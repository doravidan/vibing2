use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Manager, Emitter};
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

/// Update status information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum UpdateStatus {
    /// No update available
    UpToDate,
    /// Update available with version info
    Available {
        version: String,
        release_notes: String,
        release_date: String,
    },
    /// Update is being downloaded
    Downloading {
        downloaded: u64,
        total: u64,
        percentage: f64,
    },
    /// Update downloaded and ready to install
    Downloaded {
        version: String,
    },
    /// Update is being installed
    Installing {
        version: String,
    },
    /// Update check failed
    Error {
        message: String,
    },
}

/// Update configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConfig {
    /// Check for updates on launch (after delay)
    pub check_on_launch: bool,
    /// Launch check delay in seconds
    pub launch_delay: u64,
    /// Background check interval in hours
    pub check_interval_hours: u64,
    /// Enable automatic download
    pub auto_download: bool,
    /// Enable automatic installation
    pub auto_install: bool,
    /// Show notifications
    pub show_notifications: bool,
}

impl Default for UpdateConfig {
    fn default() -> Self {
        Self {
            check_on_launch: true,
            launch_delay: 5,
            check_interval_hours: 6,
            auto_download: true,
            auto_install: false, // Require user confirmation for installation
            show_notifications: true,
        }
    }
}

/// Updater manager
pub struct UpdaterManager {
    app: AppHandle,
    config: Arc<Mutex<UpdateConfig>>,
    current_status: Arc<Mutex<UpdateStatus>>,
}

impl UpdaterManager {
    /// Create a new updater manager
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            config: Arc::new(Mutex::new(UpdateConfig::default())),
            current_status: Arc::new(Mutex::new(UpdateStatus::UpToDate)),
        }
    }

    /// Initialize the updater with custom configuration
    pub async fn init(&self, config: UpdateConfig) {
        *self.config.lock().await = config;
    }

    /// Start the updater service
    pub async fn start(&self) {
        let config = self.config.lock().await.clone();

        // Check on launch after delay
        if config.check_on_launch {
            let app = self.app.clone();
            let delay = config.launch_delay;
            tokio::spawn(async move {
                tokio::time::sleep(Duration::from_secs(delay)).await;
                if let Err(e) = check_for_updates_internal(app.clone()).await {
                    eprintln!("Launch update check failed: {}", e);
                }
            });
        }

        // Start background checking
        let app = self.app.clone();
        let interval_hours = config.check_interval_hours;
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(interval_hours * 3600));
            interval.tick().await; // Skip first tick

            loop {
                interval.tick().await;
                if let Err(e) = check_for_updates_internal(app.clone()).await {
                    eprintln!("Background update check failed: {}", e);
                }
            }
        });
    }

    /// Get current update status
    pub async fn get_status(&self) -> UpdateStatus {
        self.current_status.lock().await.clone()
    }

    /// Update the current status
    pub async fn set_status(&self, status: UpdateStatus) {
        *self.current_status.lock().await = status.clone();

        // Emit event to frontend
        if let Err(e) = self.app.emit("update-status", &status) {
            eprintln!("Failed to emit update status: {}", e);
        }
    }
}

/// Check for updates (internal implementation)
async fn check_for_updates_internal(app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get the updater handle
    let handle = app.updater_builder().build()?;

    // Check for updates
    match handle.check().await {
        Ok(Some(update)) => {
            println!("Update available: {}", update.version);

            // Extract release notes and date
            let release_notes = update.body.clone().unwrap_or_else(|| "No release notes available".to_string());
            let release_date = update.date.clone().unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

            // Emit update available event
            let _ = app.emit("update-available", UpdateStatus::Available {
                version: update.version.clone(),
                release_notes: release_notes.clone(),
                release_date: release_date.clone(),
            });

            println!("Starting download...");

            // Download with progress tracking
            let mut downloaded = 0u64;
            let total = update.content_length.unwrap_or(0);

            update
                .download(
                    |chunk_length, _content_length| {
                        downloaded += chunk_length as u64;
                        let percentage = if total > 0 {
                            (downloaded as f64 / total as f64) * 100.0
                        } else {
                            0.0
                        };

                        // Emit download progress
                        let _ = app.emit("update-download-progress", UpdateStatus::Downloading {
                            downloaded,
                            total,
                            percentage,
                        });
                    },
                    || {
                        println!("Download finished");
                    },
                )
                .await?;

            // Emit download complete event
            let _ = app.emit("update-downloaded", UpdateStatus::Downloaded {
                version: update.version.clone(),
            });

            println!("Update downloaded successfully");

            Ok(())
        }
        Ok(None) => {
            println!("No updates available");
            let _ = app.emit("update-not-available", UpdateStatus::UpToDate);
            Ok(())
        }
        Err(e) => {
            eprintln!("Update check error: {}", e);
            let _ = app.emit("update-error", UpdateStatus::Error {
                message: e.to_string(),
            });
            Err(Box::new(e))
        }
    }
}

/// Tauri command to manually check for updates
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateStatus, String> {
    match check_for_updates_internal(app).await {
        Ok(_) => Ok(UpdateStatus::UpToDate),
        Err(e) => Ok(UpdateStatus::Error {
            message: e.to_string(),
        }),
    }
}

/// Tauri command to install the downloaded update
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let handle = app.updater_builder()
        .build()
        .map_err(|e| e.to_string())?;

    // Check if update is available
    match handle.check().await {
        Ok(Some(update)) => {
            // Emit installing event
            let _ = app.emit("update-installing", UpdateStatus::Installing {
                version: update.version.clone(),
            });

            // Install and restart
            update
                .download_and_install(
                    |chunk_length, content_length| {
                        println!("Downloaded {} of {:?} bytes", chunk_length, content_length);
                    },
                    || {
                        println!("Download finished, installing...");
                    },
                )
                .await
                .map_err(|e| e.to_string())?;

            Ok(())
        }
        Ok(None) => Err("No update available".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Tauri command to get update configuration
#[tauri::command]
pub async fn get_update_config(
    updater: tauri::State<'_, Arc<UpdaterManager>>,
) -> Result<UpdateConfig, String> {
    Ok(updater.config.lock().await.clone())
}

/// Tauri command to update configuration
#[tauri::command]
pub async fn set_update_config(
    config: UpdateConfig,
    updater: tauri::State<'_, Arc<UpdaterManager>>,
) -> Result<(), String> {
    *updater.config.lock().await = config;
    Ok(())
}

/// Tauri command to get current update status
#[tauri::command]
pub async fn get_update_status(
    updater: tauri::State<'_, Arc<UpdaterManager>>,
) -> Result<UpdateStatus, String> {
    Ok(updater.get_status().await)
}

/// Tauri command to download update without installing
#[tauri::command]
pub async fn download_update(app: AppHandle) -> Result<(), String> {
    check_for_updates_internal(app)
        .await
        .map_err(|e| e.to_string())
}

/// Tauri command to check if update is available (quick check)
#[tauri::command]
pub async fn is_update_available(app: AppHandle) -> Result<bool, String> {
    let handle = app.updater_builder()
        .build()
        .map_err(|e| e.to_string())?;

    match handle.check().await {
        Ok(Some(_)) => Ok(true),
        Ok(None) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

/// Tauri command to get current app version
#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Initialize updater system
pub async fn init_updater(app: AppHandle) -> Result<Arc<UpdaterManager>, Box<dyn std::error::Error>> {
    let manager = Arc::new(UpdaterManager::new(app.clone()));

    // Initialize with default config
    manager.init(UpdateConfig::default()).await;

    // Start the updater service
    manager.start().await;

    Ok(manager)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_config_default() {
        let config = UpdateConfig::default();
        assert!(config.check_on_launch);
        assert_eq!(config.launch_delay, 5);
        assert_eq!(config.check_interval_hours, 6);
        assert!(config.auto_download);
        assert!(!config.auto_install);
        assert!(config.show_notifications);
    }

    #[test]
    fn test_update_status_serialization() {
        let status = UpdateStatus::Available {
            version: "1.1.0".to_string(),
            release_notes: "Bug fixes".to_string(),
            release_date: "2025-10-13".to_string(),
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("Available"));
        assert!(json.contains("1.1.0"));
    }
}

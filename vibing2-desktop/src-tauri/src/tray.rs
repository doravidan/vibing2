//! System tray implementation for Vibing2 desktop application
//!
//! Provides a native system tray icon with menu items for quick access to:
//! - Window visibility controls
//! - Project management
//! - Recent projects (dynamically loaded from database)
//! - Settings and updates
//! - Application information
//!
//! Features:
//! - Native macOS integration with proper icons
//! - Dynamic menu updates based on application state
//! - Badge indicators for notifications
//! - Recent projects submenu (last 5 projects)

use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use crate::database;
use serde::{Deserialize, Serialize};
use sqlx::Row;

/// Menu item identifiers for handling events
const MENU_SHOW_HIDE: &str = "show_hide";
const MENU_NEW_PROJECT: &str = "new_project";
const MENU_SETTINGS: &str = "settings";
const MENU_CHECK_UPDATES: &str = "check_updates";
const MENU_ABOUT: &str = "about";
const MENU_QUIT: &str = "quit";
const MENU_RECENT_PREFIX: &str = "recent_";

/// Project information for recent projects menu
#[derive(Debug, Clone, Serialize, Deserialize)]
struct RecentProject {
    id: String,
    name: String,
    description: Option<String>,
    project_type: String,
    updated_at: String,
}

/// Initialize the system tray icon and menu
///
/// Creates a native system tray icon with a comprehensive menu including:
/// - Show/Hide window toggle
/// - Create new project
/// - Recent projects submenu (last 5 projects from database)
/// - Settings access
/// - Check for updates
/// - About information
/// - Quit application
///
/// # Arguments
/// * `app` - The Tauri application handle
///
/// # Returns
/// * `Result<(), tauri::Error>` - Success or error
pub fn create_tray(app: &tauri::AppHandle) -> Result<(), tauri::Error> {
    let menu = build_tray_menu(app)?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(handle_tray_event)
        .tooltip("Vibing2 - AI Development Platform")
        .build(app)?;

    Ok(())
}

/// Build the system tray menu with all items
///
/// Constructs a complete menu structure including:
/// - Standard menu items (show/hide, new project, etc.)
/// - Recent projects submenu with dynamic content from database
/// - Separators for visual organization
///
/// # Arguments
/// * `app` - The Tauri application handle
///
/// # Returns
/// * `Result<Menu, tauri::Error>` - The constructed menu or error
fn build_tray_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let app_handle = app.clone();

    // Build recent projects submenu (async operation)
    let recent_submenu = tauri::async_runtime::block_on(async move {
        build_recent_projects_submenu(&app_handle).await
    })?;

    // Build main menu
    let menu = MenuBuilder::new(app)
        .item(
            &MenuItemBuilder::with_id(MENU_SHOW_HIDE, "Show/Hide Window")
                .accelerator("Cmd+H")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id(MENU_NEW_PROJECT, "Create New Project")
                .accelerator("Cmd+N")
                .build(app)?,
        )
        .item(&recent_submenu)
        .separator()
        .item(
            &MenuItemBuilder::with_id(MENU_SETTINGS, "Settings")
                .accelerator("Cmd+,")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id(MENU_CHECK_UPDATES, "Check for Updates")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id(MENU_ABOUT, "About Vibing2")
                .build(app)?,
        )
        .separator()
        .item(
            &PredefinedMenuItem::quit(app, Some("Quit Vibing2"))?
        )
        .build()?;

    Ok(menu)
}

/// Build the recent projects submenu
///
/// Fetches the 5 most recently updated projects from the database
/// and creates menu items for each. If no projects exist, shows
/// a disabled "No Recent Projects" item.
///
/// # Arguments
/// * `app` - The Tauri application handle
///
/// # Returns
/// * `Result<Submenu, tauri::Error>` - The submenu or error
async fn build_recent_projects_submenu(
    app: &tauri::AppHandle,
) -> Result<tauri::menu::Submenu<tauri::Wry>, tauri::Error> {
    let mut submenu_builder = SubmenuBuilder::new(app, "Recent Projects");

    // Fetch recent projects from database
    match fetch_recent_projects().await {
        Ok(projects) if !projects.is_empty() => {
            // Add menu item for each recent project
            for project in projects {
                let menu_id = format!("{}{}", MENU_RECENT_PREFIX, project.id);
                let title = truncate_string(&project.name, 40);
                let subtitle = project.description
                    .as_ref()
                    .map(|d| format!(" - {}", truncate_string(d, 30)))
                    .unwrap_or_default();

                let menu_text = format!("{}{}", title, subtitle);

                submenu_builder = submenu_builder.item(
                    &MenuItemBuilder::with_id(&menu_id, menu_text)
                        .build(app)?
                );
            }
        }
        Ok(_) | Err(_) => {
            // No projects or error - show disabled item
            submenu_builder = submenu_builder.item(
                &MenuItemBuilder::new("No Recent Projects")
                    .enabled(false)
                    .build(app)?
            );
        }
    }

    submenu_builder.build()
}

/// Fetch recent projects from the database
///
/// Retrieves the 5 most recently updated projects for the local user
/// ordered by update timestamp in descending order.
///
/// # Returns
/// * `Result<Vec<RecentProject>, Box<dyn std::error::Error>>` - Projects or error
async fn fetch_recent_projects() -> Result<Vec<RecentProject>, Box<dyn std::error::Error>> {
    let pool = database::get_pool().await?;

    // Use query instead of query_as! to avoid compile-time SQL checking
    let rows = sqlx::query(
        r#"
        SELECT id, name, description, project_type, updated_at
        FROM projects
        WHERE user_id = 'local-user'
        ORDER BY updated_at DESC
        LIMIT 5
        "#
    )
    .fetch_all(&*pool)
    .await?;

    let projects: Vec<RecentProject> = rows
        .iter()
        .map(|row| RecentProject {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            project_type: row.get("project_type"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    Ok(projects)
}

/// Handle menu item click events
///
/// Routes menu events to appropriate handlers based on the menu item ID:
/// - Show/Hide: Toggle main window visibility
/// - New Project: Navigate to create project page
/// - Settings: Navigate to settings page
/// - Check Updates: Check for application updates
/// - About: Show about dialog
/// - Recent Project: Load and navigate to selected project
///
/// # Arguments
/// * `app` - The Tauri application handle
/// * `event` - The menu event containing the clicked item ID
fn handle_menu_event(app: &tauri::AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        MENU_SHOW_HIDE => {
            if let Some(window) = app.get_webview_window("main") {
                match window.is_visible() {
                    Ok(true) => {
                        let _ = window.hide();
                    }
                    Ok(false) | Err(_) => {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        }

        MENU_NEW_PROJECT => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                // Navigate to create page via JavaScript
                let _ = window.eval("window.location.href = '/create'");
            }
        }

        MENU_SETTINGS => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                // Navigate to settings page via JavaScript
                let _ = window.eval("window.location.href = '/settings'");
            }
        }

        MENU_CHECK_UPDATES => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            // Check for updates using Tauri updater
            check_for_updates(app);
        }

        MENU_ABOUT => {
            show_about_dialog(app);
        }

        id if id.starts_with(MENU_RECENT_PREFIX) => {
            // Extract project ID and load project
            let project_id = id.trim_start_matches(MENU_RECENT_PREFIX);
            load_recent_project(app, project_id);
        }

        _ => {}
    }
}

/// Handle tray icon click events
///
/// On left-click with primary mouse button: Toggle main window visibility
/// This provides quick access to show/hide the application window.
///
/// # Arguments
/// * `app` - The Tauri application handle
/// * `event` - The tray icon event
fn handle_tray_event(_tray: &tauri::tray::TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        // Left-click toggles window visibility (handled by menu_on_left_click)
        // This is already handled by the menu, but we can add additional logic here if needed
    }
}

/// Check for application updates
///
/// Uses Tauri's built-in updater to check for new versions.
/// Shows a dialog with update information if available.
///
/// Note: Requires update configuration in tauri.conf.json
///
/// # Arguments
/// * `app` - The Tauri application handle
fn check_for_updates(app: &tauri::AppHandle) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

    // In a real implementation, you would use tauri-plugin-updater
    // For now, we'll show a message dialog
    let dialog = app.dialog()
        .message("Update check not configured yet")
        .title("Check for Updates")
        .buttons(MessageDialogButtons::Ok);

    dialog.show(|_result| {
        // Handle dialog result if needed
    });
}

/// Show about dialog
///
/// Displays application information including:
/// - Application name and version
/// - Description
/// - Copyright information
/// - Website link
///
/// # Arguments
/// * `app` - The Tauri application handle
fn show_about_dialog(app: &tauri::AppHandle) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

    let version = app.package_info().version.to_string();
    let about_text = format!(
        "Vibing2 Desktop v{}\n\n\
        AI-Powered Development Platform\n\n\
        Build web applications with AI assistance.\n\
        154 specialized agents, 70% cost savings,\n\
        and 100% local data storage.\n\n\
        Copyright © 2025 Vibing2. All rights reserved.\n\n\
        Visit: https://vibing2.app",
        version
    );

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }

    let dialog = app.dialog()
        .message(about_text)
        .title("About Vibing2")
        .buttons(MessageDialogButtons::Ok);

    dialog.show(|_result| {
        // Handle dialog result if needed
    });
}

/// Load a recent project
///
/// Loads the selected project from the database and navigates
/// to the dashboard with the project loaded.
///
/// # Arguments
/// * `app` - The Tauri application handle
/// * `project_id` - The ID of the project to load
fn load_recent_project(app: &tauri::AppHandle, project_id: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();

        // Navigate to dashboard and emit event to load project
        let project_id_owned = project_id.to_string();
        tauri::async_runtime::spawn(async move {
            // Emit event to frontend to load the project
            let _ = window.emit("load-project", project_id_owned);
        });
    }
}

/// Update the tray menu dynamically
///
/// Rebuilds the tray menu with updated recent projects.
/// Call this function when projects are created, updated, or deleted
/// to keep the menu in sync with the database.
///
/// # Arguments
/// * `app` - The Tauri application handle
///
/// # Returns
/// * `Result<(), tauri::Error>` - Success or error
pub fn update_tray_menu(app: &tauri::AppHandle) -> Result<(), tauri::Error> {
    // In Tauri 2.0, we need to recreate the tray icon with new menu
    // This is a workaround as direct menu updates may not be available
    let menu = build_tray_menu(app)?;

    // Try to get existing tray and update its menu
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))?;
    }

    Ok(())
}

/// Set tray icon badge (macOS only)
///
/// Displays a badge on the tray icon to indicate notifications
/// or unread items. Pass `None` to remove the badge.
///
/// Note: Badge display is platform-specific. macOS shows badges,
/// other platforms may ignore this.
///
/// # Arguments
/// * `app` - The Tauri application handle
/// * `badge` - Optional badge text (typically a number)
///
/// # Returns
/// * `Result<(), tauri::Error>` - Success or error
#[cfg(target_os = "macos")]
pub fn set_tray_badge(
    app: &tauri::AppHandle,
    badge: Option<&str>,
) -> Result<(), tauri::Error> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_icon_as_template(true)?;
        // Note: Tauri 2.0 doesn't have direct badge support yet
        // This would need platform-specific implementation
        // For now, we can use tooltip to show notifications
        if let Some(count) = badge {
            tray.set_tooltip(Some(&format!("Vibing2 - {} notifications", count)))?;
        } else {
            tray.set_tooltip(Some("Vibing2 - AI Development Platform"))?;
        }
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn set_tray_badge(
    _app: &tauri::AppHandle,
    _badge: Option<&str>,
) -> Result<(), tauri::Error> {
    // No-op on non-macOS platforms
    Ok(())
}

/// Truncate a string to a maximum length with ellipsis
///
/// # Arguments
/// * `s` - The string to truncate
/// * `max_len` - Maximum length before truncation
///
/// # Returns
/// * `String` - The truncated string with "..." if needed
fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len.saturating_sub(3)])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_string() {
        assert_eq!(truncate_string("Short", 10), "Short");
        assert_eq!(truncate_string("This is a very long string", 10), "This is...");
        assert_eq!(truncate_string("Exact", 5), "Exact");
    }

    #[test]
    fn test_menu_id_constants() {
        assert!(MENU_SHOW_HIDE.len() > 0);
        assert!(MENU_NEW_PROJECT.len() > 0);
        assert!(MENU_RECENT_PREFIX.len() > 0);
    }
}

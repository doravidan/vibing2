// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod auth;
pub mod commands;
pub mod database;
// pub mod server;
pub mod tray;
// pub mod updater;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Initialize database asynchronously using Tauri's runtime
            tauri::async_runtime::spawn(async {
                match database::init_database().await {
                    Ok(_) => println!("✅ Database initialized successfully"),
                    Err(e) => eprintln!("Failed to initialize database: {}", e),
                }
            });

            // Initialize system tray
            if let Err(e) = tray::create_tray(app.handle()) {
                eprintln!("Failed to initialize system tray: {}", e);
            } else {
                println!("✅ System tray initialized successfully");
            }

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::save_project,
            commands::load_project,
            commands::list_projects,
            commands::delete_project,
            commands::save_settings,
            commands::load_settings,
            commands::check_claude_auth,
            commands::save_api_key,
            commands::get_credentials,
            commands::update_tray_menu,
            commands::set_tray_badge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

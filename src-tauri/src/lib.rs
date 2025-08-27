use tauri::{Manager, State, WindowEvent, AppHandle};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, GlobalShortcutExt};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

mod commands;
mod clipboard_monitor;
mod content_detection;

use commands::*;
use clipboard_monitor::ClipboardMonitor;

/**
 * Application state that holds shared resources
 */
#[derive(Default)]
pub struct AppState {
    pub clipboard_monitor: Arc<Mutex<Option<ClipboardMonitor>>>,
}

/**
 * Represents a clipboard item
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: String,
    pub content: String,
    pub content_type: String,
    pub code_language: Option<String>,
    pub source_app: String,
    pub timestamp: DateTime<Utc>,
    pub size: usize,
    pub is_favorite: bool,
    pub tags: Vec<String>,
    pub preview: String,
}

/**
 * AI transformation result
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AITransformation {
    pub id: String,
    pub title: String,
    pub description: String,
    pub result: String,
    pub confidence: f64,
    pub is_applied: bool,
    pub transformation_type: String,
}

/**
 * Application settings
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub hotkey_enabled: bool,
    pub hotkey_modifiers: Vec<String>,
    pub hotkey_key: String,
    pub theme: String,
    pub panel_opacity: f64,
    pub store_history: bool,
    pub max_history_items: u32,
    pub ai_enabled: bool,
    pub model_path: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            hotkey_enabled: true,
            hotkey_modifiers: vec!["Cmd".to_string(), "Shift".to_string()],
            hotkey_key: "V".to_string(),
            theme: "system".to_string(),
            panel_opacity: 0.95,
            store_history: true,
            max_history_items: 1000,
            ai_enabled: true,
            model_path: String::new(),
        }
    }
}

/**
 * Initialize the global shortcut for the application
 */
fn setup_global_shortcut(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyV);
    let app_handle = app.handle().clone();
    
    app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
        log::info!("Global shortcut triggered: {:?}", event);
        if let Some(main_window) = app_handle.get_webview_window("main") {
            let _ = main_window.show();
            let _ = main_window.set_focus();
            let _ = main_window.set_always_on_top(true);
            log::info!("Window shown via global shortcut");
        } else {
            log::error!("Main window not found");
        }
    })?;
    
    log::info!("Global shortcut Cmd+Shift+V registered successfully");
    
    Ok(())
}

/**
 * Initialize the database and clipboard monitor
 */
async fn setup_app_state(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state: State<AppState> = app.state();
    
    // Initialize clipboard monitor
    let monitor = ClipboardMonitor::new();
    *state.clipboard_monitor.lock().unwrap() = Some(monitor);
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(AppState::default())
        .setup(|app| {
            // Setup global shortcut
            if let Err(e) = setup_global_shortcut(app) {
                log::error!("Failed to setup global shortcut: {}", e);
            }
            
            // Setup app state asynchronously
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = setup_app_state(&app_handle).await {
                    log::error!("Failed to setup app state: {}", e);
                }
            });
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Focused(is_focused) = event {
                if !is_focused && window.label() == "main" {
                    // Hide window when it loses focus
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_clipboard_content,
            set_clipboard_content,
            get_clipboard_history,
            delete_clipboard_item,
            clear_clipboard_history,
            get_settings,
            update_settings,
            register_global_shortcut,
            unregister_global_shortcut,
            process_with_ai,
            get_ai_transformations,
            check_ai_status,
            toggle_panel_visibility,
            show_panel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

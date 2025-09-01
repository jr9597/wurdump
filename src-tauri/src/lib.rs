use tauri::{Manager, State, WindowEvent, AppHandle};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, GlobalShortcutExt};
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use tokio::sync::broadcast;

mod commands;
mod clipboard_monitor;
mod content_detection;
mod database;

use commands::*;
use clipboard_monitor::ClipboardMonitor;

/**
 * Task cancellation token for AI requests
 */
pub type CancellationToken = broadcast::Sender<()>;

/**
 * Application state that holds shared resources
 */
#[derive(Default)]
pub struct AppState {
    pub clipboard_monitor: Arc<Mutex<Option<Arc<ClipboardMonitor>>>>,
    pub active_ai_tasks: Arc<Mutex<HashMap<String, CancellationToken>>>,
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
    #[serde(rename = "isApplied")]
    pub is_applied: bool,
    #[serde(rename = "transformationType")]
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
 * 
 * Uses platform-specific modifiers:
 * - macOS: Cmd+Shift+V (SUPER = Command key)
 * - Windows: Ctrl+Shift+V (CONTROL = Ctrl key)
 * - Linux: Ctrl+Shift+V (CONTROL = Ctrl key)
 */
fn setup_global_shortcut(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Use platform-specific modifiers
    let modifiers = if cfg!(target_os = "macos") {
        Modifiers::SUPER | Modifiers::SHIFT
    } else {
        Modifiers::CONTROL | Modifiers::SHIFT
    };
    
    let shortcut = Shortcut::new(Some(modifiers), Code::KeyV);
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
    
    // Log platform-specific shortcut
    let shortcut_name = if cfg!(target_os = "macos") {
        "Cmd+Shift+V"
    } else {
        "Ctrl+Shift+V"
    };
    
    log::info!("Global shortcut {} registered successfully", shortcut_name);
    
    Ok(())
}

/**
 * Initialize the database and clipboard monitor
 * 
 * This function sets up the core clipboard monitoring functionality:
 * 1. Creates a new ClipboardMonitor instance
 * 2. Initializes SQLite database with proper schema
 * 3. Starts background clipboard monitoring (checks every 1 second)
 * 4. Stores the monitor in application state for access by Tauri commands
 * 
 * The clipboard monitor will automatically:
 * - Detect clipboard content changes
 * - Store new content in the database
 * - Maintain only the latest 20 items
 * - Prevent duplicate storage within 1-hour windows
 */
async fn setup_app_state(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state: State<AppState> = app.state();
    
    // STEP 1: Create clipboard monitor instance
    let mut monitor = ClipboardMonitor::new();
    
    // STEP 2: Initialize SQLite database for clipboard history storage
    // This creates the database file and necessary tables if they don't exist
    monitor.initialize_database(&app).await?;
    
    // STEP 3: Start automatic clipboard monitoring
    // The monitor will check clipboard content every 1000ms (1 second)
    // and automatically store new content to the database
    let app_handle_clone = app.clone();
    monitor.start_monitoring(app_handle_clone, 1000).await?;
    
    // STEP 4: Store monitor in application state for access by Tauri commands
    // This allows frontend commands to access clipboard history through the monitor
    *state.clipboard_monitor.lock().unwrap() = Some(Arc::new(monitor));
    
    log::info!("🚀 Clipboard monitoring initialized and started with database persistence");
    log::info!("📋 Monitoring interval: 1000ms | Max items: 20 | Database: SQLite");
    log::info!("🔧 Environment: {}", if cfg!(debug_assertions) { "Development" } else { "Production" });
    
    // Test clipboard access immediately
    match app.clipboard().read_text() {
        Ok(content) => {
            log::info!("✅ Clipboard access test successful: {} chars", content.len());
        }
        Err(e) => {
            log::error!("❌ Clipboard access test failed: {}", e);
            log::error!("   This indicates missing permissions or system restrictions");
        }
    }
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
            check_ai_status,
            toggle_panel_visibility,
            show_panel,
            cancel_ai_requests
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/**
 * Tauri commands for Wurdump application
 * These functions are called from the frontend TypeScript code
 */

use tauri::{command, State, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::{AppState, ClipboardItem, AITransformation, AppSettings};
use anyhow::Result;
use tokio::sync::broadcast;
use uuid::Uuid;

/**
 * Get the current clipboard content
 */
#[command]
pub async fn get_clipboard_content(app: tauri::AppHandle) -> Result<String, String> {
    match app.clipboard().read_text() {
        Ok(content) => Ok(content),
        Err(e) => {
            log::error!("Failed to get clipboard content: {}", e);
            Err("Failed to access clipboard. Please grant permission in System Preferences.".to_string())
        }
    }
}

/**
 * Set clipboard content
 */
#[command]
pub async fn set_clipboard_content(app: tauri::AppHandle, content: String) -> Result<(), String> {
    match app.clipboard().write_text(content.clone()) {
        Ok(_) => {
            log::info!("Successfully set clipboard content: {} chars", content.len());
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to set clipboard content: {}", e);
            Err("Failed to set clipboard content".to_string())
        }
    }
}

/**
 * Get clipboard history from the database
 */
#[command]
pub async fn get_clipboard_history(
    state: State<'_, AppState>,
    limit: Option<u32>,
    offset: Option<u32>
) -> Result<Vec<ClipboardItem>, String> {
    let monitor = {
        let monitor_guard = state.clipboard_monitor.lock().unwrap();
        monitor_guard.clone()
    };
    
    if let Some(monitor) = monitor {
        if let Some(db) = monitor.get_database() {
            let limit = limit.unwrap_or(20);
            let offset = offset.unwrap_or(0);
            
            match db.get_clipboard_history(limit, offset).await {
                Ok(items) => Ok(items),
                Err(e) => {
                    log::error!("Failed to get clipboard history: {}", e);
                    Err("Failed to fetch clipboard history".to_string())
                }
            }
        } else {
            log::warn!("Database not initialized");
            Ok(vec![])
        }
    } else {
        log::warn!("Clipboard monitor not initialized");
        Ok(vec![])
    }
}

/**
 * Delete a clipboard item from history
 */
#[command]
pub async fn delete_clipboard_item(
    state: State<'_, AppState>,
    item_id: String
) -> Result<(), String> {
    let monitor = {
        let monitor_guard = state.clipboard_monitor.lock().unwrap();
        monitor_guard.clone()
    };
    
    if let Some(monitor) = monitor {
        if let Some(db) = monitor.get_database() {
            match db.delete_clipboard_item(&item_id).await {
                Ok(()) => {
                    log::info!("Deleted clipboard item: {}", item_id);
                    Ok(())
                }
                Err(e) => {
                    log::error!("Failed to delete clipboard item {}: {}", item_id, e);
                    Err("Failed to delete clipboard item".to_string())
                }
            }
        } else {
            log::warn!("Database not initialized");
            Err("Database not available".to_string())
        }
    } else {
        log::warn!("Clipboard monitor not initialized");
        Err("Clipboard monitor not available".to_string())
    }
}

/**
 * Clear all clipboard history
 */
#[command]
pub async fn clear_clipboard_history(state: State<'_, AppState>) -> Result<(), String> {
    let monitor = {
        let monitor_guard = state.clipboard_monitor.lock().unwrap();
        monitor_guard.clone()
    };
    
    if let Some(monitor) = monitor {
        if let Some(db) = monitor.get_database() {
            match db.clear_clipboard_history().await {
                Ok(()) => {
                    log::info!("Cleared all clipboard history");
                    Ok(())
                }
                Err(e) => {
                    log::error!("Failed to clear clipboard history: {}", e);
                    Err("Failed to clear clipboard history".to_string())
                }
            }
        } else {
            log::warn!("Database not initialized");
            Err("Database not available".to_string())
        }
    } else {
        log::warn!("Clipboard monitor not initialized");
        Err("Clipboard monitor not available".to_string())
    }
}

/**
 * Get application settings
 */
#[command]
pub async fn get_settings() -> Result<AppSettings, String> {
    // TODO: Load settings from file or database
    Ok(AppSettings::default())
}

/**
 * Update application settings
 */
#[command]
pub async fn update_settings(settings: AppSettings) -> Result<(), String> {
    // TODO: Save settings to file or database
    log::info!("Updating settings: {:?}", settings);
    Ok(())
}

/**
 * Register a new global shortcut
 */
#[command]
pub async fn register_global_shortcut(
    modifiers: Vec<String>,
    key: String
) -> Result<(), String> {
    // TODO: Implement global shortcut registration
    log::info!("Registering global shortcut: {:?} + {}", modifiers, key);
    Ok(())
}

/**
 * Unregister the current global shortcut
 */
#[command]
pub async fn unregister_global_shortcut() -> Result<(), String> {
    // TODO: Implement global shortcut unregistration
    log::info!("Unregistering global shortcut");
    Ok(())
}

// Static HTTP client for connection pooling with improved configuration
static HTTP_CLIENT: once_cell::sync::Lazy<reqwest::Client> = once_cell::sync::Lazy::new(|| {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120)) // Increased timeout for large models
        .connect_timeout(std::time::Duration::from_secs(10)) // Quick connection detection
        .pool_idle_timeout(std::time::Duration::from_secs(30)) // Keep connections alive
        .pool_max_idle_per_host(4) // Maintain connection pool
        .tcp_keepalive(std::time::Duration::from_secs(60)) // Keep TCP connections alive
        .http1_title_case_headers() // Better compatibility with Ollama
        .build()
        .expect("Failed to create HTTP client")
});

/**
 * Process clipboard content with AI using custom prompt and optional context
 * 
 * Enhanced with improved error handling, retry logic, and context support
 */
#[command]
pub async fn process_with_ai(
    content: String,
    custom_prompt: Option<String>,
    context_items: Option<Vec<String>>, // New: Support for additional context
    state: State<'_, AppState>
) -> Result<Vec<AITransformation>, String> {
    if content.trim().is_empty() {
        return Err("Content is empty".to_string());
    }

    log::info!("🤖 Processing content with AI: {} chars, {} context items", 
               content.len(), 
               context_items.as_ref().map(|items| items.len()).unwrap_or(0));
    
    // Debug logging for context items
    if let Some(ref context) = context_items {
        log::info!("🔍 Context items received:");
        for (i, item) in context.iter().enumerate() {
            log::info!("  Context {}: {} chars - Preview: {}", 
                      i + 1, 
                      item.len(), 
                      &item.chars().take(50).collect::<String>());
        }
    } else {
        log::info!("❌ No context items provided");
    }

    // Create a unique task ID for this request
    let task_id = Uuid::new_v4().to_string();
    let (cancel_tx, mut cancel_rx) = broadcast::channel(1);

    // Store the cancellation token
    {
        let mut tasks = state.active_ai_tasks.lock().unwrap();
        tasks.insert(task_id.clone(), cancel_tx);
    }

    // Enhanced prompt building with context support
    let system_prompt = "You are an AI assistant that helps transform clipboard content. Be helpful, accurate, and preserve important information. When provided with additional context, use it to give better, more relevant responses.";
    
    let _has_custom_prompt = custom_prompt.is_some();
    let mut user_prompt = String::new();
    
    // Add context items if provided
    if let Some(ref context) = context_items {
        if !context.is_empty() {
            user_prompt.push_str("Additional Context:\n");
            for (i, item) in context.iter().enumerate() {
                user_prompt.push_str(&format!("Context {}: {}\n\n", i + 1, item));
            }
            user_prompt.push_str("---\n\n");
        }
    }
    
    // Add main content and request
    user_prompt.push_str(&format!("Main Content:\n```\n{}\n```\n\n", content));
    
    if let Some(ref prompt) = custom_prompt {
        user_prompt.push_str(&format!("Request: {}", prompt));
    } else {
        user_prompt.push_str("Please improve and format this content, taking into account any provided context.");
    }

    // Build request with dynamic token limit based on content size
    let estimated_tokens = (content.len() + user_prompt.len()) / 4; // Rough estimation
    let max_tokens = if estimated_tokens > 2000 { 2000 } else { 1000 };
    
    // Log the final prompt being sent to AI
    log::info!("📝 Final prompt being sent to AI:");
    log::info!("System: {}", system_prompt);
    log::info!("User prompt (first 500 chars): {}", 
              &user_prompt.chars().take(500).collect::<String>());
    if user_prompt.len() > 500 {
        log::info!("... (prompt continues for {} more chars)", user_prompt.len() - 500);
    }
    
    let request_body = serde_json::json!({
        "model": "gpt-oss:20b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": max_tokens,
        "stream": false // Ensure we get complete response
    });

    // Retry logic with exponential backoff
    let max_retries = 3;
    let mut last_error = String::new();
    
    for attempt in 1..=max_retries {
        log::debug!("🔄 AI request attempt {}/{}", attempt, max_retries);
        
        // Make the request with cancellation support
        let result = tokio::select! {
            response_result = make_ai_request(&request_body) => {
                response_result
            }
            _ = cancel_rx.recv() => {
                // Clean up the task from active tasks
                {
                    let mut tasks = state.active_ai_tasks.lock().unwrap();
                    tasks.remove(&task_id);
                }
                log::info!("❌ AI request cancelled: {}", task_id);
                return Err("Request cancelled by user".to_string());
            }
        };

        match result {
            Ok(transformation) => {
                // Clean up the task from active tasks
                {
                    let mut tasks = state.active_ai_tasks.lock().unwrap();
                    tasks.remove(&task_id);
                }
                
                log::info!("✅ AI processing completed successfully on attempt {}", attempt);
                return Ok(vec![transformation]);
            }
            Err(e) => {
                last_error = e;
                log::warn!("⚠️  AI request attempt {} failed: {}", attempt, last_error);
                
                // Don't retry for certain errors
                if last_error.contains("cancelled") || 
                   last_error.contains("Invalid response format") ||
                   last_error.contains("Cannot connect") {
                    break;
                }
                
                // Exponential backoff before retry
                if attempt < max_retries {
                    let delay = std::time::Duration::from_millis(1000 * (2_u64.pow(attempt - 1)));
                    log::debug!("⏳ Waiting {}ms before retry", delay.as_millis());
                    tokio::time::sleep(delay).await;
                }
            }
        }
    }

    // Clean up the task from active tasks
    {
        let mut tasks = state.active_ai_tasks.lock().unwrap();
        tasks.remove(&task_id);
    }

    log::error!("❌ AI processing failed after {} attempts: {}", max_retries, last_error);
    Err(format!("AI processing failed after {} attempts: {}", max_retries, last_error))
}

/**
 * Helper function to make AI requests with improved error handling
 */
async fn make_ai_request(request_body: &serde_json::Value) -> Result<AITransformation, String> {
    let response = HTTP_CLIENT
        .post("http://localhost:11434/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(request_body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "AI request timed out (120s). The model might be busy or Ollama needs restart.".to_string()
            } else if e.is_connect() {
                "Cannot connect to AI service. Please start Ollama: ollama serve".to_string()
            } else {
                format!("Network error: {}", e)
            }
        })?;

    if !response.status().is_success() {
        return Err(format!("AI service error: {} - {}", 
                          response.status(), 
                          response.text().await.unwrap_or_else(|_| "Unknown error".to_string())));
    }

    let json = response.json::<serde_json::Value>().await
        .map_err(|e| format!("Failed to parse AI response as JSON: {}", e))?;

    // Better response validation
    let content = json
        .get("choices")
        .and_then(|choices| choices.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .ok_or_else(|| {
            log::error!("Invalid AI response structure: {}", json);
            "Invalid response format from AI service".to_string()
        })?;

    if content.trim().is_empty() {
        return Err("AI returned empty response".to_string());
    }

    let transformation = AITransformation {
        id: format!("ai-{}", chrono::Utc::now().timestamp()),
        title: "AI Enhanced Content".to_string(),
        description: "AI-processed content with context".to_string(),
        result: content.to_string(),
        confidence: 0.9,
        is_applied: false,
        transformation_type: "enhancement".to_string(),
    };

    Ok(transformation)
}



/**
 * Check if Ollama is running and has gpt-oss model
 */
#[command]
pub async fn check_ai_status() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Check if Ollama is running (increased timeout for busy server)
    match client
        .get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => {
                        let empty_vec = vec![];
                        let models = data["models"].as_array().unwrap_or(&empty_vec);
                        let has_gpt_oss = models.iter().any(|model| {
                            model["name"].as_str()
                                .map(|name| name.contains("gpt-oss"))
                                .unwrap_or(false)
                        });
                        
                        Ok(serde_json::json!({
                            "ollama_running": true,
                            "has_gpt_oss": has_gpt_oss,
                            "message": if has_gpt_oss {
                                "AI features are ready!"
                            } else {
                                "Ollama is running but gpt-oss model not found. Run: ollama pull gpt-oss:20b"
                            }
                        }))
                    }
                    Err(_) => Ok(serde_json::json!({
                        "ollama_running": false,
                        "has_gpt_oss": false,
                        "message": "Ollama is running but returned invalid response"
                    }))
                }
            } else {
                Ok(serde_json::json!({
                    "ollama_running": false,
                    "has_gpt_oss": false,
                    "message": "Ollama server error"
                }))
            }
        }
        Err(_) => {
            Ok(serde_json::json!({
                "ollama_running": false,
                "has_gpt_oss": false,
                "message": "Ollama not running. Please start it with: ollama serve"
            }))
        }
    }
}

/**
 * Toggle panel visibility
 */
#[command]
pub async fn toggle_panel_visibility(app_handle: tauri::AppHandle) -> Result<bool, String> {
    if let Some(main_window) = app_handle.get_webview_window("main") {
        let is_visible = main_window.is_visible().unwrap_or(false);
        if is_visible {
            main_window.hide().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            main_window.show().map_err(|e| e.to_string())?;
            main_window.set_focus().map_err(|e| e.to_string())?;
            Ok(true)
        }
    } else {
        Err("Main window not found".to_string())
    }
}

/**
 * Cancel all active AI requests
 */
#[command]
pub async fn cancel_ai_requests(state: State<'_, AppState>) -> Result<(), String> {
    let mut tasks = state.active_ai_tasks.lock().unwrap();
    let task_count = tasks.len();
    
    // Send cancellation signal to all active tasks
    for (task_id, cancel_tx) in tasks.drain() {
        let _ = cancel_tx.send(());
        log::info!("Cancelled AI task: {}", task_id);
    }
    
    log::info!("Cancelled {} AI task(s)", task_count);
    Ok(())
}

/**
 * Show the panel (for global shortcut)
 */
#[command]
pub async fn show_panel(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(main_window) = app_handle.get_webview_window("main") {
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
        main_window.set_always_on_top(true).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

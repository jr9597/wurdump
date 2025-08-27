/**
 * Tauri commands for Wurdump application
 * These functions are called from the frontend TypeScript code
 */

use tauri::{command, State, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::{AppState, ClipboardItem, AITransformation, AppSettings};
use anyhow::Result;

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
    _state: State<'_, AppState>,
    _limit: Option<u32>,
    _offset: Option<u32>
) -> Result<Vec<ClipboardItem>, String> {
    // TODO: Implement clipboard history storage
    // For now, return empty history
    Ok(vec![])
}

/**
 * Delete a clipboard item from history
 */
#[command]
pub async fn delete_clipboard_item(
    _state: State<'_, AppState>,
    item_id: String
) -> Result<(), String> {
    // TODO: Implement clipboard history storage
    log::info!("Would delete clipboard item: {}", item_id);
    Ok(())
}

/**
 * Clear all clipboard history
 */
#[command]
pub async fn clear_clipboard_history(_state: State<'_, AppState>) -> Result<(), String> {
    // TODO: Implement clipboard history storage
    log::info!("Would clear clipboard history");
    Ok(())
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

/**
 * Process clipboard content with AI
 */
#[command]
pub async fn process_with_ai(
    content: String,
    custom_prompt: Option<String>
) -> Result<Vec<AITransformation>, String> {
    log::info!("Processing content with AI: {} chars", content.len());
    if let Some(prompt) = &custom_prompt {
        log::info!("Custom prompt: {}", prompt);
    }
    
    // Make HTTP request to Ollama
    let client = reqwest::Client::new();
    let ollama_url = "http://localhost:11434/v1/chat/completions";
    
    // Prepare the request based on whether we have a custom prompt
    let (system_prompt, user_prompt) = if let Some(prompt) = custom_prompt {
        (
            "You are an AI assistant that helps transform clipboard content. Be helpful, accurate, and preserve important information while following the user's request.".to_string(),
            format!("Here is the clipboard content:\n```\n{}\n```\n\nUser's request: {}\n\nPlease process the content according to the user's request:", content, prompt)
        )
    } else {
        (
            "You are an AI assistant that helps improve and transform text. Make the content more professional and well-formatted.".to_string(),
            format!("Please improve and format this content:\n\n{}", content)
        )
    };
    
    let request_body = serde_json::json!({
        "model": "gpt-oss:20b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    });
    
    match client
        .post(ollama_url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(json) => {
                        if let Some(choices) = json["choices"].as_array() {
                            if let Some(first_choice) = choices.first() {
                                if let Some(content) = first_choice["message"]["content"].as_str() {
                                    let transformation = AITransformation {
                                        id: format!("ai-{}", chrono::Utc::now().timestamp()),
                                        title: "AI Enhancement".to_string(),
                                        description: "AI-improved version of your content".to_string(),
                                        result: content.to_string(),
                                        confidence: 0.85,
                                        is_applied: false,
                                        transformation_type: "enhancement".to_string(),
                                    };
                                    
                                    return Ok(vec![transformation]);
                                }
                            }
                        }
                        Err("Invalid response format from AI".to_string())
                    }
                    Err(e) => Err(format!("Failed to parse AI response: {}", e))
                }
            } else {
                Err(format!("AI service error: {}", response.status()))
            }
        }
        Err(e) => {
            if e.is_timeout() {
                Err("AI request timed out. Make sure Ollama is running with: ollama serve".to_string())
            } else if e.is_connect() {
                Err("Cannot connect to AI service. Please start Ollama: ollama serve".to_string())
            } else {
                Err(format!("AI request failed: {}", e))
            }
        }
    }
}

/**
 * Get available AI transformations for content
 */
#[command]
pub async fn get_ai_transformations(
    content: String,
    content_type: String
) -> Result<Vec<AITransformation>, String> {
    log::info!("Getting AI transformations for {} content", content_type);
    
    let mut transformations = Vec::new();
    let client = reqwest::Client::new();
    let ollama_url = "http://localhost:11434/v1/chat/completions";
    
    // Define different transformation prompts based on content type
    let prompts = get_transformation_prompts(&content, &content_type);
    
    for (i, prompt_info) in prompts.iter().enumerate() {
        let request_body = serde_json::json!({
            "model": "gpt-oss:20b",
            "messages": [
                {"role": "system", "content": prompt_info.system_prompt},
                {"role": "user", "content": prompt_info.user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 800
        });
        
        match client
            .post(ollama_url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_secs(20))
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    if let Ok(json) = response.json::<serde_json::Value>().await {
                        if let Some(choices) = json["choices"].as_array() {
                            if let Some(first_choice) = choices.first() {
                                if let Some(result) = first_choice["message"]["content"].as_str() {
                                    transformations.push(AITransformation {
                                        id: format!("{}-{}-{}", prompt_info.transformation_type, chrono::Utc::now().timestamp(), i),
                                        title: prompt_info.title.clone(),
                                        description: prompt_info.description.clone(),
                                        result: result.to_string(),
                                        confidence: prompt_info.confidence,
                                        is_applied: false,
                                        transformation_type: prompt_info.transformation_type.clone(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to get {} transformation: {}", prompt_info.transformation_type, e);
                // Continue with other transformations
            }
        }
    }
    
    // If no AI transformations worked, return some basic ones
    if transformations.is_empty() {
        transformations.push(AITransformation {
            id: format!("fallback-{}", chrono::Utc::now().timestamp()),
            title: "AI Unavailable".to_string(),
            description: "Start Ollama to enable AI transformations".to_string(),
            result: "Please run 'ollama serve' and 'ollama run gpt-oss:20b' to enable AI features.".to_string(),
            confidence: 0.1,
            is_applied: false,
            transformation_type: "error".to_string(),
        });
    }
    
    Ok(transformations)
}

struct TransformationPrompt {
    transformation_type: String,
    title: String,
    description: String,
    system_prompt: String,
    user_prompt: String,
    confidence: f64,
}

fn get_transformation_prompts(content: &str, content_type: &str) -> Vec<TransformationPrompt> {
    let mut prompts = Vec::new();
    
    // Code transformations
    if content_type == "code" || is_code_like(content) {
        prompts.push(TransformationPrompt {
            transformation_type: "language_conversion".to_string(),
            title: "Convert to TypeScript".to_string(),
            description: "Convert code to TypeScript with proper types".to_string(),
            system_prompt: "You are a code conversion expert. Convert code to TypeScript while preserving functionality and adding proper type annotations. Only return the converted code, no explanations.".to_string(),
            user_prompt: format!("Convert this code to TypeScript:\n```\n{}\n```", content),
            confidence: 0.85,
        });
        
        prompts.push(TransformationPrompt {
            transformation_type: "cleanup".to_string(),
            title: "Clean & Format".to_string(),
            description: "Clean up and format the code with best practices".to_string(),
            system_prompt: "You are a code formatter. Improve code quality, formatting, and readability while preserving functionality. Only return the improved code, no explanations.".to_string(),
            user_prompt: format!("Clean and format this code:\n```\n{}\n```", content),
            confidence: 0.8,
        });
    }
    
    // Text transformations
    if content_type == "text" || content_type == "email" {
        prompts.push(TransformationPrompt {
            transformation_type: "enhancement".to_string(),
            title: "Professional Tone".to_string(),
            description: "Rewrite in a professional, business-appropriate tone".to_string(),
            system_prompt: "You are a professional writing assistant. Rewrite text to be more professional and business-appropriate while preserving the core message. Only return the rewritten text.".to_string(),
            user_prompt: format!("Make this text more professional:\n\n{}", content),
            confidence: 0.9,
        });
        
        prompts.push(TransformationPrompt {
            transformation_type: "summarization".to_string(),
            title: "Summarize".to_string(),
            description: "Create a concise summary of the content".to_string(),
            system_prompt: "You are a summarization expert. Create clear, concise summaries that capture the key points. Only return the summary.".to_string(),
            user_prompt: format!("Summarize this text:\n\n{}", content),
            confidence: 0.75,
        });
    }
    
    // JSON/Data transformations
    if content_type == "json" || is_json_like(content) {
        prompts.push(TransformationPrompt {
            transformation_type: "format_conversion".to_string(),
            title: "Convert to CSV".to_string(),
            description: "Convert JSON data to CSV format".to_string(),
            system_prompt: "You are a data conversion expert. Convert JSON to CSV format while preserving all information. Only return the CSV data.".to_string(),
            user_prompt: format!("Convert this JSON to CSV format:\n```json\n{}\n```", content),
            confidence: 0.8,
        });
    }
    
    // Universal transformations
    prompts.push(TransformationPrompt {
        transformation_type: "explanation".to_string(),
        title: "Explain Content".to_string(),
        description: "Provide a clear explanation of what this content does or means".to_string(),
        system_prompt: "You are an expert explainer. Break down complex content into easy-to-understand explanations.".to_string(),
        user_prompt: format!("Explain what this content does or means:\n\n{}", content),
        confidence: 0.7,
    });
    
    prompts
}

fn is_code_like(content: &str) -> bool {
    let code_indicators = [
        "function", "def ", "class ", "import ", "const ", "let ", "var ",
        "=>", "{", "}", "()", "if (", "for (", "while (", "//", "/*", "*/",
        "public ", "private ", "protected ", "static ", "async ", "await "
    ];
    
    code_indicators.iter().any(|indicator| content.contains(indicator))
}

fn is_json_like(content: &str) -> bool {
    let trimmed = content.trim();
    (trimmed.starts_with('{') && trimmed.ends_with('}')) ||
    (trimmed.starts_with('[') && trimmed.ends_with(']'))
}

/**
 * Check if Ollama is running and has gpt-oss model
 */
#[command]
pub async fn check_ai_status() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    // Check if Ollama is running
    match client
        .get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(5))
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

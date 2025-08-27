/**
 * Clipboard monitoring module for Wurdump
 * 
 * This module provides automatic clipboard monitoring functionality that:
 * - Monitors system clipboard changes every 1 second
 * - Automatically saves new clipboard content to SQLite database
 * - Maintains only the latest 20 clipboard items (auto-cleanup)
 * - Detects content types (text, code, JSON, URL, email, etc.)
 * - Prevents duplicate entries within a 1-hour window
 * - Provides thread-safe access to clipboard history
 */

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::time;
use anyhow::Result;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::{content_detection::ContentDetector, database::ClipboardDatabase};

/**
 * Clipboard monitoring service
 * 
 * This struct manages the background clipboard monitoring process and provides
 * thread-safe access to clipboard state and database operations.
 */
pub struct ClipboardMonitor {
    /// Whether the monitoring background task is currently running
    is_running: Arc<Mutex<bool>>,
    /// The last clipboard content that was processed (to detect changes)
    last_content: Arc<Mutex<String>>,
    /// Timestamp of the last successful clipboard check
    last_check: Arc<Mutex<Instant>>,
    /// Content type and language detection engine
    content_detector: ContentDetector,
    /// SQLite database instance for storing clipboard history
    database: Option<ClipboardDatabase>,
}

impl ClipboardMonitor {
    /**
     * Create a new clipboard monitor instance
     * 
     * Creates the monitor with default state but does not start monitoring
     * or initialize the database. Call initialize_database() and start_monitoring()
     * to begin clipboard monitoring.
     */
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(Mutex::new(false)),
            last_content: Arc::new(Mutex::new(String::new())),
            last_check: Arc::new(Mutex::new(Instant::now())),
            content_detector: ContentDetector::new(),
            database: None,
        }
    }

    /**
     * Initialize the clipboard monitor with SQLite database
     * 
     * This sets up the database connection and creates necessary tables.
     * Must be called before starting monitoring to enable clipboard history storage.
     * 
     * Returns: Result indicating success or database initialization error
     */
    pub async fn initialize_database(&mut self) -> Result<()> {
        let db = ClipboardDatabase::new(None).await?;
        self.database = Some(db);
        log::info!("Clipboard monitor database initialized");
        Ok(())
    }
    
    /**
     * Start monitoring the clipboard with automatic background storage
     * 
     * This method starts a background task that:
     * 1. Checks clipboard content at the specified interval (default: 1000ms)
     * 2. Detects when clipboard content changes
     * 3. Automatically stores new content to the database
     * 4. Maintains a maximum of 20 items (older items are auto-deleted)
     * 5. Prevents duplicate storage within a 1-hour window
     * 
     * Parameters:
     * - app_handle: Tauri app handle for clipboard access
     * - interval_ms: How often to check clipboard (milliseconds)
     * 
     * Returns: Result indicating if monitoring started successfully
     */
    pub async fn start_monitoring(&self, app_handle: AppHandle, interval_ms: u64) -> Result<()> {
        // Prevent multiple monitoring tasks from running
        {
            let mut is_running = self.is_running.lock().unwrap();
            if *is_running {
                log::warn!("Clipboard monitoring is already running");
                return Ok(()); // Already running
            }
            *is_running = true;
        }
        
        // Clone Arc references for the background task
        let is_running = Arc::clone(&self.is_running);
        let last_content = Arc::clone(&self.last_content);
        let last_check = Arc::clone(&self.last_check);
        let database = self.database.clone();
        
        // Spawn background monitoring task
        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(interval_ms));
            log::info!("Started clipboard monitoring with {}ms interval", interval_ms);
            
            loop {
                // Wait for the next interval tick
                interval.tick().await;
                
                // Check if monitoring should continue
                {
                    let running = is_running.lock().unwrap();
                    if !*running {
                        log::info!("Stopping clipboard monitoring");
                        break;
                    }
                }
                
                // CLIPBOARD MONITORING CORE LOGIC
                // Read current clipboard content using Tauri's clipboard plugin
                if let Ok(current_content) = app_handle.clipboard().read_text() {
                    // Check if content has actually changed (avoid unnecessary processing)
                    let needs_update = {
                        let last = last_content.lock().unwrap();
                        *last != current_content && !current_content.trim().is_empty()
                    };
                    
                    if needs_update {
                        log::info!("📋 Clipboard content changed: {} chars", current_content.len());
                        
                        // Update our internal state with the new content
                        {
                            let mut last = last_content.lock().unwrap();
                            *last = current_content.clone();
                        }
                        
                        // Update the timestamp of last successful check
                        {
                            let mut last_check_time = last_check.lock().unwrap();
                            *last_check_time = Instant::now();
                        }
                        
                        // AUTOMATIC DATABASE STORAGE
                        // Store the new clipboard content in SQLite database
                        if let Some(db) = &database {
                            // First check if this exact content already exists in recent history
                            // This prevents duplicate entries when users copy the same thing multiple times
                            match db.content_exists(&current_content).await {
                                Ok(exists) => {
                                    if !exists {
                                        // Content is new - store it in the database
                                        // The database will automatically:
                                        // 1. Detect content type (text, code, JSON, URL, etc.)
                                        // 2. Generate a preview
                                        // 3. Maintain only the latest 20 items
                                        if let Err(e) = db.store_clipboard_item(&current_content).await {
                                            log::error!("❌ Failed to store clipboard item: {}", e);
                                        } else {
                                            log::debug!("✅ Stored new clipboard item in database");
                                        }
                                    } else {
                                        log::debug!("⏭️  Clipboard content already exists in recent history, skipping");
                                    }
                                }
                                Err(e) => {
                                    log::error!("❌ Failed to check if content exists: {}", e);
                                }
                            }
                        } else {
                            log::warn!("⚠️  Database not available for storing clipboard content");
                        }
                    }
                } else {
                    // This can happen if:
                    // 1. Clipboard is empty
                    // 2. Permission denied
                    // 3. Clipboard contains non-text content (images, files, etc.)
                    log::debug!("Could not read clipboard text content");
                }
            }
        });
        
        log::info!("🚀 Clipboard monitoring task started successfully");
        Ok(())
    }
    
    /**
     * Stop monitoring the clipboard
     * 
     * Signals the background monitoring task to stop. The task will finish
     * its current iteration and then exit gracefully.
     */
    pub fn stop_monitoring(&self) {
        let mut is_running = self.is_running.lock().unwrap();
        *is_running = false;
        log::info!("🛑 Clipboard monitoring stop requested");
    }
    
    /**
     * Check if monitoring is currently active
     * 
     * Returns: true if the background monitoring task is running
     */
    pub fn is_monitoring(&self) -> bool {
        *self.is_running.lock().unwrap()
    }
    
    /**
     * Get the last detected clipboard content
     * 
     * Returns: The most recently processed clipboard content as a String
     */
    pub fn get_last_content(&self) -> String {
        self.last_content.lock().unwrap().clone()
    }
    
    /**
     * Get time since last clipboard change
     * 
     * Returns: Duration since the last time clipboard content was updated
     */
    pub fn time_since_last_change(&self) -> Duration {
        let last_check = self.last_check.lock().unwrap();
        last_check.elapsed()
    }
    
    /**
     * Manually trigger clipboard content detection
     * 
     * Forces an immediate check of the clipboard content without waiting
     * for the regular monitoring interval. Useful for on-demand updates.
     * 
     * Parameters:
     * - app_handle: Tauri app handle for clipboard access
     * 
     * Returns: Some(content) if clipboard has text content, None if empty
     */
    pub async fn detect_current_content(&self, app_handle: &AppHandle) -> Result<Option<String>> {
        let content = app_handle.clipboard().read_text()?;
        
        if !content.trim().is_empty() {
            // Update our internal state
            let mut last = self.last_content.lock().unwrap();
            *last = content.clone();
            
            let mut last_check_time = self.last_check.lock().unwrap();
            *last_check_time = Instant::now();
            
            log::debug!("🔍 Manual clipboard detection: {} chars", content.len());
            Ok(Some(content))
        } else {
            Ok(None)
        }
    }
    
    /**
     * Get the database instance for direct access
     * 
     * Returns: Cloned database instance if initialized, None otherwise
     * The database is cloneable for thread-safe access across the application.
     */
    pub fn get_database(&self) -> Option<ClipboardDatabase> {
        self.database.clone()
    }
    
    /**
     * Process new clipboard content
     */
    async fn process_content(&self, content: &str) -> Result<()> {
        // Detect content type and properties
        let content_info = self.content_detector.detect_content(content);
        
        log::info!(
            "Detected content: type={}, language={:?}, app={}", 
            content_info.content_type,
            content_info.code_language,
            content_info.source_app
        );
        
        // TODO: Store in database
        // TODO: Trigger AI processing if enabled
        
        Ok(())
    }
}

/**
 * Information about detected clipboard content
 */
#[derive(Debug, Clone)]
pub struct ClipboardContentInfo {
    pub content_type: String,
    pub code_language: Option<String>,
    pub source_app: String,
    pub preview: String,
    pub size: usize,
}

impl Default for ClipboardContentInfo {
    fn default() -> Self {
        Self {
            content_type: "text".to_string(),
            code_language: None,
            source_app: "unknown".to_string(),
            preview: String::new(),
            size: 0,
        }
    }
}

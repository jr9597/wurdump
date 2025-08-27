/**
 * Database module for Wurdump clipboard history storage
 * Handles SQLite operations for storing and retrieving clipboard items
 */

use sqlx::{Pool, Sqlite, SqlitePool, Row};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use anyhow::{Result, Context};
use std::path::PathBuf;
use crate::{ClipboardItem, content_detection::ContentDetector};

/**
 * Database manager for clipboard history
 */
#[derive(Clone)]
pub struct ClipboardDatabase {
    pool: Pool<Sqlite>,
    content_detector: ContentDetector,
}

impl ClipboardDatabase {
    /**
     * Initialize the database connection and create tables
     */
    pub async fn new(db_path: Option<PathBuf>) -> Result<Self> {
        let db_url = if let Some(path) = db_path {
            format!("sqlite:{}", path.display())
        } else {
            // Default to clipboard.db in the current directory for simplicity
            let db_path = PathBuf::from("clipboard.db");
            format!("sqlite:{}", db_path.display())
        };

        let pool = SqlitePool::connect(&db_url)
            .await
            .context("Failed to connect to database")?;

        // Create tables if they don't exist
        let database = Self { 
            pool, 
            content_detector: ContentDetector::new() 
        };
        database.create_tables().await?;

        log::info!("Database initialized at: {}", db_url);
        Ok(database)
    }

    /**
     * Create the necessary database tables
     */
    async fn create_tables(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS clipboard_items (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                content_type TEXT NOT NULL,
                code_language TEXT,
                source_app TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                size INTEGER NOT NULL,
                is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
                tags TEXT NOT NULL DEFAULT '[]',
                preview TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .context("Failed to create clipboard_items table")?;

        // Create index for faster timestamp queries
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_clipboard_timestamp 
            ON clipboard_items(timestamp DESC)
            "#,
        )
        .execute(&self.pool)
        .await
        .context("Failed to create timestamp index")?;

        Ok(())
    }

    /**
     * Store a new clipboard item with automatic content detection and cleanup
     * 
     * This method handles the complete storage process:
     * 1. Analyzes content to detect type (text, code, JSON, URL, etc.)
     * 2. Generates a preview for UI display
     * 3. Stores the item in SQLite database
     * 4. Automatically removes old items to maintain 20-item limit
     * 
     * Parameters:
     * - content: The clipboard text content to store
     * 
     * Returns: The created ClipboardItem with all metadata
     */
    pub async fn store_clipboard_item(&self, content: &str) -> Result<ClipboardItem> {
        // CONTENT ANALYSIS AND METADATA GENERATION
        // Use the content detector to analyze the clipboard content and determine:
        // - Content type (text, code, JSON, URL, email, markdown, etc.)
        // - Programming language (if it's code)
        // - Source application (future enhancement)
        // - Preview text (truncated version for UI)
        let content_info = self.content_detector.detect_content(content);
        
        // Create a new clipboard item with all metadata
        let item = ClipboardItem {
            id: Uuid::new_v4().to_string(),
            content: content.to_string(),
            content_type: content_info.content_type.clone(),
            code_language: content_info.code_language.clone(),
            source_app: content_info.source_app.clone(),
            timestamp: Utc::now(),
            size: content.len(),
            is_favorite: false,
            tags: vec![],
            preview: content_info.preview.clone(),
        };

        // DATABASE INSERTION
        // Store the clipboard item in SQLite with all metadata
        sqlx::query(
            r#"
            INSERT INTO clipboard_items 
            (id, content, content_type, code_language, source_app, timestamp, size, is_favorite, tags, preview)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&item.id)
        .bind(&item.content)
        .bind(&item.content_type)
        .bind(&item.code_language)
        .bind(&item.source_app)
        .bind(item.timestamp.to_rfc3339())
        .bind(item.size as i64)
        .bind(item.is_favorite)
        .bind(serde_json::to_string(&item.tags).unwrap_or_default())
        .bind(&item.preview)
        .execute(&self.pool)
        .await
        .context("Failed to insert clipboard item")?;

        // AUTOMATIC CLEANUP - MAINTAIN 20 ITEM LIMIT
        // Remove older items to keep only the most recent 20 clipboard entries
        // This ensures the database doesn't grow indefinitely
        self.cleanup_old_items().await?;

        log::info!("📦 Stored clipboard item: {} chars, type: {}", item.size, item.content_type);
        Ok(item)
    }

    /**
     * Get clipboard history with pagination
     */
    pub async fn get_clipboard_history(&self, limit: u32, offset: u32) -> Result<Vec<ClipboardItem>> {
        let rows = sqlx::query(
            r#"
            SELECT id, content, content_type, code_language, source_app, timestamp, 
                   size, is_favorite, tags, preview
            FROM clipboard_items 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await
        .context("Failed to fetch clipboard history")?;

        let mut items = Vec::new();
        for row in rows {
            let timestamp_str: String = row.get("timestamp");
            let tags_str: String = row.get("tags");
            
            let item = ClipboardItem {
                id: row.get("id"),
                content: row.get("content"),
                content_type: row.get("content_type"),
                code_language: row.get("code_language"),
                source_app: row.get("source_app"),
                timestamp: DateTime::parse_from_rfc3339(&timestamp_str)
                    .context("Failed to parse timestamp")?
                    .with_timezone(&Utc),
                size: row.get::<i64, _>("size") as usize,
                is_favorite: row.get("is_favorite"),
                tags: serde_json::from_str(&tags_str).unwrap_or_default(),
                preview: row.get("preview"),
            };
            items.push(item);
        }

        Ok(items)
    }

    /**
     * Delete a specific clipboard item
     */
    pub async fn delete_clipboard_item(&self, item_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM clipboard_items WHERE id = ?")
            .bind(item_id)
            .execute(&self.pool)
            .await
            .context("Failed to delete clipboard item")?;

        log::info!("Deleted clipboard item: {}", item_id);
        Ok(())
    }

    /**
     * Clear all clipboard history
     */
    pub async fn clear_clipboard_history(&self) -> Result<()> {
        sqlx::query("DELETE FROM clipboard_items")
            .execute(&self.pool)
            .await
            .context("Failed to clear clipboard history")?;

        log::info!("Cleared all clipboard history");
        Ok(())
    }

    /**
     * Check if content already exists in recent history
     */
    pub async fn content_exists(&self, content: &str) -> Result<bool> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM clipboard_items WHERE content = ? AND timestamp > datetime('now', '-1 hour')"
        )
        .bind(content)
        .fetch_one(&self.pool)
        .await
        .context("Failed to check if content exists")?;

        Ok(count > 0)
    }

    /**
     * Cleanup old items to maintain only the latest 20 clipboard entries
     * 
     * This method implements the core requirement of keeping only the most recent
     * 20 clipboard items. It works by:
     * 1. Finding the 20 most recent items (by timestamp)
     * 2. Deleting all items that are NOT in that top 20 list
     * 
     * This is called automatically after every new item insertion to ensure
     * the database never grows beyond the 20-item limit.
     */
    async fn cleanup_old_items(&self) -> Result<()> {
        let deleted = sqlx::query(
            r#"
            DELETE FROM clipboard_items 
            WHERE id NOT IN (
                SELECT id FROM clipboard_items 
                ORDER BY timestamp DESC 
                LIMIT 20
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .context("Failed to cleanup old items")?;

        if deleted.rows_affected() > 0 {
            log::debug!("🧹 Cleaned up {} old clipboard items to maintain 20-item limit", deleted.rows_affected());
        }

        Ok(())
    }

    /**
     * Get the total count of clipboard items
     */
    pub async fn get_item_count(&self) -> Result<u32> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM clipboard_items")
            .fetch_one(&self.pool)
            .await
            .context("Failed to get item count")?;

        Ok(count as u32)
    }
}

/**
 * Content detection module for Wurdump
 * Analyzes clipboard content to determine type, language, and source
 */

use regex::Regex;
use std::collections::HashMap;
use crate::clipboard_monitor::ClipboardContentInfo;

/**
 * Content detection engine
 */
pub struct ContentDetector {
    url_regex: Regex,
    email_regex: Regex,
    json_regex: Regex,
    function_regex: Regex,
    import_regex: Regex,
    html_regex: Regex,
    markdown_regex: Regex,
    code_patterns: HashMap<String, Vec<Regex>>,
}

impl ContentDetector {
    /**
     * Create a new content detector with pre-compiled patterns
     */
    pub fn new() -> Self {
        let mut detector = Self {
            url_regex: Regex::new(r"^https?://(?:[-\w.])+(?:\:[0-9]+)?(?:/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$").unwrap(),
            email_regex: Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap(),
            json_regex: Regex::new(r"^\s*[\{\[][\s\S]*[\}\]]\s*$").unwrap(),
            function_regex: Regex::new(r"^(function|def|class|interface|type|const|let|var)\s+\w+").unwrap(),
            import_regex: Regex::new(r"^(import|from|#include|use|require)\s+").unwrap(),
            html_regex: Regex::new(r"<\/?[a-z][\s\S]*>").unwrap(),
            markdown_regex: Regex::new(r"^#{1,6}\s|^\*\*|^__|\[.*\]\(.*\)|^\s*[-+*]\s").unwrap(),
            code_patterns: HashMap::new(),
        };
        
        detector.init_code_patterns();
        detector
    }
    
    /**
     * Initialize language-specific code patterns
     */
    fn init_code_patterns(&mut self) {
        // JavaScript/TypeScript patterns
        let js_patterns = vec![
            Regex::new(r"(const|let|var)\s+\w+\s*=").unwrap(),
            Regex::new(r"function\s+\w+\s*\(").unwrap(),
            Regex::new(r"=>\s*\{").unwrap(),
            Regex::new(r"import\s+.*\s+from\s+").unwrap(),
            Regex::new(r"export\s+(default\s+)?").unwrap(),
        ];
        self.code_patterns.insert("javascript".to_string(), js_patterns);
        
        // Python patterns
        let python_patterns = vec![
            Regex::new(r"def\s+\w+\s*\(").unwrap(),
            Regex::new(r"class\s+\w+\s*\(").unwrap(),
            Regex::new(r"import\s+\w+").unwrap(),
            Regex::new(r"from\s+\w+\s+import").unwrap(),
            Regex::new(r#"if\s+__name__\s*==\s*["']__main__["']"#).unwrap(),
        ];
        self.code_patterns.insert("python".to_string(), python_patterns);
        
        // Rust patterns
        let rust_patterns = vec![
            Regex::new(r"fn\s+\w+\s*\(").unwrap(),
            Regex::new(r"struct\s+\w+\s*\{").unwrap(),
            Regex::new(r"enum\s+\w+\s*\{").unwrap(),
            Regex::new(r"use\s+\w+").unwrap(),
            Regex::new(r"impl\s+\w+").unwrap(),
        ];
        self.code_patterns.insert("rust".to_string(), rust_patterns);
        
        // Go patterns
        let go_patterns = vec![
            Regex::new(r"func\s+\w+\s*\(").unwrap(),
            Regex::new(r"type\s+\w+\s+struct").unwrap(),
            Regex::new(r"package\s+\w+").unwrap(),
            Regex::new(r"import\s+\(").unwrap(),
            Regex::new(r"var\s+\w+\s+=").unwrap(),
        ];
        self.code_patterns.insert("go".to_string(), go_patterns);
        
        // Add more language patterns as needed
    }
    
    /**
     * Detect content type and properties
     */
    pub fn detect_content(&self, content: &str) -> ClipboardContentInfo {
        let trimmed = content.trim();
        let size = content.len();
        let preview = self.create_preview(content);
        
        // Check for specific content types first
        if self.is_url(trimmed) {
            return ClipboardContentInfo {
                content_type: "url".to_string(),
                code_language: None,
                source_app: self.detect_source_app(content),
                preview,
                size,
            };
        }
        
        if self.is_email(trimmed) {
            return ClipboardContentInfo {
                content_type: "email".to_string(),
                code_language: None,
                source_app: self.detect_source_app(content),
                preview,
                size,
            };
        }
        
        if self.is_json(trimmed) {
            return ClipboardContentInfo {
                content_type: "json".to_string(),
                code_language: Some("json".to_string()),
                source_app: self.detect_source_app(content),
                preview,
                size,
            };
        }
        
        if self.is_html(content) {
            return ClipboardContentInfo {
                content_type: "html".to_string(),
                code_language: Some("html".to_string()),
                source_app: self.detect_source_app(content),
                preview,
                size,
            };
        }
        
        if self.is_markdown(content) {
            return ClipboardContentInfo {
                content_type: "markdown".to_string(),
                code_language: None,
                source_app: self.detect_source_app(content),
                preview,
                size,
            };
        }
        
        // Check for code
        if let Some(language) = self.detect_code_language(content) {
            return ClipboardContentInfo {
                content_type: "code".to_string(),
                code_language: Some(language),
                source_app: self.detect_source_app(content),
                preview,
                size,
            };
        }
        
        // Default to text
        ClipboardContentInfo {
            content_type: "text".to_string(),
            code_language: None,
            source_app: self.detect_source_app(content),
            preview,
            size,
        }
    }
    
    /**
     * Check if content is a URL
     */
    fn is_url(&self, content: &str) -> bool {
        self.url_regex.is_match(content)
    }
    
    /**
     * Check if content is an email address
     */
    fn is_email(&self, content: &str) -> bool {
        self.email_regex.is_match(content)
    }
    
    /**
     * Check if content is JSON
     */
    fn is_json(&self, content: &str) -> bool {
        self.json_regex.is_match(content) && serde_json::from_str::<serde_json::Value>(content).is_ok()
    }
    
    /**
     * Check if content is HTML
     */
    fn is_html(&self, content: &str) -> bool {
        self.html_regex.is_match(content)
    }
    
    /**
     * Check if content is Markdown
     */
    fn is_markdown(&self, content: &str) -> bool {
        self.markdown_regex.is_match(content)
    }
    
    /**
     * Detect programming language from code content
     */
    fn detect_code_language(&self, content: &str) -> Option<String> {
        let mut language_scores: HashMap<String, usize> = HashMap::new();
        
        // Check against each language's patterns
        for (language, patterns) in &self.code_patterns {
            let mut score = 0;
            for pattern in patterns {
                if pattern.is_match(content) {
                    score += 1;
                }
            }
            if score > 0 {
                language_scores.insert(language.clone(), score);
            }
        }
        
        // Return the language with the highest score
        language_scores
            .into_iter()
            .max_by_key(|(_, score)| *score)
            .map(|(language, _)| language)
    }
    
    /**
     * Detect source application (placeholder implementation)
     */
    fn detect_source_app(&self, _content: &str) -> String {
        // TODO: Implement actual source app detection
        // This could use NSRunningApplication or similar APIs on macOS
        "unknown".to_string()
    }
    
    /**
     * Create a preview of the content
     */
    fn create_preview(&self, content: &str) -> String {
        const MAX_PREVIEW_LENGTH: usize = 200;
        
        let trimmed = content.trim();
        if trimmed.len() <= MAX_PREVIEW_LENGTH {
            trimmed.to_string()
        } else {
            let truncated = &trimmed[..MAX_PREVIEW_LENGTH];
            // Try to break at a word boundary
            if let Some(last_space) = truncated.rfind(' ') {
                format!("{}...", &truncated[..last_space])
            } else {
                format!("{}...", truncated)
            }
        }
    }
    
    /**
     * Check if content looks like code based on common indicators
     */
    fn has_code_indicators(&self, content: &str) -> bool {
        self.function_regex.is_match(content) || 
        self.import_regex.is_match(content) ||
        content.contains("//") ||
        content.contains("/*") ||
        content.contains("#") ||
        content.contains("def ") ||
        content.contains("function ") ||
        content.contains("class ") ||
        content.contains("interface ")
    }
}

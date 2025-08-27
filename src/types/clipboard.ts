/**
 * Type definitions for clipboard-related functionality in Wurdump
 */

/**
 * Represents the type of content detected in the clipboard
 */
export enum ContentType {
  TEXT = 'text',
  CODE = 'code',
  JSON = 'json',
  URL = 'url',
  EMAIL = 'email',
  MARKDOWN = 'markdown',
  CSV = 'csv',
  HTML = 'html',
  UNKNOWN = 'unknown'
}

/**
 * Represents the programming language detected in code content
 */
export enum CodeLanguage {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  RUST = 'rust',
  GO = 'go',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  HTML = 'html',
  CSS = 'css',
  SQL = 'sql',
  BASH = 'bash',
  JSON = 'json',
  YAML = 'yaml',
  XML = 'xml',
  UNKNOWN = 'unknown'
}

/**
 * Represents the source application that generated the clipboard content
 */
export enum SourceApp {
  VSCODE = 'vscode',
  SLACK = 'slack',
  CHROME = 'chrome',
  SAFARI = 'safari',
  FIREFOX = 'firefox',
  MAIL = 'mail',
  TERMINAL = 'terminal',
  FINDER = 'finder',
  XCODE = 'xcode',
  CURSOR = 'cursor',
  UNKNOWN = 'unknown'
}

/**
 * Represents a clipboard item stored in the database
 */
export interface ClipboardItem {
  /** Unique identifier for the clipboard item */
  id: string;
  /** The actual content from the clipboard */
  content: string;
  /** Detected content type */
  contentType: ContentType;
  /** Programming language if content is code */
  codeLanguage?: CodeLanguage;
  /** Source application that generated the content */
  sourceApp: SourceApp;
  /** Timestamp when the item was captured */
  timestamp: Date;
  /** Size of the content in characters */
  size: number;
  /** Whether this item is marked as favorite */
  isFavorite: boolean;
  /** Optional tags for organization */
  tags: string[];
  /** Preview text (truncated version for UI) */
  preview: string;
}

/**
 * Represents the result of AI processing on clipboard content
 */
export interface AITransformation {
  /** Unique identifier for the transformation */
  id: string;
  /** Human-readable title for the transformation */
  title: string;
  /** Detailed description of what the transformation does */
  description: string;
  /** The transformed content */
  result: string;
  /** Confidence score from the AI model (0-1) */
  confidence: number;
  /** Whether this transformation was applied */
  isApplied: boolean;
  /** Type of transformation performed */
  transformationType: TransformationType;
}

/**
 * Types of AI transformations available
 */
export enum TransformationType {
  LANGUAGE_CONVERSION = 'language_conversion',
  FORMAT_CONVERSION = 'format_conversion',
  SUMMARIZATION = 'summarization',
  EXPLANATION = 'explanation',
  TRANSLATION = 'translation',
  CLEANUP = 'cleanup',
  ENHANCEMENT = 'enhancement',
  VALIDATION = 'validation'
}

/**
 * Configuration for AI processing
 */
export interface AIProcessingConfig {
  /** Whether to enable AI processing */
  enabled: boolean;
  /** Maximum number of transformations to generate */
  maxTransformations: number;
  /** Minimum confidence threshold for displaying transformations */
  minConfidence: number;
  /** Timeout for AI processing in milliseconds */
  timeout: number;
}

/**
 * Represents the current state of the clipboard panel
 */
export interface ClipboardPanelState {
  /** Whether the panel is currently visible */
  isVisible: boolean;
  /** Current clipboard content being displayed */
  currentItem: ClipboardItem | null;
  /** Available AI transformations */
  transformations: AITransformation[];
  /** Whether AI processing is in progress */
  isProcessing: boolean;
  /** Current error state, if any */
  error: string | null;
  /** User's custom prompt for AI processing */
  customPrompt: string;
}

/**
 * Search filters for clipboard history
 */
export interface SearchFilters {
  /** Text query for searching content */
  query: string;
  /** Filter by content type */
  contentType?: ContentType;
  /** Filter by source application */
  sourceApp?: SourceApp;
  /** Filter by code language (if applicable) */
  codeLanguage?: CodeLanguage;
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by tags */
  tags: string[];
  /** Whether to show only favorites */
  favoritesOnly: boolean;
}

/**
 * Pagination information for clipboard history
 */
export interface PaginationInfo {
  /** Current page number (0-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Result of a clipboard history search
 */
export interface SearchResult {
  /** Array of matching clipboard items */
  items: ClipboardItem[];
  /** Pagination information */
  pagination: PaginationInfo;
  /** Total time taken for the search in milliseconds */
  searchTime: number;
}

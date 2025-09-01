/**
 * Application constants for Wurdump
 */

import { getPlatformShortcuts } from '../utils/platform';

/** Application metadata */
export const APP_NAME = 'Wurdump';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-Enhanced Clipboard Tool';

/** UI constants */
export const PANEL_WIDTH = 300;
export const PANEL_HEIGHT = 400;
export const PANEL_MIN_WIDTH = 250;
export const PANEL_MIN_HEIGHT = 300;
export const PANEL_MAX_WIDTH = 600;
export const PANEL_MAX_HEIGHT = 800;

/** Animation durations in milliseconds */
export const ANIMATION_DURATION = {
  PANEL_SHOW: 200,
  PANEL_HIDE: 150,
  ITEM_HOVER: 100,
  LOADING: 1000
} as const;

/** Debounce delays in milliseconds */
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AI_PROCESSING: 500,
  CLIPBOARD_MONITORING: 100
} as const;

/** API endpoints and timeouts */
export const API = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
} as const;

/** Database constants */
export const DATABASE = {
  NAME: 'wurdump.db',
  VERSION: 1,
  MAX_CONNECTIONS: 10,
  QUERY_TIMEOUT: 5000 // 5 seconds
} as const;

/** Content limits */
export const CONTENT_LIMITS = {
  MAX_CONTENT_SIZE: 1024 * 1024, // 1MB
  MAX_PREVIEW_LENGTH: 200,
  MAX_TITLE_LENGTH: 100,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS_PER_ITEM: 10
} as const;

/** Clipboard monitoring */
export const CLIPBOARD = {
  DEFAULT_MONITORING_INTERVAL: 500, // milliseconds
  MIN_MONITORING_INTERVAL: 100,
  MAX_MONITORING_INTERVAL: 5000,
  CONTENT_CHANGE_THRESHOLD: 10 // minimum characters changed to register as new content
} as const;

/** AI processing */
export const AI = {
  DEFAULT_TEMPERATURE: 0.7,
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 2.0,
  DEFAULT_MAX_TOKENS: 1000,
  MIN_MAX_TOKENS: 50,
  MAX_MAX_TOKENS: 4000,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MIN_CONFIDENCE: 0.3,
  MAX_TRANSFORMATIONS: 5
} as const;

/** File patterns for content detection */
export const FILE_PATTERNS = {
  JAVASCRIPT: /\.(js|jsx|mjs|cjs)$/i,
  TYPESCRIPT: /\.(ts|tsx)$/i,
  PYTHON: /\.(py|pyw|pyc|pyo|pyd)$/i,
  RUST: /\.(rs)$/i,
  GO: /\.(go)$/i,
  JAVA: /\.(java|class|jar)$/i,
  CPP: /\.(cpp|cxx|cc|c\+\+)$/i,
  C: /\.(c|h)$/i,
  HTML: /\.(html|htm)$/i,
  CSS: /\.(css|scss|sass|less)$/i,
  SQL: /\.(sql)$/i,
  BASH: /\.(sh|bash|zsh|fish)$/i,
  JSON: /\.(json)$/i,
  YAML: /\.(yaml|yml)$/i,
  XML: /\.(xml)$/i
} as const;

/** Regular expressions for content detection */
export const CONTENT_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  URL: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
  JSON: /^\s*[\{\[][\s\S]*[\}\]]\s*$/,
  CSV: /^(?:[^,\n]*,)*[^,\n]*$/m,
  HTML: /<\/?[a-z][\s\S]*>/i,
  MARKDOWN: /^#{1,6}\s|^\*\*|^__|\[.*\]\(.*\)|^\s*[-+*]\s/m,
  CODE_BLOCK: /^```[\s\S]*```$/m,
  FUNCTION_DEF: /^(function|def|class|interface|type|const|let|var)\s+\w+/m,
  IMPORT_STATEMENT: /^(import|from|#include|use|require)\s+/m
} as const;

/** Error messages */
export const ERROR_MESSAGES = {
  CLIPBOARD_ACCESS_DENIED: 'Cannot access clipboard. Please grant permission in System Preferences.',
  AI_MODEL_NOT_FOUND: 'AI model not found. Please check the model path in settings.',
  AI_PROCESSING_FAILED: 'AI processing failed. Please try again.',
  DATABASE_ERROR: 'Database error occurred. Please restart the application.',
  HOTKEY_REGISTRATION_FAILED: 'Failed to register global hotkey. Please try a different combination.',
  INVALID_SETTINGS: 'Invalid settings detected. Resetting to defaults.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please restart the application.'
} as const;

/** Success messages */
export const SUCCESS_MESSAGES = {
  SETTINGS_SAVED: 'Settings saved successfully',
  HOTKEY_REGISTERED: 'Global hotkey registered successfully',
  ITEM_COPIED: 'Item copied to clipboard',
  ITEM_DELETED: 'Item deleted successfully',
  DATABASE_CLEARED: 'History cleared successfully'
} as const;

/** Keyboard shortcuts */
export const SHORTCUTS = getPlatformShortcuts();

/**
 * Type definitions for application settings in Wurdump
 */

/**
 * Global hotkey configuration
 */
export interface HotkeyConfig {
  /** Whether the hotkey is enabled */
  enabled: boolean;
  /** Modifier keys (Cmd, Alt, Ctrl, Shift) */
  modifiers: string[];
  /** The main key */
  key: string;
  /** Human-readable representation of the hotkey */
  displayName: string;
}

/**
 * UI preferences and settings
 */
export interface UISettings {
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Panel opacity (0-1) */
  panelOpacity: number;
  /** Panel position on screen */
  panelPosition: 'center' | 'mouse' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Whether to show panel animations */
  showAnimations: boolean;
  /** Font size for the panel */
  fontSize: 'small' | 'medium' | 'large';
  /** Whether to show line numbers in code */
  showLineNumbers: boolean;
}

/**
 * Privacy and security settings
 */
export interface PrivacySettings {
  /** Whether to store clipboard history */
  storeHistory: boolean;
  /** Maximum number of items to keep in history */
  maxHistoryItems: number;
  /** Auto-delete items after X days (0 = never) */
  autoDeleteDays: number;
  /** Whether to exclude sensitive content (passwords, keys, etc.) */
  excludeSensitiveContent: boolean;
  /** List of applications to exclude from monitoring */
  excludedApps: string[];
  /** Whether to encrypt stored data */
  encryptData: boolean;
}

/**
 * AI processing settings
 */
export interface AISettings {
  /** Whether AI processing is enabled */
  enabled: boolean;
  /** Local model path for gpt-oss */
  modelPath: string;
  /** Whether to use online fallback if local model fails */
  useOnlineFallback: boolean;
  /** Maximum processing time in seconds */
  maxProcessingTime: number;
  /** Temperature for AI generation (0-2) */
  temperature: number;
  /** Maximum tokens for AI responses */
  maxTokens: number;
  /** Whether to cache AI results */
  cacheResults: boolean;
  /** Custom system prompt for AI */
  systemPrompt: string;
}

/**
 * Performance and monitoring settings
 */
export interface PerformanceSettings {
  /** Clipboard monitoring interval in milliseconds */
  monitoringInterval: number;
  /** Whether to enable debug logging */
  enableDebugLogging: boolean;
  /** Maximum memory usage for cache in MB */
  maxCacheSize: number;
  /** Whether to enable telemetry */
  enableTelemetry: boolean;
  /** Database vacuum interval in hours */
  databaseVacuumInterval: number;
}

/**
 * Complete application settings
 */
export interface AppSettings {
  /** Global hotkey configuration */
  hotkey: HotkeyConfig;
  /** UI preferences */
  ui: UISettings;
  /** Privacy and security settings */
  privacy: PrivacySettings;
  /** AI processing settings */
  ai: AISettings;
  /** Performance settings */
  performance: PerformanceSettings;
  /** Application version when settings were last updated */
  version: string;
  /** Timestamp of last settings update */
  lastUpdated: Date;
}

/**
 * Default settings for the application
 */
export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: {
    enabled: true,
    modifiers: ['Cmd', 'Shift'],
    key: 'V',
    displayName: 'Cmd+Shift+V'
  },
  ui: {
    theme: 'system',
    panelOpacity: 0.95,
    panelPosition: 'center',
    showAnimations: true,
    fontSize: 'medium',
    showLineNumbers: true
  },
  privacy: {
    storeHistory: true,
    maxHistoryItems: 1000,
    autoDeleteDays: 30,
    excludeSensitiveContent: true,
    excludedApps: ['Keychain Access', '1Password', 'LastPass'],
    encryptData: false
  },
  ai: {
    enabled: true,
    modelPath: '',
    useOnlineFallback: false,
    maxProcessingTime: 30,
    temperature: 0.7,
    maxTokens: 1000,
    cacheResults: true,
    systemPrompt: 'You are an AI assistant helping with clipboard content transformations. Be concise and helpful.'
  },
  performance: {
    monitoringInterval: 500,
    enableDebugLogging: false,
    maxCacheSize: 100,
    enableTelemetry: false,
    databaseVacuumInterval: 24
  },
  version: '1.0.0',
  lastUpdated: new Date()
};

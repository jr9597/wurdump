/**
 * Tauri command service for Wurdump
 * Provides a typed interface to interact with Rust backend commands
 */

import { invoke } from '@tauri-apps/api/core';
import type { ClipboardItem, AITransformation, SearchFilters, AppSettings } from '../types/clipboard';

/**
 * Clipboard operations
 */
export class ClipboardService {
  /**
   * Get the current clipboard content
   */
  static async getCurrentContent(): Promise<string> {
    try {
      return await invoke<string>('get_clipboard_content');
    } catch (error) {
      console.error('Failed to get clipboard content:', error);
      throw new Error('Failed to access clipboard');
    }
  }

  /**
   * Set clipboard content
   */
  static async setContent(content: string): Promise<void> {
    try {
      await invoke('set_clipboard_content', { content });
    } catch (error) {
      console.error('Failed to set clipboard content:', error);
      throw new Error('Failed to set clipboard content');
    }
  }

  /**
   * Get clipboard history with pagination
   */
  static async getHistory(limit = 50, offset = 0): Promise<ClipboardItem[]> {
    try {
      return await invoke<ClipboardItem[]>('get_clipboard_history', { limit, offset });
    } catch (error) {
      console.error('Failed to get clipboard history:', error);
      throw new Error('Failed to fetch clipboard history');
    }
  }

  /**
   * Delete a clipboard item
   */
  static async deleteItem(itemId: string): Promise<void> {
    try {
      await invoke('delete_clipboard_item', { itemId });
    } catch (error) {
      console.error('Failed to delete clipboard item:', error);
      throw new Error('Failed to delete clipboard item');
    }
  }

  /**
   * Clear all clipboard history
   */
  static async clearHistory(): Promise<void> {
    try {
      await invoke('clear_clipboard_history');
    } catch (error) {
      console.error('Failed to clear clipboard history:', error);
      throw new Error('Failed to clear clipboard history');
    }
  }
}

/**
 * AI processing operations
 */
export class AIService {
  /**
   * Process content with AI using custom prompt
   */
  static async processWithAI(
    content: string, 
    customPrompt?: string
  ): Promise<AITransformation[]> {
    try {
      return await invoke<AITransformation[]>('process_with_ai', { 
        content, 
        customPrompt 
      });
    } catch (error) {
      console.error('Failed to process content with AI:', error);
      throw new Error('AI processing failed');
    }
  }

  /**
   * Get AI transformations for content
   */
  static async getTransformations(
    content: string, 
    contentType: string
  ): Promise<AITransformation[]> {
    try {
      return await invoke<AITransformation[]>('get_ai_transformations', { 
        content, 
        contentType 
      });
    } catch (error) {
      console.error('Failed to get AI transformations:', error);
      throw new Error('Failed to get AI transformations');
    }
  }
}

/**
 * Settings operations
 */
export class SettingsService {
  /**
   * Get application settings
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      return await invoke<AppSettings>('get_settings');
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw new Error('Failed to load settings');
    }
  }

  /**
   * Update application settings
   */
  static async updateSettings(settings: AppSettings): Promise<void> {
    try {
      await invoke('update_settings', { settings });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw new Error('Failed to save settings');
    }
  }
}

/**
 * Global shortcut operations
 */
export class ShortcutService {
  /**
   * Register a new global shortcut
   */
  static async registerShortcut(
    modifiers: string[], 
    key: string
  ): Promise<void> {
    try {
      await invoke('register_global_shortcut', { modifiers, key });
    } catch (error) {
      console.error('Failed to register global shortcut:', error);
      throw new Error('Failed to register hotkey');
    }
  }

  /**
   * Unregister the current global shortcut
   */
  static async unregisterShortcut(): Promise<void> {
    try {
      await invoke('unregister_global_shortcut');
    } catch (error) {
      console.error('Failed to unregister global shortcut:', error);
      throw new Error('Failed to unregister hotkey');
    }
  }
}

/**
 * Panel operations
 */
export class PanelService {
  /**
   * Toggle panel visibility
   */
  static async toggleVisibility(): Promise<boolean> {
    try {
      return await invoke<boolean>('toggle_panel_visibility');
    } catch (error) {
      console.error('Failed to toggle panel visibility:', error);
      throw new Error('Failed to toggle panel');
    }
  }

  /**
   * Show the panel (for global shortcut)
   */
  static async showPanel(): Promise<void> {
    try {
      await invoke('show_panel');
    } catch (error) {
      console.error('Failed to show panel:', error);
      throw new Error('Failed to show panel');
    }
  }
}

/**
 * Error types for better error handling
 */
export class TauriCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'TauriCommandError';
  }
}

/**
 * Helper function to handle Tauri command errors consistently
 */
export function handleTauriError(error: unknown, command: string): never {
  console.error(`Tauri command '${command}' failed:`, error);
  
  if (error instanceof Error) {
    throw new TauriCommandError(error.message, command, error);
  }
  
  throw new TauriCommandError(
    `Unknown error occurred in command '${command}'`,
    command,
    error
  );
}

/**
 * Wrapper for invoke with consistent error handling
 */
export async function invokeWithErrorHandling<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    handleTauriError(error, command);
  }
}

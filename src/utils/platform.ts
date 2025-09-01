/**
 * Platform detection utilities for Wurdump
 */

/**
 * Detect the current platform
 */
export function getPlatform(): 'macos' | 'windows' | 'linux' {
  if (typeof window !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      return 'macos';
    } else if (userAgent.includes('win')) {
      return 'windows';
    } else if (userAgent.includes('linux')) {
      return 'linux';
    }
  }
  
  // Fallback to windows for unknown platforms
  return 'windows';
}

/**
 * Get platform-specific hotkey configuration
 */
export function getPlatformHotkey() {
  const platform = getPlatform();
  
  if (platform === 'macos') {
    return {
      modifiers: ['Cmd', 'Shift'],
      key: 'V',
      displayName: 'Cmd+Shift+V'
    };
  } else {
    return {
      modifiers: ['Ctrl', 'Shift'],
      key: 'V',
      displayName: 'Ctrl+Shift+V'
    };
  }
}

/**
 * Get platform-specific keyboard shortcuts for UI
 */
export function getPlatformShortcuts() {
  const platform = getPlatform();
  const modifier = platform === 'macos' ? 'Cmd' : 'Ctrl';
  
  return {
    CLOSE_PANEL: 'Escape',
    COPY_ITEM: 'Enter',
    DELETE_ITEM: 'Delete',
    TOGGLE_FAVORITE: 'F',
    SEARCH: `${modifier}+F`,
    SETTINGS: `${modifier}+,`,
    CLEAR_HISTORY: `${modifier}+Shift+Delete`
  } as const;
}

/**
 * Main Wurdump application component
 * Manages the overall app state and renders the clipboard panel
 */

import React, { useState, useEffect } from 'react';
import { ClipboardPanel } from './components/ClipboardPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsService } from './services/tauri-commands';
import type { AppSettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';
import './App.css';

/**
 * Check if we're running in Tauri context
 */
const isTauriContext = () => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

function App() {
  // Application state
  const [isPanelVisible, setIsPanelVisible] = useState(true); // Start visible for development
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load application settings on startup
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Note: This will fail until we implement the backend properly
        // For now, we'll use default settings
        // const loadedSettings = await SettingsService.getSettings();
        // setSettings(loadedSettings);
        setSettings(DEFAULT_SETTINGS);
      } catch (error) {
        console.warn('Failed to load settings, using defaults:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  /**
   * Handle panel close
   */
  const handleClosePanel = () => {
    setIsPanelVisible(false);
  };

  /**
   * Handle opening settings
   */
  const handleOpenSettings = () => {
    setIsSettingsVisible(true);
  };

  /**
   * Handle closing settings
   */
  const handleCloseSettings = () => {
    setIsSettingsVisible(false);
  };

  /**
   * Handle settings update
   */
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    try {
      await SettingsService.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      // In a real app, we'd show an error notification here
    }
  };

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full w-full bg-transparent">
        {/* Main Clipboard Panel */}
        <ClipboardPanel
          isVisible={isPanelVisible}
          onClose={handleClosePanel}
          onOpenSettings={handleOpenSettings}
        />

        {/* Settings Panel - TODO: Implement */}
        {isSettingsVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-96">
              <h2 className="text-lg font-semibold mb-4">Settings</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Settings panel coming soon...
              </p>
              <button
                onClick={handleCloseSettings}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Development Helper - Remove in production */}
        {!isPanelVisible && !isTauriContext() && (
          <div className="fixed bottom-4 right-4 space-y-2">
            <button
              onClick={() => setIsPanelVisible(true)}
              className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              Show Panel (Dev)
            </button>
            <button
              onClick={async () => {
                try {
                  const { ClipboardService } = await import('./services/tauri-commands');
                  const content = await ClipboardService.getCurrentContent();
                  alert(`Clipboard: ${content.slice(0, 100)}...`);
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              }}
              className="block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              Test Clipboard
            </button>
            <button
              onClick={async () => {
                try {
                  const { PanelService } = await import('./services/tauri-commands');
                  await PanelService.showPanel();
                  alert('Tried to show Tauri window');
                } catch (error) {
                  alert(`Error showing Tauri window: ${error}`);
                }
              }}
              className="block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              Show Tauri Window
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;

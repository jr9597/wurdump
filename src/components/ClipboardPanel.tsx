/**
 * Main clipboard panel component for Wurdump
 * Displays current clipboard content, AI transformations, and history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Search, Sparkles, Copy, Trash2, Heart } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ClipboardService, AIService } from '../services/tauri-commands';
import type { ClipboardItem, AITransformation } from '../types/clipboard';
import { ClipboardItemComponent } from './ClipboardItem';
import { AITransformationList } from './AITransformationList';
import { SearchInput } from './SearchInput';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';
import { AIStatusIndicator } from './AIStatusIndicator';

interface ClipboardPanelProps {
  /** Whether the panel is currently visible */
  isVisible: boolean;
  /** Callback when panel should be closed */
  onClose: () => void;
  /** Callback when settings should be opened */
  onOpenSettings: () => void;
}

/**
 * Main clipboard panel component
 */
export const ClipboardPanel: React.FC<ClipboardPanelProps> = ({
  isVisible,
  onClose,
  onOpenSettings,
}) => {
  // State management
  const [currentContent, setCurrentContent] = useState<string>('');
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [aiTransformations, setAiTransformations] = useState<AITransformation[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  /**
   * Load current clipboard content with AI transformations
   */
  const loadCurrentContent = useCallback(async () => {
    try {
      console.log('loadCurrentContent: Starting...');
      setIsLoading(true);
      setError(null);
      const content = await ClipboardService.getCurrentContent();
      console.log('loadCurrentContent: Got content:', content);
      setCurrentContent(content);
      
      // Automatically get AI transformations if content exists
      if (content.trim()) {
        console.log('loadCurrentContent: Getting AI transformations...');
        await getAITransformations(content);
      }
    } catch (err) {
      console.error('loadCurrentContent: Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clipboard content');
    } finally {
      setIsLoading(false);
      console.log('loadCurrentContent: Finished');
    }
  }, []);

  /**
   * Monitor clipboard content without triggering AI transformations
   */
  const monitorClipboardContent = useCallback(async () => {
    try {
      const content = await ClipboardService.getCurrentContent();
      // Only update if content has actually changed
      if (content !== currentContent) {
        console.log('Clipboard content changed:', content.slice(0, 50) + '...');
        setCurrentContent(content);
        // Clear previous AI transformations when content changes
        setAiTransformations([]);
      }
    } catch (err) {
      console.error('Clipboard monitor error:', err);
    }
  }, [currentContent]);

  /**
   * Load clipboard history
   */
  const loadClipboardHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const history = await ClipboardService.getHistory(50, 0);
      setClipboardHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clipboard history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get AI transformations for content
   */
  const getAITransformations = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    try {
      setIsProcessingAI(true);
      const transformations = await AIService.getTransformations(content, 'auto');
      setAiTransformations(transformations);
    } catch (err) {
      console.error('Failed to get AI transformations:', err);
      // Don't set error state for AI failures, just log them
    } finally {
      setIsProcessingAI(false);
    }
  }, []);

  /**
   * Process content with custom AI prompt
   */
  const processWithCustomPrompt = useCallback(async () => {
    if (!currentContent.trim() || !customPrompt.trim()) return;
    
    try {
      setIsProcessingAI(true);
      const transformations = await AIService.processWithAI(currentContent, customPrompt);
      setAiTransformations(transformations);
      setCustomPrompt(''); // Clear prompt after processing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI processing failed');
    } finally {
      setIsProcessingAI(false);
    }
  }, [currentContent, customPrompt]);

  /**
   * Copy content to clipboard
   */
  const copyToClipboard = useCallback(async (content: string) => {
    try {
      await ClipboardService.setContent(content);
      // Show success feedback instead of closing panel
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 2000); // Clear after 2 seconds
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy to clipboard');
    }
  }, []);

  /**
   * Delete clipboard item
   */
  const deleteClipboardItem = useCallback(async (itemId: string) => {
    try {
      await ClipboardService.deleteItem(itemId);
      await loadClipboardHistory(); // Refresh history
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  }, [loadClipboardHistory]);

  // Keyboard shortcuts
  useHotkeys('escape', onClose, { enabled: isVisible });
  useHotkeys('cmd+f', () => setActiveTab('history'), { enabled: isVisible });
  useHotkeys('cmd+comma', onOpenSettings, { enabled: isVisible });
  useHotkeys('enter', () => {
    if (customPrompt.trim()) {
      processWithCustomPrompt();
    }
  }, { enabled: isVisible && customPrompt.trim().length > 0 });

  // Load data when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      loadCurrentContent();
      loadClipboardHistory();
    }
  }, [isVisible, loadCurrentContent, loadClipboardHistory]);

  // Set up clipboard monitoring when panel is visible
  useEffect(() => {
    if (!isVisible) return;

    // Check clipboard every 1 second when panel is visible
    const interval = setInterval(() => {
      monitorClipboardContent();
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, monitorClipboardContent]);

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="panel-container w-full h-full max-w-md max-h-screen flex flex-col animate-scale-in">
          {/* Header */}
          <div className="drag-region flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 no-drag-region">
              Wurdump
            </h1>
            
            <div className="flex items-center gap-2 no-drag-region">
              <AIStatusIndicator compact />
              
              {/* Debug Test Button */}
              <button
                onClick={async () => {
                  try {
                    console.log('Testing clipboard...');
                    const content = await ClipboardService.getCurrentContent();
                    alert(`Clipboard: "${content}"`);
                    console.log('Clipboard content:', content);
                  } catch (error) {
                    console.error('Clipboard test error:', error);
                    alert(`Error: ${error}`);
                  }
                }}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                title="Test Clipboard"
              >
                Test
              </button>
              
              {/* Debug AI Status Button */}
              <button
                onClick={async () => {
                  try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    console.log('Testing AI status...');
                    const status = await invoke('check_ai_status');
                    alert(`AI Status: ${JSON.stringify(status, null, 2)}`);
                    console.log('AI status:', status);
                  } catch (error) {
                    console.error('AI status test error:', error);
                    alert(`AI Error: ${error}`);
                  }
                }}
                className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                title="Test AI Status"
              >
                AI
              </button>
              
              <button
                onClick={onOpenSettings}
                className="btn-ghost p-2"
                title="Settings (Cmd+,)"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button
                onClick={onClose}
                className="btn-ghost p-2"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'current'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Current
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              History
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            
            {copySuccess && (
              <div className="mx-4 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">{copySuccess}</p>
              </div>
            )}

            {activeTab === 'current' ? (
              <div className="p-4 h-full flex flex-col">
                {/* Current Clipboard Content */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Clipboard
                  </h3>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : currentContent ? (
                    <div className="space-y-3">
                      <ClipboardItemComponent
                        content={currentContent}
                        preview={currentContent.substring(0, 200)}
                        contentType="auto"
                        timestamp={new Date()}
                        onCopy={() => copyToClipboard(currentContent)}
                        showCopyButton={false} // Already in clipboard
                      />
                      
                      {/* Get AI Suggestions Button */}
                      {aiTransformations.length === 0 && currentContent.trim() && (
                        <button
                          onClick={() => getAITransformations(currentContent)}
                          disabled={isProcessingAI}
                          className="w-full btn-secondary text-sm py-2"
                        >
                          {isProcessingAI ? (
                            <div className="flex items-center justify-center gap-2">
                              <LoadingSpinner size="sm" />
                              Getting AI suggestions...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Get AI Suggestions
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                      No clipboard content
                    </p>
                  )}
                </div>

                {/* Custom AI Prompt */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI Assistant
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Ask AI to transform the content..."
                      className="input-field flex-1 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customPrompt.trim()) {
                          processWithCustomPrompt();
                        }
                      }}
                    />
                    
                    <button
                      onClick={processWithCustomPrompt}
                      disabled={!currentContent.trim() || !customPrompt.trim() || isProcessingAI}
                      className="btn-primary px-3"
                      title="Process with AI"
                    >
                      {isProcessingAI ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Transformations */}
                {aiTransformations.length > 0 && (
                  <div className="flex-1 overflow-y-auto scrollbar-thin max-h-64">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      AI Suggestions
                    </h3>
                    
                    <AITransformationList
                      transformations={aiTransformations}
                      onCopy={copyToClipboard}
                      className="h-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 h-full flex flex-col">
                {/* Search */}
                <div className="mb-4">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search clipboard history..."
                  />
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : clipboardHistory.length > 0 ? (
                    <div className="space-y-2">
                      {clipboardHistory
                        .filter(item => 
                          !searchQuery || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.preview.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((item) => (
                          <div key={item.id} className="group relative">
                            <ClipboardItemComponent
                              content={item.content}
                              preview={item.preview}
                              contentType={item.contentType}
                              timestamp={new Date(item.timestamp)}
                              onCopy={() => copyToClipboard(item.content)}
                              showCopyButton={true}
                            />
                            
                            <button
                              onClick={() => deleteClipboardItem(item.id)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs"
                              title="Delete item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                      {searchQuery ? 'No matching items found' : 'No clipboard history'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

/**
 * Main clipboard panel component for Wurdump
 * Displays current clipboard content, AI transformations, and history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Sparkles, Trash2, Plus } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ClipboardService, AIService, PanelService } from '../services/tauri-commands';
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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Context management for AI prompts
  const [contextItems, setContextItems] = useState<ClipboardItem[]>([]);

  /**
   * Load current clipboard content
   */
  const loadCurrentContent = useCallback(async () => {
    try {
      console.log('loadCurrentContent: Starting...');
      setIsLoading(true);
      setError(null);
      const content = await ClipboardService.getCurrentContent();
      console.log('loadCurrentContent: Got content:', content);
      setCurrentContent(content);
    } catch (err) {
      console.error('loadCurrentContent: Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clipboard content');
    } finally {
      setIsLoading(false);
      console.log('loadCurrentContent: Finished');
    }
  }, []);

  /**
   * Monitor clipboard content changes
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
   * Process content with custom AI prompt and context items
   */
  const processWithCustomPrompt = useCallback(async () => {
    if (!currentContent.trim() || !customPrompt.trim()) return;
    
    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      setIsProcessingAI(true);
      
      // Prepare context items for AI processing
      const contextStrings = contextItems.map(item => item.content);
      
      const transformations = await AIService.processWithAI(
        currentContent, 
        customPrompt,
        contextStrings.length > 0 ? contextStrings : undefined
      );
      
      // Check if request was cancelled
      if (controller.signal.aborted) {
        console.log('AI request was cancelled');
        return;
      }
      
      setAiTransformations(transformations);
      setCustomPrompt(''); // Clear prompt after processing
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('AI request cancelled by user');
        // Don't show error for user-cancelled requests
        return;
      }
      setError(err instanceof Error ? err.message : 'AI processing failed');
    } finally {
      setIsProcessingAI(false);
      setAbortController(null);
    }
  }, [currentContent, customPrompt, contextItems]);

  /**
   * Cancel the current AI request
   */
  const cancelAIRequest = useCallback(async () => {
    try {
      await PanelService.cancelAIRequests();
      setIsProcessingAI(false);
      setAbortController(null);
      console.log('AI request cancelled by user');
    } catch (error) {
      console.error('Failed to cancel AI request:', error);
      // Fallback to frontend-only cancellation
      if (abortController) {
        abortController.abort();
        setAbortController(null);
        setIsProcessingAI(false);
      }
    }
  }, [abortController]);

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

  /**
   * Add clipboard item to context for AI processing
   */
  const addToContext = useCallback((item: ClipboardItem) => {
    // Check if item is already in context
    if (!contextItems.find(contextItem => contextItem.id === item.id)) {
      setContextItems(prev => [...prev, item]);
    }
  }, [contextItems]);

  /**
   * Remove item from context
   */
  const removeFromContext = useCallback((itemId: string) => {
    setContextItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  /**
   * Clear all context items
   */
  const clearAllContext = useCallback(() => {
    setContextItems([]);
  }, []);

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

  // Refresh history when the history tab becomes active
  useEffect(() => {
    if (isVisible && activeTab === 'history') {
      loadClipboardHistory();
    }
  }, [isVisible, activeTab, loadClipboardHistory]);

  // Refresh history when clipboard content changes (indicates new items may have been added)
  useEffect(() => {
    if (isVisible && activeTab === 'history' && currentContent) {
      // Debounce to avoid too frequent refreshes
      const timeoutId = setTimeout(() => {
        loadClipboardHistory();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [currentContent, isVisible, activeTab, loadClipboardHistory]);

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

              <button
                onClick={onOpenSettings}
                className="btn-ghost p-2"
                title="Settings (Cmd+,)"
              >
                <Settings className="w-4 h-4" />
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
                    <ClipboardItemComponent
                      content={currentContent}
                      preview={currentContent.substring(0, 200)}
                      contentType="auto"
                      timestamp={new Date()}
                      onCopy={() => copyToClipboard(currentContent)}
                      showCopyButton={false} // Already in clipboard
                    />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                      No clipboard content
                    </p>
                  )}
                </div>

                {/* Context Items Section */}
                {contextItems.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Added Context ({contextItems.length})
                      </label>
                      <button
                        onClick={clearAllContext}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                      {contextItems.map((item) => (
                        <div
                          key={item.id}
                          className="group relative bg-gray-50 dark:bg-gray-800 p-2 rounded border"
                        >
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-100 pr-6">
                            {item.preview}
                          </div>
                          <button
                            onClick={() => removeFromContext(item.id)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs"
                            title="Remove from context"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom AI Prompt */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI Assistant
                    {contextItems.length > 0 && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        (with {contextItems.length} context item{contextItems.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={isProcessingAI ? "Processing your request..." : "Ask AI to transform the content..."}
                      className="input-field flex-1 text-sm"
                      disabled={isProcessingAI}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customPrompt.trim() && !isProcessingAI) {
                          processWithCustomPrompt();
                        }
                      }}
                    />
                    
                    <div className="relative group">
                      <button
                        onClick={isProcessingAI ? cancelAIRequest : processWithCustomPrompt}
                        disabled={!currentContent.trim() || (!customPrompt.trim() && !isProcessingAI)}
                        className="btn-primary px-3 relative overflow-hidden"
                        title={isProcessingAI ? "Click to cancel" : "Process with AI"}
                      >
                        {isProcessingAI ? (
                          <>
                            {/* Default loading spinner */}
                            <div className="group-hover:opacity-0 transition-opacity duration-200">
                              <LoadingSpinner size="sm" color="text-white" />
                            </div>
                            {/* Cancel icon on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <X className="w-4 h-4 text-white" />
                            </div>
                          </>
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>
                    </div>
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
                            
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => addToContext(item)}
                                disabled={contextItems.some(contextItem => contextItem.id === item.id)}
                                className={`p-1 rounded text-xs ${
                                  contextItems.some(contextItem => contextItem.id === item.id)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                                title={
                                  contextItems.some(contextItem => contextItem.id === item.id)
                                    ? 'Already added to context'
                                    : 'Add to AI context'
                                }
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              
                              <button
                                onClick={() => deleteClipboardItem(item.id)}
                                className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs"
                                title="Delete item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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

/**
 * AI Status Indicator component
 * Shows whether Ollama is running and gpt-oss model is available
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface AIStatus {
  ollama_running: boolean;
  has_gpt_oss: boolean;
  message: string;
}

interface AIStatusIndicatorProps {
  /** Show full status or just an icon */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AI Status Indicator component
 */
export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  compact = false,
  className = '',
}) => {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Check AI status
   */
  const checkStatus = async () => {
    try {
      setIsRefreshing(true);
      const result = await invoke<AIStatus>('check_ai_status');
      setStatus(result);
    } catch (error) {
      console.error('Failed to check AI status:', error);
      setStatus({
        ollama_running: false,
        has_gpt_oss: false,
        message: 'Failed to check AI status',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Check status on mount and every 30 seconds
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
        {!compact && <span className="text-xs text-gray-500">Checking AI status...</span>}
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const isReady = status.ollama_running && status.has_gpt_oss;
  const isPartiallyReady = status.ollama_running && !status.has_gpt_oss;

  // Compact view - just show an icon
  if (compact) {
    const getTooltipText = () => {
      if (isReady) {
        return "AI Ready: Ollama running with gpt-oss model available";
      } else if (isPartiallyReady) {
        return "AI Partially Ready: Ollama running but gpt-oss model not found";
      } else {
        return "AI Not Available: Ollama not running";
      }
    };

    return (
      <div className={`flex items-center ${className}`}>
        {isReady ? (
          <span title={getTooltipText()}>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </span>
        ) : isPartiallyReady ? (
          <span title={getTooltipText()}>
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          </span>
        ) : (
          <span title={getTooltipText()}>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </span>
        )}
      </div>
    );
  }

  // Full status view
  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            AI Status
          </h3>
        </div>
        
        <button
          onClick={checkStatus}
          disabled={isRefreshing}
          className="btn-ghost p-1"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        {/* Ollama Status */}
        <div className="flex items-center gap-2">
          {status.ollama_running ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Ollama: {status.ollama_running ? 'Running' : 'Not Running'}
          </span>
        </div>

        {/* Model Status */}
        <div className="flex items-center gap-2">
          {status.has_gpt_oss ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            gpt-oss model: {status.has_gpt_oss ? 'Available' : 'Not Found'}
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {status.message}
        </p>
      </div>

      {/* Setup Instructions */}
      {!isReady && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Setup Instructions:
          </h4>
          
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {!status.ollama_running && (
              <div className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  1.
                </span>
                <div>
                  <p>Install Ollama from <a 
                    href="https://ollama.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    ollama.ai <ExternalLink className="w-3 h-3" />
                  </a></p>
                  <p className="mt-1">Then run: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ollama serve</code></p>
                </div>
              </div>
            )}
            
            {status.ollama_running && !status.has_gpt_oss && (
              <div className="flex items-start gap-2">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  2.
                </span>
                <div>
                  <p>Download the gpt-oss model:</p>
                  <p className="mt-1">
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      ollama pull gpt-oss:20b
                    </code>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Individual clipboard item component
 * Displays clipboard content with type detection and actions
 */

import React, { useState } from 'react';
import { Copy, Code, Link, Mail, FileText, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
// import type { ContentType } from '../types/clipboard';

interface ClipboardItemProps {
  /** The full content of the clipboard item */
  content: string;
  /** Preview text (truncated version) */
  preview: string;
  /** Detected content type */
  contentType: string;
  /** Timestamp when item was captured */
  timestamp: Date;
  /** Whether to show the copy button */
  showCopyButton?: boolean;
  /** Callback when item is copied */
  onCopy?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get icon for content type
 */
const getContentTypeIcon = (contentType: string) => {
  switch (contentType) {
    case 'code':
      return <Code className="w-4 h-4 text-blue-500" />;
    case 'url':
      return <Link className="w-4 h-4 text-green-500" />;
    case 'email':
      return <Mail className="w-4 h-4 text-purple-500" />;
    case 'json':
      return <Hash className="w-4 h-4 text-orange-500" />;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
};

/**
 * Get content type display name
 */
const getContentTypeLabel = (contentType: string): string => {
  switch (contentType) {
    case 'code':
      return 'Code';
    case 'url':
      return 'URL';
    case 'email':
      return 'Email';
    case 'json':
      return 'JSON';
    case 'markdown':
      return 'Markdown';
    case 'html':
      return 'HTML';
    case 'csv':
      return 'CSV';
    default:
      return 'Text';
  }
};

/**
 * Format content for display based on type
 */
const formatContent = (content: string, contentType: string): string => {
  const maxLength = 150;
  
  if (content.length <= maxLength) {
    return content;
  }
  
  // For code, try to break at line boundaries
  if (contentType === 'code') {
    const lines = content.split('\n');
    let result = '';
    
    for (const line of lines) {
      if (result.length + line.length + 1 > maxLength) {
        break;
      }
      result += (result ? '\n' : '') + line;
    }
    
    return result + (result.length < content.length ? '\n...' : '');
  }
  
  // For other types, break at word boundaries
  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

/**
 * Clipboard item component
 */
export const ClipboardItemComponent: React.FC<ClipboardItemProps> = ({
  content,
  preview: _preview,
  contentType,
  timestamp,
  showCopyButton = true,
  onCopy,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formattedContent = formatContent(content, contentType);
  const isCode = contentType === 'code';
  const relativeTime = formatDistanceToNow(timestamp, { addSuffix: true });
  const isTruncated = content.length > 150;

  return (
    <div className={clsx('clipboard-item group', className)}>
      {/* Header with type and timestamp */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getContentTypeIcon(contentType)}
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {getContentTypeLabel(contentType)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {relativeTime}
          </span>
          
          {showCopyButton && onCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost p-1"
              title="Copy to clipboard"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={clsx(
        'text-sm text-gray-900 dark:text-gray-100',
        isCode && 'code-block'
      )}>
        {isCode ? (
          <pre className="whitespace-pre-wrap break-words text-xs">
            {isExpanded ? content : formattedContent}
          </pre>
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {isExpanded ? content : formattedContent}
          </p>
        )}
      </div>

      {/* Expand/Collapse button and character count */}
      {isTruncated && (
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {content.length.toLocaleString()} characters
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show more
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Show character count for non-truncated content */}
      {!isTruncated && content.length > 50 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          {content.length.toLocaleString()} characters
        </div>
      )}
    </div>
  );
};

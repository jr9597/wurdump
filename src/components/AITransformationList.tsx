/**
 * AI transformation list component
 * Displays available AI transformations with copy functionality
 */

import React from 'react';
import { Copy, Sparkles, ArrowRight, Code, FileText, Languages } from 'lucide-react';
import clsx from 'clsx';
import type { AITransformation } from '../types/clipboard';

interface AITransformationListProps {
  /** List of AI transformations to display */
  transformations: AITransformation[];
  /** Callback when a transformation is copied */
  onCopy: (content: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get icon for transformation type
 */
const getTransformationIcon = (type: string) => {
  switch (type) {
    case 'language_conversion':
      return <Code className="w-4 h-4 text-blue-500" />;
    case 'format_conversion':
      return <FileText className="w-4 h-4 text-green-500" />;
    case 'translation':
      return <Languages className="w-4 h-4 text-purple-500" />;
    case 'summarization':
      return <FileText className="w-4 h-4 text-orange-500" />;
    case 'explanation':
      return <FileText className="w-4 h-4 text-indigo-500" />;
    case 'cleanup':
      return <Sparkles className="w-4 h-4 text-pink-500" />;
    case 'enhancement':
      return <ArrowRight className="w-4 h-4 text-emerald-500" />;
    default:
      return <Sparkles className="w-4 h-4 text-gray-500" />;
  }
};

/**
 * Get confidence color classes
 */
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Format confidence as percentage
 */
const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

/**
 * AI transformation item component
 */
const AITransformationItem: React.FC<{
  transformation: AITransformation;
  onCopy: (content: string) => void;
}> = ({ transformation, onCopy }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const confidenceColor = getConfidenceColor(transformation.confidence);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {getTransformationIcon(transformation.transformation_type)}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {transformation.title}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {transformation.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          <span className={clsx('text-xs font-medium', confidenceColor)}>
            {formatConfidence(transformation.confidence)}
          </span>
          
          <button
            onClick={() => onCopy(transformation.result)}
            className="btn-ghost p-1.5"
            title="Copy transformation"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="mt-2">
        <div
          className={clsx(
            'text-sm text-gray-800 dark:text-gray-200 cursor-pointer',
            !isExpanded && 'text-truncate-3'
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {transformation.transformation_type === 'language_conversion' || 
           transformation.transformation_type === 'format_conversion' ? (
            <pre className="whitespace-pre-wrap break-words text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto">
              {isExpanded 
                ? transformation.result 
                : transformation.result.substring(0, 200) + (transformation.result.length > 200 ? '...' : '')
              }
            </pre>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {isExpanded 
                ? transformation.result 
                : transformation.result.substring(0, 200) + (transformation.result.length > 200 ? '...' : '')
              }
            </p>
          )}
        </div>
        
        {transformation.result.length > 200 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * AI transformation list component
 */
export const AITransformationList: React.FC<AITransformationListProps> = ({
  transformations,
  onCopy,
  className,
}) => {
  if (transformations.length === 0) {
    return (
      <div className={clsx('flex items-center justify-center py-8', className)}>
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No AI transformations available
          </p>
        </div>
      </div>
    );
  }

  // Sort transformations by confidence (highest first)
  const sortedTransformations = [...transformations].sort((a, b) => 
    b.confidence - a.confidence
  );

  return (
    <div className={clsx('space-y-3 overflow-y-auto scrollbar-thin', className)}>
      {sortedTransformations.map((transformation) => (
        <AITransformationItem
          key={transformation.id}
          transformation={transformation}
          onCopy={onCopy}
        />
      ))}
    </div>
  );
};

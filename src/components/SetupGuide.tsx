/**
 * Setup Guide component for first-time users
 * Provides step-by-step instructions for setting up Ollama and gpt-oss
 */

import React from 'react';
import { ExternalLink, Download, Terminal, Sparkles, CheckCircle } from 'lucide-react';

interface SetupGuideProps {
  /** Whether to show the guide */
  isOpen: boolean;
  /** Callback when guide should be closed */
  onClose: () => void;
}

/**
 * Setup guide component
 */
export const SetupGuide: React.FC<SetupGuideProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: 'Install Ollama',
      description: 'Download and install Ollama on your system',
      icon: <Download className="w-5 h-5 text-blue-500" />,
      action: (
        <a
          href="https://ollama.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          Download Ollama <ExternalLink className="w-4 h-4" />
        </a>
      ),
    },
    {
      id: 2,
      title: 'Start Ollama Server',
      description: 'Open Terminal and start the Ollama service',
      icon: <Terminal className="w-5 h-5 text-green-500" />,
      command: 'ollama serve',
    },
    {
      id: 3,
      title: 'Download gpt-oss Model',
      description: 'Pull the gpt-oss-20b model (this may take a few minutes)',
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      command: 'ollama pull gpt-oss:20b',
    },
    {
      id: 4,
      title: 'Ready to Use!',
      description: 'Wurdump will now provide AI-powered clipboard transformations',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-2xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Welcome to Wurdump!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Let's set up AI-powered clipboard transformations
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="btn-ghost text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4">
              {/* Step number and icon */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                  {step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-px h-12 bg-gray-200 dark:bg-gray-700 mt-2" />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center gap-2 mb-2">
                  {step.icon}
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {step.description}
                </p>

                {/* Command to copy */}
                {step.command && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 mb-3">
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                      {step.command}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(step.command);
                      }}
                      className="ml-3 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Copy command"
                    >
                      Copy
                    </button>
                  </div>
                )}

                {/* Action button */}
                {step.action && (
                  <div>
                    {step.action}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">
                ℹ️
              </div>
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Why local AI?
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Wurdump uses local AI processing to keep your clipboard data private and secure. 
                  No data is sent to external servers - everything runs on your machine.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

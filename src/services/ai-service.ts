/**
 * AI service for Wurdump using Ollama + gpt-oss
 * Integrates with local Ollama instance running gpt-oss-20b
 */

import type { AITransformation, TransformationType } from '../types/clipboard';

/**
 * Configuration for the AI service
 */
export interface AIServiceConfig {
  /** Ollama base URL */
  baseUrl: string;
  /** Model name (e.g., 'gpt-oss:20b') */
  modelName: string;
  /** Timeout for requests in milliseconds */
  timeout: number;
  /** Temperature for generation */
  temperature: number;
  /** Maximum tokens to generate */
  maxTokens: number;
}

/**
 * Default configuration for Ollama
 */
export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  baseUrl: 'http://localhost:11434/v1',
  modelName: 'gpt-oss:20b',
  timeout: 30000,
  temperature: 0.7,
  maxTokens: 1000,
};

/**
 * OpenAI-compatible chat completion request
 */
interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Chat message structure
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI-compatible chat completion response
 */
interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI service for processing clipboard content with gpt-oss via Ollama
 */
export class AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig = DEFAULT_AI_CONFIG) {
    this.config = config;
  }

  /**
   * Check if Ollama is running and has the model available
   */
  async checkOllamaStatus(): Promise<{ available: boolean; model: boolean; error?: string }> {
    try {
      // Check if Ollama is running
      const response = await fetch(`${this.config.baseUrl.replace('/v1', '')}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        return { 
          available: false, 
          model: false, 
          error: 'Ollama server not responding' 
        };
      }

      const data = await response.json();
      const models = data.models || [];
      const hasModel = models.some((model: any) => 
        model.name === this.config.modelName || 
        model.name.includes('gpt-oss')
      );

      return { 
        available: true, 
        model: hasModel,
        error: hasModel ? undefined : `Model ${this.config.modelName} not found. Run: ollama pull ${this.config.modelName}`
      };
    } catch (error) {
      return { 
        available: false, 
        model: false, 
        error: error instanceof Error ? error.message : 'Unknown error checking Ollama status' 
      };
    }
  }

  /**
   * Generate AI transformations for clipboard content
   */
  async generateTransformations(
    content: string, 
    contentType: string = 'text'
  ): Promise<AITransformation[]> {
    const status = await this.checkOllamaStatus();
    if (!status.available || !status.model) {
      throw new Error(status.error || 'Ollama not available');
    }

    const transformations: AITransformation[] = [];

    // Generate different types of transformations based on content type
    const transformationPrompts = this.getTransformationPrompts(content, contentType);

    for (const prompt of transformationPrompts) {
      try {
        const result = await this.callOllama(prompt.systemPrompt, prompt.userPrompt);
        
        transformations.push({
          id: `${prompt.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: prompt.title,
          description: prompt.description,
          result: result.trim(),
          confidence: this.calculateConfidence(content, result, prompt.type),
          isApplied: false,
          transformationType: prompt.type,
        });
      } catch (error) {
        console.warn(`Failed to generate ${prompt.type} transformation:`, error);
        // Continue with other transformations
      }
    }

    return transformations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Process content with a custom user prompt
   */
  async processWithCustomPrompt(
    content: string, 
    customPrompt: string
  ): Promise<AITransformation[]> {
    const status = await this.checkOllamaStatus();
    if (!status.available || !status.model) {
      throw new Error(status.error || 'Ollama not available');
    }

    try {
      const systemPrompt = `You are an AI assistant that helps transform clipboard content. 
The user has copied some content and wants you to process it according to their instructions.
Be helpful, accurate, and preserve important information while following their request.`;

      const userPrompt = `Here is the clipboard content:
\`\`\`
${content}
\`\`\`

User's request: ${customPrompt}

Please process the content according to the user's request:`;

      const result = await this.callOllama(systemPrompt, userPrompt);

      return [{
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Custom Transformation',
        description: customPrompt,
        result: result.trim(),
        confidence: 0.8, // Default confidence for custom prompts
        isApplied: false,
        transformationType: 'enhancement',
      }];
    } catch (error) {
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make a request to Ollama using OpenAI-compatible API
   */
  private async callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
    const requestBody: ChatCompletionRequest = {
      model: this.config.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: false,
    };

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ollama', // Dummy key as mentioned in the guide
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from Ollama API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Get transformation prompts based on content type
   */
  private getTransformationPrompts(content: string, contentType: string) {
    const prompts = [];

    // Code transformations
    if (contentType === 'code' || this.looksLikeCode(content)) {
      prompts.push({
        type: 'language_conversion' as TransformationType,
        title: 'Convert to TypeScript',
        description: 'Convert code to TypeScript with proper types',
        systemPrompt: 'You are a code conversion expert. Convert code to TypeScript while preserving functionality and adding proper type annotations.',
        userPrompt: `Convert this code to TypeScript:\n\`\`\`\n${content}\n\`\`\``,
      });

      prompts.push({
        type: 'cleanup' as TransformationType,
        title: 'Clean & Format Code',
        description: 'Clean up and format the code with best practices',
        systemPrompt: 'You are a code formatter and cleaner. Improve code quality, formatting, and readability while preserving functionality.',
        userPrompt: `Clean and format this code:\n\`\`\`\n${content}\n\`\`\``,
      });
    }

    // Text transformations
    if (contentType === 'text' || contentType === 'email') {
      prompts.push({
        type: 'enhancement' as TransformationType,
        title: 'Professional Tone',
        description: 'Rewrite in a professional, business-appropriate tone',
        systemPrompt: 'You are a professional writing assistant. Rewrite text to be more professional and business-appropriate while preserving the core message.',
        userPrompt: `Make this text more professional:\n\n${content}`,
      });

      prompts.push({
        type: 'summarization' as TransformationType,
        title: 'Summarize',
        description: 'Create a concise summary of the content',
        systemPrompt: 'You are a summarization expert. Create clear, concise summaries that capture the key points.',
        userPrompt: `Summarize this text:\n\n${content}`,
      });
    }

    // JSON/Data transformations
    if (contentType === 'json' || this.looksLikeJson(content)) {
      prompts.push({
        type: 'format_conversion' as TransformationType,
        title: 'Convert to CSV',
        description: 'Convert JSON data to CSV format',
        systemPrompt: 'You are a data conversion expert. Convert data between formats while preserving all information.',
        userPrompt: `Convert this JSON to CSV format:\n\`\`\`json\n${content}\n\`\`\``,
      });
    }

    // General transformations for any content
    prompts.push({
      type: 'explanation' as TransformationType,
      title: 'Explain Content',
      description: 'Provide a clear explanation of what this content does or means',
      systemPrompt: 'You are an expert explainer. Break down complex content into easy-to-understand explanations.',
      userPrompt: `Explain what this content does or means:\n\n${content}`,
    });

    return prompts;
  }

  /**
   * Calculate confidence score for a transformation
   */
  private calculateConfidence(original: string, transformed: string, type: TransformationType): number {
    // Basic confidence calculation based on various factors
    let confidence = 0.7; // Base confidence

    // Length similarity (transformations shouldn't be too short or too long)
    const lengthRatio = transformed.length / original.length;
    if (lengthRatio > 0.3 && lengthRatio < 3) {
      confidence += 0.1;
    }

    // Content preservation (check if key words are preserved)
    const originalWords = original.toLowerCase().split(/\W+/);
    const transformedWords = transformed.toLowerCase().split(/\W+/);
    const preservedWords = originalWords.filter(word => 
      word.length > 3 && transformedWords.includes(word)
    );
    
    if (preservedWords.length / originalWords.length > 0.3) {
      confidence += 0.1;
    }

    // Type-specific adjustments
    switch (type) {
      case 'language_conversion':
        if (transformed.includes('interface') || transformed.includes('type ')) {
          confidence += 0.1;
        }
        break;
      case 'format_conversion':
        if (type === 'format_conversion' && transformed.includes(',')) {
          confidence += 0.1;
        }
        break;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if content looks like code
   */
  private looksLikeCode(content: string): boolean {
    const codeIndicators = [
      'function', 'def ', 'class ', 'import ', 'const ', 'let ', 'var ',
      '=>', '{', '}', '()', 'if (', 'for (', 'while (', '//', '/*', '*/',
      'public ', 'private ', 'protected ', 'static ', 'async ', 'await '
    ];

    return codeIndicators.some(indicator => content.includes(indicator));
  }

  /**
   * Check if content looks like JSON
   */
  private looksLikeJson(content: string): boolean {
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Global AI service instance
 */
export const aiService = new AIService();

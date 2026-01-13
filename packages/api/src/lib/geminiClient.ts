// packages/api/src/lib/geminiClient.ts
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from './logger';

/**
 * Gemini AI Client for ROPI AI Describe Feature
 * 
 * Provides server-side integration with Google's Gemini AI models
 * for product description generation with proper error handling,
 * rate limiting, and token tracking.
 */

interface ModelSettings {
  model: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

interface GeminiCallOptions {
  prompt: string;
  modelSettings: ModelSettings;
  metadata?: {
    mpn?: string;
    site?: string;
    templateKey?: string;
    userId?: string;
  };
}

interface GeminiResponse {
  text: string;
  promptTokens?: number;
  outputTokens?: number;
  elapsedMs: number;
  finishReason?: string;
  safetyRatings?: any[];
}

/**
 * Custom error class for Gemini API issues
 */
export class GeminiError extends Error {
  public code: string;
  public retryAfter?: number;
  
  constructor(message: string, code: string, retryAfter?: number) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/**
 * Get Gemini API key from environment or Secret Manager
 */
async function getGeminiApiKey(): Promise<string> {
  // First try environment variable (local development)
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Try Secret Manager (production)
  try {
    const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();
    
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'ropi-bccee';
    const secretName = `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`;
    
    const [version] = await client.accessSecretVersion({
      name: secretName,
    });
    
    const secretValue = version.payload?.data?.toString();
    if (!secretValue) {
      throw new Error('Secret value is empty');
    }
    
    return secretValue;
  } catch (error) {
    logger.error('Failed to retrieve Gemini API key from Secret Manager', { error });
    throw new GeminiError(
      'Gemini API key not available - check environment variables or Secret Manager', 
      'AI_DESCRIBE_KEY_MISSING'
    );
  }
}

/**
 * Initialize Gemini client with API key
 */
async function initGeminiClient(): Promise<GoogleGenerativeAI> {
  const apiKey = await getGeminiApiKey();
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Call Gemini API with proper error handling and retry logic
 * 
 * @param options Call options including prompt, model settings, and metadata
 * @returns Gemini response with text and token counts
 */
export async function callGemini(options: GeminiCallOptions): Promise<GeminiResponse> {
  const startTime = Date.now();
  const { prompt, modelSettings, metadata = {} } = options;
  
  try {
    // Initialize client
    const genAI = await initGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: modelSettings.model,
      generationConfig: {
        maxOutputTokens: modelSettings.maxOutputTokens || 1024,
        temperature: modelSettings.temperature || 0.7,
        topP: modelSettings.topP || 0.9,
        topK: modelSettings.topK || 40,
      },
    });

    logger.info('Calling Gemini API', {
      model: modelSettings.model,
      promptLength: prompt.length,
      maxOutputTokens: modelSettings.maxOutputTokens,
      temperature: modelSettings.temperature,
      metadata
    });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Extract response text
    const text = response.text();
    if (!text || text.trim().length === 0) {
      throw new GeminiError(
        'Gemini returned empty response',
        'EMPTY_RESPONSE'
      );
    }

    // Extract usage metadata if available
    const usageMetadata = response.usageMetadata;
    const elapsedMs = Date.now() - startTime;

    const geminiResponse: GeminiResponse = {
      text: text.trim(),
      promptTokens: usageMetadata?.promptTokenCount,
      outputTokens: usageMetadata?.candidatesTokenCount,
      elapsedMs,
      finishReason: response.candidates?.[0]?.finishReason,
      safetyRatings: response.candidates?.[0]?.safetyRatings
    };

    logger.info('Gemini API call successful', {
      model: modelSettings.model,
      elapsedMs,
      promptTokens: geminiResponse.promptTokens,
      outputTokens: geminiResponse.outputTokens,
      finishReason: geminiResponse.finishReason,
      textLength: text.length,
      metadata
    });

    return geminiResponse;

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    
    logger.error('Gemini API call failed', {
      error: error.message,
      stack: error.stack,
      model: modelSettings.model,
      elapsedMs,
      metadata
    });

    // Handle specific error types
    if (error.code === 'AI_DESCRIBE_KEY_MISSING') {
      throw error; // Re-throw key missing errors
    }

    // Handle rate limiting
    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      throw new GeminiError(
        'Gemini API rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        60 // Retry after 60 seconds
      );
    }

    // Handle safety filter blocks
    if (error.message?.includes('safety') || error.message?.includes('blocked')) {
      throw new GeminiError(
        'Content blocked by safety filters',
        'CONTENT_BLOCKED'
      );
    }

    // Handle network/timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('network')) {
      throw new GeminiError(
        'Network error calling Gemini API',
        'NETWORK_ERROR'
      );
    }

    // Generic error
    throw new GeminiError(
      `Gemini API error: ${error.message}`,
      'API_ERROR'
    );
  }
}

/**
 * Test Gemini API connectivity and authentication
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const response = await callGemini({
      prompt: 'Say "Hello" if you can read this.',
      modelSettings: {
        model: 'gemini-1.5-flash',
        maxOutputTokens: 10,
        temperature: 0
      },
      metadata: {
        mpn: 'TEST',
        site: 'test',
        templateKey: 'connection-test'
      }
    });

    return response.text.toLowerCase().includes('hello');
  } catch (error) {
    logger.error('Gemini connection test failed', { error });
    return false;
  }
}

export default callGemini;
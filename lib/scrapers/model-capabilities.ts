/**
 * Static model capabilities mapping
 * Source: https://vercel.com/ai-gateway/models
 *
 * This file contains capability information for models that isn't available
 * through the Gateway API. Update this mapping when new models are added
 * or capabilities change.
 *
 * Pricing is per-use (e.g., per image, per search), NOT per token.
 *
 * To update:
 * 1. Visit https://vercel.com/ai-gateway/models
 * 2. Find models with Image Gen or Web Search pricing
 * 3. Update the mapping below
 *
 * Migration: When the Gateway API includes capability data, this file can be
 * replaced with API-based extraction.
 */

export interface ModelCapabilities {
  pricingImageGen: number | null; // Price per image generation
  pricingWebSearch: number | null; // Price per web search
}

/**
 * Model capabilities mapping
 * Key: model ID (e.g., "openai/gpt-5-chat")
 * Value: capability pricing (null = not supported)
 *
 * Last updated: 2026-01-05
 * Source: https://vercel.com/ai-gateway/models
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // OpenAI models with image generation and web search
  "openai/gpt-5": {
    pricingImageGen: 0.02,
    pricingWebSearch: 0.025,
  },
  "openai/gpt-5-chat": {
    pricingImageGen: 0.02,
    pricingWebSearch: 0.025,
  },
  "openai/gpt-5-mini": {
    pricingImageGen: 0.02,
    pricingWebSearch: 0.025,
  },
  "openai/gpt-5.2": {
    pricingImageGen: 0.02,
    pricingWebSearch: 0.025,
  },
  "openai/gpt-4o": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },
  "openai/gpt-4o-mini": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },

  // Google models with image generation
  "google/gemini-2.5-flash": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },
  "google/gemini-2.5-flash-lite": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },
  "google/gemini-2.5-pro": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },
  "google/gemini-3-flash": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },
  "google/gemini-3-pro-preview": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },
  "google/gemini-3-pro-image": {
    pricingImageGen: 0.02,
    pricingWebSearch: null,
  },

  // xAI models with web search
  "xai/grok-3": {
    pricingImageGen: null,
    pricingWebSearch: 0.05,
  },
  "xai/grok-3-fast": {
    pricingImageGen: null,
    pricingWebSearch: 0.05,
  },
  "xai/grok-3-mini": {
    pricingImageGen: null,
    pricingWebSearch: 0.05,
  },
  "xai/grok-4": {
    pricingImageGen: null,
    pricingWebSearch: 0.05,
  },

  // Perplexity models (inherently have web search)
  "perplexity/sonar": {
    pricingImageGen: null,
    pricingWebSearch: 0.005,
  },
  "perplexity/sonar-pro": {
    pricingImageGen: null,
    pricingWebSearch: 0.005,
  },
  "perplexity/sonar-reasoning": {
    pricingImageGen: null,
    pricingWebSearch: 0.005,
  },
  "perplexity/sonar-reasoning-pro": {
    pricingImageGen: null,
    pricingWebSearch: 0.005,
  },
};

/**
 * Get capabilities for a model
 * Returns null values if model is not in the mapping (no special capabilities)
 */
export function getModelCapabilities(modelId: string): ModelCapabilities {
  return (
    MODEL_CAPABILITIES[modelId] ?? {
      pricingImageGen: null,
      pricingWebSearch: null,
    }
  );
}

/**
 * Get all models with a specific capability
 */
export function getModelsWithCapability(
  capability: "imageGen" | "webSearch"
): string[] {
  return Object.entries(MODEL_CAPABILITIES)
    .filter(([, caps]) =>
      capability === "imageGen"
        ? caps.pricingImageGen !== null
        : caps.pricingWebSearch !== null
    )
    .map(([id]) => id);
}


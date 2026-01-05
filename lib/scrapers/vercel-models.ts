import "server-only";

export interface ScrapedModelCapabilities {
  id: string;
  pricingImageGen: number | null;
  pricingWebSearch: number | null;
}

export interface ScrapeResult {
  models: ScrapedModelCapabilities[];
  errors: string[];
  timestamp: Date;
}

/**
 * Extracts capability pricing from Vercel AI Gateway models page.
 * This is a temporary solution until the Gateway API includes capability data.
 *
 * @returns Parsed model capabilities with pricing information
 */
export async function scrapeVercelModelsPage(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const models: ScrapedModelCapabilities[] = [];

  try {
    // Fetch the models page
    const response = await fetch("https://vercel.com/ai-gateway/models", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch models page: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Try to extract JSON data if the page uses Next.js data fetching
    const jsonMatch = html.match(
      /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
    );
    if (jsonMatch) {
      try {
        const nextData = JSON.parse(jsonMatch[1]);
        const extracted = extractFromNextData(nextData);
        if (extracted.length > 0) {
          return {
            models: extracted,
            errors,
            timestamp: new Date(),
          };
        }
      } catch (parseError) {
        errors.push(`Failed to parse Next.js data: ${parseError}`);
      }
    }

    // Fallback: Parse HTML table structure
    const tableData = extractFromHTML(html);
    models.push(...tableData);

    return {
      models,
      errors,
      timestamp: new Date(),
    };
  } catch (error) {
    errors.push(
      `Scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return {
      models,
      errors,
      timestamp: new Date(),
    };
  }
}

/**
 * Extracts model capabilities from Next.js __NEXT_DATA__ JSON
 */
function extractFromNextData(nextData: unknown): ScrapedModelCapabilities[] {
  const models: ScrapedModelCapabilities[] = [];

  try {
    // Navigate through Next.js data structure
    // This structure may vary, so we'll need to adapt based on actual response
    const props = (nextData as { props?: { pageProps?: unknown } })?.props
      ?.pageProps;

    if (!props) {
      return models;
    }

    // Try to find models array in various possible locations
    const modelsData =
      (props as { models?: unknown[] })?.models ??
      (props as { data?: { models?: unknown[] } })?.data?.models ??
      [];

    for (const model of modelsData) {
      const modelData = model as {
        id?: string;
        imageGen?: string | number | null;
        webSearch?: string | number | null;
        capabilities?: {
          imageGen?: string | number | null;
          webSearch?: string | number | null;
        };
      };

      if (!modelData.id) continue;

      const imageGen = parsePricing(
        modelData.imageGen ??
          modelData.capabilities?.imageGen ??
          null
      );
      const webSearch = parsePricing(
        modelData.webSearch ??
          modelData.capabilities?.webSearch ??
          null
      );

      models.push({
        id: modelData.id,
        pricingImageGen: imageGen,
        pricingWebSearch: webSearch,
      });
    }
  } catch (error) {
    // Silently fail - will fall back to HTML parsing
  }

  return models;
}

/**
 * Extracts model capabilities from HTML table structure
 * Parses the models table on the Vercel AI Gateway page
 */
function extractFromHTML(html: string): ScrapedModelCapabilities[] {
  const models: ScrapedModelCapabilities[] = [];

  // Pattern to match table rows with model data
  // Looking for rows that contain model links like /ai-gateway/models/gpt-5-chat
  const modelRowRegex =
    /<tr[^>]*>[\s\S]*?<a[^>]*href="\/ai-gateway\/models\/([^"]+)"[^>]*>[\s\S]*?<\/tr>/gi;

  let match;
  while ((match = modelRowRegex.exec(html)) !== null) {
    const modelSlug = match[1];
    const rowHtml = match[0];

    // Extract model ID from slug (e.g., "gpt-5-chat" -> "openai/gpt-5-chat")
    // We need to infer the provider from context or use a mapping
    const modelId = inferModelId(modelSlug, rowHtml);

    // Extract capability indicators from the row
    // Look for "Image Gen" and "Web Search" columns
    const hasImageGen = /Image\s+Gen|image[\s-]?gen/i.test(rowHtml) &&
      !/—|none|no/i.test(rowHtml);
    const hasWebSearch =
      /Web\s+Search|web[\s-]?search/i.test(rowHtml) &&
      !/—|none|no/i.test(rowHtml);

    // Try to extract pricing from the row
    // Pricing format: $X.XX or $X.XX/M
    const imageGenPrice = extractPricingFromRow(rowHtml, "Image Gen");
    const webSearchPrice = extractPricingFromRow(rowHtml, "Web Search");

    if (modelId) {
      models.push({
        id: modelId,
        pricingImageGen: hasImageGen ? imageGenPrice : null,
        pricingWebSearch: hasWebSearch ? webSearchPrice : null,
      });
    }
  }

  return models;
}

/**
 * Infers full model ID from slug and HTML context
 */
function inferModelId(slug: string, rowHtml: string): string | null {
  // Common provider patterns
  const providerPatterns = [
    { pattern: /openai|gpt/i, provider: "openai" },
    { pattern: /anthropic|claude/i, provider: "anthropic" },
    { pattern: /google|gemini/i, provider: "google" },
    { pattern: /xai|grok/i, provider: "xai" },
    { pattern: /meta|llama/i, provider: "meta" },
    { pattern: /mistral/i, provider: "mistral" },
    { pattern: /deepseek/i, provider: "deepseek" },
  ];

  // Try to find provider in row HTML
  for (const { pattern, provider } of providerPatterns) {
    if (pattern.test(rowHtml)) {
      // Convert slug to model ID format
      // e.g., "gpt-5-chat" -> "openai/gpt-5-chat"
      const modelName = slug.replace(/-/g, "-");
      return `${provider}/${modelName}`;
    }
  }

  // Fallback: try to match slug directly with known patterns
  if (slug.startsWith("gpt-")) {
    return `openai/${slug}`;
  }
  if (slug.startsWith("claude-")) {
    return `anthropic/${slug}`;
  }
  if (slug.startsWith("gemini-")) {
    return `google/${slug}`;
  }
  if (slug.startsWith("grok-")) {
    return `xai/${slug}`;
  }

  return null;
}

/**
 * Extracts pricing value from a table row for a specific capability
 */
function extractPricingFromRow(
  rowHtml: string,
  capability: string
): number | null {
  // Look for pricing pattern near the capability column
  // Format: $X.XX or $X.XX/M
  const priceRegex = /\$(\d+\.?\d*)\/?M?/i;
  const matches = rowHtml.match(priceRegex);

  if (matches && matches[1]) {
    const price = parseFloat(matches[1]);
    if (!Number.isNaN(price)) {
      // Convert to per-1M format if needed (assuming prices are already per 1M)
      return price;
    }
  }

  return null;
}

/**
 * Parses pricing value from various formats
 */
function parsePricing(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    // Remove currency symbols and parse
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Future: Extract capabilities from Gateway API response
 * This function will be used when the API includes capability data
 */
export async function extractCapabilitiesFromAPI(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _apiResponse: unknown
): Promise<ScrapedModelCapabilities[]> {
  // TODO: Implement when Gateway API includes capability data
  // This will replace the scraping approach
  return [];
}


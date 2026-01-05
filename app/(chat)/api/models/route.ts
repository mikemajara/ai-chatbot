import { createGateway } from "ai";
import { auth } from "@/app/(auth)/auth";
import { getEnabledModels, upsertModels } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import type { Model } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const models = await getEnabledModels();
    return Response.json(models);
  } catch (error) {
    return new ChatSDKError(
      "bad_request:api",
      "Failed to fetch models"
    ).toResponse();
  }
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.MODELS_SYNC_API_KEY;

  if (!expectedApiKey) {
    return new ChatSDKError(
      "bad_request:api",
      "MODELS_SYNC_API_KEY not configured"
    ).toResponse();
  }

  if (apiKey !== expectedApiKey) {
    return new ChatSDKError("unauthorized:api", "Invalid API key").toResponse();
  }

  try {
    console.log("Fetching models from gateway...");

    // Create gateway instance with API key
    const gateway = createGateway({
      apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
    });

    const availableModels = await gateway.getAvailableModels();
    console.log(`Fetched ${availableModels.models.length} models from gateway`);

    // Temporary logging to explore Gateway API response structure
    const targetModel = availableModels.models.find((m) => m.id === "openai/gpt-5-chat");
    if (targetModel) {
      console.log(
        "Full model data for openai/gpt-5-chat:",
        JSON.stringify(targetModel, null, 2)
      );
    }

    // Filter to only language models and transform to our schema
    const languageModels: Model[] = availableModels.models
      .filter((m) => m.modelType === "language")
      .map((m) => {
        // Extract capability pricing from Gateway API response
        // Note: Structure may need adjustment based on actual API response
        // The pricing object may contain additional fields for capabilities
        const pricing = m.pricing as
          | {
              input?: string;
              output?: string;
              imageGen?: string;
              webSearch?: string;
              [key: string]: unknown;
            }
          | null
          | undefined;

        // Parse pricing values (they come as strings from Gateway API)
        const parsePrice = (price: string | undefined | null): number | null => {
          if (!price) return null;
          const parsed = parseFloat(price);
          return Number.isNaN(parsed) ? null : parsed;
        };

        return {
          id: m.id,
          name: m.name,
          provider: m.id.split("/")[0],
          description: m.description ?? null,
          modelType: m.modelType ?? "language",
          contextWindow: null, // Gateway API doesn't provide contextWindow in the response
          pricingInput: parsePrice(pricing?.input),
          pricingOutput: parsePrice(pricing?.output),
          pricingImageGen: parsePrice(pricing?.imageGen),
          pricingWebSearch: parsePrice(pricing?.webSearch),
          isEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

    console.log(`Upserting ${languageModels.length} language models...`);
    await upsertModels(languageModels);
    console.log("Models upserted successfully");

    return Response.json({
      success: true,
      count: languageModels.length,
    });
  } catch (error) {
    console.error("Failed to sync models:", error);
    return new ChatSDKError(
      "bad_request:api",
      `Failed to sync models from gateway: ${error instanceof Error ? error.message : "Unknown error"}`
    ).toResponse();
  }
}


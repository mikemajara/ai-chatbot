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
      "internal_server_error:api",
      "Failed to fetch models"
    ).toResponse();
  }
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.MODELS_SYNC_API_KEY;

  if (!expectedApiKey) {
    return new ChatSDKError(
      "internal_server_error:api",
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

    // Filter to only language models and transform to our schema
    const languageModels: Model[] = availableModels.models
      .filter((m) => m.modelType === "language")
      .map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
        description: m.description ?? null,
        modelType: m.modelType ?? "language",
        contextWindow: m.contextWindow ?? null,
        pricingInput: m.pricing?.input ?? null,
        pricingOutput: m.pricing?.output ?? null,
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

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
      "internal_server_error:api",
      `Failed to sync models from gateway: ${error instanceof Error ? error.message : "Unknown error"}`
    ).toResponse();
  }
}


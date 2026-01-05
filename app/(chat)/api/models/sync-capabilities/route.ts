import { ChatSDKError } from "@/lib/errors";
import {
  bulkUpdateModelCapabilities,
  getEnabledModels,
} from "@/lib/db/queries";
import {
  MODEL_CAPABILITIES,
  getModelCapabilities,
} from "@/lib/scrapers/model-capabilities";

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
    console.log("Starting capability sync from static mapping...");

    // Get existing models from database
    const existingModels = await getEnabledModels();

    // Match models with capability mapping
    const updates: Array<{
      id: string;
      pricingImageGen: number | null;
      pricingWebSearch: number | null;
    }> = [];

    const unchanged: string[] = [];
    const notInMapping: string[] = [];

    for (const existingModel of existingModels) {
      const capabilities = getModelCapabilities(existingModel.id);

      // Check if this model is in our capability mapping
      if (!MODEL_CAPABILITIES[existingModel.id]) {
        notInMapping.push(existingModel.id);
      }

      // Check if capabilities have changed
      const imageGenChanged =
        existingModel.pricingImageGen !== capabilities.pricingImageGen;
      const webSearchChanged =
        existingModel.pricingWebSearch !== capabilities.pricingWebSearch;

      if (imageGenChanged || webSearchChanged) {
        updates.push({
          id: existingModel.id,
          pricingImageGen: capabilities.pricingImageGen,
          pricingWebSearch: capabilities.pricingWebSearch,
        });
      } else {
        unchanged.push(existingModel.id);
      }
    }

    // Apply updates
    let updateResult;
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} models with new capabilities...`);
      updateResult = await bulkUpdateModelCapabilities(updates);
    } else {
      updateResult = {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
      };
    }

    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      source: "static-mapping",
      summary: {
        totalModels: existingModels.length,
        inMapping: Object.keys(MODEL_CAPABILITIES).length,
        updated: updateResult.successful,
        unchanged: unchanged.length,
        notInMapping: notInMapping.length,
        failed: updateResult.failed,
      },
      details: {
        updated: updates.map((u) => ({
          id: u.id,
          pricingImageGen: u.pricingImageGen,
          pricingWebSearch: u.pricingWebSearch,
        })),
        notInMapping: notInMapping.slice(0, 20), // Limit for brevity
        errors: updateResult.errors,
      },
    };

    console.log("Capability sync completed:", report.summary);

    return Response.json(report);
  } catch (error) {
    console.error("Failed to sync capabilities:", error);
    return new ChatSDKError(
      "bad_request:api",
      `Failed to sync capabilities: ${error instanceof Error ? error.message : "Unknown error"}`
    ).toResponse();
  }
}

/**
 * GET endpoint to preview what would be updated without making changes
 */
export async function GET(request: Request) {
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
    console.log("Previewing capability sync...");

    // Get existing models from database
    const existingModels = await getEnabledModels();

    // Match models with capability mapping
    const preview: Array<{
      id: string;
      current: {
        pricingImageGen: number | null;
        pricingWebSearch: number | null;
      };
      new: {
        pricingImageGen: number | null;
        pricingWebSearch: number | null;
      };
      willUpdate: boolean;
      inMapping: boolean;
    }> = [];

    for (const existingModel of existingModels) {
      const capabilities = getModelCapabilities(existingModel.id);
      const inMapping = Boolean(MODEL_CAPABILITIES[existingModel.id]);

      const imageGenChanged =
        existingModel.pricingImageGen !== capabilities.pricingImageGen;
      const webSearchChanged =
        existingModel.pricingWebSearch !== capabilities.pricingWebSearch;

      preview.push({
        id: existingModel.id,
        current: {
          pricingImageGen: existingModel.pricingImageGen,
          pricingWebSearch: existingModel.pricingWebSearch,
        },
        new: {
          pricingImageGen: capabilities.pricingImageGen,
          pricingWebSearch: capabilities.pricingWebSearch,
        },
        willUpdate: imageGenChanged || webSearchChanged,
        inMapping,
      });
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      source: "static-mapping",
      mappingVersion: "2026-01-05",
      preview,
      summary: {
        total: preview.length,
        willUpdate: preview.filter((p) => p.willUpdate).length,
        unchanged: preview.filter((p) => !p.willUpdate).length,
        inMapping: preview.filter((p) => p.inMapping).length,
        notInMapping: preview.filter((p) => !p.inMapping).length,
      },
    });
  } catch (error) {
    console.error("Failed to preview capabilities:", error);
    return new ChatSDKError(
      "bad_request:api",
      `Failed to preview capabilities: ${error instanceof Error ? error.message : "Unknown error"}`
    ).toResponse();
  }
}

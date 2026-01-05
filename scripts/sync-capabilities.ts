#!/usr/bin/env tsx

/**
 * Script to sync model capabilities from static mapping
 * Usage: pnpm models:sync-capabilities [--preview]
 *
 * --preview: Only preview changes without applying them
 */

import { config } from "dotenv";
import { resolve } from "node:path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const API_KEY = process.env.MODELS_SYNC_API_KEY;
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const isPreview = process.argv.includes("--preview");

async function syncCapabilities() {
  if (!API_KEY) {
    console.error("❌ MODELS_SYNC_API_KEY not found in environment variables");
    process.exit(1);
  }

  const endpoint = `${BASE_URL}/api/models/sync-capabilities`;
  const method = isPreview ? "GET" : "POST";

  console.log(
    `🔄 ${isPreview ? "Previewing" : "Syncing"} model capabilities...`
  );
  console.log(`📍 Endpoint: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Error:", error);
      process.exit(1);
    }

    const data = await response.json();

    if (isPreview) {
      console.log("\n📊 Preview Results:");
      console.log("=".repeat(60));
      console.log(`Source: ${data.source}`);
      console.log(`Total models: ${data.summary.total}`);
      console.log(`In capability mapping: ${data.summary.inMapping}`);
      console.log(`Will update: ${data.summary.willUpdate}`);
      console.log(`Unchanged: ${data.summary.unchanged}`);

      if (data.preview) {
        const toUpdate = data.preview.filter(
          (p: { willUpdate: boolean }) => p.willUpdate
        );
        if (toUpdate.length > 0) {
          console.log("\n📝 Changes that would be applied:");
          toUpdate.slice(0, 15).forEach(
            (item: {
              id: string;
              current: {
                pricingImageGen: number | null;
                pricingWebSearch: number | null;
              };
              new: {
                pricingImageGen: number | null;
                pricingWebSearch: number | null;
              };
            }) => {
              console.log(`\n  ${item.id}:`);
              if (item.current.pricingImageGen !== item.new.pricingImageGen) {
                console.log(
                  `    Image Gen: ${item.current.pricingImageGen ?? "null"} → ${item.new.pricingImageGen ?? "null"}`
                );
              }
              if (item.current.pricingWebSearch !== item.new.pricingWebSearch) {
                console.log(
                  `    Web Search: ${item.current.pricingWebSearch ?? "null"} → ${item.new.pricingWebSearch ?? "null"}`
                );
              }
            }
          );
          if (toUpdate.length > 15) {
            console.log(`\n  ... and ${toUpdate.length - 15} more`);
          }
        }
      }

      console.log("\n💡 Run without --preview to apply changes");
    } else {
      console.log("\n✅ Sync completed!");
      console.log("=".repeat(60));
      console.log(`Source: ${data.source}`);
      console.log(`Total models: ${data.summary.totalModels}`);
      console.log(`In mapping: ${data.summary.inMapping}`);
      console.log(`Updated: ${data.summary.updated}`);
      console.log(`Unchanged: ${data.summary.unchanged}`);
      console.log(`Failed: ${data.summary.failed}`);

      if (data.details.updated.length > 0) {
        console.log("\n📝 Updated models:");
        data.details.updated.slice(0, 15).forEach(
          (item: {
            id: string;
            pricingImageGen: number | null;
            pricingWebSearch: number | null;
          }) => {
            const caps = [];
            if (item.pricingImageGen !== null)
              caps.push(`ImageGen=$${item.pricingImageGen}`);
            if (item.pricingWebSearch !== null)
              caps.push(`WebSearch=$${item.pricingWebSearch}`);
            console.log(`  ${item.id}: ${caps.join(", ") || "no capabilities"}`);
          }
        );
        if (data.details.updated.length > 15) {
          console.log(`  ... and ${data.details.updated.length - 15} more`);
        }
      }
    }

    console.log(`\n🕐 Timestamp: ${data.timestamp}`);
  } catch (error) {
    console.error("❌ Failed to sync capabilities:", error);
    process.exit(1);
  }
}

syncCapabilities();

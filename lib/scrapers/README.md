# Model Capabilities

This directory contains utilities for managing model capability information that isn't available through the Gateway API.

## Overview

Since the Gateway API (`getAvailableModels()`) doesn't currently include capability information (image generation, web search), we use a static mapping that can be manually updated.

## Files

- `model-capabilities.ts` - Static mapping of model IDs to capabilities
- `vercel-models.ts` - (Legacy) Scraping utility, kept for reference

## Updating Capabilities

1. Visit https://vercel.com/ai-gateway/models
2. Find models with Image Gen or Web Search pricing columns
3. Update `model-capabilities.ts` with the new data
4. Run `pnpm models:sync-capabilities --preview` to verify
5. Run `pnpm models:sync-capabilities` to apply

## Migration Path

When the Gateway API adds capability support, update the sync endpoint to use API data instead of the static mapping.

## Usage

### Via API Endpoint

```bash
# Preview changes (no updates)
curl -X GET http://localhost:3000/api/models/sync-capabilities \
  -H "x-api-key: YOUR_API_KEY"

# Apply changes
curl -X POST http://localhost:3000/api/models/sync-capabilities \
  -H "x-api-key: YOUR_API_KEY"
```

### Via npm Script

```bash
# Preview changes
pnpm models:sync-capabilities --preview

# Apply changes
pnpm models:sync-capabilities
```

## Environment Variables

- `MODELS_SYNC_API_KEY`: Required API key for authentication
- `NEXT_PUBLIC_BASE_URL` or `VERCEL_URL`: Base URL for API endpoint (defaults to localhost:3000)

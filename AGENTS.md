---
version: 1.0
supported_languages:
  - typescript
  - javascript
agents:
  - name: code-generator
    description: Generates new features, components, and functionality
    instructions: |
      - Follow existing patterns in the codebase
      - Use TypeScript with strict types
      - Prefer Server Components; use "use client" only when necessary
      - Follow Ultracite/Biome linting rules
    constraints:
      - Never modify files in components/ui/ directly
      - Never hardcode API keys or secrets
      - Always use path aliases (@/*)

  - name: code-reviewer
    description: Reviews code for quality, security, and best practices
    instructions: |
      - Check for TypeScript type safety
      - Verify accessibility compliance
      - Ensure proper error handling
      - Look for security vulnerabilities
    constraints:
      - Focus on actionable feedback
      - Prioritize critical issues

  - name: debugger
    description: Helps identify and fix bugs
    instructions: |
      - Analyze error messages and stack traces
      - Check database queries and API routes
      - Verify client/server component boundaries
      - Examine hook dependencies
---

# AGENTS.md

This file provides context and guidelines for AI agents to interact with this repository effectively. It ensures consistency, quality, and alignment with project standards.

## Project Overview

**AI Chatbot (Chat SDK)** is a full-stack conversational AI application built with modern web technologies. It provides a beautiful, production-ready chatbot interface with support for multiple AI providers, artifacts (code/document generation), and real-time streaming.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.6+ (strict mode) |
| UI | React 19, Tailwind CSS 4, Radix UI, shadcn/ui |
| Database | PostgreSQL (Neon Serverless) via Drizzle ORM |
| AI | Vercel AI SDK, AI Gateway (multi-provider) |
| Auth | Auth.js (NextAuth v5) |
| Storage | Vercel Blob |
| Cache | Redis |
| Package Manager | pnpm 9.12+ |

### Key Features

- Multi-model support (OpenAI, Anthropic, Google, xAI)
- Artifacts system for code/document/spreadsheet generation
- Real-time streaming responses
- Chat history persistence
- File attachments
- Dark/light theme support

## Repository Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes & logic
│   │   ├── auth.ts        # Auth.js configuration
│   │   ├── login/         # Login page
│   │   └── register/      # Registration page
│   ├── (chat)/            # Main chat application
│   │   ├── api/           # API routes (chat, vote, history, etc.)
│   │   ├── chat/[id]/     # Dynamic chat pages
│   │   ├── page.tsx       # Home page (new chat)
│   │   └── layout.tsx     # Chat layout with sidebar
│   ├── globals.css        # Global styles & Tailwind config
│   └── layout.tsx         # Root layout
├── artifacts/             # Artifact generation (code, text, sheet, image)
├── components/            # React components
│   ├── ui/                # shadcn/ui primitives (DO NOT MODIFY)
│   ├── ai-elements/       # AI-specific UI components
│   └── *.tsx              # Feature components
├── hooks/                 # Custom React hooks
├── lib/                   # Shared utilities
│   ├── ai/                # AI configuration, models, prompts, tools
│   ├── db/                # Database schema, queries, migrations
│   └── utils.ts           # Utility functions
├── tests/                 # Playwright E2E tests
└── public/                # Static assets
```

## Coding Standards

### TypeScript Guidelines

- **Strict mode enabled** - All code must pass strict type checking
- Use `type` imports: `import type { Foo } from './foo'`
- Prefer interfaces for object shapes, types for unions/primitives
- Avoid `any` - use `unknown` with type guards when necessary
- Use `as const` for literal types

```typescript
// ✅ Good
import type { ChatMessage } from '@/lib/types';

const config = {
  model: 'gpt-4',
  temperature: 0.7,
} as const;

// ❌ Bad
import { ChatMessage } from '@/lib/types';  // Missing 'type'
const data: any = response;  // Avoid any
```

### React Patterns

- **Server Components by default** - Only add `"use client"` when needed
- Use path aliases: `@/components`, `@/lib`, `@/hooks`
- Prefer composition over inheritance
- Extract reusable logic into custom hooks
- Use `Suspense` for async component boundaries

```typescript
// ✅ Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}

// ✅ Client Component (when needed)
"use client";
import { useState } from 'react';
```

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use CSS variables from `globals.css` for theming
- Leverage `cn()` utility for conditional classes

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "flex items-center gap-2",
  isActive && "bg-primary text-primary-foreground"
)} />
```

### Database (Drizzle ORM)

- Schema defined in `lib/db/schema.ts`
- Use type inference: `InferSelectModel<typeof table>`
- Queries in `lib/db/queries.ts`
- Migrations via `pnpm db:generate` and `pnpm db:migrate`

### Linting & Formatting

This project uses **Ultracite** (Biome-based) for linting and formatting:

```bash
pnpm lint      # Check for issues
pnpm format    # Auto-fix issues
```

Key rules enforced:
- No `var` declarations (use `const`/`let`)
- No unused imports or variables
- Accessibility compliance (a11y)
- Consistent import ordering
- No magic numbers in complex logic

## Agent Instructions

### General Rules

1. **Read before writing** - Always examine existing patterns before creating new code
2. **Preserve conventions** - Match the style of surrounding code
3. **Path aliases** - Always use `@/` imports, never relative paths like `../../`
4. **Type safety** - Never use `any`, provide proper types
5. **Error handling** - Use `ChatSDKError` for user-facing errors

### File Restrictions

| Path | Rule |
|------|------|
| `components/ui/*` | **DO NOT MODIFY** - shadcn/ui primitives |
| `lib/utils.ts` | **DO NOT MODIFY** - Core utilities |
| `.env*` | **NEVER** commit or expose secrets |
| `lib/db/migrations/*` | **DO NOT MANUALLY EDIT** - Generated files |

### Adding New Features

1. **Components**: Add to `components/` with proper TypeScript types
2. **API Routes**: Add to `app/(chat)/api/` following existing patterns
3. **Database**: Modify schema in `lib/db/schema.ts`, then run migrations
4. **AI Tools**: Add to `lib/ai/tools/` following the tool interface

### Working with AI Models

Models are configured in `lib/ai/models.ts`. The AI Gateway routes requests to providers:

```typescript
// Available model format: "provider/model-name"
// Example: "anthropic/claude-sonnet-4.5", "openai/gpt-5.2"
```

### Testing

```bash
pnpm test  # Run Playwright E2E tests
```

Tests are in `tests/e2e/`. Follow existing patterns for new test files.

## Environment Variables

Required variables (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Auth.js secret (generate with `openssl rand -base64 32`) |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key (non-Vercel deployments) |
| `POSTGRES_URL` | PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `REDIS_URL` | Redis connection string |

## Common Tasks

```bash
# Development
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build

# Database
pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Check code issues
pnpm format           # Fix code issues
```

## Examples

### Creating a New API Route

```typescript
// app/(chat)/api/example/route.ts
import { auth } from '@/app/(auth)/auth';

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Your logic here
  return Response.json({ data: 'example' });
}
```

### Creating a New Component

```typescript
// components/example.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExampleProps {
  title: string;
  className?: string;
}

export function Example({ title, className }: ExampleProps) {
  const [count, setCount] = useState(0);

  return (
    <div className={cn("p-4", className)}>
      <h2>{title}</h2>
      <Button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </Button>
    </div>
  );
}
```

### Adding a Database Table

```typescript
// lib/db/schema.ts
export const newTable = pgTable("NewTable", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type NewTable = InferSelectModel<typeof newTable>;
```

Then run:
```bash
pnpm db:generate
pnpm db:migrate
```

## Contributing

When collaborating with AI agents:

1. **Be specific** - Provide clear context about what you want to achieve
2. **Reference files** - Point to existing patterns you want to follow
3. **Review output** - Always review generated code before committing
4. **Test changes** - Run linting and tests before pushing

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel AI SDK](https://ai-sdk.dev/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Auth.js](https://authjs.dev)
- [Chat SDK Docs](https://chat-sdk.dev)


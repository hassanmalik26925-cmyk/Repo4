# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Pulse Commerce App

Production e-commerce analytics dashboard backed by Postgres.

- **Backend** (`artifacts/api-server`): Express + JWT auth + Drizzle. Routes under `/api/*` for auth, dashboard, orders, products, customers, marketing, integrations, settings, activities. Service layer (`src/services/*`) is the single source of truth for business calculations: `revenue = SUM(orders.total_amount WHERE status IN ['paid','fulfilled'])`, `ad_spend = SUM(ad_metrics.spend)`, `profit = revenue - ad_spend`. Integration framework (`src/integrations/*`) registers Shopify/Meta/etc.; sync engine (`src/sync/engine.ts`) runs every 15 min with 3 retries.
- **Frontend** (`artifacts/data-app`): React + Vite. All data comes from generated React Query hooks in `@workspace/api-client-react` — no mock data, no FE-side aggregation. Auth token in `localStorage["pulse.auth.token"]`. Global `DateRangeContext` (`7d/14d/30d/90d`) drives every query.
- **Demo user**: `demo@pulse.test` / `demo1234` (seed data: 90d orders, 5 campaigns, integrations).
- **Schemas/hooks**: regenerate with `pnpm --filter @workspace/api-spec run codegen` after editing the OpenAPI spec.
- **Manual data entry**: Products support full CRUD (add/edit price, cogs, stock via `/api/products`), and Settings has a custom Shipping Rates editor (`/api/shipping-rates`) for region/order-value-based rate rules — both DB-backed, no mock data.
- **Demo vs. real users**: `usersTable.isDemo` ("true"/"false" text column) marks `demo@pulse.test`. Demo users' integration "disconnect" is a no-op (stays connected) so the demo always shows live-looking data; real users disconnect normally.

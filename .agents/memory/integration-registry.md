---
name: Integration registry
description: How the 15-platform integration registry works and how to extend it.
---

## Rule
Every new integration requires entries in 4 places:
1. `artifacts/api-server/src/integrations/<name>.ts` — adapter implementing `IntegrationAdapter`
2. `artifacts/api-server/src/integrations/index.ts` — add to `SUPPORTED_PLATFORMS`, `REGISTRY`, `PLATFORM_LABELS`, `PLATFORM_CATEGORIES`
3. `artifacts/data-app/src/pages/SettingsPage.tsx` — add to `PLATFORM_ICON`, `PLATFORM_BG`, `PLATFORM_CATEGORY`, `PLATFORM_FIELDS`
4. `lib/api-spec/openapi.yaml` — new credential fields go in `ConnectIntegrationBody` schema (all optional)

**Why:** The integrations route (`/integrations`) auto-generates placeholder rows for every entry in `SUPPORTED_PLATFORMS`, so adding to only the registry immediately surfaces the platform in the Settings UI without any other route changes.

**Current 15 platforms:** shopify, woocommerce, amazon, ebay, meta_ads, google_ads, tiktok, pinterest, snapchat, microsoft_ads, klaviyo, stripe, paypal, shipstation, supplier.

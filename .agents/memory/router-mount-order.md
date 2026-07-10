---
name: Express router mount order with unscoped router.use middleware
description: Why a sub-router with router.use(requireAuth, requireAdmin) and no path can silently block unrelated routes registered after it
---

In `artifacts/api-server/src/routes/index.ts`, feature routers are combined with `router.use(subRouter)` (no path prefix) in a fixed order. If a sub-router registers its own gate via `router.use(requireAuth, requireAdmin)` with **no path argument**, that gate runs for every request that reaches that sub-router — not just its own `/admin/*` routes — because an unscoped `router.use` matches all paths.

**Symptom seen:** `shippingRatesRouter` was mounted after `adminRouter`, so every `/api/shipping-rates` request got rejected with "Admin access required" for non-admin users, even though nothing in `shippingRates.ts` referenced admin auth.

**Fix applied:** scope the admin gate explicitly — `router.use("/admin", requireAuth, requireAdmin)` — so it only intercepts `/admin/*`, and moved `adminRouter` registration last as defense in depth.

**How to apply:** any router-level `.use(middleware)` inside a feature router that isn't meant to be global must be given an explicit path prefix matching that router's own routes. Don't rely on registration order alone to contain a middleware's blast radius.

---
name: Demo vs real user data behavior
description: How the app keeps the demo account looking "alive" without faking integration state, and how demo data avoids going stale
---

Pulse Commerce needs the demo account to always look "alive" (full data visible) for sales/demo purposes, while real signed-up users must get truthful integration state.

**Decision:** `usersTable.isDemo` is a text column ("true"/"false") set only for `demo@pulse.test`, and is now exposed on `AuthUser` (register/login/`/auth/me`). Only demo registration seeds sample rows; ordinary registrations start with an empty database. Disconnect is a REAL DB toggle for every user, demo included — no no-op branch. The frontend gate (`hasConnected` in `App.tsx`) bypasses the "must have a connected integration" check entirely when `user.isDemo` is true, while analytics queries use `enabled: hasConnected` so unconnected real users do not fetch analytics. Service-layer queries remain user-scoped and truthful.

**Why:** Product decision — demo must never look broken/empty during a sales demo, but faking the DB disconnect state was confusing (disconnect button looked broken) and unnecessary once we realized data visibility never depended on integration status server-side.

**How to apply:** Any new data or analytics query should use the same `hasConnected` gate; any new demo seed path must explicitly check `isDemo === "true"` rather than seeding all registrations.

**Separate stale-data pitfall:** demo accounts are long-lived, so seed data generated once (relative to "now" at seed time) silently drifts — recent date-range queries (7d/14d/30d) can show $0 once enough real time has passed, even though 90d still looks fine. Fix: `refreshDemoDataIfStale(userId)` in `artifacts/api-server/src/lib/seed.ts`, called on every demo login — checks latest `orderedAt`, and if older than ~1 day, deletes that user's orders/ad-metrics and re-seeds a fresh time series anchored to current date. Any future seed/demo-data logic must stay "now-relative" and re-run this kind of freshness check rather than assuming one-time seeding is sufficient.

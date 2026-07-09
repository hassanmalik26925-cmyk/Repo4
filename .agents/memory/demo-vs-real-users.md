---
name: Demo vs real user data behavior
description: How the app distinguishes the demo account from real users for integration disconnect and data visibility
---

Pulse Commerce needs the demo account to always look "alive" (connected, full data) for sales/demo purposes, while real signed-up users must get truthful integration state.

**Decision:** `usersTable.isDemo` is a text column ("true"/"false", matching existing boolean-as-text convention in this schema) set only for `demo@pulse.test`. The `/api/integrations/:platform/disconnect` route checks it — for demo users the disconnect is a no-op (DB status untouched, response forced to "connected"); real users disconnect for real.

**Why:** Product decision — demo data must never appear broken/disconnected during a sales demo, but this must not weaken real users' ability to actually manage their own integrations.

**How to apply:** Any new endpoint that can change integration/connection state should branch on `isDemo` the same way rather than introducing a separate "demo mode" flag or env var.

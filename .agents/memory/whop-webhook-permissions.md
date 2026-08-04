---
name: Whop webhook permissions
description: Connected Whop permission boundary affecting automatic webhook setup
---

The Replit-connected Whop account can manage the CommercePulse product, plan, checkout, and membership flows, but webhook endpoint creation/listing is blocked when the connector lacks `company:basic:read`.

**Why:** Attempts to create and list webhook endpoints were rejected by Whop before any endpoint or signing secret was issued, so the app must not assume `WHOP_WEBHOOK_SECRET` exists.

**How to apply:** Before retrying automatic webhook setup, refresh or reauthorize the Whop connection with company read permission. Then create one public endpoint at the published app’s `/api/webhooks/whop` path, save the generated signing secret via Replit Secrets, and subscribe to membership activation, deactivation, cancellation-at-period-end, and relevant payment/refund events.
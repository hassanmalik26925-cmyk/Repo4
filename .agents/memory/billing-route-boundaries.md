---
name: Billing route boundaries
description: Route-scoping and trial requirements for CommercePulse billing
---

Paid-access enforcement belongs only on analytics routes: dashboard, orders, products, customers, marketing, and insights. Onboarding, settings, integrations, notifications, shipping rates, account management, and billing checkout/status must remain available to unpaid users.

**Why:** An unscoped middleware mounted inside one router can intercept unrelated routes registered later in the shared router, preventing new users from completing setup or reaching checkout.

**How to apply:** Scope middleware with the route prefix (for example `/dashboard`) or attach it directly to individual analytics handlers. Keep the Whop plan's trial duration synchronized with all public and in-app billing copy.
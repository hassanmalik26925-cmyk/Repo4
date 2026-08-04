---
name: Billing membership lookup
description: Reliability rules for resolving CommercePulse subscriptions from Whop membership history
---

Whop membership lists are paginated and a customer can have multiple historical memberships for the same plan. Access resolution must scan all pages, prefer any active/trialing/canceling match, and only fall back to the newest inactive match for display state.

**Why:** A first-page-only lookup can miss a valid subscription after enough billing history accumulates, while a long inactive cache can delay access immediately after a successful checkout.

**How to apply:** Keep inactive billing status cache TTLs much shorter than active status TTLs, and use the SDK's async pagination whenever matching memberships are listed.
---
name: Traffic measurement boundary
description: Product boundary for GA4, browser pixels, and truthful traffic reporting.
---

CommercePulse currently has authenticated first-party workspace event tracking, but not a public storefront event endpoint, pixel installation snippet, or GA4 OAuth/property import flow.

**Why:** Traffic and funnel numbers must reflect actual events or authorized connector data. Presenting a fake GA4/pixel connection would make sessions, conversions, and attribution appear more complete than the product can support.

**How to apply:** Keep GA4/pixel surfaces labeled as unavailable or not installed until a real ingestion/authentication path is implemented. Continue showing explicit traffic empty states rather than fabricating metrics.
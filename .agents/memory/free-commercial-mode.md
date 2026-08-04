---
name: Free commercial mode
description: CommercePulse currently operates without billing, checkout, paid-access gates, or Whop integration.
---

CommercePulse is intentionally free while product validation continues. Billing routes, webhooks, client contracts, frontend paywalls, provider dependencies, and admin billing visibility should remain absent. The legacy billing columns in the users table are inert compatibility fields and should not be treated as active product behavior.

**Why:** The product decision was to remove billing completely for launch rather than continue the Whop monetization path.

**How to apply:** New analytics and account features should be available without subscription checks. Reintroduce monetization only as a deliberate product decision with a fresh end-to-end design.
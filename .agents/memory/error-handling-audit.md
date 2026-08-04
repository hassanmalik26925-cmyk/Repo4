---
name: Error handling audit
description: Durable API and UI error-handling boundaries found during the CommercePulse reliability audit.
---

Server-side validation must enforce cross-field business rules, not only the
single-field schemas used by the client. In particular, shipping-rate minimum
and maximum order values must be checked together on create and update, and
updates should resolve resource existence before rejecting an empty patch.

**Why:** Client-only validation was bypassed by direct API requests, allowing
impossible shipping ranges to persist.

**How to apply:** For every mutation, validate both the request shape and the
resulting domain state on the server; check ownership/resource existence before
returning validation errors that would obscure a missing resource.
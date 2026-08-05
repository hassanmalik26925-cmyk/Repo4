---
name: Ads trend truthfulness
description: The trust boundary for daily paid-acquisition charts in CommercePulse.
---

Daily paid-acquisition charts must be computed from persisted ad-metric rows. If no daily rows exist for the requested window, the UI must show an explicit empty state rather than drawing a synthetic curve.

**Why:** Advertising analytics is trust-critical; a visually complete chart must never imply performance data that was not imported from a connected platform.

**How to apply:** When adding or changing ad trend visualizations, use the server-side ad metrics source of truth, preserve the requested date window, and keep a truthful no-data state.
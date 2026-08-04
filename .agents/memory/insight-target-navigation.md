---
name: Insight target navigation
description: Actionable insights should carry an exact entity and focus so review actions open the relevant detail, not only a broad screen.
---

When an insight is about a specific record, its action target should include that record's ID plus a semantic focus such as costs or inventory. The client must preserve the full target through navigation and use it to open, highlight, and scroll to the matching detail.

**Why:** Sending only a destination screen makes review actions feel disconnected from the warning and forces the operator to search again.

**How to apply:** Add entityId/focus to server-generated insight targets, keep them in dashboard and reports navigation callbacks, and provide a visible fallback when the referenced entity is not present.
---
name: Insights engine
description: Rule-based AI insights engine at GET /insights — no LLM required.
---

## Rule
The insights route at `artifacts/api-server/src/routes/insights.ts` analyzes Postgres data and returns up to 8 `Insight` objects sorted by severity: critical → warning → positive → info.

**Why:** OpenAI Replit integration requires paid plan. Rule-based engine delivers real value and is always available. Can be enhanced with LLM later by passing insights context to a chat-completions call.

**Checks performed:**
- Revenue trend vs prior period (surge ≥20%, drop ≤-15%, softening ≤-5%)
- Margin health (<10% critical, <20% warning, ≥35% positive)
- ROAS (<1x critical, <2x warning, ≥5x excellent; also ROAS change ≤-25%)
- Per-campaign analysis: worst ROAS (if spend >$50), best ROAS
- Product stock: OOS products (critical), low stock <10 units (warning)
- AOV change ≥15% positive, ≤-15% warning

**Schema:** `Insight { id, severity, title, description, metric?, action? }` — validated by `GetInsightsResponse` Zod schema from codegen.

**How to apply:** Add new rules by pushing to the `insights` array before the sort+slice at the end of the route handler.

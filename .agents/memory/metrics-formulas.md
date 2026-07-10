---
name: Revenue/profit/ROAS formulas across dashboard sections
description: Why dashboard, products, and marketing sections intentionally use different revenue/profit formulas, and how historical orders freeze price/cost
---

Pulse Commerce shows different "revenue"/"profit" numbers in different sections by design, not by bug:

- **Dashboard overview** (`RevenueService`): revenue = `SUM(orders.total_amount)` for status in paid/fulfilled; profit = `revenue - ad_spend` (does not subtract COGS — this is top-line P&L against marketing spend only).
- **Products section** (`ProductService`): revenue = `SUM(order_items.unit_price * quantity)`, cost = `SUM(order_items.unit_cost * quantity)`, profit = `revenue - cost` (COGS-based margin per product, no ad spend).
- **Marketing section** (`MarketingService`): "ad revenue" = `SUM(ad_metrics.revenue)`, which is platform-*attributed* revenue (what Shopify/Meta/etc. report as driven by a campaign), not actual order revenue. ROAS = `adRevenue / adSpend`.

These three are legitimately different lenses (order ledger vs. per-SKU margin vs. ad-platform attribution) and won't sum to the same number — that's normal in real e-commerce analytics tools too, but it can look like "inconsistent data" to a user unless labeled clearly in the UI.

**Historical freezing:** `order_items.unitPrice`/`unitCost` are captured at the time the order was created (seed time, or sync time from a real integration) and are never retroactively updated when `products.price`/`cogs` change later. Editing a product's cost/price in Settings only affects *future* orders — this matches real accounting (you don't restate past sales when your supplier cost changes) and is intentional, not a gap.

**How to apply:** if asked to make "all numbers match" across sections, the correct fix is UI labeling/tooltips clarifying what each metric measures — not forcing one formula everywhere, which would make the tool less useful (e.g. losing true COGS-based margin or true ad attribution).

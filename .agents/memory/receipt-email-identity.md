---
name: Receipt email identity
description: Where the "from" address and recipient for order receipt emails come from — no hardcoded/separate from-address.
---

## Rule
Order receipt emails use the account's own `usersTable.name`/`usersTable.email` as the from-identity, and the order's linked `customersTable.email` as the recipient. There is no dedicated store-email column in the schema.

**Why:** User explicitly asked to derive the sender from "the store connection or data API of orders" rather than requesting a separately hardcoded from-address env var. Confirmed via schema grep that no store-specific email field exists.

**How to apply:** If a future request wants a distinct store/brand email separate from the login email, that requires a new schema column (e.g. on a stores/settings table) — don't default to inventing an env var for it without checking schema first.

## Related
- Sending is best-effort via `sendMail()` (`artifacts/api-server/src/lib/email.ts`) — returns `false` on any failure/missing SMTP config, never throws, so it never blocks order fulfillment or sync.
- Receipts fire automatically on fulfill and after integration syncs (only for revenue-recognized statuses: paid/fulfilled), plus a manual tap-to-send button per order in the UI.
- Receipt HTML template varies its accent color/label by order status (paid/fulfilled/refunded/cancelled/pending) rather than using one static design.

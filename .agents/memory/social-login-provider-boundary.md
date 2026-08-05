---
name: Social login provider boundary
description: Which social login providers are safe to expose in the managed Clerk setup
---

CommercePulse should expose Google and X through the managed Clerk OAuth flow. Facebook must remain disabled unless a real Facebook OAuth provider is configured and verified; a visually enabled but nonfunctional Facebook button is misleading.

**Why:** The managed Clerk setup supports Google and X, while Facebook appears as a separate connector requiring setup rather than as an available Clerk login provider.

**How to apply:** When adding social authentication, use provider-specific Clerk redirects for Google/X and keep unsupported providers visibly unavailable until their provider configuration and callback flow are complete.
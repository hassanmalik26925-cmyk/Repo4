---
name: Orval codegen barrel fix
description: Orval regenerates lib/api-zod/src/index.ts with duplicate exports; must be overwritten post-codegen.
---

## The Rule
After every `orval` run, `lib/api-zod/src/index.ts` gets regenerated with both `export * from "./generated/api"` and `export * from "./generated/types"`, causing TS2308 duplicate-export errors.

**Why:** Orval's `workspace` option makes it maintain a barrel at the workspace root. When `schemas` config is present (even removed), stale `generated/types` dir causes the barrel to include both.

**Fix applied:**
1. Removed `schemas` config from zod orval target.
2. Set `mode: "single"`, `target: "generated/api.ts"`, `clean: false`.
3. Added a node one-liner to the codegen npm script that overwrites `index.ts` after orval:
   ```
   node -e "require('fs').writeFileSync(require('path').join(__dirname,'../api-zod/src/index.ts'),'export * from \"./generated/api\";\n')"
   ```
4. Deleted stale `lib/api-zod/src/generated/types/` directory.

**How to apply:** Any time you edit `orval.config.ts` or add new OpenAPI endpoints, run `pnpm --filter @workspace/api-spec run codegen` — the script now self-heals the barrel.

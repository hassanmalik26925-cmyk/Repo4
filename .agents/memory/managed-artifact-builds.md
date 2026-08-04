---
name: Managed artifact builds
description: Artifact Vite configs require workflow-provided environment values outside dev workflows.
---

The frontend and mockup sandbox Vite configs intentionally fail without `PORT` and `BASE_PATH`. Their managed workflows inject those values; standalone builds must provide the corresponding artifact values explicitly.

**Why:** This prevents accidental builds from escaping the artifact routing path and keeps preview/deployment routing consistent.

**How to apply:** Prefer managed workflow restarts for runtime verification. For manual builds, provide each artifact's configured `PORT` and `BASE_PATH` rather than changing the Vite guards.
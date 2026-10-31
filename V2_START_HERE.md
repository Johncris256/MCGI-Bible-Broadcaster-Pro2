# Bible Broadcast Live â€” V2 hardening workspace

This folder is a separate working copy. The original GitHub repository was not edited or pushed to.

- V1 source commit: e1d41e5d3f020b3099543fcee41a0781f6234bda
- Local branch: `v2-hardening`
- V1 remote name: `v1-upstream` (renamed deliberately to reduce accidental pushes)
- Hardening toolkit: `tools/bible-broadcast-live-v2-hardening-pack`

## First checks

1. Review the original startup instructions and install dependencies using the repo's documented process.
2. Run the existing app unchanged once to record a baseline.
3. Run the toolkit tests:
   ```powershell
   cd tools/bible-broadcast-live-v2-hardening-pack
   node --test
   ```
4. Return to the repository root and run the read-only scan:
   ```powershell
   node .\tools\bible-broadcast-live-v2-hardening-pack\scripts\preflight.js .
   ```
5. Read `tools/bible-broadcast-live-v2-hardening-pack\V2_IMPLEMENTATION_PLAN.md` before integrating any helper into `server.js`.

**Important:** this bootstrap creates a complete separate clone plus the V2 hardening tools. It does not automatically modify the running server; that is intentional until the actual endpoint contracts and regression behavior are verified.

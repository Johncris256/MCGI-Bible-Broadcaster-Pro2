# Bible Broadcast Live — V2 Hardening Workspace Starter

**Package type:** a V2 workspace bootstrapper and security/stability toolkit. It is not, by itself, a full copy of the app. The bootstrap script clones the actual repository on your Windows PC and adds this toolkit inside the separate V2 working copy.

Source repository: https://github.com/Johncris256/bible-broadcast-live

## Safest way to create a full V2 copy on Windows

1. Download and extract this ZIP somewhere outside your existing app folder.
2. Make sure Git for Windows and Node.js 18+ are installed.
3. Open PowerShell in the extracted `bible-broadcast-live-v2-hardening-pack` folder.
4. Run:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\scripts\create-full-v2.ps1 -Destination 'D:\BibleBroadcast\bible-broadcast-live-v2'
   ```

   Change the destination to a path that does not already exist.

The script clones the repository's `main` branch into a new folder, records its source commit, creates a local `v2-hardening` branch, renames the source remote to `v1-upstream`, and copies this toolkit under `tools\bible-broadcast-live-v2-hardening-pack`. It does **not** edit V1 or push to GitHub. It also refuses to overwrite an existing destination.

## Run the toolkit tests

Requires Node.js 18 or later. From the extracted toolkit folder, or the copy inside the new V2 workspace:

```powershell
node --test
```

Run the read-only scanner against the whole V2 source tree from the repository root:

```powershell
node .\tools\bible-broadcast-live-v2-hardening-pack\scripts\preflight.js .
```

The scanner flags source patterns for human review. It does not make code changes and does not certify the app as secure.

## Contents

- `src/security.js` — CommonJS helpers for path containment, public-file allowlisting, realpath/symlink checks, bounded JSON bodies, bearer-token checks, safe response headers, and atomic JSON persistence.
- `test/security.test.js` — regression tests for the security helpers.
- `scripts/preflight.js` — read-only source scanner.
- `scripts/create-full-v2.ps1` — Windows bootstrapper that creates a separate complete app clone and adds the toolkit.
- `V2_IMPLEMENTATION_PLAN.md` — staged migration plan and acceptance gates.
- `INTEGRATION_EXAMPLE.md` — example pattern, not a drop-in server replacement.
- `SOURCE_REVIEW_NOTES.md` — observations to re-check against the exact cloned commit.
- `.gitignore.recommended` — proposed ignore entries to merge carefully.

## Important integration rules

- Keep the original V1 folder and its GitHub repository unchanged until the V2 version has passed rehearsals.
- Do not replace `server.js` wholesale with the helper module. Preserve the existing endpoint contract while wrapping handlers with validation and authorization.
- Do not immediately require bearer tokens on all old routes. First decide how the operator and tablet receive credentials; otherwise current browser clients will stop working.
- Use specific public file entries wherever possible. Allowing a whole directory makes all descendants public except the blocked sensitive names/segments implemented in the helper.
- Bind to `127.0.0.1` during local testing. Only expose on the church LAN when the API is authenticated and regression testing is complete.
- A helper test passing proves that helper behavior, not that the original app is fully hardened.

## Current state

This starter does not claim that the app's original server has already been patched. The bootstrap creates a full separate copy first; the server changes follow after route inventory and baseline smoke tests so they can be tested without risking the current production version.

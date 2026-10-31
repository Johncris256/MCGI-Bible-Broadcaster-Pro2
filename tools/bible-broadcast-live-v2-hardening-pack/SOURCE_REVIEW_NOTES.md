# Source review notes for V2

Reviewed public repository: https://github.com/Johncris256/bible-broadcast-live

These are code-review observations, not proof of an active exploit. Re-check each observation against the exact commit cloned by `scripts/create-full-v2.ps1` before changing production behavior.

## Server risks to address

1. `server.js` contains wrappers/overrides around HTTP server creation and hooks around the `ws` server prototype. This can make route order and runtime behavior difficult to reason about. Prefer one explicit HTTP server instance and one explicit WebSocket attachment only if the active clients require it.
2. Some live-session and broadcast POST handlers collect request bodies without a visible strict byte limit. Apply a bounded body reader to each mutation endpoint.
3. Some stream and mutation handlers send wildcard `Access-Control-Allow-Origin`; the preflight route also appears to allow wildcard headers. CORS is not authentication. Use explicit origins only where needed, and authenticate state-changing requests.
4. Session cache persistence appears to use synchronous writes with swallowed errors in at least one code path. Use atomic replacement, schema validation, and observable persistence errors.
5. The static file handler should resolve paths beneath a public root and apply a narrow allowlist. File existence checks alone do not establish that a requested file is safe to expose.
6. Slot-lock routes accept client-supplied fields such as slot index, operator name, and client ID. Validate the schema and authorize the actor before changing lock state.
7. Slot locking is a coordination feature, not authentication. A client ID supplied by the browser does not establish identity.

## Endpoint / client consistency

The reviewed code includes `/api/live-session`, `/api/live-session-stream`, `/api/pilots`, `/api/slave-action`, `/api/output-stream`, `/api/output-broadcast`, `/api/pastor-stream`, and `/api/pastor-feed` endpoint families. Some operator-side code also appears to reference `/api/stream` and `/api/broadcast`. Inventory all current `fetch()`, `EventSource`, and `WebSocket` callers against server routes before deleting or renaming endpoints.

## Safe deployment rule

Run V2 on loopback first. Move to LAN binding only after API authorization, output rendering, pastor tablet, slot locks, translations, reconnect, and restart tests pass. Do not port-forward the server or expose it publicly as-is.

## Verification status

The helper test suite validates the new reusable helper code only. It does **not** certify the source app or mean the existing `server.js` is already patched. This package intentionally defers server integration until the full clone has a recorded baseline and complete endpoint inventory.

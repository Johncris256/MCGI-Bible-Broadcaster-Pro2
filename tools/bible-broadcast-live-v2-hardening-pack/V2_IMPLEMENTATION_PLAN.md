# Bible Broadcast Live V2 — Implementation Plan

## Scope and non-goals

V2 is a separate working copy. V1 stays untouched and is the rollback source. The first release should preserve existing operator, output, translation, highlighter, pastor-feed, and slot-locking behavior while reducing risk. Do not redesign the interface in this milestone.

## Phase 0 — Establish a repeatable baseline

- Download/clone the complete repository into a separate `bible-broadcast-live-v2` folder.
- Record the source commit and Node.js version.
- Run `npm install` / `npm ci` as appropriate and start the app locally.
- Capture the existing endpoint list, UI routes, and live workflows before changing anything.
- Create a backup tag/copy and verify the original still starts.

**Gate:** the unmodified V2 copy behaves like V1 in a local smoke test.

## Phase 1 — Security boundaries

- Replace unsafe static serving with URL decoding, path containment, and an explicit allowlist. Never serve repository internals, package files, `.git`, `.wrangler`, `node_modules`, cache files, or environment files.
- Apply the request-body reader on every POST route that accepts JSON; reject malformed JSON and oversized bodies.
- Validate every slot index (`0..3` or the documented UI convention), message type, translation ID, and session field at the server boundary.
- Restrict state-changing APIs to authenticated clients. Use a random secret from an untracked environment variable, compare secrets safely, and avoid logging them.
- Configure explicit origins only where browser CORS is genuinely needed. CORS is not an authentication system.
- Do not expose the server publicly or forward its port to the internet.

**Gate:** path traversal, no-token mutation, malformed JSON, oversized requests, and invalid-slot tests fail safely; ordinary authorized local requests still work.

## Phase 2 — Synchronization contract

- Inventory all `fetch()`, `EventSource`, and `WebSocket` destinations in `operator/`, `highlighter/`, `output/`, and root HTML.
- Inventory all server routes and determine which are live, legacy, or dead. Do not delete endpoints until callers are verified.
- Stop monkey-patching `http.createServer` in multiple places. Use explicit route/middleware functions and one HTTP server instance; attach one WebSocket server only if clients truly depend on it.
- Make the server the source of truth for shared live state. Keep personal UI preferences local.
- Add a monotonically increasing state revision. On reconnect, clients receive a full snapshot before incremental updates.
- Add explicit handling for stale client writes and slot-lock ownership/heartbeat expiry.

**Gate:** operator, projection, and tablet remain coherent through repeated verse changes and simultaneous connections.

## Phase 3 — Persistence and recovery

- Validate the loaded session schema at startup; treat corrupt/partial JSON as a recoverable error and retain a backup.
- Use atomic file replacement for session state. Log write failures and surface a warning rather than silently ignoring them.
- Throttle/debounce disk writes if updates are frequent, while preserving the newest state.
- Use SSE heartbeats and remove disconnected response objects on close/error.
- After server restart, restore only valid saved session fields; do not blindly restore arbitrary browser localStorage keys from clients.

**Gate:** refresh, network interruption, restart, and invalid-cache scenarios pass.

## Phase 4 — Testing and release

- Add `node:test` tests for utility functions and route-level tests for authentication, body size, content types, and state validation.
- Add a GitHub Actions workflow to run tests on push and pull request.
- Manually test the original core flows: load translation, search verse, stage a slot, take live, change layout, highlight words, use pastor feed, and acquire/release a slot lock.
- Release as a separate version/branch and keep V1 unchanged until the new build passes the church's normal rehearsal.

**Release gate:** automated tests pass and all connected devices have passed a real LAN rehearsal.

## Endpoint inventory to complete before integration

The reviewed source has references around these endpoint families (confirm in the full copy):

- `/api/live-session` and `/api/live-session-stream`
- `/api/pilots` and `/api/slave-action`
- `/api/output-stream` and `/api/output-broadcast`
- `/api/pastor-stream` and `/api/pastor-feed`
- any operator proxy or WebSocket routes

Some code also appears to reference `/api/stream` and `/api/broadcast`. Check every client caller against a server route before classifying those as valid or obsolete.

# Integration example (review before merging)

This is a pattern for the original `server.js`, not a complete replacement server.

```js
const {
  HttpError,
  atomicWriteJson,
  jsonError,
  readJsonBody,
  requireBearerToken,
  requireJsonContentType,
  safeResolveStaticPath,
  isAllowedPublicPath,
  validateSlotIndex,
} = require('./src/security');

// Example for a privileged POST route:
async function handleProtectedPost(req, res) {
  try {
    requireJsonContentType(req);
    requireBearerToken(req, process.env.BBL_OPERATOR_TOKEN);
    const data = await readJsonBody(req, 64 * 1024);
    const slotIndex = validateSlotIndex(data.slotIndex);
    if (slotIndex === null) throw new HttpError(400, 'Invalid slot index');

    // Validate the rest of the schema before mutating live state.
    // Update canonical state, increment revision, notify connected SSE clients.
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    jsonError(res, error);
  }
}
```

## Notes

- Generate `BBL_OPERATOR_TOKEN` locally; do not commit it. A `.env.example` may document the variable name without containing a real value.
- Browser clients must send `Authorization: Bearer ...` for protected calls. Decide how the token is provisioned to local devices before enabling this guard, or all existing operator actions will be rejected.
- If the output is an OBS browser source that cannot safely hold operator secrets, it should remain read-only and not receive the operator token.
- Do not put authentication tokens in query strings or URLs.

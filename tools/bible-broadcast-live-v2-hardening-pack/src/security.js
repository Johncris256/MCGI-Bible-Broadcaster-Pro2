'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

const DENIED_SEGMENTS = new Set([
  '.git', '.wrangler', 'node_modules', '.env',
  'server.js', 'package.json', 'package-lock.json',
  'live-session-cache.json',
]);

function isContainedPath(root, candidate) {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  const relative = path.relative(base, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * Resolve a raw HTTP request target beneath root. Returns null if malformed
 * or outside root. Does not prove that a file is safe to expose; callers must
 * also use resolvePublicFile() or apply an explicit public-file allowlist.
 */
function safeResolveStaticPath(root, requestTarget) {
  if (typeof requestTarget !== 'string' || !requestTarget.startsWith('/')) return null;

  const queryIndex = requestTarget.indexOf('?');
  const hashIndex = requestTarget.indexOf('#');
  const endIndex = [queryIndex, hashIndex]
    .filter((n) => n >= 0)
    .reduce((a, b) => Math.min(a, b), requestTarget.length);
  const rawPath = requestTarget.slice(0, endIndex);

  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (decoded.includes('\0')) return null;

  // Treat backslash as a separator too, including on POSIX hosts.
  const portable = decoded.replace(/\\/g, '/');
  const normalizedRoot = path.resolve(root);
  const candidate = path.resolve(normalizedRoot, `.${portable}`);
  return isContainedPath(normalizedRoot, candidate) ? candidate : null;
}

/**
 * Gate a path against an explicit allowlist. Entries may be filenames or
 * intentionally public directories, relative to root. Avoid allowing broad
 * directories unless every file beneath them is meant to be publicly served.
 */
function isAllowedPublicPath(root, resolvedPath, publicEntries) {
  if (!Array.isArray(publicEntries)) return false;
  const base = path.resolve(root);
  const resolved = path.resolve(resolvedPath);
  if (!isContainedPath(base, resolved) || resolved === base) return false;

  const relative = path.relative(base, resolved);
  const parts = relative.split(path.sep).filter(Boolean);
  if (parts.some((part) => {
    const lower = part.toLowerCase();
    return DENIED_SEGMENTS.has(lower) || lower.startsWith('.env') || lower.startsWith('.git') ||
      lower === '.htaccess' || lower === '.htpasswd' || lower === 'credentials.json' ||
      lower === 'secrets.json' || lower.endsWith('.log') || lower.endsWith('.tmp');
  })) return false;

  const normalized = parts.join('/');
  return publicEntries.some((entry) => {
    if (typeof entry !== 'string' || !entry.trim()) return false;
    const cleanEntry = entry.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
    if (!cleanEntry || cleanEntry === '.' || cleanEntry.split('/').some((part) => part === '..')) return false;
    return normalized === cleanEntry || normalized.startsWith(`${cleanEntry}/`);
  });
}

/**
 * Resolve an existing regular file while also checking real paths, preventing
 * a symlink inside the public tree from exposing files outside the root.
 * Returns the canonical file path or null. Use a narrow publicEntries allowlist.
 */
async function resolvePublicFile(root, requestTarget, publicEntries) {
  const candidate = safeResolveStaticPath(root, requestTarget);
  if (!candidate || !isAllowedPublicPath(root, candidate, publicEntries)) return null;

  try {
    const [realRoot, realFile, stat] = await Promise.all([
      fs.realpath(path.resolve(root)),
      fs.realpath(candidate),
      fs.stat(candidate),
    ]);
    if (!stat.isFile() || !isContainedPath(realRoot, realFile)) return null;
    if (!isAllowedPublicPath(realRoot, realFile, publicEntries)) return null;
    return realFile;
  } catch {
    return null;
  }
}

/** Read a JSON request body with a hard byte limit and object-only schema. */
function readJsonBody(req, maxBytes = 64 * 1024) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError('maxBytes must be a positive safe integer');
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    req.on('data', (chunk) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        fail(new HttpError(413, 'Request body too large'));
        // Keep the socket from buffering an oversized body in memory.
        req.resume?.();
        return;
      }
      chunks.push(buffer);
    });

    req.on('aborted', () => fail(new HttpError(400, 'Request aborted')));
    req.on('error', (error) => fail(error));
    req.on('end', () => {
      if (settled) return;
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = JSON.parse(raw || '{}');
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          fail(new HttpError(400, 'JSON body must be an object'));
          return;
        }
        settled = true;
        resolve(parsed);
      } catch (error) {
        if (error instanceof HttpError) fail(error);
        else fail(new HttpError(400, 'Invalid JSON body'));
      }
    });
  });
}

function requireJsonContentType(req) {
  const value = req?.headers?.['content-type'];
  if (typeof value !== 'string' || !/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(value.trim())) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
}

function timingSafeSecretEquals(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string' || !provided || !expected) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getBearerToken(req) {
  const header = req?.headers?.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function requireBearerToken(req, expectedToken) {
  const supplied = getBearerToken(req);
  if (!timingSafeSecretEquals(supplied, expectedToken)) {
    throw new HttpError(401, 'Unauthorized');
  }
}

function validateSlotIndex(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  if (typeof value === 'string' && !/^-?\d+$/.test(value.trim())) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 3 ? number : null;
}

function setBaselineSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Do not set Access-Control-Allow-Origin: * here. Configure explicit origins only if required.
  // Add Content-Security-Policy only after auditing inline scripts/styles and external assets.
}

/** Write JSON to a unique temp file in the same directory, then atomically rename. */
async function atomicWriteJson(filePath, value) {
  const fullPath = path.resolve(filePath);
  const directory = path.dirname(fullPath);
  const tempPath = path.join(
    directory,
    `.${path.basename(fullPath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  const json = `${JSON.stringify(value)}\n`;

  try {
    await fs.writeFile(tempPath, json, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await fs.rename(tempPath, fullPath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

function jsonError(res, error) {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  if (!res.headersSent) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
  }
  res.end(JSON.stringify({ ok: false, error: status >= 500 ? 'Internal server error' : error.message }));
}

module.exports = {
  DENIED_SEGMENTS,
  HttpError,
  atomicWriteJson,
  getBearerToken,
  isAllowedPublicPath,
  jsonError,
  readJsonBody,
  requireBearerToken,
  requireJsonContentType,
  resolvePublicFile,
  safeResolveStaticPath,
  setBaselineSecurityHeaders,
  timingSafeSecretEquals,
  validateSlotIndex,
};

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(process.argv[2] || process.cwd());
const ignored = new Set(['.git', 'node_modules', '.wrangler', 'dist', 'build']);
const ignoredRelativePrefix = 'tools/bible-broadcast-live-v2-hardening-pack/';
const extensions = new Set(['.js', '.cjs', '.mjs', '.html']);
const findings = [];
let scanned = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) {
      const relative = path.relative(target, full).split(path.sep).join('/');
      if (relative === 'scripts/preflight.js' || relative.startsWith(ignoredRelativePrefix)) continue;
      scanned++;
      let content;
      try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
      const lines = content.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(?:\/\/|\*|<!--)/.test(line)) return; // Ignore simple comment lines to reduce obvious false positives.
        const checks = [
          [/Access-Control-Allow-Origin['"\s:,]*\*|Access-Control-Allow-Origin[^\n]*\*\s*['"]?/i, 'Wildcard CORS: verify whether explicit origins are required'],
          [/http\.createServer\s*=\s*function|createServer\s*=\s*\(/, 'Monkey-patched http.createServer: review for hidden middleware/route ordering'],
          [/writeFileSync\([^\n]*SESSION|writeFileSync\([^\n]*session/i, 'Synchronous session write: consider atomic asynchronous persistence'],
          [/decodeURIComponent\([^\n]*\)[^\n]*path\.join|path\.join\([^\n]*decodeURIComponent/i, 'Decoded URL path joined to filesystem: verify containment and allowlist'],
          [/Access-Control-Allow-Headers['"\s:,]*\*|Access-Control-Allow-Headers[^\n]*\*/i, 'Wildcard allowed headers: restrict to required headers'],
          [/req\.on\(['"]data['"][^\n]*=>\s*body\s*\+=/i, 'Unbounded request body collection may allow memory exhaustion'],
        ];
        for (const [regex, message] of checks) {
          if (regex.test(line)) findings.push({ file: path.relative(target, full), line: i + 1, message, sample: line.trim().slice(0, 180) });
        }
      });
    }
  }
}

if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`Target directory does not exist: ${target}`);
  process.exit(2);
}

walk(target);
console.log(`Bible Broadcast Live V2 preflight (read-only)\nTarget: ${target}\nFiles scanned: ${scanned}\n`);
if (findings.length === 0) {
  console.log('No heuristic matches found. This is not a security certification.');
  process.exit(0);
}
for (const item of findings) {
  console.log(`[REVIEW] ${item.file}:${item.line} — ${item.message}`);
  console.log(`         ${item.sample}`);
}
console.log(`\n${findings.length} item(s) to review. Results are heuristic; confirm each against runtime behavior.`);

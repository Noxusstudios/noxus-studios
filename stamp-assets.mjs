#!/usr/bin/env node
/**
 * stamp-assets.mjs — content-hash cache-busting for the Noxus site.
 *
 * Why: /css/* and /js/* are served `immutable, max-age=1yr` (see _headers) on
 * fixed filenames. Without a versioned URL, a device that cached an old file
 * never re-fetches it, so a CSS change can leave returning visitors (often
 * phones) stuck on stale styles. This stamps every local CSS/JS <link>/<script>
 * reference with `?v=<8-char hash of that file's contents>`. Only files whose
 * contents actually changed get a new hash, so unchanged assets stay cached.
 *
 * Idempotent: re-running with no asset changes produces no diff.
 * Runs in CI (see .github/workflows/deploy.yml) before each deploy, and can be
 * run by hand: `node stamp-assets.mjs`.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));

// (href|src)="<path>.(css|js)" with optional existing ?v=..., local paths only.
const REF_RE = /((?:href|src)=")(\/?(?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?(")/g;

const hashCache = new Map();
async function hashOf(relPath) {
  if (hashCache.has(relPath)) return hashCache.get(relPath);
  const abs = join(ROOT, relPath.replace(/^\//, ''));
  const buf = await readFile(abs); // throws if a referenced asset is missing — fail loud
  const h = createHash('sha1').update(buf).digest('hex').slice(0, 8);
  hashCache.set(relPath, h);
  return h;
}

const htmlFiles = (await readdir(ROOT)).filter((f) => f.endsWith('.html'));
let totalRefs = 0;
let changedFiles = 0;

for (const f of htmlFiles) {
  const src = await readFile(join(ROOT, f), 'utf8');
  const matches = [...src.matchAll(REF_RE)];
  if (!matches.length) continue;

  // hash all referenced assets first (async), then do the sync replace
  const hashes = new Map();
  for (const m of matches) hashes.set(m[2], await hashOf(m[2]));

  let count = 0;
  const out = src.replace(REF_RE, (_, a, path, c) => {
    count++;
    return `${a}${path}?v=${hashes.get(path)}${c}`;
  });
  totalRefs += count;
  if (out !== src) {
    await writeFile(join(ROOT, f), out);
    changedFiles++;
  }
  console.log(`${f}: ${count} refs stamped`);
}

console.log(`\nDone. ${totalRefs} references across ${htmlFiles.length} pages; ${changedFiles} file(s) rewritten.`);

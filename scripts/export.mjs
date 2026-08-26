#!/usr/bin/env node
// Usage: node scripts/export.mjs --doc <path/to/slug.md>
// Writes <slug>.html next to the doc with every panel image inlined.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { exportStorybook } from './lib/export.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = {}; const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  if (!a.doc) { console.error('usage: export.mjs --doc <slug.md>'); process.exit(2); }
  console.log(JSON.stringify(exportStorybook(a.doc)));
}

#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { loadDesign } from './lib/design.mjs';
import { detectBackend, generate } from './lib/backends.mjs';

const [, , cmd, ...rest] = process.argv;
const opt = {}; const refs = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--ref') refs.push(rest[++i]);
  else if (rest[i].startsWith('--')) opt[rest[i].slice(2)] = rest[++i];
}
const cwd = opt.cwd || process.cwd();
const design = loadDesign(cwd);

if (cmd === 'detect') {
  const b = detectBackend({ pinned: design.output.backend });
  console.log(`backend: ${b.note}`);
} else if (cmd === 'generate') {
  const b = detectBackend({ pinned: design.output.backend });
  const prompt = readFileSync(opt['prompt-file'], 'utf8');
  const r = await generate({ backend: b.name, prompt, refs, out: opt.out, cwd });
  console.log(JSON.stringify(r));
} else {
  console.error('usage: backend.mjs detect | generate --prompt-file P --out OUT [--ref R]...');
  process.exit(2);
}

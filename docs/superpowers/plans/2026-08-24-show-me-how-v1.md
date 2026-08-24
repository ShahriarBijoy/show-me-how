# show-me-how v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Claude Code plugin with `/show-me-how:init`, `/show-me-how:explain`, `/show-me-how:write-doc` that turns repo knowledge into mascot-illustrated plain-language docs.

**Architecture:** Thin command skills gather input and hand off to one engine skill (`illustrate`) that plans shots, drives an image backend (codex CLI or manual), and overlays labels with a Node script. Brand comes from a `design.md` in the user's repo; defaults are mascot "Flow" + Caveat font.

**Tech Stack:** Claude Code plugin (markdown skills), Node ≥18 ESM, `sharp` for compositing, `node:test` for tests, codex CLI (`image_gen`) as v1 image backend.

**Spec:** `docs/superpowers/specs/2026-08-24-show-me-how-design.md`

## Global Constraints

- Node ≥18; only runtime dependency is `sharp`. Tests use built-in `node:test`.
- Plugin name `show-me-how`; commands are `skills/<name>/SKILL.md` with `disable-model-invocation: true` (docs mark `commands/` legacy; UX is identical: `/show-me-how:<name>`).
- Scripts are invoked from skills as `node "${CLAUDE_PLUGIN_ROOT}/scripts/<file>.mjs"`; scripts never read `design.md` themselves except via `scripts/lib/design.mjs`.
- Default output folder `docs/show-me-how/<topic-slug>/`; slugs derived from topic, never numbered.
- Colors: `flow` `#F28C28`, `warn` `#D93025`, `note` `#1A73E8`; default font Caveat (OFL); default mascot Flow.
- Image rules: 16:9, pure white background, no text in image (labels overlaid), mascot performs the core action.
- v1 backends: `codex`, `manual`. Detected backend printed once per run.
- License MIT; `NOTICE.md` credits `helloianneo/ian-xiaohei-illustrations`.
- Windows dev machine: use forward slashes in Node paths; no shell-specific syntax inside scripts.

## File Structure

```
show-me-how/
├── .claude-plugin/plugin.json
├── package.json                      "type":"module", test script, sharp dep
├── skills/
│   ├── illustrate/SKILL.md           engine (model-invocable)
│   ├── illustrate/references/{style-dna,mascot-flow,composition-patterns,prompt-template,qa-checklist,backends}.md
│   ├── init/SKILL.md                 /show-me-how:init
│   ├── explain/SKILL.md              /show-me-how:explain
│   └── write-doc/SKILL.md            /show-me-how:write-doc
├── scripts/
│   ├── lib/design.mjs                parse/load design.md + defaults
│   ├── lib/slug.mjs                  slugify
│   ├── lib/backends.mjs              detect + adapters
│   ├── design.mjs                    CLI: print resolved design as JSON
│   ├── backend.mjs                   CLI: detect | generate
│   └── label.mjs                     CLI: overlay labels
├── templates/design.md
├── assets/fonts/Caveat-Regular.ttf
├── assets/flow/{front,working,stuck}.png
├── test/{design,slug,backends,label}.test.mjs
├── test/fixtures/
├── examples/
├── README.md, NOTICE.md, LICENSE
```

---

### Task 0: Scaffold repo, plugin manifest, test harness

**Files:**
- Create: `.gitignore`, `.claude-plugin/plugin.json`, `package.json`, `LICENSE`, `NOTICE.md`, `README.md` (stub), `test/smoke.test.mjs`

- [ ] **Step 1: git init and ignore file**

```bash
cd W:/personal-code/show-me-how
git init -b main
printf 'node_modules/\n.show-me-how-tmp/\n' > .gitignore
```

- [ ] **Step 2: plugin manifest**

`.claude-plugin/plugin.json`:
```json
{
  "name": "show-me-how",
  "description": "Explain code, features and PRs with mascot-illustrated plain-language docs. Hand-drawn style, your brand, your font.",
  "version": "0.1.0",
  "author": { "name": "Shahriar Bijoy" },
  "license": "MIT"
}
```

- [ ] **Step 3: package.json**

```json
{
  "name": "show-me-how",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": { "test": "node --test test/" },
  "dependencies": { "sharp": "^0.33.5" }
}
```

- [ ] **Step 4: LICENSE (MIT, 2026, Shahriar Bijoy) and NOTICE.md**

`NOTICE.md`:
```md
# Notice

show-me-how's illustration method (cognitive anchors, shot lists, the "mascot performs the action" rule,
style DNA, composition patterns and QA checklist) is adapted from
**Ian Xiaohei Illustrations** by Ian (伊恩): https://github.com/helloianneo/ian-xiaohei-illustrations (MIT).

The character "Xiaohei" and Ian's example images are NOT included in this plugin.
"Flow", the default mascot here, is an original character created for show-me-how.
```

- [ ] **Step 5: smoke test**

`test/smoke.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('plugin manifest is valid', () => {
  const m = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url)));
  assert.equal(m.name, 'show-me-how');
});
```

- [ ] **Step 6: install and run**

Run: `npm install && npm test`
Expected: 1 passing.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold show-me-how plugin"
```

---

### Task 1: design.md parser with defaults

**Files:**
- Create: `scripts/lib/design.mjs`, `scripts/design.mjs`, `templates/design.md`, `test/design.test.mjs`, `test/fixtures/design-custom.md`

**Interfaces:**
- Produces: `parseDesign(text: string): Design`, `loadDesign(cwd: string): Design`, `DEFAULTS: Design`.
- `Design = { mascot: {name, description, references: string[], never}, font: {labels}, colors: {flow, warn, note}, tone: string, output: {docs, backend} }`
- CLI: `node scripts/design.mjs [cwd]` prints resolved Design as JSON to stdout.

- [ ] **Step 1: template**

`templates/design.md`:
```md
# show-me-how design
# Edit any line. Delete a line to fall back to the default. Comments start with #.

## Mascot
name: Flow
description: small solid-black blob, white dot eyes, thin legs, deadpan; a serious operator doing absurd but valid work
  # Describe shape, eyes, limbs, expression. What it is NOT is as useful as what it is.
references:
  # 1-3 image paths used as style references, one per line, e.g.
  # - brand/mascot-front.png
never: cute, sparkly eyes, clothing, standing in the corner watching

## Font
labels: Caveat
  # Google Font name, a path to a .ttf/.otf, or "in-image" to let the model draw text (typos likely)

## Colors
flow: "#F28C28"    # arrows, paths, main movement
warn: "#D93025"    # problems, results, key reminders
note: "#1A73E8"    # side notes, system state

## Tone
deadpan, absurd, clean

## Output
docs: docs/show-me-how/
backend: auto      # auto | codex | manual
```

- [ ] **Step 2: failing tests**

`test/fixtures/design-custom.md`:
```md
## Mascot
name: Pip
description: orange fox
references:
  - brand/pip1.png
  - brand/pip2.png
never: scary

## Font
labels: brand/Inter.ttf

## Colors
flow: "#00AA00"

## Output
docs: docs/explainers/
backend: manual
```

`test/design.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDesign, loadDesign, DEFAULTS } from '../scripts/lib/design.mjs';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('template parses to defaults', () => {
  const d = parseDesign(readFileSync(new URL('../templates/design.md', import.meta.url), 'utf8'));
  assert.deepEqual(d, DEFAULTS);
});

test('custom overrides merge over defaults', () => {
  const d = parseDesign(fx('design-custom.md'));
  assert.equal(d.mascot.name, 'Pip');
  assert.deepEqual(d.mascot.references, ['brand/pip1.png', 'brand/pip2.png']);
  assert.equal(d.font.labels, 'brand/Inter.ttf');
  assert.equal(d.colors.flow, '#00AA00');
  assert.equal(d.colors.warn, DEFAULTS.colors.warn);
  assert.equal(d.output.docs, 'docs/explainers/');
  assert.equal(d.output.backend, 'manual');
  assert.equal(d.tone, DEFAULTS.tone);
});

test('invalid color throws a clear error', () => {
  assert.throws(() => parseDesign('## Colors\nflow: red\n'), /flow.*hex/i);
});

test('loadDesign returns defaults when file is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  assert.deepEqual(loadDesign(dir), DEFAULTS);
});

test('loadDesign reads design.md from cwd', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  writeFileSync(join(dir, 'design.md'), '## Mascot\nname: Zed\n');
  assert.equal(loadDesign(dir).mascot.name, 'Zed');
});
```

- [ ] **Step 3: run, expect failure**

Run: `node --test test/design.test.mjs`
Expected: FAIL, cannot find module `design.mjs`.

- [ ] **Step 4: implement**

`scripts/lib/design.mjs`:
```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULTS = Object.freeze({
  mascot: {
    name: 'Flow',
    description: 'small solid-black blob, white dot eyes, thin legs, deadpan; a serious operator doing absurd but valid work',
    references: [],
    never: 'cute, sparkly eyes, clothing, standing in the corner watching',
  },
  font: { labels: 'Caveat' },
  colors: { flow: '#F28C28', warn: '#D93025', note: '#1A73E8' },
  tone: 'deadpan, absurd, clean',
  output: { docs: 'docs/show-me-how/', backend: 'auto' },
});

const HEX = /^#[0-9a-fA-F]{6}$/;

function stripComment(line) {
  // remove "# ..." unless the # is inside quotes
  let out = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    if (ch === '#' && !q) break;
    out += ch;
  }
  return out.trimEnd();
}

function unquote(v) {
  v = v.trim();
  return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}

export function parseDesign(text) {
  const d = structuredClone(DEFAULTS);
  let section = '', lastKey = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    const h = line.match(/^##\s+(\w+)/);
    if (h) { section = h[1].toLowerCase(); lastKey = ''; continue; }
    if (line.startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.+)$/);
    if (item && section === 'mascot' && lastKey === 'references') { d.mascot.references.push(unquote(item[1])); continue; }
    const kv = line.match(/^\s*([\w-]+):\s*(.*)$/);
    if (kv) {
      const [, k, vRaw] = kv; const v = unquote(vRaw); lastKey = k;
      if (section === 'mascot') {
        if (k === 'references') d.mascot.references = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
        else if (k in d.mascot) d.mascot[k] = v;
      } else if (section === 'font' && k === 'labels') d.font.labels = v;
      else if (section === 'colors' && k in d.colors) {
        if (!HEX.test(v)) throw new Error(`design.md: color "${k}" must be a 6-digit hex like #F28C28, got "${v}"`);
        d.colors[k] = v.toUpperCase();
      } else if (section === 'output' && k in d.output) d.output[k] = v;
      continue;
    }
    if (section === 'tone') d.tone = line.trim();
  }
  return d;
}

export function loadDesign(cwd = process.cwd()) {
  const p = join(cwd, 'design.md');
  return existsSync(p) ? parseDesign(readFileSync(p, 'utf8')) : structuredClone(DEFAULTS);
}
```

`scripts/design.mjs`:
```js
#!/usr/bin/env node
import { loadDesign } from './lib/design.mjs';
const cwd = process.argv[2] || process.cwd();
process.stdout.write(JSON.stringify(loadDesign(cwd), null, 2) + '\n');
```

- [ ] **Step 5: run, expect pass**

Run: `node --test test/design.test.mjs`
Expected: 5 passing. (If "template parses to defaults" fails on `colors` case, ensure DEFAULTS hex values are uppercase.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: design.md parser with defaults and template"
```

---

### Task 2: slug helper

**Files:**
- Create: `scripts/lib/slug.mjs`, `test/slug.test.mjs`

**Interfaces:**
- Produces: `slugify(text: string): string`, `topicSlug(topic: string): string` (same as slugify, max 60 chars, no leading/trailing dashes), `shotFilename(n: number, title: string): string` → `01-login-before-after`.

- [ ] **Step 1: failing tests**

`test/slug.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, topicSlug, shotFilename } from '../scripts/lib/slug.mjs';

test('slugify basics', () => {
  assert.equal(slugify('Magic-link Login!'), 'magic-link-login');
  assert.equal(slugify('  Rate   Limiter (v2) '), 'rate-limiter-v2');
  assert.equal(slugify('PR 412: Add retry queue'), 'pr-412-add-retry-queue');
});

test('topicSlug caps length and trims dashes', () => {
  const long = 'a'.repeat(80);
  assert.equal(topicSlug(long).length, 60);
  assert.equal(topicSlug('--hello--'), 'hello');
  assert.equal(topicSlug(''), 'untitled');
});

test('shotFilename zero-pads', () => {
  assert.equal(shotFilename(1, 'Login before/after'), '01-login-before-after');
  assert.equal(shotFilename(12, 'x'), '12-x');
});
```

- [ ] **Step 2: run, expect failure**

Run: `node --test test/slug.test.mjs` → FAIL, module not found.

- [ ] **Step 3: implement**

`scripts/lib/slug.mjs`:
```js
export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function topicSlug(topic) {
  const s = slugify(topic).slice(0, 60).replace(/^-+|-+$/g, '');
  return s || 'untitled';
}

export function shotFilename(n, title) {
  return `${String(n).padStart(2, '0')}-${topicSlug(title)}`;
}
```

- [ ] **Step 4: run, expect pass** → 3 passing.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: slug helpers"`

---

### Task 3: backend detection and adapters (codex, manual)

**Files:**
- Create: `scripts/lib/backends.mjs`, `scripts/backend.mjs`, `test/backends.test.mjs`

**Interfaces:**
- Consumes: `loadDesign` (Task 1).
- Produces:
  - `detectBackend({ pinned = 'auto', which = defaultWhich, env = process.env }): { name: 'codex'|'manual', note: string }`
  - `generate({ backend, prompt, refs = [], out, cwd, run = defaultRun }): Promise<{ ok: boolean, backend, out, promptFile? }>`
  - CLI `node scripts/backend.mjs detect` → prints `backend: codex (ChatGPT subscription)` or `backend: manual (no image CLI found)`.
  - CLI `node scripts/backend.mjs generate --prompt-file P --out OUT [--ref R]...` → generates or writes `OUT.prompt.txt`; exits 0 either way; prints JSON result line.
- `which(cmd)` returns true if the command exists; `run(cmd, args, {cwd})` returns `{code, stdout, stderr}`.

- [ ] **Step 1: failing tests**

`test/backends.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectBackend, generate, buildCodexArgs } from '../scripts/lib/backends.mjs';

test('detect prefers codex when present', () => {
  const r = detectBackend({ which: (c) => c === 'codex' });
  assert.equal(r.name, 'codex');
  assert.match(r.note, /subscription/i);
});

test('detect falls back to manual', () => {
  assert.equal(detectBackend({ which: () => false }).name, 'manual');
});

test('pinned backend wins even if missing (error surfaces)', () => {
  assert.throws(() => detectBackend({ pinned: 'codex', which: () => false }), /codex.*not found/i);
  assert.equal(detectBackend({ pinned: 'manual', which: () => true }).name, 'manual');
});

test('buildCodexArgs includes refs and out path in prompt', () => {
  const args = buildCodexArgs({ prompt: 'draw x', refs: ['a.png', 'b.png'], out: 'raw/01.png', cwd: '/w' });
  assert.deepEqual(args.slice(0, 7), ['exec', '-C', '/w', '-s', 'workspace-write', '--skip-git-repo-check', '-i']);
  assert.ok(args.includes('a.png') && args.includes('b.png'));
  assert.match(args.at(-1), /raw\/01\.png/);
  assert.match(args.at(-1), /draw x/);
});

test('manual generate writes prompt file and returns ok=false', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const out = join(dir, '01.png');
  const r = await generate({ backend: 'manual', prompt: 'hello', out, cwd: dir });
  assert.equal(r.ok, false);
  assert.ok(existsSync(out + '.prompt.txt'));
  assert.match(readFileSync(out + '.prompt.txt', 'utf8'), /hello/);
});

test('codex generate runs codex and reports ok when file appears', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const out = join(dir, '01.png');
  const calls = [];
  const run = async (cmd, args) => { calls.push([cmd, args]); const { writeFileSync } = await import('node:fs'); writeFileSync(out, 'png'); return { code: 0, stdout: '', stderr: '' }; };
  const r = await generate({ backend: 'codex', prompt: 'p', out, cwd: dir, run });
  assert.equal(r.ok, true);
  assert.equal(calls[0][0], 'codex');
});
```

- [ ] **Step 2: run, expect failure** → module not found.

- [ ] **Step 3: implement**

`scripts/lib/backends.mjs`:
```js
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function defaultWhich(cmd) {
  const isWin = process.platform === 'win32';
  const r = spawnSyncSafe(isWin ? 'where' : 'which', [cmd]);
  return r.code === 0;
}

function spawnSyncSafe(cmd, args) {
  try {
    const { spawnSync } = requireSync();
    const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
    return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
  } catch { return { code: 1, stdout: '', stderr: '' }; }
}
function requireSync() { return { spawnSync: (await_import_hack()) }; }
// (implementer: replace the two helpers above with a plain `import { spawnSync } from 'node:child_process'` at top — kept explicit here so the intent is clear)

export function defaultRun(cmd, args, { cwd } = {}) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d); p.stderr.on('data', d => stderr += d);
    p.on('close', code => res({ code: code ?? 1, stdout, stderr }));
    p.on('error', () => res({ code: 1, stdout, stderr: 'spawn failed' }));
  });
}

export const NOTES = {
  codex: 'codex (ChatGPT subscription)',
  manual: 'manual (no image CLI found: prompts will be written to files for you to run)',
};

export function detectBackend({ pinned = 'auto', which = defaultWhich } = {}) {
  if (pinned !== 'auto') {
    if (pinned === 'codex' && !which('codex')) throw new Error('design.md pins backend: codex but `codex` was not found on PATH. Install: npm i -g @openai/codex');
    if (!(pinned in NOTES)) throw new Error(`Unknown backend "${pinned}". Use auto | codex | manual`);
    return { name: pinned, note: NOTES[pinned] };
  }
  if (which('codex')) return { name: 'codex', note: NOTES.codex };
  return { name: 'manual', note: NOTES.manual };
}

export function buildCodexArgs({ prompt, refs = [], out, cwd }) {
  const args = ['exec', '-C', cwd, '-s', 'workspace-write', '--skip-git-repo-check'];
  for (const r of refs) args.push('-i', r);
  const instruction =
    `Use the built-in image generation tool (image_gen) to generate exactly one image and save it to "${out}" ` +
    `(create parent folders if needed). Landscape 16:9. ` +
    (refs.length ? `Use the attached image(s) as style references for the mascot character. ` : '') +
    `Do not write any other files. Do not ask questions. Image prompt follows.\n\n${prompt}`;
  args.push(instruction);
  return args;
}

export async function generate({ backend, prompt, refs = [], out, cwd = process.cwd(), run = defaultRun }) {
  out = resolve(cwd, out);
  mkdirSync(dirname(out), { recursive: true });
  if (backend === 'manual') {
    const promptFile = out + '.prompt.txt';
    writeFileSync(promptFile, `# Paste into ChatGPT / Gemini / any image tool. Save the result as:\n# ${out}\n\n${prompt}\n`);
    return { ok: false, backend, out, promptFile };
  }
  if (backend === 'codex') {
    const r = await run('codex', buildCodexArgs({ prompt, refs, out, cwd }), { cwd });
    const ok = r.code === 0 && existsSync(out);
    return { ok, backend, out, stderr: ok ? undefined : (r.stderr || r.stdout).slice(-2000) };
  }
  throw new Error(`Unknown backend ${backend}`);
}
```

Implementer note: replace `defaultWhich`/`spawnSyncSafe`/`requireSync` with:
```js
import { spawnSync } from 'node:child_process';
export function defaultWhich(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8', shell: process.platform === 'win32' });
  return r.status === 0;
}
```

`scripts/backend.mjs`:
```js
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
```

- [ ] **Step 4: run, expect pass**

Run: `node --test test/backends.test.mjs` → 6 passing.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: backend detection, codex and manual adapters"`

---

### Task 4: Caveat font + label overlay script

**Files:**
- Create: `assets/fonts/Caveat-Regular.ttf`, `assets/fonts/OFL.txt`, `scripts/label.mjs`, `test/label.test.mjs`, `test/fixtures/make-fixture.mjs`

**Interfaces:**
- Consumes: `loadDesign` for font/colors when `--design-cwd` given (optional; JSON may carry them).
- Produces: `renderSvgLayer(spec, width, height): string` and `labelImage({ input, spec, out, fontPath }): Promise<{ out, svg }>`; CLI `node scripts/label.mjs --in raw/01.png --labels 01.labels.json --out 01-title.png [--font PATH]`.
- `spec = { font, colors:{flow,warn,note}, labels:[{text,x,y,kind,size?}], arrows:[{from:[x,y],to:[x,y],kind}] }`; `kind` ∈ black|flow|warn|note; x,y ∈ [0,1].

- [ ] **Step 1: fetch Caveat**

```bash
mkdir -p assets/fonts
curl -L -o assets/fonts/Caveat-Regular.ttf "https://github.com/googlefonts/caveat/raw/main/fonts/ttf/Caveat-Regular.ttf"
curl -L -o assets/fonts/OFL.txt "https://github.com/googlefonts/caveat/raw/main/OFL.txt"
ls -la assets/fonts
```
Expected: ttf > 100 KB. If the URL 404s, download from https://fonts.google.com/specimen/Caveat (Get font → zip) and copy `Caveat-Regular.ttf` (static folder).

- [ ] **Step 2: fixture generator + failing tests**

`test/fixtures/make-fixture.mjs`:
```js
import sharp from 'sharp';
export async function whitePng(path, w = 640, h = 360) {
  await sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } }).png().toFile(path);
  return path;
}
```

`test/label.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderSvgLayer, labelImage } from '../scripts/label.mjs';
import { whitePng } from './fixtures/make-fixture.mjs';

const spec = {
  font: 'Caveat',
  colors: { flow: '#F28C28', warn: '#D93025', note: '#1A73E8' },
  labels: [
    { text: 'password + 2FA', x: 0.2, y: 0.7, kind: 'black' },
    { text: '1 click', x: 0.8, y: 0.7, kind: 'flow' },
    { text: 'expiry!', x: 0.5, y: 0.9, kind: 'warn' },
  ],
  arrows: [{ from: [0.35, 0.5], to: [0.62, 0.5], kind: 'flow' }],
};

test('svg layer contains labels, colors, font and an arrow path', () => {
  const svg = renderSvgLayer(spec, 640, 360);
  assert.match(svg, /password \+ 2FA/);
  assert.match(svg, /#F28C28/); assert.match(svg, /#D93025/);
  assert.match(svg, /font-family="Caveat/);
  assert.match(svg, /<path[^>]+d="M/);
  assert.match(svg, /x="128(\.\d+)?"/); // 0.2 * 640
});

test('labelImage writes png of same size plus svg', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const input = await whitePng(join(dir, 'raw.png'));
  const out = join(dir, '01-test.png');
  const r = await labelImage({ input, spec, out });
  assert.ok(existsSync(r.out) && existsSync(r.svg));
  const meta = await sharp(r.out).metadata();
  assert.equal(meta.width, 640); assert.equal(meta.height, 360);
  const { data } = await sharp(r.out).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data.some((v, i) => i % 3 === 0 && v < 250), 'some non-white pixels drawn');
});
```

- [ ] **Step 3: run, expect failure** → module not found.

- [ ] **Step 4: implement**

`scripts/label.mjs`:
```js
#!/usr/bin/env node
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadDesign } from './lib/design.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FONT = join(HERE, '..', 'assets', 'fonts', 'Caveat-Regular.ttf');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function color(kind, colors) {
  return kind === 'flow' ? colors.flow : kind === 'warn' ? colors.warn : kind === 'note' ? colors.note : '#111111';
}

// deterministic "hand-drawn" wobble so snapshots are stable
function wobblePath(x1, y1, x2, y2, seed) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const w = 0.04 * len * Math.sin(seed * 12.9898);
  const cx = (x1 + x2) / 2 + nx * w, cy = (y1 + y2) / 2 + ny * w;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function arrowHead(x2, y2, x1, y1, size) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (t) => `${(x2 - size * Math.cos(a - t)).toFixed(1)} ${(y2 - size * Math.sin(a - t)).toFixed(1)}`;
  return `M${p(0.5)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${p(-0.5)}`;
}

export function renderSvgLayer(spec, width, height) {
  const family = spec.font && spec.font !== 'in-image' ? spec.font.replace(/\.(ttf|otf)$/i, '').split(/[\\/]/).pop() : 'Caveat';
  const base = Math.round(height * 0.06);
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  (spec.arrows || []).forEach((a, i) => {
    const [x1, y1] = [a.from[0] * width, a.from[1] * height];
    const [x2, y2] = [a.to[0] * width, a.to[1] * height];
    const c = color(a.kind, spec.colors);
    const sw = Math.max(2, Math.round(height * 0.006));
    parts.push(`<path d="${wobblePath(x1, y1, x2, y2, i + 1)}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`);
    parts.push(`<path d="${arrowHead(x2, y2, x1, y1, sw * 4)}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
  });
  for (const l of spec.labels || []) {
    const size = Math.round(base * (l.size || 1));
    parts.push(`<text x="${(l.x * width).toFixed(1)}" y="${(l.y * height).toFixed(1)}" font-family="${esc(family)}, cursive" font-size="${size}" fill="${color(l.kind, spec.colors)}" text-anchor="middle">${esc(l.text)}</text>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}

export async function labelImage({ input, spec, out, fontPath = DEFAULT_FONT }) {
  const img = sharp(input);
  const { width, height } = await img.metadata();
  const svg = renderSvgLayer(spec, width, height);
  const svgPath = out.replace(/\.png$/i, '') + '.svg';
  writeFileSync(svgPath, svg);
  // librsvg resolves fonts via fontconfig; point it at our font dir so Caveat is found
  process.env.FONTCONFIG_PATH ??= dirname(fontPath);
  await img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(out);
  return { out, svg: svgPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = {}; const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  const design = loadDesign(a['design-cwd'] || process.cwd());
  const spec = JSON.parse(readFileSync(a.labels, 'utf8'));
  spec.font ??= design.font.labels; spec.colors ??= design.colors;
  const fontPath = a.font || (/\.(ttf|otf)$/i.test(design.font.labels) ? resolve(design.font.labels) : DEFAULT_FONT);
  const r = await labelImage({ input: a.in, spec, out: a.out, fontPath });
  console.log(JSON.stringify(r));
}
```

- [ ] **Step 5: run, expect pass**

Run: `node --test test/label.test.mjs` → 2 passing.

- [ ] **Step 6: font sanity check (manual, once)**

Create `test/fixtures/fonts.conf` if Caveat does not render (text appears in a fallback font when you open the PNG):
```xml
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>../../assets/fonts</dir><cachedir>/tmp/smh-fc</cachedir></fontconfig>
```
and set `FONTCONFIG_FILE` to it in `labelImage` instead of `FONTCONFIG_PATH`. Run `node scripts/label.mjs --in <any png> --labels test/fixtures/labels.json --out /tmp/x.png` and open `/tmp/x.png`; text must look handwritten. Record which env var worked in a comment in `label.mjs`.

- [ ] **Step 7: Commit** `git add -A && git commit -m "feat: label overlay with Caveat font"`

---

### Task 5: Engine references (style, mascot, patterns, prompt, QA, backends)

**Files:**
- Create: `skills/illustrate/references/style-dna.md`, `mascot-flow.md`, `composition-patterns.md`, `prompt-template.md`, `qa-checklist.md`, `backends.md`
- Source: `reference/xiaohei-en/skill/references/*.md` (English translation, already in repo)

- [ ] **Step 1: style-dna.md** — copy `reference/xiaohei-en/skill/references/style-dna.md`, then: replace "Xiaohei" with "the mascot"; replace the color section with `flow / warn / note` names mapped to `design.md` colors; add under Must: "**No text inside the image.** Labels are added afterwards in the configured font. Ask for clear empty space next to each key object for a label."; add "16:9" → "16:9 (2048x1152 preferred)".

- [ ] **Step 2: mascot-flow.md**

```md
# Flow (default mascot)

Flow is the default character when a repo has no `design.md` mascot. If `design.md` defines a mascot, use that sheet instead and treat this file as an example of how a sheet should read.

## Appearance
- Small solid-black blob, slightly irregular hand-drawn outline.
- Two white dot eyes. No mouth unless the action needs one.
- Thin stick legs; thin arms only when holding, pulling or pushing something.
- Body can stretch, squash, become a funnel, a plug, a doorstop, a bridge segment.

## Personality
- Deadpan. Serious about absurd jobs. A low-key operator inside the system, not a spectator.
- A bit clumsy, never stupid. Dry humor, never cute.

## Duties (pick one per image)
carry, pull, push, plug, sort, weigh, cut, stitch, guard a gate, hold a ladder, get stuck in a pipe, hand something over, stamp, catch, drop.

## Never
- Cute, sparkly eyes, blush, clothing, hats, accessories.
- Standing in the corner watching.
- Multiple Flows unless the idea is about a team or a queue.

## Test
Remove Flow from the picture. If the idea still reads, Flow is decoration: rewrite so Flow performs the action.

## Reference images
`assets/flow/front.png`, `assets/flow/working.png`, `assets/flow/stuck.png` — pass these as `--ref` to the backend.
```

- [ ] **Step 3: composition-patterns.md** — copy from `reference/xiaohei-en/...`, replace "Xiaohei" with "the mascot", drop the "Anti-copy rules" bullet list of Ian's specific compositions and replace with: "Do not reuse a metaphor you used earlier in the same doc. Invent one per anchor from the article's own nouns."; add a "Dev-doc anchors" section:

```md
## Dev-doc anchors (what usually deserves a picture in a codebase)
- Before / after a change (the PR shot)
- The path a request takes (who calls whom, 3-5 nodes max)
- The one gotcha (expiry, race, retry, cache miss)
- State change (draft -> review -> merged; queued -> running -> done)
- Ownership / handoff (which service or team hands what to whom)
```

- [ ] **Step 4: prompt-template.md**

```md
# Image prompt template (no text in image)

Fill every {slot}. One prompt per shot. Send via `scripts/backend.mjs generate`.

```text
One standalone 16:9 landscape illustration, 2048x1152.

Visual DNA: pure white background. Minimal black hand-drawn line art, thin slightly wobbly pen lines. Lots of empty white space; the subject fills 40-60% of the canvas. Clean, absurd product-sketch feeling. No gradients, no shadows, no paper texture, no background scenery, no vector/corporate style, no infographic or slide look, no cute mascot poster, no children's illustration, no UI screenshots.

ABSOLUTELY NO TEXT, LETTERS, NUMBERS OR LABELS anywhere in the image. Leave clear empty space beside each key object where a label could be written later.

Recurring character (required): {mascot.name}: {mascot.description}. Never: {mascot.never}. {mascot.name} must PERFORM the core action of the idea, not stand beside it. Deadpan, slightly bizarre, not cute.

Idea to explain: {core idea, one sentence}
Structure: {before-after | flow | system-part | states | metaphor | layers | route | comic}
Scene: {where the mascot is, what it is physically doing, the 1-2 low-tech objects, how things move}
Accent color (sparingly, only for the main movement/arrow if any): {colors.flow}. Everything else black on white.
```

Retry prompt (QA failed on "mascot decorative"):
```text
Regenerate with the same idea and layout, but make {mascot.name} central: it must be doing the physical work that explains the idea. Keep white background, sparse lines, no text.
```
```

- [ ] **Step 5: qa-checklist.md** — copy from translation; replace Xiaohei; add: "No text/letters visible in the image (labels are ours)"; remove "labels readable" items (they now live in the overlay); keep iteration moves.

- [ ] **Step 6: backends.md**

```md
# Backends

Run once per session: `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect` and echo its line to the user.

| Backend | When | Cost | Refs |
|---|---|---|---|
| codex | `codex` on PATH | ChatGPT subscription | yes (`--ref`) |
| manual | otherwise | none | user's tool |

Generate one shot:
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file <dir>/raw/NN.prompt.txt --out <dir>/raw/NN.png --ref <img> [--ref <img>] --cwd <repo root>
```
Result is a JSON line. `ok:true` → continue to labels. `ok:false` with `promptFile` (manual) → tell the user: "Prompt saved to <promptFile>. Paste it into ChatGPT/Gemini, save the image as <out>, then run the command again to add labels." and continue building the doc with `![NN — pending](raw/NN.png)`. `ok:false` with `stderr` (codex failed) → show the last 5 lines of stderr and fall back to manual for this shot.

Compatible: users who have `openai/codex-plugin-cc` installed can alternatively ask `/codex:rescue` to run the same prompt; not required.
```

- [ ] **Step 7: Commit** `git add -A && git commit -m "docs: illustrate engine references"`

---

### Task 6: Engine skill `skills/illustrate/SKILL.md`

**Files:**
- Create: `skills/illustrate/SKILL.md`

**Interfaces:**
- Consumes: scripts from Tasks 1, 3, 4; references from Task 5.
- Produces: a documented contract that command skills call with a **brief block**:
  ```
  MODE: explain | write-doc
  TOPIC: <text>
  SOURCES: <list of files/commits read>
  BRIEF: <≤200 words>
  MAX_IMAGES: n
  ```

- [ ] **Step 1: write SKILL.md**

```md
---
name: illustrate
description: Engine for show-me-how. Plans 1-6 mascot illustrations for a brief, generates them via an image backend, overlays labels in the brand font, and assembles a plain-language explainer. Invoked by /show-me-how:explain and /show-me-how:write-doc; also usable when the user asks to "illustrate", "draw how X works", or "make an explainer image".
---

# illustrate

Input: a brief block (MODE, TOPIC, SOURCES, BRIEF, MAX_IMAGES). If you were not given one, build it first: read the files the user points at, write BRIEF (≤200 words: what it is, who it is for, the 3-6 ideas a reader must get), set MODE=explain, MAX_IMAGES=3.

Read once: `references/style-dna.md`, `references/composition-patterns.md`, `references/prompt-template.md`. Read `references/qa-checklist.md` after generating. Read `references/mascot-flow.md` only if `design.md` has no mascot description.

## 0. Resolve brand and backend
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.mjs"` → JSON. If `design.md` is missing, say once: "No design.md found; using Flow + Caveat defaults. Run /show-me-how:init to customize."
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect` → print the line to the user.
3. Compute `SLUG` = `node -e "import('${CLAUDE_PLUGIN_ROOT}/scripts/lib/slug.mjs').then(m=>console.log(m.topicSlug(process.argv[1])))" "<TOPIC>"`; `DIR` = `<design.output.docs>/<SLUG>` (create `DIR/raw/`).
4. Mascot refs: `design.mascot.references` if non-empty, else the three files in `${CLAUDE_PLUGIN_ROOT}/assets/flow/`.

## 1. Anchors
From BRIEF pick at most MAX_IMAGES anchors using "Dev-doc anchors" in composition-patterns.md. Do not illustrate evenly; skip ideas that are better as one sentence.

## 2. Shot list (show it, do not ask)
Print, then continue without waiting:
```
NN  <structure>   "<title>"
    <mascot>: <what it physically does>
    Labels: <2-5 short labels, ≤4 words each>
```

## 3. Draw (per shot)
1. Fill prompt-template.md → write `DIR/raw/NN.prompt.txt`.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file DIR/raw/NN.prompt.txt --out DIR/raw/NN.png --ref <each ref> --cwd <repo root>`.
3. Follow `references/backends.md` for ok:false.
4. If ok: view `DIR/raw/NN.png` (Read tool) and run qa-checklist.md. On "mascot decorative" or "text in image": one retry with the retry prompt. Otherwise accept.

## 4. Label (per successful shot)
1. Look at the PNG and write `DIR/raw/NN.labels.json`: `{ "labels": [{ "text", "x", "y", "kind" }], "arrows": [{ "from": [x,y], "to": [x,y], "kind" }] }` with x,y as 0-1 fractions in empty space next to the object they describe. `kind`: black (names), flow (movement), warn (the gotcha/result), note (side info). Max 5 labels, 2 arrows.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/label.mjs" --in DIR/raw/NN.png --labels DIR/raw/NN.labels.json --out DIR/NN-<shot-slug>.png --design-cwd <repo root>`.
3. View the result once; if a label overlaps line art, nudge x/y and rerun.

## 5. Assemble
- MODE=explain: answer in chat, ≤200 words, plain language, one image link per anchor: `![title](DIR/NN-<slug>.png)`.
- MODE=write-doc: write `DIR/README.md`:
  ```
  # <Title>
  <one-paragraph summary>
  ## <anchor 1 title>
  ![..](01-...png)
  <2-4 sentences>
  ...
  ## Sources
  - <files/commits from SOURCES>
  ```
Finish with: how many images, which backend, path to DIR, and which shots are pending (manual).
```

- [ ] **Step 2: validate plugin loads**

Run: `claude plugin validate .` → "Validation passed" (warnings acceptable). Then `claude --plugin-dir . -p "/show-me-how:illustrate is not a command; just say ok"` is optional; main check is validation.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat: illustrate engine skill"`

---

### Task 7: `/show-me-how:init`

**Files:**
- Create: `skills/init/SKILL.md`

- [ ] **Step 1: write SKILL.md**

```md
---
name: init
description: Set up show-me-how for this repo: creates design.md (mascot, font, colors, tone, output folder) and generates one test image.
disable-model-invocation: true
---

# /show-me-how:init

If `design.md` already exists in the repo root, say so and ask (one question): overwrite, or edit by hand? Stop if they choose edit.

Ask these one at a time (AskUserQuestion when available; otherwise plain questions):
1. Mascot: (a) Use Flow, the default (b) Describe your own (c) I have 1-3 reference images. For (b) ask for 1-2 sentences describing shape, eyes, limbs, expression. For (c) ask for paths, then still ask for the one-line description.
2. Font for labels: (a) Caveat, handwritten default (b) a local .ttf/.otf path (c) let the image model draw text ("in-image").
3. Colors: (a) defaults orange/red/blue (b) give three hex values for flow / warn / note.
4. Tone, 2-3 words (default "deadpan, absurd, clean").
5. Docs folder (default `docs/show-me-how/`).

Then:
1. Copy `${CLAUDE_PLUGIN_ROOT}/templates/design.md` to `./design.md` and edit the answered fields; keep all comments.
2. `cd "${CLAUDE_PLUGIN_ROOT}" && npm install --silent` if `node_modules/sharp` is missing there.
3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect` and show the line.
4. Run the `illustrate` skill with MODE=explain, TOPIC="show-me-how test", BRIEF="A mascot hands a reader one clear picture instead of three paragraphs.", MAX_IMAGES=1, output folder `<docs>/_test/`.
5. Report: design.md path, backend, test image path (or the pending prompt file for manual), and the three commands they can use next.
```

- [ ] **Step 2: manual test**

Run `claude --plugin-dir W:/personal-code/show-me-how` in a scratch repo, `/show-me-how:init`, choose all defaults. Expected: `design.md` created, backend line printed, `docs/show-me-how/_test/` contains either `01-*.png` or `raw/01.png.prompt.txt`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat: init command"`

---

### Task 8: `/show-me-how:explain`

**Files:**
- Create: `skills/explain/SKILL.md`

- [ ] **Step 1: write SKILL.md**

```md
---
name: explain
description: Explain a feature, module, or concept from this repo in plain language with 1-3 mascot illustrations.
disable-model-invocation: true
---

# /show-me-how:explain $ARGUMENTS

TOPIC = "$ARGUMENTS". If empty, ask for one topic and stop.

Gather (read-only, ≤5 files):
1. Grep the repo for the topic words (case-insensitive) in `*.md`, source files, and `docs/`; rank by match count and path relevance (README, docs/, ADRs, entry points first).
2. Read the top 5 files (or the relevant sections). Note paths as SOURCES.
3. If nothing matches, say what you searched and ask for a file or folder. Stop.

Write BRIEF (≤200 words): what it is, who uses it, the 3 ideas a newcomer must get, the one gotcha.

Invoke the `illustrate` skill with MODE=explain, TOPIC, SOURCES, BRIEF, MAX_IMAGES=3.
```

- [ ] **Step 2: manual test on this repo**

`/show-me-how:explain label overlay` → chat answer with 1-3 images (or pending prompt files) under `docs/show-me-how/label-overlay/`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat: explain command"`

---

### Task 9: `/show-me-how:write-doc`

**Files:**
- Create: `skills/write-doc/SKILL.md`

- [ ] **Step 1: write SKILL.md**

```md
---
name: write-doc
description: Write an illustrated explainer doc for a feature, folder, or recent change, saved under docs/show-me-how/<topic>/.
disable-model-invocation: true
---

# /show-me-how:write-doc $ARGUMENTS

Input resolution, in order:
1. `$ARGUMENTS` is an existing file → read it; TOPIC = its H1 or filename.
2. `$ARGUMENTS` is an existing folder → read its README/index and list its files; TOPIC = folder name.
3. `$ARGUMENTS` is free text → treat as a topic: grep like /show-me-how:explain (≤8 files).
4. Empty → `git log -20 --stat`; take the most recent coherent set of commits (same feature words); read the changed files; TOPIC = the feature words from the commit subjects. Tell the user which commits you picked.

SOURCES = files/commits read. BRIEF (≤200 words): what changed or what this is, why, how it works, what a teammate must do or know, the gotcha.

Invoke the `illustrate` skill with MODE=write-doc, TOPIC, SOURCES, BRIEF, MAX_IMAGES=6 (3 if the source is small).

After it finishes, print the doc path and a 3-line summary. Do not commit.
```

- [ ] **Step 2: manual test**

`/show-me-how:write-doc scripts/` → `docs/show-me-how/scripts/README.md` with 3-6 image sections.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat: write-doc command"`

---

### Task 10: Codex spike + Flow reference images

**Files:**
- Create: `assets/flow/front.png`, `assets/flow/working.png`, `assets/flow/stuck.png`
- Modify: `scripts/lib/backends.mjs` (only if flags differ), `skills/illustrate/references/backends.md`

- [ ] **Step 1: install codex and verify flags (15 min cap)**

```bash
npm i -g @openai/codex && codex --version && codex login
codex exec --help | grep -E "^\s+-(i|C|s)|--image|--skip-git"
```
Expected: `-i, --image <FILE>`, `-C`, `-s`, `--skip-git-repo-check` present. If `-i` is absent, remove the `-i` pairs from `buildCodexArgs` and pass refs as file paths inside the instruction text ("Reference images: a.png, b.png — open them with view_image first"); update the test in Task 3 accordingly.

- [ ] **Step 2: generate three Flow references without refs**

Create `assets/flow/prompt-front.txt` from prompt-template.md with mascot description from `mascot-flow.md`, Scene = "Flow standing alone, centered, facing the viewer, nothing else"; `prompt-working.txt` Scene = "Flow pushing a cardboard box up a short ramp"; `prompt-stuck.txt` Scene = "Flow wedged inside a bent water pipe, legs sticking out". Then:

```bash
for n in front working stuck; do node scripts/backend.mjs generate --prompt-file assets/flow/prompt-$n.txt --out assets/flow/$n.png --cwd .; done
```
View each. Accept when: white background, solid black blob, white dot eyes, thin legs, deadpan, no text. Regenerate any that fail (max 3 tries each). Ask the user to approve the three before committing.

- [ ] **Step 3: consistency check with refs**

Generate one more image with `--ref assets/flow/front.png --ref assets/flow/working.png` and Scene = "Flow weighing two boxes on a balance scale". Confirm the character matches. Delete the test image.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat: Flow reference images; verify codex backend"`

---

### Task 11: Examples, README, validation

**Files:**
- Create: `examples/README.md`, `examples/explain-label-overlay/`, `examples/write-doc-scripts/`
- Modify: `README.md`

- [ ] **Step 1: produce two real runs on this repo** (`/show-me-how:explain label overlay`, `/show-me-how:write-doc scripts/`) and copy their output folders into `examples/`. Keep `raw/` out (add `examples/**/raw/` to `.gitignore`).

- [ ] **Step 2: README.md**

Sections, in this order, each ≤10 lines except Install:
1. One-liner + one example image inline.
2. Install: `/plugin marketplace add <your-gh>/show-me-how` (once published) or `claude --plugin-dir ./show-me-how`; `cd show-me-how && npm install`.
3. Commands table (`init`, `explain`, `write-doc`) with one example each.
4. Backends: codex (subscription) → manual; how to pin in `design.md`; note `codex-plugin-cc` compatibility.
5. Brand: `design.md` fields, Flow default, bring-your-own mascot with 1-3 refs, fonts (Caveat / local file / in-image).
6. How it works: the 5-step engine in five lines.
7. Credits (Ian's repo, link) + license.

- [ ] **Step 3: validate and full test**

```bash
claude plugin validate . && npm test
```
Expected: validation passed; all tests passing (smoke 1, design 5, slug 3, backends 6, label 2 = 17).

- [ ] **Step 4: Commit** `git add -A && git commit -m "docs: README, examples; v0.1.0"` then `git tag v0.1.0`.

---

## Self-review

**Spec coverage:** §2 commands → Tasks 7/8/9 (pr-review is v1.1, excluded by spec §10). §3 layout → Task 0 + File Structure (deviation: `commands/` → `skills/`, documented in Global Constraints). §4 engine → Task 6. §5 style → Task 5. §6 design.md/init → Tasks 1, 7. §7 backends → Task 3, 10. §8 label overlay → Task 4. §9 testing → Tasks 1-4 tests, Task 11 examples. §11 credit → Task 0 NOTICE.

**Placeholders:** none; the `spawnSyncSafe` sketch in Task 3 carries an explicit replacement note.

**Type consistency:** `detectBackend` returns `{name, note}` (Tasks 3, 6); `generate` returns `{ok, backend, out, promptFile?, stderr?}` (Tasks 3, 5, 6); labels JSON shape identical in Tasks 4 and 6; `topicSlug`/`shotFilename` names match Tasks 2 and 6; CLI flags `--prompt-file/--out/--ref/--cwd` and `--in/--labels/--out/--design-cwd` match across Tasks 3, 4, 5, 6.

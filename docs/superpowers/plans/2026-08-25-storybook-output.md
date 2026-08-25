# Storybook Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every show-me-how command writes one storybook (`<slug>.md` + `NN.png` panels, nothing else), panels generate in parallel, and the repo installs via `/plugin marketplace add`.

**Architecture:** The plugin's logic is mostly prose in `skills/*/SKILL.md` that Claude follows, plus four tiny Node CLIs under `scripts/`. This plan changes one script (`label.mjs` stops writing `.svg`), rewrites the `illustrate` skill's output/scratch/parallel steps, adjusts the three command skills that call it, adds `marketplace.json`, and regenerates the two examples in the new shape.

**Tech Stack:** Node >=20.9 ESM, `sharp`, `node --test`. Claude Code plugin format (`.claude-plugin/plugin.json`, `SKILL.md` frontmatter).

**Spec:** `docs/superpowers/specs/2026-08-25-storybook-output-design.md`

## Global Constraints

- Node `>=20.9.0`; `sharp ^0.35.3` is the only runtime dependency. Do not add dependencies.
- Commit as the personal identity: every `git commit` below uses `git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit ...`.
- `backend.mjs generate` must keep exiting 0 and reporting success only via JSON `ok`. One failed panel never aborts a run.
- Skills never run `git commit`/`git add`/`gh pr comment`, and never edit the user's `.gitignore`.
- Final output folder after a fully successful run contains only `<slug>.md` and `NN.png` (zero-padded, from `01`).
- Doc shape (spec §2): `# Title`, hook, then `![title](NN.png)` + caption pairs, `**Remember:**` line, `<details><summary>Sources</summary>` block. No `##` headings anywhere. Caption ≤40 words; total prose ≤120 words for ≤3 panels, ≤180 for 4-5.
- Scratch dir is `REPO/.show-me-how/<slug>/`, deleted after a run with no pending panels.
- Run tests with `npm test` from the repo root (Windows: `npm.cmd test` from Bash works too).

---

### Task 1: `label.mjs` writes only the PNG

**Files:**
- Modify: `scripts/label.mjs:152-188` (`labelImage`)
- Modify: `scripts/label.mjs:91-95` (comment above `renderSvgLayer`)
- Test: `test/label.test.mjs`

**Interfaces:**
- Produces: `labelImage({ input, spec, out, fontPath }) -> Promise<{ out: string }>` (the `svg` key is removed). `renderSvgLayer(spec, width, height) -> string` unchanged and still exported.

- [ ] **Step 1: Change the test to assert no `.svg` sidecar**

In `test/label.test.mjs`, replace the last test (`'labelImage writes png of same size plus svg'`) with:

```js
test('labelImage writes only the png, no svg sidecar', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const input = await whitePng(join(dir, 'raw.png'));
  const out = join(dir, '01.png');
  const r = await labelImage({ input, spec, out });
  assert.deepEqual(Object.keys(r), ['out']);
  assert.ok(existsSync(r.out));
  assert.equal(existsSync(join(dir, '01.svg')), false, 'no .svg sidecar may be written');
  const meta = await sharp(r.out).metadata();
  assert.equal(meta.width, 640); assert.equal(meta.height, 360);
  const { data, info } = await sharp(r.out).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data.some((v, i) => i % info.channels === 0 && v < 250), 'some non-white pixels drawn');
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --test test/label.test.mjs`
Expected: 1 failing — `Object.keys(r)` is `['out','svg']` and `01.svg` exists.

- [ ] **Step 3: Remove the sidecar write**

In `scripts/label.mjs`, inside `labelImage`, delete these three lines:

```js
  const svg = renderSvgLayer(spec, width, height);
  const svgPath = out.replace(/\.png$/i, '') + '.svg';
  writeFileSync(svgPath, svg);
```

and change the return to `return { out };`. Remove `writeFileSync` from the `node:fs` import (keep `readFileSync`). Update the comment above `renderSvgLayer` to:

```js
// Full overlay markup: arrows + text labels. Kept as an exported pure function
// so the unit tests can assert on the label layer as a string. It is NOT what
// gets rasterized for the <text> portion -- see the comment above labelImage().
```

and in the long font-rendering note replace the sentence starting `So: renderSvgLayer() above still emits` with:

```
// So: renderSvgLayer() above still emits the full <text>-bearing SVG markup
// (asserted on as a string by tests), but labelImage() below rasterizes arrows
// via a text-free SVG through librsvg and each label via the `fontfile`
// text-create path, then composites both onto the base image.
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/label.mjs test/label.test.mjs
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "feat(label): write only the labelled png, drop svg sidecar"
```

---

### Task 2: Marketplace manifest

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Test: `test/smoke.test.mjs`

**Interfaces:**
- Produces: marketplace named `show-me-how` containing plugin `show-me-how` with `source: "./"`. Users install with `/plugin marketplace add ShahriarBijoy/show-me-how` then `/plugin install show-me-how@show-me-how`.

- [ ] **Step 1: Add the failing test**

Append to `test/smoke.test.mjs`:

```js
test('marketplace manifest lists this plugin from the repo root', () => {
  const plugin = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url)));
  const m = JSON.parse(readFileSync(new URL('../.claude-plugin/marketplace.json', import.meta.url)));
  assert.equal(m.name, 'show-me-how');
  assert.ok(m.owner && m.owner.name);
  assert.equal(m.plugins.length, 1);
  assert.equal(m.plugins[0].name, plugin.name);
  assert.equal(m.plugins[0].source, './');
  assert.equal(m.plugins[0].description, plugin.description);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/smoke.test.mjs`
Expected: FAIL — ENOENT on `marketplace.json`.

- [ ] **Step 3: Create the manifest**

`.claude-plugin/marketplace.json`:

```json
{
  "name": "show-me-how",
  "owner": { "name": "Shahriar Bijoy" },
  "metadata": {
    "description": "Explain code, features and PRs with mascot-illustrated plain-language docs."
  },
  "plugins": [
    {
      "name": "show-me-how",
      "source": "./",
      "description": "Explain code, features and PRs with mascot-illustrated plain-language docs. Hand-drawn style, your brand, your font.",
      "version": "0.1.0",
      "author": { "name": "Shahriar Bijoy" },
      "homepage": "https://github.com/ShahriarBijoy/show-me-how",
      "repository": "https://github.com/ShahriarBijoy/show-me-how",
      "license": "MIT",
      "keywords": ["illustration", "documentation", "mascot", "explainer", "codex"]
    }
  ]
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/marketplace.json test/smoke.test.mjs
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "feat: marketplace manifest so the repo installs via /plugin marketplace add"
```

---

### Task 3: Prompt template and beat sheet references

**Files:**
- Modify: `skills/illustrate/references/prompt-template.md`
- Modify: `skills/illustrate/references/composition-patterns.md:55-60` (the "Dev-doc anchors" section)

**Interfaces:**
- Produces: prompt template slot `{previous_panel}`; reference section `## Beat sheet (what each panel of a storybook does)` that Task 4's skill text points at by name.

- [ ] **Step 1: Add the `{previous_panel}` slot to the prompt template**

In `skills/illustrate/references/prompt-template.md`, inside the fenced prompt, insert this line directly after the `Scene:` line:

```text
Continuity: {previous_panel}
```

and add this paragraph after the fenced prompt, before "Retry prompt":

```markdown
`{previous_panel}` is `This is the first panel.` for panel 01. For every later panel it is: `Panel N-1 showed <one sentence: the scene and main object of the previous panel>. Same character, same drawing style, same main object where it still applies; continue the scene, but the character must now do a different physical action.`
```

- [ ] **Step 2: Replace "Dev-doc anchors" with the beat sheet**

In `skills/illustrate/references/composition-patterns.md`, replace the block from `## Dev-doc anchors (what usually deserves a picture in a codebase)` through the blank line before `## Original-metaphor method` with:

```markdown
## Beat sheet (what each panel of a storybook does)

Panels are read in order, like a short comic. Each panel is one beat:

1. **Setup** — the thing exists, or the request arrives. Establish the object and the mascot.
2. **Action** — the mechanism: what actually happens. May split into two panels for a big feature.
3. **Twist** — the gotcha, the failure, the surprising rule. Only if the brief has one.
4. **Payoff** — the result, or what the reader must now do.

Panel count -> beats: 1 = a single before/after; 2 = setup + action; 3 = setup + action + (twist or payoff); 4-5 = all beats, action may split.

Continuity rule: one mascot, one drawing style, and the main object may carry across panels. What must change every panel is the mascot's physical action. A twist panel is the one place to introduce a second object (the thing that goes wrong).

What usually earns a beat in a codebase: before/after a change; the path a request takes (3-5 nodes max); the one gotcha (expiry, race, retry, cache miss); a state change (draft -> review -> merged); an ownership handoff.
```

- [ ] **Step 3: Check nothing else references the old heading**

Run: `grep -rn "Dev-doc anchors" skills/ README.md`
Expected: only the hit in `skills/illustrate/SKILL.md` (fixed in Task 4). If README hits, note it for Task 6.

- [ ] **Step 4: Commit**

```bash
git add skills/illustrate/references/prompt-template.md skills/illustrate/references/composition-patterns.md
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "docs(illustrate): beat sheet and panel continuity slot"
```

---

### Task 4: Rewrite the `illustrate` skill

**Files:**
- Modify: `skills/illustrate/SKILL.md` (entire file)

**Interfaces:**
- Consumes: `labelImage` writing only `DIR/NN.png` (Task 1); `{previous_panel}` slot and beat sheet (Task 3); existing CLIs `design.mjs`, `backend.mjs detect|generate`, `slug.mjs`, `label.mjs` unchanged.
- Produces: brief block contract for Task 5: `MODE: explain | doc`, `TOPIC`, `SOURCES`, `BRIEF`, `MAX_IMAGES`, optional `OUTDIR`. Output: `DIR/<SLUG>.md` + `DIR/NN.png`. Finish line format printed by illustrate (Task 5 skills print things after it).

- [ ] **Step 1: Replace the file**

Write `skills/illustrate/SKILL.md` with exactly this content:

````markdown
---
name: illustrate
description: Engine for show-me-how. Plans 1-6 mascot panels for a brief as a short storybook, generates them in parallel via an image backend, overlays labels in the brand font, and writes one doc with the panels in sequence. Invoked by /show-me-how:explain, /show-me-how:write-doc and /show-me-how:pr-review; also usable when the user asks to "illustrate", "draw how X works", or "make an explainer image".
---

# illustrate

Input is a brief block:

```
MODE: explain | doc
TOPIC: <text>
SOURCES: <list of files/commits read>
BRIEF: <=200 words
MAX_IMAGES: n
OUTDIR: <optional, overrides DIR>
```

If you were not given one, build it first: read the files the user points at, write BRIEF (<=200 words: what it is, who it is for, the 3-6 ideas a reader must get, the one gotcha), set `MODE=explain`, `MAX_IMAGES=3`.

`MODE` changes only one thing: `explain` echoes the finished doc in chat (step 6); `doc` prints its path. Both always save the file.

Read once, before drawing: `references/style-dna.md`, `references/composition-patterns.md`, `references/prompt-template.md`. Read `references/qa-checklist.md` after the first image lands. Read `references/mascot-flow.md` only if `design.md` has no `## Mascot` section. Read `references/backends.md` whenever a generate call returns `ok:false`.

`REPO` below is the absolute path of the git root (`git rev-parse --show-toplevel`). Run every command from there. Never stop the run because one panel failed — mark it pending and keep going.

## 0. Resolve brand, backend, folders

Before any script call below: if `${CLAUDE_PLUGIN_ROOT}/node_modules/sharp` is missing, run `npm install --silent` with cwd `${CLAUDE_PLUGIN_ROOT}` first.

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.mjs" "REPO"` -> JSON (`mascot`, `font`, `colors`, `tone`, `output.docs`, `output.backend`). If `REPO/design.md` does not exist, say once: "No design.md found; using Flow + Caveat defaults. Run /show-me-how:init to customize."
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect --cwd "REPO"` -> prints `backend: ...`. Echo that line to the user verbatim. If the command errors instead of printing `backend:`, show the error; it means `design.md` pins a backend that is not installed. Ask them to install it or set `backend: auto`, then stop.
3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/slug.mjs" "<TOPIC>"` -> `SLUG`.
   - `DIR` = `<design.output.docs>` + `/` + `SLUG` (e.g. `docs/show-me-how/label-overlay`), or `OUTDIR` if the brief block has one.
   - `DOC` = `DIR/SLUG.md` (e.g. `docs/show-me-how/label-overlay/label-overlay.md`).
   - `SCRATCH` = `REPO/.show-me-how/SLUG`. Create `DIR` and `SCRATCH` (`mkdir -p`).
4. Mascot refs: `design.mascot.references` (repo-root-relative) if non-empty, else `${CLAUDE_PLUGIN_ROOT}/assets/flow/front.png`, `.../working.png`, `.../stuck.png`. Drop any path that does not exist; if none exist, pass no `--ref` at all — the character still comes from the prompt text.

## 1. Beats

From BRIEF pick at most `MAX_IMAGES` panels using "Beat sheet" in `references/composition-patterns.md`. Prefer fewer: skip anything that is better as one caption sentence. Panels form one continuous scene: same mascot, main object may carry over, the mascot's action must change every panel. One panel = one beat.

## 2. Panel list (show it, do not ask)

Print this, then continue without waiting for approval:

```
NN  <beat>  <structure>   "<title>"
    <mascot>: <what it physically does>
    Labels: <2-5 short labels, <=4 words each>
    Caption: <the 1-2 sentences that will sit under the panel, <=40 words>
```

`NN` is the zero-padded panel number (`01`, `02`, ...). `<beat>` is setup / action / twist / payoff.

## 3a. Launch every generation at once

1. For every panel, fill every `{slot}` of the template in `references/prompt-template.md` (including `{previous_panel}`) and write the result to `SCRATCH/NN.prompt.txt`.
2. Skip any panel whose `SCRATCH/NN.png` already exists (the user saved it by hand after a manual run); it goes straight to step 4.
3. For all remaining panels, start the generate commands **in the same turn, each in the background** (Bash `run_in_background: true`), so they run concurrently:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file "SCRATCH/NN.prompt.txt" --out "SCRATCH/NN.png" --ref "<ref1>" --ref "<ref2>" --cwd "REPO"
   ```
   Each command always exits 0. Read success from its JSON `ok` field, never from the exit code. Tell the user how many generations are running.

## 3b. Collect, in whatever order they finish

Handle each result as it arrives; do not wait for all of them before starting QA on the first.

1. `ok:false` with `promptFile` (manual backend) — collect all such panels, then tell the user once: "Prompts saved to `<promptFile>` (one per panel). Paste each into ChatGPT/Gemini, save the image as `SCRATCH/NN.png`, then re-run the same slash command; saved panels are picked up and labelled." Mark each **pending**.
2. `ok:false` with `stderr` (codex failed) — show the last 5 lines of `stderr`, then point the user at `SCRATCH/NN.prompt.txt` and the same save path with the same re-run line. Mark **pending**.
3. `ok:true` — view `SCRATCH/NN.png` with the Read tool and check it against every "Must pass" item in `references/qa-checklist.md`. If any fails, regenerate exactly once, in the background, without blocking other panels:
   - Append the matching line from "Iteration moves" in `references/qa-checklist.md` to the end of `SCRATCH/NN.prompt.txt`. For a decorative mascot, append the retry prompt from `references/prompt-template.md`. For text in the image, append a stronger no-text instruction — never the mascot-central retry text. If no move matches, append the failed "Must pass" line itself as an instruction.
   - The retry text is only ever **appended** to the original filled prompt; never sent alone.
   - Delete `SCRATCH/NN.png` first, so a failed retry cannot be reported as `ok:true` on the stale file, then run the step 3a.3 command again for that panel. If the retry is `ok:false`, handle it exactly like 3b.1/3b.2. Accept whatever the retry gives you. One retry per panel.
4. As soon as a panel's PNG is accepted, label it (step 4) — do not wait for the others.

## 4. Label (once per accepted panel)

1. Look at the PNG and write `SCRATCH/NN.labels.json`:
   ```json
   { "labels": [{ "text": "", "x": 0.0, "y": 0.0, "kind": "black" }],
     "arrows": [{ "from": [0.0, 0.0], "to": [0.0, 0.0], "kind": "flow" }] }
   ```
   `x`/`y` are 0-1 fractions of width/height, placed in empty space next to the object they describe. The canvas is about 1672x941 and a label is centred on its `x`/`y`, so keep every centre within x 0.12-0.88 and y 0.08-0.94. `kind`: `black` (names), `flow` (movement), `warn` (the gotcha or result), `note` (side info). Max 5 labels, 2 arrows. Omit `colors`/`font` — the script fills them from `design.md`.
2. Overlay:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/label.mjs" --in "SCRATCH/NN.png" --labels "SCRATCH/NN.labels.json" --out "DIR/NN.png" --design-cwd "REPO"
   ```
3. View `DIR/NN.png` once. If a label sits on line art or runs off the edge, nudge its `x`/`y` and rerun 4.2. At most one nudge per panel.

## 5. Write the storybook

Only after every panel is either labelled or pending. Write `DOC` exactly in this shape — no `##` headings anywhere, the image order is the structure:

```
# <Title>

<hook: 1-2 sentences — what this is and why the reader cares>

![<panel 1 title>](01.png)

<caption 1>

![<panel 2 title>](02.png)

<caption 2>

**Remember:** <the one gotcha, one sentence>

<details><summary>Sources</summary>

- <each file/commit from SOURCES, one per line>
</details>
```

Word budget: each caption <=40 words; hook + captions + Remember together <=120 words for up to 3 panels, <=180 for 4-5. Plain language, no jargon dumps. Image links are relative to `DIR`, so no folder prefix.

For a pending panel write `![<title> — pending](../../../.show-me-how/SLUG/NN.png)` (adjust the `../` depth so the path resolves from `DIR` to `SCRATCH`) followed by one line: `_Pending: prompt at <prompt file>._`

## 6. Clean up and finish

1. If **no** panel is pending: delete `SCRATCH` (only `REPO/.show-me-how/SLUG`, never `.show-me-how` itself). If deleting fails, say so in one line and continue. If any panel is pending, keep `SCRATCH` and say it is kept for the re-run.
2. `DIR` must now contain only `SLUG.md` and `NN.png` files. List it; if anything else is there, delete it and say what you removed.
3. `MODE=explain`: print the full contents of `DOC` in chat. `MODE=doc`: do not.
4. Print exactly: how many panels were produced, which backend was used, the path to `DOC`, and which panel numbers are pending with each one's prompt file — or "none pending". Then suggest, without editing anything: "Add `.show-me-how/` to your `.gitignore` to keep prompts and unlabelled generations out of the repo." Do not commit anything.
````

- [ ] **Step 2: Sanity-check references**

Run: `grep -n "raw/\|\.svg\|README.md\|Dev-doc anchors\|shot-slug" skills/illustrate/SKILL.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add skills/illustrate/SKILL.md
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "feat(illustrate): storybook doc, scratch dir, parallel generation"
```

---

### Task 5: Update the three command skills

**Files:**
- Modify: `skills/explain/SKILL.md` (section 3)
- Modify: `skills/write-doc/SKILL.md` (sections 3, 4)
- Modify: `skills/pr-review/SKILL.md` (frontmatter description, sections 4, 5)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: brief block `MODE: explain | doc` and outputs `DIR/<SLUG>.md`, `DIR/NN.png` from Task 4.

- [ ] **Step 1: explain**

In `skills/explain/SKILL.md`, replace the frontmatter `description` with:

```
description: Explain a feature, module, or concept from this repo as a short storybook — 1-3 mascot panels with captions — shown in chat and saved under docs/show-me-how/<topic>/<topic>.md.
```

and replace the last line of section 3 (`Let illustrate produce the chat answer and images; do not duplicate its output.`) with:

```
Illustrate prints the finished storybook in chat and saves it as `<docs>/<slug>/<slug>.md`; do not duplicate its output.
```

- [ ] **Step 2: write-doc**

In `skills/write-doc/SKILL.md`:
- In the frontmatter description, change `saved under docs/show-me-how/<topic>/.` to `saved as docs/show-me-how/<topic>/<topic>.md.`
- In section 3's brief block, change `MODE: write-doc` to `MODE: doc`.
- Replace section 4 entirely with:

```markdown
## 4. Report

After illustrate finishes, print the doc path (`DIR/<slug>.md`) and a 3-line summary of what it covers. Illustrate already suggests the `.show-me-how/` gitignore line; do not repeat it, and never edit `.gitignore`. Do not commit anything, and do not tell the user to commit it for them — leave that to them.
```

- [ ] **Step 3: pr-review**

In `skills/pr-review/SKILL.md`:
- Frontmatter description: change `saved under docs/show-me-how/pr-<n>-<slug>/.` to `saved as docs/show-me-how/pr-<n>-<slug>/pr-<n>-<slug>.md.`
- Section 4: `MAX_IMAGES = 1 if the PR touches <=2 files, else 2. Anchor preference: before/after first, then the request/data path.` becomes `MAX_IMAGES = 1 if the PR touches <=2 files, else 2. Beats: a single before/after panel, or setup (before) + payoff (after) with the request/data path as the action if there are 2.` In the brief block change `MODE: write-doc` to `MODE: doc`.
- Section 5 first line: `Illustrate writes `docs/show-me-how/pr-N-<slug>/README.md`.` becomes `Illustrate writes `docs/show-me-how/pr-N-<slug>/pr-N-<slug>.md`.`

- [ ] **Step 4: .gitignore**

Replace the line `examples/**/raw/` in `.gitignore` with `.show-me-how/`.

- [ ] **Step 5: Verify no stale references remain**

Run: `grep -rn "write-doc\b" skills/*/SKILL.md | grep -i "MODE"; grep -rn "raw/\|README.md\|\.svg" skills/`
Expected: no `MODE: write-doc`; no `raw/`, `.svg`; the only `README.md` hit is `skills/write-doc/SKILL.md` step 1.2 ("read its README/index"), which is about the user's folder and stays.

- [ ] **Step 6: Commit**

```bash
git add skills/explain/SKILL.md skills/write-doc/SKILL.md skills/pr-review/SKILL.md .gitignore
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "feat(skills): commands write <slug>.md storybooks; scratch dir gitignore hint"
```

---

### Task 6: README

**Files:**
- Modify: `README.md` (Install, Commands, How it works)

- [ ] **Step 1: Install section**

Replace the whole `## Install` section (from `## Install` to the line before `## Commands`) with:

```markdown
## Install

```
/plugin marketplace add ShahriarBijoy/show-me-how
/plugin install show-me-how@show-me-how
```

The first run installs `sharp` into the plugin folder automatically. Requires Node >=20.9.

From a clone instead (useful while hacking on the plugin):

```bash
git clone https://github.com/ShahriarBijoy/show-me-how.git
cd show-me-how && npm install
claude --plugin-dir .
```
```

- [ ] **Step 2: Commands table**

Replace the `explain` and `write-doc` rows with:

```markdown
| `/show-me-how:explain <topic>` | Explains a feature or concept as a 1-3 panel storybook, shown in chat and saved. | `/show-me-how:explain label overlay` |
| `/show-me-how:write-doc [path\|folder\|topic]` | Writes a storybook doc as `docs/show-me-how/<topic>/<topic>.md` (set `docs:` in design.md to move it). | `/show-me-how:write-doc scripts/` |
```

- [ ] **Step 3: How it works**

Replace the numbered list under `## How it works` with:

```markdown
1. Understand: read the topic's source files or commits, write a short brief.
2. Beats: pick 2-5 panels that tell it in order — setup, action, twist, payoff.
3. Panel list: print the planned panels and captions before drawing.
4. Draw: generate every panel at once, in parallel, with no text baked in.
5. Label + write: overlay labels in your brand font, then write one storybook — `docs/show-me-how/<topic>/<topic>.md` with `01.png`, `02.png`… inline. Working files live in `.show-me-how/` and are removed when the run completes.
```

Also replace, in the intro paragraph, `picks the 1–6 ideas worth a picture, has a mascot act them out in hand-drawn style, and writes the explainer with the images inline` with `picks the 2-5 beats worth a panel, has a mascot act them out in hand-drawn style, and writes a short storybook with the panels in sequence`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "docs: marketplace install, storybook output"
```

---

### Task 7: Regenerate the examples and lock the shape with a test

This task needs the `codex` CLI on PATH (or the manual backend and hand-saved PNGs). It is the end-to-end verification of Tasks 1-5.

**Files:**
- Delete: `examples/explain-label-overlay/*`, `examples/write-doc-scripts/*`
- Create: `examples/explain-label-overlay/explain-label-overlay.md` + `NN.png`, `examples/write-doc-scripts/write-doc-scripts.md` + `NN.png` (produced by the plugin)
- Modify: `examples/README.md`, `examples/hero.png`
- Create: `test/examples.test.mjs`

- [ ] **Step 1: Write the shape test first**

`test/examples.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const EXAMPLES = new URL('../examples/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const folders = readdirSync(EXAMPLES).filter((f) => statSync(join(EXAMPLES, f)).isDirectory());

test('there is at least one example storybook', () => {
  assert.ok(folders.length >= 1);
});

for (const slug of folders) {
  test(`examples/${slug} is a storybook: <slug>.md + NN.png only`, () => {
    const files = readdirSync(join(EXAMPLES, slug)).sort();
    const pngs = files.filter((f) => /^\d{2}\.png$/.test(f));
    assert.deepEqual(files, [...pngs, `${slug}.md`].sort(), `unexpected files in ${slug}: ${files}`);
    assert.ok(pngs.length >= 1);
    pngs.forEach((p, i) => assert.equal(p, `${String(i + 1).padStart(2, '0')}.png`));

    const md = readFileSync(join(EXAMPLES, slug, `${slug}.md`), 'utf8');
    assert.match(md, /^# .+/m, 'has a title');
    assert.equal(/^##\s/m.test(md), false, 'no ## headings');
    const links = [...md.matchAll(/!\[[^\]]*\]\((\d{2})\.png\)/g)].map((m) => m[1]);
    assert.deepEqual(links, pngs.map((p) => p.slice(0, 2)), 'images linked in order, relative, all present');
    assert.match(md, /^\*\*Remember:\*\* .+/m);
    assert.match(md, /<details><summary>Sources<\/summary>/);
  });
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/examples.test.mjs`
Expected: FAIL — current folders contain `NN-slug.png`/`.svg` and no `<slug>.md`.

- [ ] **Step 3: Clear the old examples**

```bash
git rm -q examples/explain-label-overlay/* examples/write-doc-scripts/*
```

- [ ] **Step 4: Regenerate through the plugin**

In a Claude Code session started with `claude --plugin-dir .` from the repo root, run each command and, when illustrate asks for nothing, let it finish:

1. `/show-me-how:explain label overlay` — then move the output: `git mv docs/show-me-how/label-overlay examples/explain-label-overlay && git mv examples/explain-label-overlay/label-overlay.md examples/explain-label-overlay/explain-label-overlay.md` (the folder is the example name; the doc is renamed to match).
2. `/show-me-how:write-doc scripts/` — then `git mv docs/show-me-how/scripts examples/write-doc-scripts && git mv examples/write-doc-scripts/scripts.md examples/write-doc-scripts/write-doc-scripts.md`.
3. `cp examples/explain-label-overlay/01.png examples/hero.png`.
4. Confirm `.show-me-how/` no longer exists (both runs had no pending panels) and `docs/show-me-how/` is empty.

- [ ] **Step 5: Update examples/README.md**

Replace the two paragraphs describing the folders with:

```markdown
**`explain-label-overlay/`** — `/show-me-how:explain label overlay`, on how
`scripts/label.mjs` puts words onto a finished picture. `explain` shows the
storybook in chat and saves it too: [`explain-label-overlay.md`](explain-label-overlay/explain-label-overlay.md)
with its panels `01.png`, `02.png`.

**`write-doc-scripts/`** — `/show-me-how:write-doc scripts/`, a storybook tour
of the plugin's four CLIs: [`write-doc-scripts.md`](write-doc-scripts/write-doc-scripts.md).
```

and change `Raw generations and prompt files are gitignored; only the labelled output ships.` to `Working files (prompts, unlabelled generations) live in `.show-me-how/` during a run and are deleted afterwards; only the storybook ships.`

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: all pass, including every `examples/<slug>` shape test.

- [ ] **Step 7: Commit**

```bash
git add examples test/examples.test.mjs
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "docs(examples): regenerate as storybooks; shape test"
```

---

### Task 8: Version bump and final check

**Files:**
- Modify: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json` (`version` -> `0.2.0`)

- [ ] **Step 1: Bump versions**

Set `"version": "0.2.0"` in all three files (`marketplace.json` has it under `plugins[0]`).

- [ ] **Step 2: Full verification**

Run: `npm test && grep -rn "raw/\|\.svg sidecar\|README.md" skills/ README.md examples/README.md`
Expected: tests pass; the grep shows only README badge `.svg` URLs and the write-doc "read its README/index" line.

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json package.json
git -c user.name=shahriarbijoy -c user.email=shahriarbijoy@gmail.com commit -m "chore: v0.2.0"
```

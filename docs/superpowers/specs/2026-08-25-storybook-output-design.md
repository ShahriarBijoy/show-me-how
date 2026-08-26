# Storybook output, parallel generation, marketplace publishing

Date: 2026-08-25. Supersedes the output-layout and `explain` sections of `2026-08-24-show-me-how-design.md`.

## Problem

- A 3-shot doc writes 16 files (`raw/NN.prompt.txt`, `raw/NN.png`, `raw/NN.labels.json`, `NN-slug.png`, `NN-slug.svg`, `README.md`). Most are scaffolding the reader never wants.
- `/show-me-how:explain` answers only in chat and leaves loose PNGs/SVGs behind with no wrapping text (see `examples/explain-label-overlay/`). Labels alone do not carry the explanation.
- `write-doc` output is an essay with `##` headings, not a sequence.
- Shots are generated strictly one at a time; each codex call takes minutes.
- The plugin cannot be installed with `/plugin install`: no `marketplace.json`.

## Goals

1. Every command produces the same artifact: one storybook — a short `<slug>.md` wrapping 2-5 labelled panels in sequence.
2. Final output folder contains only `<slug>.md` and the panel PNGs.
3. All panels generate in parallel.
4. Repo is installable as a marketplace.

Out of scope: composite comic-page image, speech bubbles, gemini backend, migrating existing docs (they are regenerated).

**Amended 2026-08-26:** no target panel count (beat sheet decides, hard cap 8); every panel gets a one-line caption baked into the PNG as a strip in the brand font plus a `###` caption line and 1-2 sentence text in the doc.

## 1. Output layout

```
<design.output.docs>/<slug>/
  <slug>.md
  01.png
  02.png
  ...
```

The doc is `<slug>.md`, named after the topic (e.g. `docs/show-me-how/label-overlay/label-overlay.md`), so it stays identifiable when opened alone or in an editor tab. Panel files are `NN.png` (no title slug — the title lives in the doc). Nothing else may remain in the folder after a fully successful run.

## 2. Doc shape (the storybook)

```
# <Title>

<hook: 1-2 sentences — what this is and why the reader cares>

![<panel 1 title>](01.png)

<caption: 1-2 sentences>

![<panel 2 title>](02.png)

<caption>

...

**Remember:** <the one gotcha, one sentence>

<details><summary>Sources</summary>

- <each file/commit from SOURCES>
</details>
```

Rules:
- No `##` headings between panels. The sequence of images is the structure.
- Caption ≤40 words. Total prose (hook + captions + remember) ≤120 words for 3 panels, ≤180 for 5.
- Pending panel: `![<title> — pending](<scratch>/NN.png)` plus one line naming the prompt file, same as today.
- `explain` prints the finished doc verbatim in chat **and** saves it. `write-doc` and `pr-review` print the path plus their existing summaries. The `MODE` field in the brief block collapses to one behaviour; it is kept only to decide whether to echo the doc in chat (`explain`) or not.

## 3. Beats instead of anchors

Illustrate step 1 becomes a beat sheet. Panels must read as a sequence with one mascot and continuous scene:

1. **Setup** — the thing exists / the request arrives.
2. **Action** — what happens (the mechanism).
3. **Twist** — the gotcha or failure, if the brief has one.
4. **Payoff** — the result / what the reader should now do.

2 panels = setup + action. 3 = + twist or payoff. 4-5 = all beats, action may split in two. `MAX_IMAGES` caps still apply (explain 3, write-doc 3 or 4-5, pr-review 1-2; a 1-panel pr-review is a single "before/after" beat).

Prompt template gets a `{previous_panel}` slot: for panel N>1, a one-line description of panel N-1's scene and object, with the instruction "same character, same style, continue the scene". Metaphor rule is relaxed from "never reuse a main object across shots" to "the main object may carry across panels; the mascot's action must change every panel".

## 4. Scratch directory

`SCRATCH = REPO/.show-me-how/<slug>/`. It holds `NN.prompt.txt`, `NN.png` (unlabelled), `NN.labels.json`, and `NN.png.prompt.txt` from the manual backend. Behaviour:

- Generate, retry, manual-resume ("save the PNG here and re-run") all operate on SCRATCH exactly as they do on `DIR/raw/` today.
- `label.mjs` reads `SCRATCH/NN.png` and writes `DIR/NN.png`. It no longer writes an `.svg` sidecar. `renderSvgLayer` stays exported for tests; the file write is removed.
- After the run, if **no** panel is pending, delete `SCRATCH` (the topic folder only, not `.show-me-how/` itself). If any panel is pending, keep it and say so.
- Finish step suggests adding `.show-me-how/` to `.gitignore` (replaces today's `raw/` suggestion). Never edits `.gitignore`.

## 5. Parallel generation

Illustrate step 3 splits into two phases:

**3a. Launch.** Write every `SCRATCH/NN.prompt.txt`, then start every `backend.mjs generate` call as a background process in one go, skipping panels whose `SCRATCH/NN.png` already exists. Capture each process's JSON result.

**3b. Collect.** As each result arrives (in any order), apply today's per-shot handling: `ok:false` → pending; `ok:true` → view, QA, at most one retry. Retries are also launched in the background so a retry on panel 1 does not block QA on panel 3. Labelling (step 4) runs per panel as soon as its final PNG is accepted.

The manual backend produces N prompt files immediately; all N panels are pending in one message rather than one at a time.

Ordering guarantee: the doc is written only after every panel is either labelled or pending.

## 6. Marketplace

Add `.claude-plugin/marketplace.json`:

```json
{
  "name": "show-me-how",
  "owner": { "name": "Shahriar Bijoy" },
  "plugins": [
    { "name": "show-me-how", "source": "./", "description": "<same as plugin.json>" }
  ]
}
```

README install section becomes:

```
/plugin marketplace add ShahriarBijoy/show-me-how
/plugin install show-me-how@show-me-how
```

with the `--plugin-dir` route kept as the "from a clone" alternative. The existing first-run `npm install` in illustrate step 0 covers the `sharp` dependency after a clone-based install.

## 7. Files touched

- `skills/illustrate/SKILL.md` — steps 0, 1, 3, 4, 5, 6 rewritten per §1-5.
- `skills/illustrate/references/prompt-template.md` — `{previous_panel}` slot.
- `skills/illustrate/references/composition-patterns.md` — beat sheet section replaces "Dev-doc anchors".
- `skills/explain/SKILL.md`, `skills/write-doc/SKILL.md`, `skills/pr-review/SKILL.md` — report steps updated; `.gitignore` suggestion updated.
- `scripts/label.mjs` — drop `.svg` write.
- `test/label.test.mjs` — assert no `.svg` is produced.
- `test/smoke.test.mjs` — assert final folder contains only `<slug>.md` + `NN.png` (fixture-driven, no backend).
- `.claude-plugin/marketplace.json` — new.
- `README.md` — install, commands, how-it-works, file layout.
- `examples/` — regenerate `explain-label-overlay` and `write-doc-scripts` in the new shape; delete their `.svg` files.
- `.gitignore` — replace `examples/**/raw/` with `.show-me-how/`.

## 8. Error handling

Unchanged contracts: `backend.mjs generate` always exits 0; one failed panel never aborts the run. New: a failure to delete SCRATCH is reported in one line and ignored.

## 9. Testing

- Unit: `label.mjs` writes only the PNG. `slug`/`design`/`backends` tests unchanged.
- Smoke: run illustrate's file-shaping logic against fixture PNGs (already in `test/fixtures/`) and assert the output folder listing and that the doc matches the §2 shape (no `##` before the Sources block, image links in order).
- Manual: `/show-me-how:explain label overlay` with codex; confirm timing drops versus sequential and the folder contains only `<slug>.md` + `0N.png`.

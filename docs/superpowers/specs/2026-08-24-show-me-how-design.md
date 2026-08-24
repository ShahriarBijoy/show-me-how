# show-me-how — Design Spec

Date: 2026-08-24
Status: approved in discussion, pending written review

## 1. What it is

A Claude Code plugin that turns code, docs and PRs into short plain-language explainers illustrated by a company mascot in a hand-drawn, white-background style. Method is ported from Ian's `ian-xiaohei-illustrations` (Chinese, Codex skill; English translation in `reference/xiaohei-en/`), generalized to: any mascot, any font, any image backend, repo-aware inputs, doc outputs.

One-liner: *instead of writing three paragraphs, let the mascot do the thing.*

Target users: (B) dev teams documenting features and PRs; (C) marketing / DevRel making explainers with brand identity.

## 2. Commands

| Command | Input | Output | Image cap |
|---|---|---|---|
| `/show-me-how:init` | interview (5 questions) | `design.md` + one test image | 1 |
| `/show-me-how:explain <topic>` | grep repo + `docs/` for topic, read top 5 files | plain-language answer in chat, images linked | 1–3 |
| `/show-me-how:write-doc [path]` | given path, or `git log -20` + changed files | `docs/show-me-how/<slug>/README.md` with inline images | 3–6 |
| `/show-me-how:pr-review <pr>` (v1.1) | `gh pr view` + `gh pr diff` | "what this PR does" summary + images; never auto-posts | 1–2 |

`pr-review` is positioned as "the picture of what the PR does", not a bug/style review.

Commands are thin (~30 lines): gather input for their mode, then invoke the `illustrate` skill.

## 3. Repository layout

```
show-me-how/
├── .claude-plugin/plugin.json
├── commands/
│   ├── init.md
│   ├── explain.md
│   ├── write-doc.md
│   └── pr-review.md            (v1.1)
├── skills/illustrate/
│   ├── SKILL.md
│   └── references/
│       ├── style-dna.md
│       ├── mascot-flow.md
│       ├── composition-patterns.md
│       ├── prompt-template.md
│       ├── qa-checklist.md
│       └── backends.md
├── scripts/
│   ├── label.mjs               PNG + labels JSON -> labelled PNG + SVG
│   └── gen-api.mjs             (v1.1) API-key backend
├── templates/design.md
├── assets/flow/                3 reference images of Flow
├── assets/fonts/Caveat.ttf     OFL
├── examples/                   3 committed real runs
├── test/
├── NOTICE.md                   credits ian-xiaohei-illustrations
└── LICENSE                     MIT
```

## 4. Engine: `skills/illustrate`

Five steps; modes change only steps 1 and 5.

1. **Understand** — write a brief (≤200 words): what it is, who it's for, the 3–6 ideas a reader must get. Source depends on mode (see §2).
2. **Anchors** — choose which ideas deserve an image. Rule: do not illustrate evenly. Anchor types: before/after, flow (A→B→C), the one gotcha, who-talks-to-whom, state change. Respect the per-mode cap.
3. **Shot list** — one block per image, printed to the user before drawing:
   ```
   01  before-after   "Login before/after magic links"
       Flow: holding a heavy keyring on the left, one key on the right
       Labels: password + 2FA / magic link / 1 click
   ```
   Metaphor recipe: abstract idea → physical action → low-tech object → mascot performs the action. Composition patterns and anti-copy rules ported from the original.
4. **Draw** — fill `prompt-template.md`; prompt demands **no text in the image** and clear space near each object for labels. Backend writes `raw/NN.png`. Run `qa-checklist.md` on the result; one automatic retry with the "make the mascot central" fix prompt on failure.
5. **Label + assemble** — Claude looks at the raw PNG and writes `NN.labels.json` (positions as 0–1 fractions). `scripts/label.mjs` renders labels/arrows in the configured font → `NN-<shot-slug>.png` + `NN.svg`. Then output per mode (§2).

Output folder: `docs/show-me-how/<topic-slug>/` (overridable in `design.md`). Slug is derived from the topic or PR title, never numbered (`magic-link-login/`, `pr-412-rate-limiter/`).

## 5. Style DNA (ported, English)

- 16:9, pure white background, thin wobbly black line art, ≥35% whitespace, subject 40–60% of canvas.
- One image = one idea. Mascot must perform the core action; if the image works without the mascot, redo.
- Colors: black = line art; `flow` (orange) = arrows/paths; `warn` (red) = problems/results; `note` (blue) = side notes/system state.
- Forbidden: PPT/infographic look, flowchart boxes, cute/childish, gradients, shadows, textures, titles in the top-left, structure-type names on the image.

## 6. Brand config: `design.md`

Zero-config always works (Flow + Caveat + defaults). If `design.md` is missing, commands print one line suggesting `/show-me-how:init` and proceed.

`init` asks 5 questions one at a time (mascot, font, colors, tone, docs folder), writes `design.md` from `templates/design.md` with comments on every field, runs one test image.

```md
# show-me-how design

## Mascot
name: Flow
description: small solid-black blob, white dot eyes, thin legs, deadpan.
  # Shape, eyes, limbs, expression. What it is NOT is as useful as what it is.
references: []            # 1-3 image paths, used as style refs
never: cute, sparkly eyes, clothing, standing in the corner watching

## Font
labels: Caveat            # Google Font name, or path to .ttf/.otf; "in-image" = let the model write text

## Colors
flow: "#F28C28"
warn: "#D93025"
note: "#1A73E8"

## Tone
deadpan, absurd, clean

## Output
docs: docs/show-me-how/
backend: auto             # auto | codex | gemini | api | manual
```

Default mascot **Flow**: solid black, white dot eyes, thin legs, deadpan, a serious operator doing absurd-but-valid work. Sheet in `mascot-flow.md`; 3 reference PNGs in `assets/flow/`.

## 7. Backends: `references/backends.md`

Interface: `(prompt, refImagePaths[], outPath) -> PNG written | loud failure`. Auto-detect order, first match wins; `design.md` `backend:` pins one. Detected backend is printed once per run, e.g. `backend: codex (ChatGPT subscription)`.

| Order | Adapter | Detect | Call | v |
|---|---|---|---|---|
| 1 | codex | `codex --version` | `codex exec` with a prompt instructing `image_gen` to write `outPath`, refs attached | v1 |
| 2 | gemini | `gemini extensions list` includes `nanobanana` | `gemini -p "/generate ... --out"` | v1.1 |
| 3 | api | `OPENAI_API_KEY` / `GEMINI_API_KEY` | `scripts/gen-api.mjs` | v1.1 |
| 4 | manual | always | write `raw/NN.prompt.txt` + instructions; doc uses `![NN — pending](raw/NN.png)` placeholders | v1 |

`manual` never errors; the doc is still produced. Docs mention `openai/codex-plugin-cc` as compatible but not required. Exact `codex exec` flags for `image_gen` + reference images are verified by a 15-minute spike at the start of implementation.

## 8. Label overlay: `scripts/label.mjs`

Node ≥18, `sharp` + inline SVG. Input `NN.labels.json`:

```json
{
  "font": "Caveat",
  "colors": { "flow": "#F28C28", "warn": "#D93025", "note": "#1A73E8" },
  "labels": [ { "text": "1 click", "x": 0.80, "y": 0.70, "kind": "flow" } ],
  "arrows": [ { "from": [0.35, 0.5], "to": [0.62, 0.5], "kind": "flow" } ]
}
```

`kind` ∈ black | flow | warn | note. Arrows get a slight hand-drawn wobble. Output: final PNG + editable SVG. Fonts: bundled Caveat; local `.ttf/.otf` path (v1); Google Font name downloaded to `~/.show-me-how/fonts/` (v1.1). `labels: in-image` skips the overlay.

`init` runs `npm install` inside the plugin folder on first use.

## 9. Testing

Automated (`npm test`):
1. `label.mjs`: fixture PNG + JSON → output exists, correct dimensions, SVG contains each label text and hex color; SVG snapshot.
2. Backend detection: mocked PATH/env → correct order; pinned backend wins.
3. `design.md` parsing: template parses; missing → defaults; invalid color → clear error.
4. Slugs: `"Magic-link Login!"` → `magic-link-login`; PR 412 → `pr-412-<title-slug>`.

Manual: `examples/` holds three committed real runs on this repo (explain, write-doc, pr-review) and doubles as the README showcase. Image taste is checked by the QA checklist at prompt level.

## 10. Scope

**v1:** `init`, `explain`, `write-doc`; backends codex + manual; Flow + 3 refs; Caveat bundled + local font; `label.mjs` + tests; 3 examples; README, NOTICE, LICENSE.

**v1.1:** `pr-review`; gemini + api backends; Google Font download.

**Later (not designed):** more models (Nano Banana Pro, gemini-omni), Confluence/Slack output, animated variants.

Estimate: v1 ≈ 3 sessions × 2–3 h; v1.1 ≈ 1 session.

## 11. Credit and license

MIT. `NOTICE.md` credits Ian (`helloianneo/ian-xiaohei-illustrations`) as the origin of the method and style DNA, per their NOTICE. Flow is our own character; Xiaohei images are not shipped in the plugin (only in `reference/`).

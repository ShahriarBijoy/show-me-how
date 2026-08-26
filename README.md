# show-me-how

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >=20.9](https://img.shields.io/badge/node-%3E%3D20.9-brightgreen.svg)](package.json)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-D97757.svg)](https://code.claude.com/docs/en/plugins)
[![Tests](https://img.shields.io/badge/tests-node%3Atest-informational.svg)](test)
[![Image backends](https://img.shields.io/badge/backends-codex%20%7C%20manual-lightgrey.svg)](skills/illustrate/references/backends.md)

Explain code, features and PRs with mascot-illustrated plain-language docs. Hand-drawn style, your brand, your font.

A Claude Code plugin. Point it at a feature, a folder, or a topic; it reads the code, breaks it into story beats (as many as it needs), has a mascot act them out in hand-drawn style, and writes a short storybook with the panels in sequence. Works with your ChatGPT subscription (via the Codex CLI) or with any image tool by hand.

![example](examples/hero.png)

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

## Commands

| Command | Does | Example |
|---|---|---|
| `/show-me-how:init` | Sets up `design.md` (mascot, font, colors, tone, output folder) and draws one test image. | `/show-me-how:init` |
| `/show-me-how:explain <topic>` | Explains a feature or concept as a storybook — as many panels as the topic needs — shown in chat and saved. | `/show-me-how:explain label overlay` |
| `/show-me-how:write-doc [path\|folder\|topic]` | Writes a storybook doc as `docs/show-me-how/<topic>/<topic>.md` (set `docs:` in design.md to move it). | `/show-me-how:write-doc scripts/` |
| `/show-me-how:pr-review [pr\|url]` | Draws "the picture of what this PR does" — never posts or commits. | `/show-me-how:pr-review 412` |

## Backends

v1 tries, in order: `codex` CLI (ChatGPT subscription, auto-detected on PATH), then falls back to manual — a prompt file is written for you to paste into ChatGPT/Gemini and save back.

Pin one instead of auto-detecting by setting `backend:` in `design.md` (`auto`, `codex`, or `manual`); `codex_model:` and `codex_reasoning:` in the same section tune which codex model runs the job and how hard it thinks (default: codex's own model at `low` effort).

If you have `openai/codex-plugin-cc` installed, `/codex:rescue` can run the same prompt; it's not required.

## Brand

`design.md` at your repo root controls the look: mascot, font, colors, tone, output folder. Run `/show-me-how:init` to create it.

- Mascot: Flow (default) — small solid-black blob, deadpan — or bring your own: a text description plus 1-3 reference images.
- Font for labels: Caveat (bundled, OFL), or a local `.ttf`/`.otf` path.
- Colors, tone, and the docs output folder are also editable fields.

### Your own character, per project

The character is read from the `design.md` in whichever repo you run the command in, so each project can have its own. Two ways to set it:

1. **Guided:** run `/show-me-how:init` in that repo. The first question offers Flow, a description of your own, or 1-3 reference images plus a description. It writes `design.md` and draws one test image so you see the character before a real doc.
2. **By hand:** create or edit `design.md` at the repo root. The mascot section looks like this:

```markdown
## Mascot
name: Pixel
description: a squat grey robot on tank treads, one big round lens for an eye, stubby claw arms; calm, methodical
references:
  - brand/pixel-front.png
  - brand/pixel-working.png
never: smiling, humanoid face, wheels instead of treads, standing idle
```

- `name` and `description` go verbatim into every image prompt ("Pixel must PERFORM the core action"), so describe shape, eyes, limbs and expression concretely.
- `references` are optional image paths relative to the repo root, passed to the backend as style anchors. Drop the list to rely on text only.
- `never` matters as much as `description`: it is what stops the model drifting into a generic cute mascot.
- Delete any line to fall back to the default.

A silhouette that reads at small size (a blob, a box, a simple robot) works better than a detailed character, because the mascot is drawn *doing* something in thin line art with no colour fill.

## How it works

1. Understand: read the topic's source files or commits, write a short brief.
2. Beats: turn it into a storyboard — setup, action, twist, payoff — one panel per beat, as many as the topic needs.
3. Panel list: print the planned panels and captions before drawing.
4. Draw: generate every panel at once, in parallel, with no text baked in.
5. Label + write: overlay labels and a caption strip in your brand font, then write one storybook — `docs/show-me-how/<topic>/<topic>.md` with `01.png`, `02.png`… inline, plus `<topic>.html` with the panels embedded: one self-contained file you can send to anyone, no markdown viewer needed. Working files live in `.show-me-how/` and are removed when the run completes.

v1.1 roadmap: `gemini` and API-key backends, Google Font downloads, and in-image labels.

## Credits

The illustration method (cognitive anchors, shot lists, the "mascot performs the action" rule, style DNA, composition patterns, QA checklist) is adapted from **Ian Xiaohei Illustrations** by Ian (伊恩): https://github.com/helloianneo/ian-xiaohei-illustrations (MIT). Flow, the default mascot, is original to show-me-how.

MIT licensed. See [NOTICE.md](NOTICE.md) for full attribution.

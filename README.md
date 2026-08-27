# show-me-how

[![Release](https://img.shields.io/github/v/release/ShahriarBijoy/show-me-how?display_name=tag&sort=semver)](https://github.com/ShahriarBijoy/show-me-how/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >=20.9](https://img.shields.io/badge/node-%3E%3D20.9-brightgreen.svg)](package.json)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-D97757.svg)](https://code.claude.com/docs/en/plugins)
[![Tests](https://img.shields.io/badge/tests-node%3Atest-informational.svg)](test)
[![Image backends](https://img.shields.io/badge/backends-codex%20%7C%20gemini--api%20%7C%20openai--api%20%7C%20openrouter%20%7C%20manual-lightgrey.svg)](skills/illustrate/references/backends.md)

Explain code, features and PRs with mascot-illustrated plain-language docs. Hand-drawn style, your brand, your font.

A Claude Code plugin. Point it at a feature, a folder, or a topic; it reads the code, breaks it into story beats (as many as it needs), has a mascot act them out in hand-drawn style, and writes a short storybook with the panels in sequence. Works with a paid ChatGPT plan (via the Codex CLI) or with any image tool by hand.

![example](examples/hero.png)

## Why this exists

I have a bit of ADHD. A long design doc or a dense README is hard for me to get through, even when I care about what's in it; the attention runs out before the paragraphs do. A picture of the idea, with a mascot acting it out, works for me like nothing else: I get it in one glance and it sticks.

That's what this tool is for. It's aimed at dev teams: people working on different features of the same project, or on different projects, who need to hand knowledge to each other. Instead of sharing a long document nobody finishes, you share a short storyboard: three to six panels, one caption each, that explain the feature, the PR or the concept. It's for the teammate who joins next week, the reviewer with 10 minutes, and anyone who reads the way I do.

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
| `/show-me-how:init` | Sets up `show-me-how.md` (mascot, font, colors, tone, output folder) and draws one test image. | `/show-me-how:init` |
| `/show-me-how:explain <topic>` | Explains a feature or concept as a storybook — as many panels as the topic needs — shown in chat and saved. | `/show-me-how:explain label overlay` |
| `/show-me-how:write-doc [path\|folder\|topic]` | Writes a storybook doc as `docs/show-me-how/<topic>/<topic>.md` (set `docs:` in show-me-how.md to move it). | `/show-me-how:write-doc scripts/` |
| `/show-me-how:pr-review [pr\|url]` | Draws "the picture of what this PR does" — never posts or commits. | `/show-me-how:pr-review 412` |

## Backends

| Backend | Needs | Cost | How it's chosen |
|---|---|---|---|
| `codex` | [Codex CLI](https://github.com/openai/codex) >= 0.149 on PATH, signed in with a **paid ChatGPT plan** (Plus or higher) | covered by your ChatGPT plan | auto-detected when installed, current and logged in |
| `gemini-api` | `GEMINI_API_KEY` in your environment ([get a key](https://aistudio.google.com/apikey)) | ~$0.03-0.13 per panel (Nano Banana 2 family; no free tier for image models) | auto-detected when the variable is set |
| `openai-api` | `OPENAI_API_KEY` in your environment ([get a key](https://platform.openai.com/api-keys)) | ~$0.01-0.30 per panel (`gpt-image-2` default; `gpt-image-1-mini` is the budget option) | auto-detected when the variable is set |
| `openrouter` | `OPENROUTER_API_KEY` in your environment ([get a key](https://openrouter.ai/keys)) | vendor list price per panel (~$0.03-0.10); one key covers Nano Banana 2, GPT Image 2, Seedream 5 and 40+ more, and every run reports the real charge | auto-detected when the variable is set |
| `manual` | any image tool you already use (ChatGPT, Gemini, ...) | none | the fallback; a prompt file is written for you to paste and save back |

Detection order for `auto` is codex, then Gemini, then OpenAI, then OpenRouter. Prices are approximate list prices as of 2026-08; each run prints its estimate. `/show-me-how:init` walks you through the choice, with the cost of each model, when nothing is detected.

Codex's built-in image tool is only available to paid ChatGPT logins; ChatGPT Free accounts and API-key logins can install codex but won't get images from it, so they should use `manual`.

Installing codex, if you have a paid plan:

```bash
npm i -g @openai/codex
codex login          # opens a browser
```

The plugin never installs codex by itself. `/show-me-how:init` checks for it and, if it's missing, too old or signed out, asks whether you want to set it up or stay on `manual`. Every command prints a `backend:` line with the same hint, so you're never left guessing why a run produced prompt files instead of pictures.

Pin one instead of auto-detecting by setting `backend:` in `show-me-how.md` (`auto`, `codex`, `gemini-api`, `openai-api`, `openrouter`, or `manual`); `image_model:` and `image_api_quality:` pick the API model and (OpenAI) quality tier; `codex_model:` and `codex_reasoning:` in the same section tune which codex model runs the job and how hard it thinks (default: codex's own model at `low` effort).

If you have `openai/codex-plugin-cc` installed, `/codex:rescue` can run the same prompt; it's not required.

## Brand

`show-me-how.md` at your repo root controls the look: mascot, font, colors, tone, output folder. Run `/show-me-how:init` to create it. (Before 0.5 the file was called `design.md`; one that starts with `# show-me-how design` is still read, and any other `design.md` in your repo is ignored.)

- Mascot: Flow (default) — small solid-black blob, deadpan — or bring your own: a text description plus 1-3 reference images.
- Font for labels: Caveat (bundled, OFL), or a local `.ttf`/`.otf` path.
- Colors, tone, and the docs output folder are also editable fields.

### Your own character, per project

The character is read from the `show-me-how.md` in whichever repo you run the command in, so each project can have its own. Two ways to set it:

1. **Guided:** run `/show-me-how:init` in that repo. The first question offers Flow, a description of your own, or 1-3 reference images plus a description. It writes `show-me-how.md` and draws one test image so you see the character before a real doc.
2. **By hand:** create or edit `show-me-how.md` at the repo root. The mascot section looks like this:

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
5. Label + write: overlay labels and a caption strip in your brand font, then write one storybook — `docs/show-me-how/<topic>/<topic>.md` with `01.webp`, `02.webp`… inline, plus `<topic>.html` with the panels embedded: one self-contained file you can send to anyone, no markdown viewer needed. Working files live in `.show-me-how/` and are removed when the run completes.

Panels are saved as WebP at full generated size (about 45 KB each instead of ~700 KB as PNG, so a five-panel HTML is ~250 KB rather than 4-5 MB). Set `image_format: png` and `image_quality:` in the `## Output` section of `show-me-how.md` if you need something else.

## Troubleshooting

**macOS: labels come out in Helvetica, not Caveat.** sharp's macOS build resolves fonts through CoreText and ignores the bundled font file, so the font has to be installed for your user once. `/show-me-how:init` offers to do this; by hand:

```sh
node "<plugin dir>/scripts/font.mjs" install     # copies the label font into ~/Library/Fonts and re-checks
# or simply: cp "<plugin dir>/assets/fonts/Caveat-Regular.ttf" ~/Library/Fonts/
```

`label.mjs` detects the fallback and prints the same hint, so a run never silently ships the wrong font. `node "<plugin dir>/scripts/font.mjs" check` tells you where you stand. The `Fontconfig error: Cannot load default config file` line sharp prints on macOS is harmless.

v1.1 roadmap: Google Font downloads and in-image labels.

## Credits

The illustration method (cognitive anchors, shot lists, the "mascot performs the action" rule, style DNA, composition patterns, QA checklist) is adapted from **Ian Xiaohei Illustrations** by Ian (伊恩): https://github.com/helloianneo/ian-xiaohei-illustrations (MIT). Flow, the default mascot, is original to show-me-how.

MIT licensed. See [NOTICE.md](NOTICE.md) for full attribution.

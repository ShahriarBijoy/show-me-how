# show-me-how

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-D97757.svg)](https://code.claude.com/docs/en/plugins)
[![Tests](https://img.shields.io/badge/tests-node%3Atest-informational.svg)](test)
[![Image backends](https://img.shields.io/badge/backends-codex%20%7C%20manual-lightgrey.svg)](skills/illustrate/references/backends.md)

Explain code, features and PRs with mascot-illustrated plain-language docs. Hand-drawn style, your brand, your font.

A Claude Code plugin. Point it at a feature, a folder, or a topic; it reads the code, picks the 1–6 ideas worth a picture, has a mascot act them out in hand-drawn style, and writes the explainer with the images inline. Works with your ChatGPT subscription (via the Codex CLI) or with any image tool by hand.

<!-- hero image added after first real run -->
![example](examples/hero.png)

## Install

For now, run without a marketplace. Clone and install dependencies first, since `claude --plugin-dir` blocks the shell:

```bash
git clone https://github.com/<your-github>/show-me-how.git
cd show-me-how
npm install
```

Then load it as a local plugin:

```bash
claude --plugin-dir .
```

Once published: `/plugin marketplace add <your-github>/show-me-how`.

Requires Node >=18.

## Commands

| Command | Does | Example |
|---|---|---|
| `/show-me-how:init` | Sets up `design.md` (mascot, font, colors, tone, output folder) and draws one test image. | `/show-me-how:init` |
| `/show-me-how:explain <topic>` | Explains a feature or concept in chat, with 1-3 illustrations. | `/show-me-how:explain label overlay` |
| `/show-me-how:write-doc [path\|folder\|topic]` | Writes an illustrated doc under `docs/show-me-how/<topic>/` (default; set `docs:` in design.md). | `/show-me-how:write-doc scripts/` |
| `/show-me-how:pr-review [pr\|url]` | Draws "the picture of what this PR does" — never posts or commits. | `/show-me-how:pr-review 412` |

## Backends

v1 tries, in order: `codex` CLI (ChatGPT subscription, auto-detected on PATH), then falls back to manual — a prompt file is written for you to paste into ChatGPT/Gemini and save back.

Pin one instead of auto-detecting by setting `backend:` in `design.md` (`auto`, `codex`, or `manual`).

If you have `openai/codex-plugin-cc` installed, `/codex:rescue` can run the same prompt; it's not required.

## Brand

`design.md` at your repo root controls the look: mascot, font, colors, tone, output folder. Run `/show-me-how:init` to create it.

- Mascot: Flow (default) — small solid-black blob, deadpan — or bring your own: a text description plus 1-3 reference images.
- Font for labels: Caveat (bundled, OFL), a local `.ttf`/`.otf` path, or `labels: in-image` to let the model draw text itself.
- Colors, tone, and the docs output folder are also editable fields.

## How it works

1. Understand: read the topic's source files or commits, write a short brief.
2. Anchors: pick the few ideas worth a picture, one fresh metaphor each.
3. Shot list: print the planned illustrations before drawing.
4. Draw: generate each shot with no text baked in.
5. Label overlay + assemble: overlay labels in your brand font, then write the images (with editable `.svg` sidecars) into the doc.

v1.1 roadmap: a `pr-review` command, `gemini` and API-key backends, and Google Font downloads.

## Credits

The illustration method (cognitive anchors, shot lists, the "mascot performs the action" rule, style DNA, composition patterns, QA checklist) is adapted from **Ian Xiaohei Illustrations** by Ian (伊恩): https://github.com/helloianneo/ian-xiaohei-illustrations (MIT). Flow, the default mascot, is original to show-me-how.

MIT licensed. See [NOTICE.md](NOTICE.md) for full attribution.

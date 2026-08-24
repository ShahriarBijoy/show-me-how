---
name: init
description: Set up show-me-how for this repo: creates design.md (mascot, font, colors, tone, output folder) and generates one test image.
disable-model-invocation: true
---

# /show-me-how:init

`REPO` = absolute path of the git root (`git rev-parse --show-toplevel`). Run every command from there.

## 0. Existing design.md

If `REPO/design.md` already exists, say so and ask one question: overwrite, or edit by hand? Use AskUserQuestion if available; otherwise ask in plain text and wait for a reply. If they choose edit, stop. Only proceed past this step on an explicit "overwrite" answer, or when no `design.md` exists yet.

## 1. Ask (one at a time)

Use AskUserQuestion when available; otherwise ask in plain text and wait for each answer before asking the next.

1. Mascot: (a) Use Flow, the default (b) Describe your own (c) I have 1-3 reference images. For (b) ask for 1-2 sentences describing shape, eyes, limbs, expression. For (c) ask for the paths, then still ask for the one-line description.
2. Font for labels: (a) Caveat, handwritten default (b) a local `.ttf`/`.otf` path (c) let the image model draw text ("in-image").
3. Colors: (a) defaults orange/red/blue (b) three hex values for flow / warn / note.
4. Tone, 2-3 words (default "deadpan, absurd, clean").
5. Docs folder (default `docs/show-me-how/`).

## 2. Write design.md

Copy `${CLAUDE_PLUGIN_ROOT}/templates/design.md` to `REPO/design.md` and edit in the answered fields; keep all comments and every field the user did not change.

## 3. Dependencies and backend

1. If `${CLAUDE_PLUGIN_ROOT}/node_modules/sharp` is missing, run `npm install --silent` with cwd `${CLAUDE_PLUGIN_ROOT}`.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect --cwd "REPO"` -> prints `backend: ...`. Show that line to the user verbatim.

## 4. Test image

`<docs>` is the `docs:` folder from the design.md just written (step 2). OUTDIR = `<docs>` with any trailing slash removed, plus `/_test` (no trailing slash, matching illustrate's DIR convention).

Invoke the `illustrate` skill (`skills/illustrate/SKILL.md`) from its step 0, with this brief block:

```
MODE: explain
TOPIC: show-me-how test
SOURCES: (none)
BRIEF: A mascot hands a reader one clear picture instead of three paragraphs.
MAX_IMAGES: 1
OUTDIR: <that value>
```

Per illustrate step 0.3, OUTDIR is used as DIR instead of the slug-derived path.

## 5. Report

Print exactly: the `design.md` path, the backend line from step 3.2, the test image path (or the pending prompt file, if generation fell back to manual), and these three next commands:

```
/show-me-how:explain <topic>
/show-me-how:write-doc <path or topic>
/show-me-how:init          (rerun any time to change design.md)
```

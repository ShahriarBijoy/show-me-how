---
name: illustrate
description: Engine for show-me-how. Plans 1-6 mascot illustrations for a brief, generates them via an image backend, overlays labels in the brand font, and assembles a plain-language explainer. Invoked by /show-me-how:explain and /show-me-how:write-doc; also usable when the user asks to "illustrate", "draw how X works", or "make an explainer image".
---

# illustrate

Input is a brief block:

```
MODE: explain | write-doc
TOPIC: <text>
SOURCES: <list of files/commits read>
BRIEF: <=200 words>
MAX_IMAGES: n
```

If you were not given one, build it first: read the files the user points at, write BRIEF (<=200 words: what it is, who it is for, the 3-6 ideas a reader must get), set `MODE=explain`, `MAX_IMAGES=3`.

Read once, before drawing: `references/style-dna.md`, `references/composition-patterns.md`, `references/prompt-template.md`. Read `references/qa-checklist.md` after the first image. Read `references/mascot-flow.md` only if `design.md` has no `## Mascot` section. Read `references/backends.md` whenever a generate call returns `ok:false`.

`REPO` below is the absolute path of the git root (`git rev-parse --show-toplevel`). Run every command from there. Never stop the run because one shot failed — mark it pending and keep going.

## 0. Resolve brand and backend

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.mjs" "REPO"` -> JSON (`mascot`, `font`, `colors`, `tone`, `output.docs`, `output.backend`). If `REPO/design.md` does not exist, say once: "No design.md found; using Flow + Caveat defaults. Run /show-me-how:init to customize."
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect --cwd "REPO"` -> prints `backend: ...`. Echo that line to the user verbatim. If the command errors instead of printing `backend:`, show the error to the user; it means `design.md` pins a backend that is not installed. Ask them to install it or set `backend: auto`, then stop.
3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/slug.mjs" "<TOPIC>"` -> `SLUG`. `DIR` = `<design.output.docs>` + `SLUG` (single `/` between them, e.g. `docs/show-me-how/label-overlay`). Create `DIR/raw/` (generate creates it anyway). If the brief block includes OUTDIR, use it as DIR instead.
4. Mascot refs: `design.mascot.references` (repo-root-relative) if non-empty, else `${CLAUDE_PLUGIN_ROOT}/assets/flow/front.png`, `.../working.png`, `.../stuck.png`. Drop any path that does not exist; if none exist, pass no `--ref` at all — the character still comes from the prompt text.

## 1. Anchors

From BRIEF pick at most `MAX_IMAGES` anchors using "Dev-doc anchors" in `references/composition-patterns.md`. Do not illustrate evenly; skip ideas that are better as one sentence. One fresh metaphor per anchor — never reuse a main object or mascot action across shots in the same doc.

## 2. Shot list (show it, do not ask)

Print this, then continue without waiting for approval:

```
NN  <structure>   "<title>"
    <mascot>: <what it physically does>
    Labels: <2-5 short labels, <=4 words each>
```

`NN` is the zero-padded shot number (`01`, `02`, ...). `<shot-slug>` below is the title slugified (lowercase, non-alphanumerics to `-`).

## 3. Draw (once per shot)

1. Fill every `{slot}` of the template in `references/prompt-template.md` and write the result to `DIR/raw/NN.prompt.txt`.
2. If `DIR/raw/NN.png` already exists (e.g. the user saved it by hand after a manual run), skip generation and go straight to step 4.
3. Generate:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file "DIR/raw/NN.prompt.txt" --out "DIR/raw/NN.png" --ref "<ref1>" --ref "<ref2>" --cwd "REPO"
   ```
   The command always exits 0. Read success from the JSON `ok` field, never from the exit code.
4. `ok:false` with `promptFile` (manual backend) — tell the user: "Prompt saved to `<promptFile>`. Paste it into ChatGPT/Gemini, save the image as `DIR/raw/NN.png`, then run the same command again; the shot will be picked up and labelled." Mark shot NN **pending**, skip step 3.6 and step 4, go to the next shot.
5. `ok:false` with `stderr` (codex failed) — show the last 5 lines of `stderr`, then fall back to manual for this shot: point the user at `DIR/raw/NN.prompt.txt` and the same save path, with the same "run the same command again" line. Mark NN **pending**, skip step 3.6 and step 4, go to the next shot.
6. `ok:true` — view `DIR/raw/NN.png` with the Read tool and check it against every "Must pass" item in `references/qa-checklist.md`. If any of them fails, regenerate exactly once:
   - Append the matching line from "Iteration moves" in `references/qa-checklist.md` to the end of the existing `DIR/raw/NN.prompt.txt`. For a decorative mascot, append the retry prompt from `references/prompt-template.md` instead. For text in the image, append a stronger no-text instruction — never the mascot-central retry text. If no move matches the failed item, append the failed "Must pass" line itself as an instruction (e.g. "Make the mascot present and performing the action").
   - The retry text is only ever **appended** to the original filled prompt; never send it on its own.
   - Delete `DIR/raw/NN.png` first, so a failed retry cannot be reported as `ok:true` on the stale file, then run step 3.3 again with the same paths. If the second attempt is also `ok:false`, handle it exactly like step 3.4/3.5 — mark the shot pending and skip step 4.
   - Accept whatever the second attempt gives you. One retry per shot, no more.

## 4. Label (once per successful shot)

1. Look at the PNG and write `DIR/raw/NN.labels.json`:
   ```json
   { "labels": [{ "text": "", "x": 0.0, "y": 0.0, "kind": "black" }],
     "arrows": [{ "from": [0.0, 0.0], "to": [0.0, 0.0], "kind": "flow" }] }
   ```
   `x`/`y` are 0-1 fractions of width/height, placed in empty space next to the object they describe. `kind`: `black` (names), `flow` (movement), `warn` (the gotcha or result), `note` (side info). Max 5 labels, 2 arrows. Omit `colors`/`font` — the script fills them from `design.md`.
2. Overlay:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/label.mjs" --in "DIR/raw/NN.png" --labels "DIR/raw/NN.labels.json" --out "DIR/NN-<shot-slug>.png" --design-cwd "REPO"
   ```
   It also writes `DIR/NN-<shot-slug>.svg`, an editable sidecar of the label layer: keep it, never link it from a doc.
3. View `DIR/NN-<shot-slug>.png` once. If a label sits on line art or runs off the edge, nudge its `x`/`y` and rerun step 4.2. At most one nudge per shot.

## 5. Assemble

The prompt file to name for a pending shot is the `promptFile` from the generate result (`raw/NN.png.prompt.txt`) after a manual run, or `raw/NN.prompt.txt` after a codex failure.

**`MODE=explain`** — answer in chat: <=200 words, plain language, no jargon dumps, one image per anchor inline in reading order:

```
![<title>](DIR/NN-<shot-slug>.png)
```

For a pending shot, write `![<title> — pending](DIR/raw/NN.png)` and name its prompt file.

**`MODE=write-doc`** — write `DIR/README.md` (image links are relative to `DIR`, so no folder prefix):

```
# <Title>

<one-paragraph plain-language summary>

## <anchor 1 title>

![<anchor 1 title>](01-<shot-slug>.png)

<2-4 sentences>

## <anchor 2 title>
...

## Sources
- <each file/commit from SOURCES>
```

Use `![<title> — pending](raw/NN.png)` for pending shots. Do not commit anything.

## 6. Finish

Print exactly four things: how many images were produced, which backend was used, the path to `DIR`, and which shot numbers are pending (manual) with each one's prompt file — the `promptFile` from its generate result, or `raw/NN.prompt.txt` after a codex failure — or "none pending".

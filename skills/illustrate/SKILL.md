---
name: illustrate
description: Engine for show-me-how. Plans 1-5 mascot panels for a brief as a short storybook, generates them in parallel via an image backend, overlays labels in the brand font, and writes one doc with the panels in sequence. Invoked by /show-me-how:explain, /show-me-how:write-doc and /show-me-how:pr-review; also usable when the user asks to "illustrate", "draw how X works", or "make an explainer image".
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

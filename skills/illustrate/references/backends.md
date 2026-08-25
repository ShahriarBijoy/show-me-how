# Backends

Run once per session: `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect --cwd "REPO"` (`REPO` = the repo root) and echo its line to the user.

| Backend | When | Cost | Refs |
|---|---|---|---|
| codex | `codex` on PATH | ChatGPT subscription | yes (`--ref`) |
| manual | otherwise | none | user's tool |

Generate one panel (`<scratch>` = `<repo>/.show-me-how/<slug>`):
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file <scratch>/NN.prompt.txt --out <scratch>/NN.png --ref <img> [--ref <img>] --cwd <repo root>
```
The CLI always exits 0; read success from the JSON `ok` field, never from the exit code.

codex runs sandboxed to the panel's output folder; it cannot write elsewhere in your repo. The codex backend requires codex >= 0.149 (`--enable image_generation`, bundled `$imagegen` skill). It reads two optional `## Output` fields from `design.md`: `codex_model:` (empty = codex's own default; passed as `-m`) and `codex_reasoning:` (default `low`; passed as `-c model_reasoning_effort=`). These pick the codex *agent* model and how hard it thinks — the image model itself is chosen by codex's built-in `image_gen` tool and is not configurable here, so `low` is usually right and cheapest.

Result is a JSON line. `ok:true` → continue to labels. `ok:false` with `promptFile` (manual) → tell the user: "Prompt saved to <promptFile>. Paste it into ChatGPT/Gemini, save the image as `<out>`, then re-run the same slash command (e.g. `/show-me-how:explain <topic>`); the saved panel is picked up and labelled." and continue building the doc with `![<title> — pending](<rel>/.show-me-how/<slug>/NN.png)` (`<rel>` = one `..` per segment of the doc folder relative to the repo root). `ok:false` with `stderr` (codex failed) → show the last 5 lines of stderr and fall back to manual for this panel.

Compatible: users who have `openai/codex-plugin-cc` installed can alternatively ask `/codex:rescue` to run the same prompt; not required.

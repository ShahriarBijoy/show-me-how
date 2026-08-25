# Backends

Run once per session: `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect --cwd "REPO"` (`REPO` = the repo root) and echo its line to the user.

| Backend | When | Cost | Refs |
|---|---|---|---|
| codex | `codex` on PATH | ChatGPT subscription | yes (`--ref`) |
| manual | otherwise | none | user's tool |

Generate one shot:
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file <dir>/raw/NN.prompt.txt --out <dir>/raw/NN.png --ref <img> [--ref <img>] --cwd <repo root>
```
The CLI always exits 0; read success from the JSON `ok` field, never from the exit code.

The codex backend requires codex >= 0.149 (`--enable image_generation`, bundled `$imagegen` skill). It reads two optional `## Output` fields from `design.md`: `codex_model:` (empty = codex's own default; passed as `-m`) and `codex_reasoning:` (default `low`; passed as `-c model_reasoning_effort=`). These pick the codex *agent* model and how hard it thinks — the image model itself is chosen by codex's built-in `image_gen` tool and is not configurable here, so `low` is usually right and cheapest.

Result is a JSON line. `ok:true` → continue to labels. `ok:false` with `promptFile` (manual) → tell the user: "Prompt saved to <promptFile>. Paste it into ChatGPT/Gemini, save the image as <out>, then run the same command again; the shot will be picked up and labelled." and continue building the doc with `![NN — pending](raw/NN.png)`. `ok:false` with `stderr` (codex failed) → show the last 5 lines of stderr and fall back to manual for this shot.

Compatible: users who have `openai/codex-plugin-cc` installed can alternatively ask `/codex:rescue` to run the same prompt; not required.

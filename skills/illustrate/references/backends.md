# Backends

Run once per session: `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect` and echo its line to the user.

| Backend | When | Cost | Refs |
|---|---|---|---|
| codex | `codex` on PATH | ChatGPT subscription | yes (`--ref`) |
| manual | otherwise | none | user's tool |

Generate one shot:
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file <dir>/raw/NN.prompt.txt --out <dir>/raw/NN.png --ref <img> [--ref <img>] --cwd <repo root>
```
Result is a JSON line. `ok:true` → continue to labels. `ok:false` with `promptFile` (manual) → tell the user: "Prompt saved to <promptFile>. Paste it into ChatGPT/Gemini, save the image as <out>, then run the command again to add labels." and continue building the doc with `![NN — pending](raw/NN.png)`. `ok:false` with `stderr` (codex failed) → show the last 5 lines of stderr and fall back to manual for this shot.

Compatible: users who have `openai/codex-plugin-cc` installed can alternatively ask `/codex:rescue` to run the same prompt; not required.

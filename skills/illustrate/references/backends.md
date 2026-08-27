# Backends

Run once per session: `node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" detect --cwd "REPO"` (`REPO` = the repo root) and echo its line to the user.

| Backend | When | Needs | Refs | Cost |
|---|---|---|---|---|
| codex | `codex` >= 0.149 on PATH **and** `codex login` done | paid ChatGPT plan (Plus or higher) -- codex's image tool is not available on Free or API-key logins | yes (`--ref`) | covered by the plan |
| gemini-api | `GEMINI_API_KEY` set | Gemini API key (https://aistudio.google.com/apikey); no free tier for image models | yes, sent as inline image parts | ~$0.03-0.13/panel by `image_model` |
| openai-api | `OPENAI_API_KEY` set | OpenAI API key (https://platform.openai.com/api-keys) | yes, via `images/edits` | ~$0.01-0.30/panel by `image_model` + `image_api_quality` |
| manual | otherwise | any image tool the user has (ChatGPT, Gemini, ...) | user's tool | -- |

`auto` picks the first ready one in that order. `detect` probes `codex --version` and `codex login status`, then checks that a key variable is present; when nothing is ready it falls back to manual and the printed line says what each candidate needs. A wrong key shows up as `HTTP 401/403 ... check GEMINI_API_KEY` on the first generate, and that panel falls back to manual. Codex is never installed on the user's behalf -- `/show-me-how:init` asks first.

`show-me-how.md ## Output` fields: `backend:` (`auto | codex | gemini-api | openai-api | manual`), `image_model:` (empty = the backend's default: `gemini-3.1-flash-image` / `gpt-image-2`), `image_api_quality:` (`low | medium | high`, openai-api only), plus the existing `codex_model:` / `codex_reasoning:`. Costs are approximate list prices as of 2026-08; the generate JSON carries `estimatedUsd` per panel for API backends.

Generate one panel (`<scratch>` = `<repo>/.show-me-how/<slug>`):
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/backend.mjs" generate --prompt-file <scratch>/NN.prompt.txt --out <scratch>/NN.png --ref <img> [--ref <img>] --cwd <repo root>
```
The CLI always exits 0; read success from the JSON `ok` field, never from the exit code.

codex runs sandboxed to the panel's output folder; it cannot write elsewhere in your repo. The codex backend requires codex >= 0.149 (`--enable image_generation`, bundled `$imagegen` skill). It reads two optional `## Output` fields from `show-me-how.md`: `codex_model:` (empty = codex's own default; passed as `-m`) and `codex_reasoning:` (default `low`; passed as `-c model_reasoning_effort=`). These pick the codex *agent* model and how hard it thinks — the image model itself is chosen by codex's built-in `image_gen` tool and is not configurable here, so `low` is usually right and cheapest.

Result is a JSON line. `ok:true` → continue to labels. `ok:false` with `promptFile` (manual) → tell the user: "Prompt saved to <promptFile>. Paste it into ChatGPT/Gemini, save the image as `<out>`, then re-run the same slash command (e.g. `/show-me-how:explain <topic>`); the saved panel is picked up and labelled." and continue building the doc with `![<title> — pending](<rel>/.show-me-how/<slug>/NN.png)` (`<rel>` = one `..` per segment of the doc folder relative to the repo root). `ok:false` with `stderr` (the backend failed) → show the last 5 lines of stderr and fall back to manual for this panel.

Compatible: users who have `openai/codex-plugin-cc` installed can alternatively ask `/codex:rescue` to run the same prompt; not required.

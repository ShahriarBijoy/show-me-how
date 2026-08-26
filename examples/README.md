# Examples

Two real runs of show-me-how on this repo, codex backend (`codex` 0.149.0,
ChatGPT subscription), default Flow + Caveat brand. Working files (prompts,
unlabelled generations) live in `.show-me-how/` during a run and are deleted
afterwards; only the storybook ships. `hero.png` is the repo showcase image: a one-off panel drawn with the same
pipeline (prompt at `assets/hero-prompt.txt`) to picture the motivation in the README.

**`explain-label-overlay/`** — `/show-me-how:explain label overlay`, on how
`scripts/label.mjs` puts words onto a finished picture. `explain` shows the
storybook in chat and saves it too: [`explain-label-overlay.md`](explain-label-overlay/explain-label-overlay.md)
with its four panels `01.png`-`04.png`, each carrying its caption strip, and `explain-label-overlay.html`, the same storybook as one shareable file.

**`write-doc-scripts/`** — `/show-me-how:write-doc scripts/`, a storybook tour
of the plugin's four CLIs in five panels: [`write-doc-scripts.md`](write-doc-scripts/write-doc-scripts.md).

`/show-me-how:pr-review` ships in v1 but has no example run here yet.

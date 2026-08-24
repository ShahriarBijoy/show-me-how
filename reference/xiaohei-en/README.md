# Ian Xiaohei Illustrations (English translation)

> Turn the judgments, workflows, states and metaphors inside an article into white-background, hand-drawn, absurd-but-clean body illustrations.
>
> 16:9 landscape | Xiaohei IP | pure-white hand-drawn | sparse red/orange/blue annotations | Codex Skill

Original (Chinese): https://github.com/helloianneo/ian-xiaohei-illustrations, MIT, author Ian (伊恩). This folder is an English translation for study. Layout: `skill/` = the installable skill (originally `ian-xiaohei-illustrations/`), `examples/` = showcase images + prompts.

---

## What this repo is

A Codex Skill that guides an AI agent to generate body illustrations for articles, posts, blogs, Notion docs and methodology content.

It is not a generic illustration prompt, and not a PPT infographic template. Core goal: first understand the article's *cognitive anchors*, then turn one judgment, workflow, structure, state or metaphor into a memorable 16:9 hand-drawn explanatory image.

The default visual IP is "Xiaohei" (小黑, "Little Black"): a small solid-black character with white dot eyes, thin legs and a blank expression. Xiaohei is not a mascot, not a sticker, not a decoration standing in the corner; it is an absurd worker seriously participating in how the system runs.

In one line: **Let AI not just "add a picture", but draw one key cognitive action from the article.**

---

## Who it's for

Good for:

- People writing articles who need body illustrations
- Knowledge, methodology, AI-workflow content
- People who want to draw abstract judgments as concrete metaphors
- People who want a style lighter, stranger and more personally recognizable than PPT infographics
- People using Codex for content production who want a stable, reusable visual language

Not for:

- Commercial illustration, brand key visuals, polished flat illustration
- Traditional PPT infographics, complex architecture diagrams or flowcharts
- Children's cartoons, cute IP, sticker/meme style
- Cramming long text or a full course page into one image
- Strictly editable vector source files

---

## What it produces

Default output:

- 16:9 landscape body illustrations
- A 4-8 item shot list per article
- Per image: theme, core idea, structure type, Xiaohei's action, suggested labels
- Final PNGs saved to `assets/<article-slug>-illustrations/`

Not by default: PPTX / PDF / Keynote, SVG / HTML editable graphics, posters, text-heavy infographics.

---

## Visual style

- Pure white background; no paper texture, beige, shadows, gradients
- Black hand-drawn line art, thin lines, slight wobble
- Lots of whitespace; subject occupies ~40-60% of the canvas
- Sparse red, orange and blue handwritten annotations
- One image = one core action, structure, state or metaphor
- Xiaohei must take part in the core action, never just decorate
- Absurd, creative, clean; not childish, not cutesy

---

## Examples (`examples/images/`)

| # | Title | Idea |
|---|---|---|
| 01 | Two breakpoints | where a pipeline breaks |
| 02 | Sort by purpose | route content by intent |
| 03 | One fish, many dishes | one raw asset -> traffic post / trust post / long-form / marketing copy, "don't publish all at once" |
| 04 | Handoff path | how a reader is led from content to the next step |
| 05 | Information well | sources settling into one well |
| 06 | Idea press | pressing raw ideas into shape |
| 07 | Content fermentation | letting content mature |
| 08 | Trust bridge | trust laid one evidence-plank at a time |

Style-calibration samples, not composition templates.

---

## Install (original Codex instructions)

```bash
git clone https://github.com/helloianneo/ian-xiaohei-illustrations.git
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R ./ian-xiaohei-illustrations "${CODEX_HOME:-$HOME/.codex}/skills/"
```

Then in Codex:

```text
Use $ian-xiaohei-illustrations to design and generate 5 absurd Xiaohei body illustrations for this article.
```

More prompts in [examples/prompts.md](examples/prompts.md).

---

## Workflow

1. Read the article, Markdown, Notion content, screenshot, or the topic the user gives
2. Extract core viewpoints, cognitive turns, workflow structures, paragraphs suited to visualization
3. Output a shot list first: one cognitive anchor per image
4. Pick a structure type per image: Workflow, System part, Before/After, Character states, Concept metaphor, Layered method, Map route, Mini comic
5. Reinvent a low-tech, absurd-but-valid physical metaphor
6. Make Xiaohei carry the core action
7. Call the image model once per image
8. Check against the QA checklist: white background, whitespace, Xiaohei's action, labels, not-PPT, not a copy of an old case
9. Save the final PNGs and report purpose and paths

---

## Notes

- The shorter the text inside the image, the more stable it is.
- One image = one core structure. Don't turn the article into a manual.
- If the image still fully works without Xiaohei, Xiaohei is too decorative.
- Example images calibrate line density, whitespace, color restraint and participation only.
- Image models may produce typos, hallucinated labels, style drift or extra titles; check after generating.
- If typos are severe, reduce the number of labels and regenerate.

---

## Notice (from NOTICE.md)

The bundled example images were generated by Ian and are included as style-calibration examples. The character "Xiaohei" is part of Ian's visual language. When redistributing or adapting, keep the `Ian Xiaohei Illustrations` name or credit Ian in derived documentation.

Author: Ian, product designer / one-person-company builder / AI builder. GitHub `helloianneo`, X `@ianneo_ai`, site www.ianneo.xyz. Related: `ian-handdrawn-ppt`, `awesome-claude-code-skills`, `obsidian-ai-second-brain`.

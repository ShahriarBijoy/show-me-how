---
name: ian-xiaohei-illustrations
description: Generate Ian-style body illustrations for articles. Use when the user asks for illustrations for an article, post, blog, Notion doc, workflow doc, methodology, process, structure, state, metaphor or viewpoint — tasks like "absurd", "Xiaohei", "hand-drawn", "body illustration", "article illustration", "illustration suggestions", "shot list", "remove title / edit image". Default to the Xiaohei IP, pure-white hand-drawn style, sparse red/orange/blue annotations, clean and simple but wildly imaginative.
---

# Ian Xiaohei Absurd Body Illustrations

## Core positioning

Design and generate 16:9 landscape body illustrations for articles. The goal is not commercial illustration, PPT infographics or cute cartoons, but to turn a key judgment, workflow, structure, state or metaphor from the article into a clean, absurd, creative, readable-but-not-a-manual hand-drawn explanatory image.

The default visual IP is "Xiaohei" (Little Black): solid black, white dot eyes, thin legs, blank expression, seriously doing something absurd but valid. Xiaohei must take part in the core action of the image, not stand beside it as decoration.

## Read these references first

Read as the task requires; don't load everything into context at once:

- `references/style-dna.md`: style DNA, colors, text, taboos.
- `references/xiaohei-ip.md`: Xiaohei's look, personality, action library and taboos.
- `references/composition-patterns.md`: structure types, original-metaphor method, anti-copy rules.
- `references/prompt-template.md`: single-image generation prompt template.
- `references/qa-checklist.md`: post-generation checks and iteration rules.
- `assets/examples/`: low-frequency visual calibration only; not in the default generation path. Do not copy their compositions, objects or labels.

## Workflow

### 1. Digest the article

Read the body text, link, Notion page, Markdown file or screenshot the user gives. Extract:

- What the core viewpoint is
- Which paragraphs carry cognitive turns
- Which content suits an image
- Which parts only suit text and need no image

Don't illustrate evenly. Prioritize "cognitive anchors", e.g.: core judgment, two breakpoints, input-to-output loop, branching/sorting, before/after contrast, one-asset-many-uses, handoff path, common pitfalls, character state change.

### 2. Output an illustration strategy first

If the user only says "analyze how to illustrate / think about where images are needed", give a shot list first. For each image state:

- Which paragraph it goes after
- The image's theme
- Core meaning
- Structure type
- What Xiaohei is doing
- Suggested elements
- Suggested labels

Default 4-8 images. Very short articles: 1-3; long articles: don't casually exceed 9. Enough is enough; don't turn the article into a picture book.

### 3. Generate one at a time

If the user explicitly asks to "generate / output / make images / help me generate", don't stop for confirmation; use the built-in `image_gen` to generate each image separately. Never combine several images into one.

Each image explains only one core structure. The prompt must include:

- 16:9 landscape body illustration
- Pure white background
- Black hand-drawn line art
- Sparse red/orange/blue handwritten annotations
- Lots of whitespace
- Xiaohei as the subject of the core action
- Forbidden: PPT, commercial illustration, childish-cute, complex architecture, a type-title in the top-left corner

Don't recreate past cases. Cases only show style density and how Xiaohei participates; don't directly reuse existing compositions like "conveyor-belt breakpoints / Xiaohei pulling lines / material fish / stamp toolbox / common-pitfalls path" unless the user explicitly asks to replicate one. Every time, reinvent a strange-but-valid metaphor from the current article.

### 4. Check and iterate

After generating, check `references/qa-checklist.md`. If any of these appear, regenerate or locally edit first:

- Xiaohei is only decoration
- The frame is too full
- Looks too much like a flowchart/PPT
- Too much text or severe typos
- A title such as "Common pitfalls / Flowchart / System architecture" in the top-left
- Style too cute, childish, rigid
- Background not clean white

### 5. Save and deliver

If the user is working inside a workspace, copy the final images to:

```text
assets/<article-slug>-illustrations/
```

Named in order:

```text
01-topic-name.png
02-topic-name.png
```

Keep the original generated files; don't overwrite existing assets unless the user explicitly asks to replace them.

## Output style

Strategy output before generating should be short and precise. Delivery after generating should include:

- How many images were generated
- Each image's purpose
- Save path
- Which images are solid, which are optional

Don't write long explanations of style theory; let the images speak.

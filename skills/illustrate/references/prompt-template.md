# Image prompt template (no text in image)

Fill every {slot}. One prompt per shot. Send via `scripts/backend.mjs generate`.

```text
One standalone 16:9 landscape illustration, 2048x1152.

Visual DNA: pure white background. Minimal black hand-drawn line art, thin slightly wobbly pen lines. Lots of empty white space; the subject fills 40-60% of the canvas. Clean, absurd product-sketch feeling. No gradients, no shadows, no paper texture, no background scenery, no vector/corporate style, no infographic or slide look, no cute mascot poster, no children's illustration, no UI screenshots.

ABSOLUTELY NO TEXT, LETTERS, NUMBERS OR LABELS anywhere in the image. Leave clear empty space beside each key object where a label could be written later.

Recurring character (required): {mascot.name}: {mascot.description}. Never: {mascot.never}. {mascot.name} must PERFORM the core action of the idea, not stand beside it. Deadpan, slightly bizarre, not cute.

Idea to explain: {core idea, one sentence}
Structure: {before-after | flow | system-part | states | metaphor | layers | route | comic}
Scene: {where the mascot is, what it is physically doing, the 1-2 low-tech objects, how things move}
Accent color (sparingly, only for the main movement/arrow if any): {colors.flow}. Everything else black on white.
```

Retry prompt (QA failed on "mascot decorative"):
```text
Regenerate with the same idea and layout, but make {mascot.name} central: it must be doing the physical work that explains the idea. Keep white background, sparse lines, no text.
```

# Image prompt template (no text in image)

Fill every {slot}. One prompt per panel. Send via `scripts/backend.mjs generate`.

```text
One standalone 16:9 landscape illustration, 2048x1152.

Visual DNA: opaque pure white background, RGB 255,255,255 -- NOT transparent, no alpha channel, the background must be painted white. Props are unfilled thin black outlines: no colour fill, no wood grain, no cross-hatching, no stippling. Minimal black hand-drawn line art, thin slightly wobbly pen lines. Lots of empty white space; the subject fills 40-60% of the canvas. Clean, absurd product-sketch feeling. No gradients, no shadows, no paper texture, no background scenery, no vector/corporate style, no infographic or slide look, no cute mascot poster, no children's illustration, no UI screenshots.

ABSOLUTELY NO TEXT, LETTERS, NUMBERS OR LABELS anywhere in the image. Leave clear empty space beside each key object where a label could be written later.

Recurring character (required): {mascot.name}: {mascot.description}. Never: {mascot.never}. {mascot.name} must PERFORM the core action of the idea, not stand beside it. Deadpan, slightly bizarre, not cute.

Idea to explain: {core idea, one sentence}
Structure: {before-after | flow | system-part | states | metaphor | layers | route | comic}
Scene: {where the mascot is, what it is physically doing, the 1-2 low-tech objects, how things move}
Continuity: {previous_panel}
Accent color (sparingly, only for the main movement/arrow if any): {colors.flow}. Everything else black on white.
```

`{previous_panel}` is `This is the first panel.` for panel 01. For every later panel it is: `Panel N-1 showed <one sentence: the scene and main object of the previous panel>. Same character, same drawing style, same main object where it still applies; continue the scene, but the character must now do a different physical action.`

Retry prompt (QA failed on "mascot decorative"):
```text
Regenerate with the same idea and layout, but make {mascot.name} central: it must be doing the physical work that explains the idea. Keep white background, sparse lines, no text.
```

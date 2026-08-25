# show-me-how design
# Edit any line. Delete a line to fall back to the default. Comments start with #.

## Mascot
name: Flow
description: small solid-black blob, white dot eyes, thin legs, deadpan; a serious operator doing absurd but valid work
  # Describe shape, eyes, limbs, expression. What it is NOT is as useful as what it is.
references:
  # 1-3 image paths used as style references, one per line, e.g.
  # - brand/mascot-front.png
never: cute, sparkly eyes, clothing, standing in the corner watching

## Font
labels: Caveat
  # Google Font name, a path to a .ttf/.otf, or "in-image" to let the model draw text (typos likely)

## Colors
flow: "#F28C28"    # arrows, paths, main movement
warn: "#D93025"    # problems, results, key reminders
note: "#1A73E8"    # side notes, system state

## Tone
deadpan, absurd, clean

## Output
docs: docs/show-me-how/
backend: auto      # auto | codex | manual
codex_model:       # codex model for image generation; empty = codex's own default
codex_reasoning: low   # codex reasoning effort: minimal | low | medium | high

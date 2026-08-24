---
name: write-doc
description: Write an illustrated explainer doc for a feature, folder, or recent change, saved under docs/show-me-how/<topic>/.
disable-model-invocation: true
---

# /show-me-how:write-doc $ARGUMENTS

Never run `git commit`, `git add`, or any other write-doc step that commits. This command only writes files under the docs folder.

## 1. Resolve input, in order

1. `$ARGUMENTS` is an existing file -> read it. TOPIC = its H1, or the filename if it has none.
2. `$ARGUMENTS` is an existing folder -> read its README/index if present, and list its files. TOPIC = the folder name.
3. `$ARGUMENTS` is free text -> treat it as a topic and grep the repo like `/show-me-how:explain` step 1, at most 8 files.
4. `$ARGUMENTS` is empty -> run `git log -20 --stat`. Pick the most recent coherent set of commits (same feature words in the subjects); read the files those commits changed. TOPIC = the feature words from those subjects. Tell the user which commits you picked, by hash and subject, before continuing.

Record every file read (and, for case 4, every commit picked) as SOURCES.

## 2. Brief

Write BRIEF (<=200 words): what changed or what this is, why, how it works, what a teammate must do or know, the gotcha.

## 3. Illustrate

Invoke the `illustrate` skill (`skills/illustrate/SKILL.md`) from its step 0, with this brief block:

```
MODE: write-doc
TOPIC: <TOPIC>
SOURCES: <the paths/commits from step 1>
BRIEF: <the text from step 2>
MAX_IMAGES: 6 (use 3 if the source material is small, e.g. a single short file)
```

## 4. Report

After illustrate finishes, print the doc path (`DIR/README.md`) and a 3-line summary of what it covers. Do not commit anything, and do not tell the user to commit it for them — leave that to them.

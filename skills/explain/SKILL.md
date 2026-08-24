---
name: explain
description: Explain a feature, module, or concept from this repo in plain language with 1-3 mascot illustrations.
disable-model-invocation: true
---

# /show-me-how:explain $ARGUMENTS

TOPIC = "$ARGUMENTS". If empty, ask the user for a topic and stop — do not guess one.

## 1. Gather (read-only, at most 5 files)

1. Grep the repo for the topic words (case-insensitive) across `*.md`, `docs/`, and code files (`*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.py`, `*.go`, `*.rs`, `*.java`, `*.cs`, `*.rb`, `*.php`), excluding `node_modules`, `dist`, `build`, and `.git`. Grep only — never edit or write during this step.
2. Rank hits: primary key is number of matching lines per file (descending); tie-break by path relevance, in this order: README > `docs/` > ADR > entry points > everything else.
3. Read the top 5 files, or just the relevant sections of larger ones. Record each path read as SOURCES.
4. If nothing matches, tell the user exactly what you searched (the terms and the globs) and ask them to point at a file or folder instead. Stop.

## 2. Brief

Write BRIEF (<=200 words): what it is, who uses it, the 3 ideas a newcomer must get, the one gotcha.

## 3. Illustrate

Invoke the `illustrate` skill (`skills/illustrate/SKILL.md`) from its step 0, with this brief block:

```
MODE: explain
TOPIC: <TOPIC>
SOURCES: <the paths from step 1.3>
BRIEF: <the text from step 2>
MAX_IMAGES: 3
```

Let illustrate produce the chat answer and images; do not duplicate its output.

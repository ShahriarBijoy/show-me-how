---
name: pr-review
description: Draw the picture of what a PR does — before/after and request-path illustrations plus a brief summary, saved under docs/show-me-how/pr-<n>-<slug>/. Not a bug/style review; see /code-review for that.
disable-model-invocation: true
---

# /show-me-how:pr-review $ARGUMENTS

This is "the picture of what this PR does" — the thing a reviewer looks at before reading the diff. It is not a bug or style review; use `/code-review` for that.

Never run `gh pr comment`, `git commit`, or `git push`. This command only reads with `gh` and writes files under the docs folder.

## 1. Resolve the PR number

1. If `$ARGUMENTS` is empty, run `gh pr view --json number` (resolves the PR for the current branch).
2. Otherwise `$ARGUMENTS` is a PR number or a full GitHub PR URL — run `gh pr view $ARGUMENTS --json number` (gh accepts either form).
3. If `gh` is not installed or not authenticated, tell the user exactly: "Run `gh auth login`, then try again." Stop.
4. If the command errors or returns no PR, stop with one line: "No PR found for `$ARGUMENTS`." (or "for the current branch" if empty).
5. `N` = the resolved `number`. `URL` = the PR's `url` (read it in step 2 along with the rest).

## 2. Gather (read-only)

1. `gh pr view N --json title,body,baseRefName,headRefName,files,additions,deletions,commits,url`
2. `gh pr diff N` — if it is more than ~1500 lines, do not read it all: read only the file list from step 1 and the first 300 lines of the diff, and note in the brief that the summary is partial.

## 3. Brief

Write BRIEF (<=200 words): what changed, why (from the body/commits), how the pieces connect, what a reviewer should look at first, the one risk.

## 4. Illustrate

MAX_IMAGES = 1 if the PR touches <=2 files, else 2. Anchor preference: before/after first, then the request/data path.

Invoke the `illustrate` skill (`skills/illustrate/SKILL.md`) from its step 0, with this brief block:

```
MODE: write-doc
TOPIC: pr-N-<title>
SOURCES: <files changed from step 2.1>, <URL>
BRIEF: <the text from step 3>
MAX_IMAGES: <1 or 2>
```

## 5. Report

Illustrate writes `docs/show-me-how/pr-N-<slug>/README.md`. After it finishes, print:
1. A 5-line "what this PR does" summary.
2. The image paths it produced.
3. The doc path.
4. This offer, without running it: "Post this as a PR comment? Run: `gh pr comment N --body-file <doc>`"

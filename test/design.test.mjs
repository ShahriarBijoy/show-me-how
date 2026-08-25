import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDesign, loadDesign, DEFAULTS } from '../scripts/lib/design.mjs';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('template parses to defaults', () => {
  const d = parseDesign(readFileSync(new URL('../templates/design.md', import.meta.url), 'utf8'));
  assert.deepEqual(d, DEFAULTS);
});

test('custom overrides merge over defaults', () => {
  const d = parseDesign(fx('design-custom.md'));
  assert.equal(d.mascot.name, 'Pip');
  assert.deepEqual(d.mascot.references, ['brand/pip1.png', 'brand/pip2.png']);
  assert.equal(d.font.labels, 'brand/Inter.ttf');
  assert.equal(d.colors.flow, '#00AA00');
  assert.equal(d.colors.warn, DEFAULTS.colors.warn);
  assert.equal(d.output.docs, 'docs/explainers/');
  assert.equal(d.output.backend, 'manual');
  assert.equal(d.tone, DEFAULTS.tone);
});

test('codex model/effort defaults', () => {
  assert.equal(DEFAULTS.output.codexModel, '');
  assert.equal(DEFAULTS.output.codexReasoning, 'low');
});

test('codex_model and codex_reasoning parse from the Output section', () => {
  const d = parseDesign(['## Output', 'codex_model: gpt-5.1-codex-max', 'codex_reasoning: medium', ''].join('\n'));
  assert.equal(d.output.codexModel, 'gpt-5.1-codex-max');
  assert.equal(d.output.codexReasoning, 'medium');
});

test('an empty codex_model keeps the codex default', () => {
  const d = parseDesign(['## Output', 'codex_model:', ''].join('\n'));
  assert.equal(d.output.codexModel, '');
});

test('invalid color throws a clear error', () => {
  assert.throws(() => parseDesign('## Colors\nflow: red\n'), /flow.*hex/i);
});

test('loadDesign returns defaults when file is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  assert.deepEqual(loadDesign(dir), DEFAULTS);
});

test('loadDesign reads design.md from cwd', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  writeFileSync(join(dir, 'design.md'), '## Mascot\nname: Zed\n');
  assert.equal(loadDesign(dir).mascot.name, 'Zed');
});

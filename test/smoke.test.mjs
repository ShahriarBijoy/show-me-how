import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('plugin manifest is valid', () => {
  const m = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url)));
  assert.equal(m.name, 'show-me-how');
});

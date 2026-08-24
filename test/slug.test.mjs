import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { slugify, topicSlug, shotFilename } from '../scripts/lib/slug.mjs';

test('slugify basics', () => {
  assert.equal(slugify('Magic-link Login!'), 'magic-link-login');
  assert.equal(slugify('  Rate   Limiter (v2) '), 'rate-limiter-v2');
  assert.equal(slugify('PR 412: Add retry queue'), 'pr-412-add-retry-queue');
});

test('topicSlug caps length and trims dashes', () => {
  const long = 'a'.repeat(80);
  assert.equal(topicSlug(long).length, 60);
  assert.equal(topicSlug('--hello--'), 'hello');
  assert.equal(topicSlug(''), 'untitled');
});

test('shotFilename zero-pads', () => {
  assert.equal(shotFilename(1, 'Login before/after'), '01-login-before-after');
  assert.equal(shotFilename(12, 'x'), '12-x');
});

test('slug.mjs CLI prints topicSlug of its argument', () => {
  const out = execFileSync(process.execPath, ['scripts/slug.mjs', 'Magic-link Login!']);
  assert.equal(out.toString(), 'magic-link-login\n');
});

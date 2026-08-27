import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchWithTimeout, refsToParts, httpFailure, referencePreamble } from '../scripts/lib/backends/http.mjs';

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test('refsToParts reads refs relative to cwd and picks mime from the extension', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-http-'));
  writeFileSync(join(dir, 'a.png'), PNG_1x1);
  writeFileSync(join(dir, 'b.jpg'), PNG_1x1);
  writeFileSync(join(dir, 'c.webp'), PNG_1x1);
  const parts = refsToParts(['a.png', 'b.jpg', 'c.webp'], dir);
  assert.deepEqual(parts.map((p) => p.mime), ['image/png', 'image/jpeg', 'image/webp']);
  assert.equal(parts[0].data, PNG_1x1.toString('base64'));
});

test('httpFailure keeps the body tail and adds a key hint on 401/403 and a retry hint on 429', () => {
  assert.equal(httpFailure(500, 'x'.repeat(600), 'K'), `HTTP 500: ${'x'.repeat(500)}`);
  assert.match(httpFailure(401, '{"error":"bad key"}', 'GEMINI_API_KEY'), /HTTP 401: .*bad key.* — check GEMINI_API_KEY$/);
  assert.match(httpFailure(403, '', 'OPENAI_API_KEY'), /check OPENAI_API_KEY$/);
  assert.match(httpFailure(429, 'slow down', 'K'), /rate limited, retry later$/);
});

test('referencePreamble only mentions references when there are some', () => {
  assert.equal(referencePreamble(0), 'Landscape 16:9. ');
  assert.match(referencePreamble(2), /style references for the mascot character.*Landscape 16:9\. $/);
});

test('fetchWithTimeout rejects with a timeout message when the fetch never settles', async () => {
  const never = (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
  await assert.rejects(fetchWithTimeout(never, 'https://x', {}, 20), /timeout after 0s/);
});

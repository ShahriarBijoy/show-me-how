import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderSvgLayer, labelImage } from '../scripts/label.mjs';
import { whitePng } from './fixtures/make-fixture.mjs';

const spec = {
  font: 'Caveat',
  colors: { flow: '#F28C28', warn: '#D93025', note: '#1A73E8' },
  labels: [
    { text: 'password + 2FA', x: 0.2, y: 0.7, kind: 'black' },
    { text: '1 click', x: 0.8, y: 0.7, kind: 'flow' },
    { text: 'expiry!', x: 0.5, y: 0.9, kind: 'warn' },
  ],
  arrows: [{ from: [0.35, 0.5], to: [0.62, 0.5], kind: 'flow' }],
};

test('svg layer contains labels, colors, font and an arrow path', () => {
  const svg = renderSvgLayer(spec, 640, 360);
  assert.match(svg, /password \+ 2FA/);
  assert.match(svg, /#F28C28/); assert.match(svg, /#D93025/);
  assert.match(svg, /font-family="Caveat/);
  assert.match(svg, /<path[^>]+d="M/);
  assert.match(svg, /x="128(\.\d+)?"/); // 0.2 * 640
  assert.match(svg, /dominant-baseline="central"/);
});

test('labelImage writes png of same size plus svg', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const input = await whitePng(join(dir, 'raw.png'));
  const out = join(dir, '01-test.png');
  const r = await labelImage({ input, spec, out });
  assert.ok(existsSync(r.out) && existsSync(r.svg));
  const meta = await sharp(r.out).metadata();
  assert.equal(meta.width, 640); assert.equal(meta.height, 360);
  const { data, info } = await sharp(r.out).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data.some((v, i) => i % info.channels === 0 && v < 250), 'some non-white pixels drawn');
});

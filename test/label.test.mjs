import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderSvgLayer, labelImage } from '../scripts/label.mjs';
import { whitePng, transparentPng } from './fixtures/make-fixture.mjs';

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

test('labelImage flattens a transparent generation onto white', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-alpha-'));
  const input = await transparentPng(join(dir, 'raw.png'));
  assert.equal((await sharp(input).metadata()).hasAlpha, true, 'fixture must start out transparent');
  const out = join(dir, '01-test.png');
  const r = await labelImage({ input, spec, out });
  const meta = await sharp(r.out).metadata();
  assert.equal(meta.hasAlpha, false);
  const { data, info } = await sharp(r.out).raw().toBuffer({ resolveWithObject: true });
  // top-left corner: no label or arrow reaches it, so it must be the flattened white background
  assert.deepEqual([data[0], data[1], data[2]], [255, 255, 255], `corner was ${[data[0], data[1], data[2]]}`);
  assert.equal(info.channels, 3);
});

test('labelImage writes only the png, no svg sidecar', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const input = await whitePng(join(dir, 'raw.png'));
  const out = join(dir, '01.png');
  const r = await labelImage({ input, spec, out });
  assert.deepEqual(Object.keys(r), ['out']);
  assert.ok(existsSync(r.out));
  assert.equal(existsSync(join(dir, '01.svg')), false, 'no .svg sidecar may be written');
  const meta = await sharp(r.out).metadata();
  assert.equal(meta.width, 640); assert.equal(meta.height, 360);
  const { data, info } = await sharp(r.out).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data.some((v, i) => i % info.channels === 0 && v < 250), 'some non-white pixels drawn');
});

test('labelImage adds a caption strip below the picture when spec.caption is set', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-cap-'));
  const input = await whitePng(join(dir, 'raw.png'));
  const out = join(dir, '01.png');
  const r = await labelImage({ input, spec: { ...spec, caption: 'The font takes the side door.' }, out });
  const meta = await sharp(r.out).metadata();
  assert.equal(meta.width, 640, 'width unchanged');
  assert.ok(meta.height > 360, `canvas grew for the caption, got ${meta.height}`);
  assert.equal(meta.hasAlpha, false);
  // the strip is below the original picture and contains dark caption pixels
  const strip = await sharp(r.out).extract({ left: 0, top: 360, width: 640, height: meta.height - 360 }).raw().toBuffer({ resolveWithObject: true });
  assert.ok(strip.data.some((v, i) => i % strip.info.channels === 0 && v < 128), 'caption text drawn in the strip');
});

test('labelImage keeps the original size when there is no caption', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-nocap-'));
  const input = await whitePng(join(dir, 'raw.png'));
  const r = await labelImage({ input, spec, out: join(dir, '01.png') });
  const meta = await sharp(r.out).metadata();
  assert.equal(meta.height, 360);
});

#!/usr/bin/env node
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadDesign } from './lib/design.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FONT = join(HERE, '..', 'assets', 'fonts', 'Caveat-Regular.ttf');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function color(kind, colors) {
  return kind === 'flow' ? colors.flow : kind === 'warn' ? colors.warn : kind === 'note' ? colors.note : '#111111';
}

function fontFamily(font) {
  return font && font !== 'in-image' ? font.replace(/\.(ttf|otf)$/i, '').split(/[\\/]/).pop() : 'Caveat';
}

// deterministic "hand-drawn" wobble so snapshots are stable
function wobblePath(x1, y1, x2, y2, seed) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const w = 0.04 * len * Math.sin(seed * 12.9898);
  const cx = (x1 + x2) / 2 + nx * w, cy = (y1 + y2) / 2 + ny * w;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function arrowHead(x2, y2, x1, y1, size) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (t) => `${(x2 - size * Math.cos(a - t)).toFixed(1)} ${(y2 - size * Math.sin(a - t)).toFixed(1)}`;
  return `M${p(0.5)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${p(-0.5)}`;
}

function arrowParts(spec, width, height) {
  const parts = [];
  (spec.arrows || []).forEach((a, i) => {
    const [x1, y1] = [a.from[0] * width, a.from[1] * height];
    const [x2, y2] = [a.to[0] * width, a.to[1] * height];
    const c = color(a.kind, spec.colors);
    const sw = Math.max(2, Math.round(height * 0.006));
    parts.push(`<path d="${wobblePath(x1, y1, x2, y2, i + 1)}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`);
    parts.push(`<path d="${arrowHead(x2, y2, x1, y1, sw * 4)}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
  });
  return parts;
}

// Full overlay markup: arrows + text labels. This is what gets written to the
// .svg sidecar and is what the unit tests assert against as a string. It is
// NOT what actually gets rasterized into the output PNG for the <text>
// portion -- see the comment above labelImage() for why.
export function renderSvgLayer(spec, width, height) {
  const family = fontFamily(spec.font);
  const base = Math.round(height * 0.06);
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  parts.push(...arrowParts(spec, width, height));
  for (const l of spec.labels || []) {
    const size = Math.round(base * (l.size || 1));
    parts.push(`<text x="${(l.x * width).toFixed(1)}" y="${(l.y * height).toFixed(1)}" font-family="${esc(family)}, cursive" font-size="${size}" fill="${color(l.kind, spec.colors)}" text-anchor="middle" dominant-baseline="central">${esc(l.text)}</text>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}

// --- Font rendering notes (read before touching this file) ---------------
//
// sharp's SVG rasterizer (librsvg, via libvips) resolves <text font-family="…">
// through fontconfig+Pango. On this Windows build (sharp 0.35.3, libvips
// 8.18.3, bundled fontconfig 2.18.1) that lookup could NOT be steered at all:
// setting FONTCONFIG_FILE (absolute path, with and without <cachedir>) or
// FONTCONFIG_PATH before the first `import('sharp')`, even pointing at a
// trivially valid fonts.conf, produced no error (even with deliberately
// malformed/nonexistent config paths -- silence in every case) and no font
// cache was ever written; rasterizing an SVG <text> always fell back to a
// generic system serif, never Caveat. So on Windows, compositing a rasterized
// SVG <text> layer is NOT a viable path to a handwritten label -- regardless
// of env var wiring.
//
// What DOES work: libvips' `text` create-operation (`sharp({ text: {...} })`)
// accepts a `fontfile` option that loads a font file directly via
// FcConfigAppFontAddFile into a private, in-process font config -- entirely
// bypassing the system/env fontconfig lookup that failed above. Combined with
// a `font: "<Family> <size>"` Pango description and Pango markup
// (`<span foreground="#RRGGBB">…</span>`) for color, this reliably rendered
// Caveat glyphs, verified visually (handwritten strokes, not a fallback
// sans/serif) via a scratchpad PNG. This is portable (no dependency on the
// host's fontconfig setup at all) so we use it for every platform, not just
// Windows.
//
// So: renderSvgLayer() above still emits the full <text>-bearing SVG markup
// (used for the .svg sidecar file and asserted on as a string by tests), but
// labelImage() below rasterizes arrows via that SVG through librsvg (fine --
// no fonts involved) and rasterizes each label's text separately via the
// `fontfile` text-create path, then composites both onto the base image.
async function renderLabelPng(text, kind, size, spec, fontPath) {
  const family = fontFamily(spec.font);
  const markup = `<span foreground="${esc(color(kind, spec.colors))}">${esc(text)}</span>`;
  return sharp({
    text: {
      text: markup,
      font: `${family} ${size}`,
      fontfile: fontPath,
      rgba: true,
    },
  }).png().toBuffer();
}

export async function labelImage({ input, spec, out, fontPath = DEFAULT_FONT }) {
  const img = sharp(input);
  const { width, height } = await img.metadata();
  const svg = renderSvgLayer(spec, width, height);
  const svgPath = out.replace(/\.png$/i, '') + '.svg';
  writeFileSync(svgPath, svg);

  const arrowsSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...arrowParts(spec, width, height),
    '</svg>',
  ].join('\n');

  const overlays = [{ input: Buffer.from(arrowsSvg), top: 0, left: 0 }];

  const base = Math.round(height * 0.06);
  for (const l of spec.labels || []) {
    const size = Math.round(base * (l.size || 1));
    const buf = await renderLabelPng(l.text, l.kind, size, spec, fontPath);
    const meta = await sharp(buf).metadata();
    const left = Math.max(0, Math.min(width - meta.width, Math.round(l.x * width - meta.width / 2)));
    const top = Math.max(0, Math.min(height - meta.height, Math.round(l.y * height - meta.height / 2)));
    overlays.push({ input: buf, left, top });
  }

  await img.composite(overlays).png().toFile(out);
  return { out, svg: svgPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = {}; const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  const design = loadDesign(a['design-cwd'] || process.cwd());
  const spec = JSON.parse(readFileSync(a.labels, 'utf8'));
  spec.font ??= design.font.labels; spec.colors ??= design.colors;
  const fontPath = a.font || (/\.(ttf|otf)$/i.test(design.font.labels) ? resolve(design.font.labels) : DEFAULT_FONT);
  const r = await labelImage({ input: a.in, spec, out: a.out, fontPath });
  console.log(JSON.stringify(r));
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { userFontDir, installFont } from '../scripts/lib/font.mjs';
import { DEFAULT_FONT, fontFileWorks, fontFallbackHint, fontFamilyFromFile, labelFamily, resolveFontPath } from '../scripts/label.mjs';
import { DEFAULTS } from '../scripts/lib/design.mjs';

test('fontFamilyFromFile reads the family Pango matches on, not the file name', () => {
  assert.equal(fontFamilyFromFile(DEFAULT_FONT), 'Caveat');
  const dir = mkdtempSync(join(tmpdir(), 'smh-font-'));
  writeFileSync(join(dir, 'Broken.ttf'), 'not a font');
  assert.equal(fontFamilyFromFile(join(dir, 'Broken.ttf')), null);
  assert.equal(fontFamilyFromFile(join(dir, 'missing.ttf')), null);
});

test('labelFamily: file-backed fonts use the name inside the file, installed families their own name', () => {
  assert.equal(labelFamily('Caveat', DEFAULT_FONT), 'Caveat');
  assert.equal(labelFamily('brand/Caveat-Regular.ttf', DEFAULT_FONT), 'Caveat', 'file name differs from family');
  assert.equal(labelFamily(undefined, DEFAULT_FONT), 'Caveat');
  assert.equal(labelFamily('Comic Sans MS', DEFAULT_FONT), 'Comic Sans MS', 'an installed family is asked for as written');
  assert.equal(labelFamily('brand/Broken.ttf', '/nope/Broken.ttf'), 'Broken', 'unreadable file falls back to the file name');
});

const fallbackWidth = { width: 638, height: 70 };
const measureIgnoringFile = async () => fallbackWidth; // macOS: fontfile ignored, both hit Helvetica
const measureHonouringFile = async ({ fontPath }) => (fontPath ? { width: 510, height: 70 } : fallbackWidth);

test('fontFileWorks is false when the font file changes nothing (issue #1)', async () => {
  assert.equal(await fontFileWorks('/x/Caveat-Regular.ttf', 'Caveat', measureIgnoringFile), false);
});

test('fontFileWorks is true when the font file is honoured', async () => {
  assert.equal(await fontFileWorks('/x/Caveat-Regular.ttf', 'Caveat', measureHonouringFile), true);
});

// A fresh process on purpose: the probe depends on being the first text render in the process
// (see the order note in label.mjs), which a shared test process cannot guarantee.
const CLI = fileURLToPath(new URL('../scripts/font.mjs', import.meta.url));
const runCli = (...args) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
};

test('font.mjs check: bundled Caveat renders through fontfile on this platform (skipped on macOS)', { skip: process.platform === 'darwin' }, () => {
  const j = runCli('check');
  assert.equal(j.ok, true, JSON.stringify(j));
  assert.equal(j.font, DEFAULT_FONT);
  assert.equal(j.hint, undefined);
});

test('font.mjs check reports ok:false plus a hint for a font sharp cannot use', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-font-'));
  writeFileSync(join(dir, 'Broken.ttf'), 'not a font');
  const j = runCli('check', '--font', join(dir, 'Broken.ttf'));
  assert.equal(j.ok, false);
  assert.match(j.hint, /Broken\.ttf/);
});

test('fallback hint names the font and the fix per platform', () => {
  const mac = fontFallbackHint('/plugin/assets/fonts/Caveat-Regular.ttf', 'darwin');
  assert.match(mac, /macOS/);
  assert.match(mac, /cp "\/plugin\/assets\/fonts\/Caveat-Regular\.ttf" ~\/Library\/Fonts\//);
  assert.match(mac, /font\.mjs" install/);
  const other = fontFallbackHint('/plugin/assets/fonts/Caveat-Regular.ttf', 'linux');
  assert.match(other, /Caveat-Regular\.ttf/);
  assert.doesNotMatch(other, /macOS/);
});

test('userFontDir: per-user folders on mac and linux, none on windows', () => {
  assert.equal(userFontDir('darwin', '/Users/me'), join('/Users/me', 'Library', 'Fonts'));
  assert.equal(userFontDir('linux', '/home/me'), join('/home/me', '.local', 'share', 'fonts'));
  assert.equal(userFontDir('win32', 'C:\\Users\\me'), null);
});

test('installFont copies once and reports an existing copy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-font-'));
  const dest = join(dir, 'fonts');
  const first = installFont(DEFAULT_FONT, dest);
  assert.equal(first.installed, true);
  assert.ok(existsSync(first.path));
  assert.equal(readFileSync(first.path).length, readFileSync(DEFAULT_FONT).length);
  const second = installFont(DEFAULT_FONT, dest);
  assert.equal(second.installed, false);
  assert.equal(second.path, first.path);
});

test('installFont fails clearly without a folder or file', () => {
  assert.throws(() => installFont(DEFAULT_FONT, null), /by hand/);
  assert.throws(() => installFont('/nope/missing.ttf', mkdtempSync(join(tmpdir(), 'smh-font-'))), /not found/);
});

test('resolveFontPath: family name -> bundled Caveat, .ttf path -> resolved against the repo', () => {
  assert.equal(resolveFontPath(DEFAULTS, '/repo'), DEFAULT_FONT);
  const dir = mkdtempSync(join(tmpdir(), 'smh-font-'));
  writeFileSync(join(dir, 'Brand.ttf'), '');
  const custom = { ...DEFAULTS, font: { labels: 'Brand.ttf' } };
  assert.equal(resolveFontPath(custom, dir), join(dir, 'Brand.ttf'));
});

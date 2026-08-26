#!/usr/bin/env node
// Usage:
//   node scripts/font.mjs check   [--design-cwd REPO] [--font path.ttf]
//   node scripts/font.mjs install [--design-cwd REPO] [--font path.ttf]
//
// `check` renders a probe string with the label font file and reports whether sharp really
// used it: {"ok":true|false,"font":..,"installDir":..,"hint":..}. On macOS sharp ignores the
// `fontfile` option (CoreText), so the font has to be installed once in ~/Library/Fonts --
// that is what `install` does (copy, then re-check). Always exits 0; read the JSON `ok` field.
import { fileURLToPath } from 'node:url';
import { basename, resolve } from 'node:path';
import { loadDesign } from './lib/design.mjs';
import { userFontDir, installFont } from './lib/font.mjs';
import { fontFileWorks, fontFallbackHint, resolveFontPath } from './label.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , cmd, ...rest] = process.argv;
  const a = {};
  for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) a[rest[i].slice(2)] = rest[++i];
  if (cmd !== 'check' && cmd !== 'install') {
    console.error('usage: font.mjs check | install [--design-cwd REPO] [--font path.ttf]');
    process.exit(2);
  }
  const cwd = a['design-cwd'] || process.cwd();
  const fontPath = a.font ? resolve(cwd, a.font) : resolveFontPath(loadDesign(cwd), cwd);
  const family = basename(fontPath).replace(/\.(ttf|otf)$/i, '');
  const r = { ok: false, font: fontPath, platform: process.platform, installDir: userFontDir() };
  try {
    if (cmd === 'install') Object.assign(r, installFont(fontPath, r.installDir));
    r.ok = await fontFileWorks(fontPath, family);
    if (!r.ok) r.hint = fontFallbackHint(fontPath);
  } catch (err) {
    r.error = err.message;
  }
  console.log(JSON.stringify(r));
}

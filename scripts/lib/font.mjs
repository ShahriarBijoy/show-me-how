import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

// Per-user font folder that needs no admin rights. Only the platforms where installing the
// font is the fix: on macOS sharp resolves fonts through CoreText and ignores the `fontfile`
// option (issue #1); on Linux `fontfile` works, but a user font dir is harmless and lets
// `font.mjs install` behave the same way. Windows returns null: `fontfile` works there and a
// per-user font install needs the registry, which is not worth automating.
export function userFontDir(platform = process.platform, home = homedir()) {
  if (platform === 'darwin') return join(home, 'Library', 'Fonts');
  if (platform === 'linux') return join(home, '.local', 'share', 'fonts');
  return null;
}

// Copies the font file into `dir` unless an identically named file is already there.
// Returns { installed, path }; `installed` is false when it was already present.
export function installFont(fontPath, dir) {
  if (!dir) throw new Error('No per-user font folder on this platform; install the font by hand.');
  if (!existsSync(fontPath)) throw new Error(`Font file not found: ${fontPath}`);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, basename(fontPath));
  if (existsSync(dest)) return { installed: false, path: dest };
  copyFileSync(fontPath, dest);
  return { installed: true, path: dest };
}

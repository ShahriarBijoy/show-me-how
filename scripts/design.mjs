#!/usr/bin/env node
import { loadDesign, findDesignFile } from './lib/design.mjs';
const cwd = process.argv[2] || process.cwd();
// `file` is the config actually in use (null = defaults). Callers must not check for the file
// themselves: a foreign `design.md` exists on disk but is not ours.
process.stdout.write(JSON.stringify({ file: findDesignFile(cwd), ...loadDesign(cwd) }, null, 2) + '\n');

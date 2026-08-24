#!/usr/bin/env node
import { loadDesign } from './lib/design.mjs';
const cwd = process.argv[2] || process.cwd();
process.stdout.write(JSON.stringify(loadDesign(cwd), null, 2) + '\n');

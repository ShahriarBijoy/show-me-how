import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULTS = Object.freeze({
  mascot: {
    name: 'Flow',
    description: 'small solid-black blob, white dot eyes, thin legs, deadpan; a serious operator doing absurd but valid work',
    references: [],
    never: 'cute, sparkly eyes, clothing, standing in the corner watching',
  },
  font: { labels: 'Caveat' },
  colors: { flow: '#F28C28', warn: '#D93025', note: '#1A73E8' },
  tone: 'deadpan, absurd, clean',
  output: { docs: 'docs/show-me-how/', backend: 'auto', codexModel: '', codexReasoning: 'low' },
});

const HEX = /^#[0-9a-fA-F]{6}$/;

function stripComment(line) {
  // remove "# ..." unless the # is inside quotes
  let out = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    if (ch === '#' && !q) break;
    out += ch;
  }
  return out.trimEnd();
}

function unquote(v) {
  v = v.trim();
  return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}

export function parseDesign(text) {
  const d = structuredClone(DEFAULTS);
  let section = '', lastKey = '';
  for (const raw of text.split(/\r?\n/)) {
    const trimmedRaw = raw.trim();
    if (trimmedRaw.startsWith('##')) {
      const h = trimmedRaw.match(/^##\s+(\w+)/);
      if (h) { section = h[1].toLowerCase(); lastKey = ''; }
      continue;
    }
    const line = stripComment(raw);
    if (!line.trim()) continue;
    if (line.startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.+)$/);
    if (item && section === 'mascot' && lastKey === 'references') { d.mascot.references.push(unquote(item[1])); continue; }
    const kv = line.match(/^\s*([\w-]+):\s*(.*)$/);
    if (kv) {
      const [, k, vRaw] = kv; const v = unquote(vRaw); lastKey = k;
      if (section === 'mascot') {
        if (k === 'references') d.mascot.references = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
        else if (k in d.mascot) d.mascot[k] = v;
      } else if (section === 'font' && k === 'labels') d.font.labels = v;
      else if (section === 'colors' && k in d.colors) {
        if (!HEX.test(v)) throw new Error(`design.md: color "${k}" must be a 6-digit hex like #F28C28, got "${v}"`);
        d.colors[k] = v.toUpperCase();
      } else if (section === 'output') {
        // snake_case in design.md, camelCase in the parsed object
        const key = { codex_model: 'codexModel', codex_reasoning: 'codexReasoning' }[k] ?? k;
        if (key in d.output) d.output[key] = v;
      }
      continue;
    }
    if (section === 'tone') d.tone = line.trim();
  }
  return d;
}

export function loadDesign(cwd = process.cwd()) {
  const p = join(cwd, 'design.md');
  return existsSync(p) ? parseDesign(readFileSync(p, 'utf8')) : structuredClone(DEFAULTS);
}

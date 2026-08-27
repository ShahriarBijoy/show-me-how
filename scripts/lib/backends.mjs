import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as codex from './backends/codex.mjs';
import * as manual from './backends/manual.mjs';

export { defaultWhich, defaultRun, defaultProbe, codexProblems, buildCodexArgs, CODEX_MIN_VERSION, CODEX_INSTALL_HINT } from './backends/codex.mjs';

// Detection order for `backend: auto`. Subscription first (no per-image charge), then the APIs.
export const ORDER = ['codex'];
export const BACKENDS = { codex, manual };

export const NOTES = {
  codex: 'codex (ChatGPT subscription)',
  manual: 'manual (no image CLI found: prompts will be written to files for you to run)',
};

function known(name) { return name === 'auto' || name in BACKENDS; }

export function detectBackend({ pinned = 'auto', which = codex.defaultWhich, probe = codex.defaultProbe } = {}) {
  if (!known(pinned)) throw new Error(`Unknown backend "${pinned}". Use auto | ${Object.keys(BACKENDS).join(' | ')}`);
  if (pinned === 'manual') return { name: 'manual', note: 'manual (pinned in show-me-how.md)' };
  if (pinned !== 'auto') {
    const d = BACKENDS[pinned].detect({ which, probe });
    if (!d.ready) throw new Error(`show-me-how.md pins backend: ${pinned} but ${d.problems.join('; ')}`);
    return { name: pinned, note: d.note };
  }
  const reasons = [];
  for (const name of ORDER) {
    const d = BACKENDS[name].detect({ which, probe });
    if (d.ready) return { name, note: d.note };
    reasons.push(d.note);
  }
  return { name: 'manual', note: `manual (${reasons.join('; ')})` };
}

export async function generate({ backend, prompt, refs = [], out, cwd = process.cwd(), run, codexModel = '', codexReasoning = 'low' }) {
  out = resolve(cwd, out);
  mkdirSync(dirname(out), { recursive: true });
  const b = BACKENDS[backend];
  if (!b) throw new Error(`Unknown backend ${backend}`);
  return b.generate({ prompt, refs, out, cwd, run, codexModel, codexReasoning });
}

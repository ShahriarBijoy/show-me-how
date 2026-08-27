import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as codex from './backends/codex.mjs';
import * as gemini from './backends/gemini.mjs';
import * as openai from './backends/openai.mjs';
import * as manual from './backends/manual.mjs';

export { defaultWhich, defaultRun, defaultProbe, codexProblems, buildCodexArgs, CODEX_MIN_VERSION, CODEX_INSTALL_HINT } from './backends/codex.mjs';

// Detection order for `backend: auto`. Subscription first (no per-image charge), then the APIs.
export const ORDER = ['codex', 'gemini-api', 'openai-api'];
export const BACKENDS = { codex, 'gemini-api': gemini, 'openai-api': openai, manual };

// Single source of truth for model ids and rough cost. Gemini: list price per 1K image.
// OpenAI: token-priced; these are per-image figures at 1536x1024 with 1-3 reference images,
// rounded up so a doc estimate errs high. Every place that shows them says "approx." and
// cites PRICES_AS_OF. See docs/research/image-backends.md for sources.
export const PRICES_AS_OF = '2026-08';
export const MODELS = {
  'gemini-api': [
    { id: 'gemini-3.1-flash-image',      label: 'Nano Banana 2',      usdPerPanel: 0.067, default: true },
    { id: 'gemini-3.1-flash-lite-image', label: 'Nano Banana 2 Lite', usdPerPanel: 0.034 },
    { id: 'gemini-3-pro-image',          label: 'Nano Banana Pro',    usdPerPanel: 0.134 },
  ],
  'openai-api': [
    { id: 'gpt-image-2',      label: 'GPT Image 2',      usdPerPanel: { low: 0.02, medium: 0.10, high: 0.30 }, default: true },
    { id: 'gpt-image-1.5',    label: 'GPT Image 1.5',    usdPerPanel: { low: 0.02, medium: 0.10, high: 0.30 } },
    { id: 'gpt-image-1-mini', label: 'GPT Image 1 mini', usdPerPanel: { low: 0.01, medium: 0.02, high: 0.05 } },
  ],
};

// '' means the backend's default model. Unknown ids are rejected here, at detect time, so a typo
// in show-me-how.md fails before the user has waited on a generation.
export function resolveModel(backend, imageModel = '') {
  const list = MODELS[backend];
  if (!list) return '';
  if (!imageModel) return list.find((m) => m.default).id;
  if (!list.some((m) => m.id === imageModel)) {
    throw new Error(`show-me-how.md: image_model "${imageModel}" is not a ${backend} model. Use ${list.map((m) => m.id).join(' | ')}`);
  }
  return imageModel;
}

export function estimateUsd(backend, modelId, quality = 'medium') {
  const m = MODELS[backend]?.find((x) => x.id === modelId);
  if (!m) return undefined;
  return typeof m.usdPerPanel === 'number' ? m.usdPerPanel : m.usdPerPanel[quality];
}

function apiNote(backend, modelId, quality) {
  const q = backend === 'openai-api' ? ` ${quality}` : '';
  return `${backend} (${modelId}${q}, ~$${estimateUsd(backend, modelId, quality).toFixed(2)}/panel)`;
}

export const NOTES = {
  codex: 'codex (ChatGPT subscription)',
  manual: 'manual (no image CLI found: prompts will be written to files for you to run)',
};

function known(name) { return name === 'auto' || name in BACKENDS; }

export function detectBackend({ pinned = 'auto', model = '', quality = 'medium', env = process.env, which = codex.defaultWhich, probe = codex.defaultProbe } = {}) {
  if (!known(pinned)) throw new Error(`Unknown backend "${pinned}". Use auto | ${Object.keys(BACKENDS).join(' | ')}`);
  if (pinned === 'manual') return { name: 'manual', note: 'manual (pinned in show-me-how.md)' };
  const finish = (name, d) => {
    if (!(name in MODELS)) return { name, note: d.note };
    const id = resolveModel(name, model);
    return { name, note: apiNote(name, id, quality), model: id };
  };
  if (pinned !== 'auto') {
    const d = BACKENDS[pinned].detect({ which, probe, env });
    if (!d.ready) throw new Error(`show-me-how.md pins backend: ${pinned} but ${d.problems.join('; ')}`);
    return finish(pinned, d);
  }
  const reasons = [];
  for (const name of ORDER) {
    const d = BACKENDS[name].detect({ which, probe, env });
    if (d.ready) return finish(name, d);
    reasons.push(d.note);
  }
  return { name: 'manual', note: `manual (${reasons.join('; ')}). Run /show-me-how:init to set up automatic images.` };
}

export async function generate({ backend, prompt, refs = [], out, cwd = process.cwd(), run, codexModel = '', codexReasoning = 'low' }) {
  out = resolve(cwd, out);
  mkdirSync(dirname(out), { recursive: true });
  const b = BACKENDS[backend];
  if (!b) throw new Error(`Unknown backend ${backend}`);
  return b.generate({ prompt, refs, out, cwd, run, codexModel, codexReasoning });
}

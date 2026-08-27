import { existsSync, writeFileSync } from 'node:fs';

export const name = 'manual';

export function detect() {
  return { ready: true, note: 'manual', problems: [] };
}

export async function generate({ prompt, out }) {
  // Resume path: the user took the prompt file to their own image tool and saved the result as
  // `out`, then re-ran the same command. Picking the saved shot up here is what makes that loop
  // work -- and the prompt file is deliberately left untouched, so a hand-edited prompt is not
  // silently overwritten by the freshly rendered one on the pass that finally succeeds.
  if (existsSync(out)) return { ok: true, backend: name, out, resumed: true };
  const promptFile = out + '.prompt.txt';
  writeFileSync(promptFile, `# Paste into ChatGPT / Gemini / any image tool. Save the result as:\n# ${out}\n\n${prompt}\n`);
  return { ok: false, backend: name, out, promptFile };
}

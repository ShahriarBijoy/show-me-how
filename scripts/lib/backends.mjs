import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const isWin = process.platform === 'win32';

export function defaultWhich(cmd) {
  const r = spawnSync(isWin ? 'where' : 'which', [cmd], { encoding: 'utf8', shell: isWin });
  return r.status === 0;
}

// Windows-only. Two things were verified empirically (see task-3-report.md) before landing on
// this shape:
//   1. Spawning a `.cmd`/`.bat` shim (which is what npm-installed CLIs like `codex` are on
//      Windows) with `shell:false` throws EINVAL synchronously -- Node refuses to CreateProcess
//      a batch file directly (post-CVE hardening), so some form of cmd.exe involvement is
//      mandatory to run codex at all on Windows.
//   2. Node's own `shell:true` builds the child's command line by naively quoting each arg
//      (wrap in quotes if it has a space) and does NOT escape cmd.exe metacharacters
//      (& | % ^ ( ) < > !), so an instruction containing e.g. " & " silently splits into two
//      commands. Separately, cmd.exe's own command-line parser cannot carry a literal newline
//      inside a single argument under ANY quoting/escaping scheme -- it truncates the command
//      at the first \n. That is a cmd.exe parser limitation, not a Node bug, so no amount of
//      escaping fixes it; the newline has to be removed before it reaches cmd.exe.
// The fix: build the full command line ourselves with cross-spawn-style escaping (quote the
// arg, backslash-escape embedded quotes, then caret-escape cmd.exe metacharacters) and hand it
// to cmd.exe verbatim via `windowsVerbatimArguments: true`, bypassing Node's own quoting. Long
// instructions with embedded newlines get those newlines collapsed to spaces first, since they
// cannot survive cmd.exe regardless -- an accepted, documented tradeoff for a natural-language
// image prompt where a line break carries no semantic meaning to the model.
function escapeArgForWindowsShell(arg) {
  let a = String(arg).replace(/\r?\n/g, ' ');
  a = a.replace(/(\\*)"/g, '$1$1\\"');
  a = a.replace(/(\\*)$/, '$1$1');
  a = `"${a}"`;
  a = a.replace(/(["^&|<>()%!;, ])/g, '^$1');
  return a;
}

export function defaultRun(cmd, args, { cwd } = {}) {
  return new Promise((res) => {
    let p;
    if (isWin) {
      const commandLine = [escapeArgForWindowsShell(cmd), ...args.map(escapeArgForWindowsShell)].join(' ');
      p = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandLine], { cwd, windowsVerbatimArguments: true });
    } else {
      p = spawn(cmd, args, { cwd, shell: false });
    }
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d); p.stderr.on('data', d => stderr += d);
    p.on('close', code => res({ code: code ?? 1, stdout, stderr }));
    p.on('error', () => res({ code: 1, stdout, stderr: 'spawn failed' }));
  });
}

export const NOTES = {
  codex: 'codex (ChatGPT subscription)',
  manual: 'manual (no image CLI found: prompts will be written to files for you to run)',
};

export function detectBackend({ pinned = 'auto', which = defaultWhich } = {}) {
  if (pinned !== 'auto') {
    if (pinned === 'codex' && !which('codex')) throw new Error('design.md pins backend: codex but `codex` was not found on PATH. Install: npm i -g @openai/codex');
    if (!(pinned in NOTES)) throw new Error(`Unknown backend "${pinned}". Use auto | codex | manual`);
    return { name: pinned, note: NOTES[pinned] };
  }
  if (which('codex')) return { name: 'codex', note: NOTES.codex };
  return { name: 'manual', note: NOTES.manual };
}

export function buildCodexArgs({ prompt, refs = [], out, cwd }) {
  const args = ['exec', '-C', cwd, '-s', 'workspace-write', '--skip-git-repo-check'];
  for (const r of refs) args.push('-i', r);
  const instruction =
    `Use the built-in image generation tool (image_gen) to generate exactly one image and save it to "${out}" ` +
    `(create parent folders if needed). Landscape 16:9. ` +
    (refs.length ? `Use the attached image(s) as style references for the mascot character. ` : '') +
    `Do not write any other files. Do not ask questions. Image prompt follows.\n\n${prompt}`;
  args.push(instruction);
  return args;
}

export async function generate({ backend, prompt, refs = [], out, cwd = process.cwd(), run = defaultRun }) {
  out = resolve(cwd, out);
  mkdirSync(dirname(out), { recursive: true });
  if (backend === 'manual') {
    const promptFile = out + '.prompt.txt';
    writeFileSync(promptFile, `# Paste into ChatGPT / Gemini / any image tool. Save the result as:\n# ${out}\n\n${prompt}\n`);
    return { ok: false, backend, out, promptFile };
  }
  if (backend === 'codex') {
    const r = await run('codex', buildCodexArgs({ prompt, refs, out, cwd }), { cwd });
    const ok = r.code === 0 && existsSync(out);
    return { ok, backend, out, stderr: ok ? undefined : (r.stderr || r.stdout).slice(-2000) };
  }
  throw new Error(`Unknown backend ${backend}`);
}

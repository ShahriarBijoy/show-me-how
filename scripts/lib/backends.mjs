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

// stdin MUST be 'ignore', not the default 'pipe'. `codex exec` checks whether stdin is a pipe and,
// if it is, blocks reading it for extra prompt input ("Reading additional input from stdin...").
// With the default stdio the parent holds that pipe open forever, so codex waits forever, burning
// no CPU and writing no session -- a silent hang that looks exactly like a slow model. Handing it
// an already-closed stdin makes it skip that path and start immediately.
const STDIO = ['ignore', 'pipe', 'pipe'];

export function defaultRun(cmd, args, { cwd } = {}) {
  return new Promise((res) => {
    let p;
    if (isWin) {
      const commandLine = [escapeArgForWindowsShell(cmd), ...args.map(escapeArgForWindowsShell)].join(' ');
      p = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandLine], { cwd, windowsVerbatimArguments: true, stdio: STDIO });
    } else {
      p = spawn(cmd, args, { cwd, shell: false, stdio: STDIO });
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

// codex ships an image tool but does NOT expose it by default: a plain `codex exec` session only
// gets shell/file tools, so asking it for a picture makes it try to *draw one with code*, which is
// both wrong and slow. `--enable image_generation` (verified against codex 0.149.0, see
// task-10-report.md) turns on the real `image_gen` tool plus `view_image`.
const ENABLE_IMAGE_TOOL = ['--enable', 'image_generation'];

export function buildCodexArgs({ prompt, refs = [], out, cwd, codexModel = '', codexReasoning = 'low' }) {
  const args = ['exec', '-C', cwd, '-s', 'workspace-write', '--skip-git-repo-check', ...ENABLE_IMAGE_TOOL];
  for (const r of refs) args.push('-i', r);
  // Drawing does not need deep reasoning; low effort is faster and cheaper. An empty model
  // means "whatever codex is configured to use", so only pass -m when one was chosen.
  if (codexModel) args.push('-m', codexModel);
  args.push('-c', `model_reasoning_effort=${codexReasoning}`);
  // Three things this instruction has to get right, all learned the hard way (task-10-report.md):
  //   1. Name the `$imagegen` skill explicitly. "Create an image" on its own reads as an ordinary
  //      coding task and codex answers it by *drawing with code* (SVG/PIL), which is not what we want.
  //   2. `image_gen` takes no destination argument -- it saves under $CODEX_HOME/generated_images/.
  //      The agent has to copy the chosen output to `out` afterwards, so we ask for that in words.
  //   3. Forbid the scripts/image_gen.py CLI fallback: it needs an OPENAI_API_KEY, which a
  //      subscription user does not have, so falling back to it just burns a run.
  const instruction =
    `Use the $imagegen skill to generate exactly ONE image with its built-in image_gen tool. ` +
    `The image_gen tool takes no destination argument: it saves under $CODEX_HOME/generated_images/. ` +
    `After generating, copy the selected output to exactly this path: "${out}" ` +
    `(create parent folders if needed), then report that path. Landscape 16:9. ` +
    (refs.length ? `The attached image(s) are style references for the mascot character -- reference role, not edit targets. ` : '') +
    `Do not use the scripts/image_gen.py CLI fallback. Do not substitute SVG, HTML/CSS, canvas, ` +
    `Python/PIL or any other code-drawn placeholder art; if image_gen is unavailable, stop and say so. ` +
    `Do not write any other files. Do not ask questions. Image prompt follows.\n\n${prompt}`;
  args.push(instruction);
  return args;
}

export async function generate({ backend, prompt, refs = [], out, cwd = process.cwd(), run = defaultRun, codexModel = '', codexReasoning = 'low' }) {
  out = resolve(cwd, out);
  mkdirSync(dirname(out), { recursive: true });
  if (backend === 'manual') {
    const promptFile = out + '.prompt.txt';
    writeFileSync(promptFile, `# Paste into ChatGPT / Gemini / any image tool. Save the result as:\n# ${out}\n\n${prompt}\n`);
    return { ok: false, backend, out, promptFile };
  }
  if (backend === 'codex') {
    const r = await run('codex', buildCodexArgs({ prompt, refs, out, cwd, codexModel, codexReasoning }), { cwd });
    const ok = r.code === 0 && existsSync(out);
    return { ok, backend, out, stderr: ok ? undefined : (r.stderr || r.stdout).slice(-2000) };
  }
  throw new Error(`Unknown backend ${backend}`);
}

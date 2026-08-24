import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { detectBackend, generate, buildCodexArgs } from '../scripts/lib/backends.mjs';

test('detect prefers codex when present', () => {
  const r = detectBackend({ which: (c) => c === 'codex' });
  assert.equal(r.name, 'codex');
  assert.match(r.note, /subscription/i);
});

test('detect falls back to manual', () => {
  assert.equal(detectBackend({ which: () => false }).name, 'manual');
});

test('pinned backend wins even if missing (error surfaces)', () => {
  assert.throws(() => detectBackend({ pinned: 'codex', which: () => false }), /codex.*not found/i);
  assert.equal(detectBackend({ pinned: 'manual', which: () => true }).name, 'manual');
});

test('buildCodexArgs includes refs and out path in prompt', () => {
  const args = buildCodexArgs({ prompt: 'draw x', refs: ['a.png', 'b.png'], out: 'raw/01.png', cwd: '/w' });
  assert.deepEqual(args.slice(0, 7), ['exec', '-C', '/w', '-s', 'workspace-write', '--skip-git-repo-check', '-i']);
  assert.ok(args.includes('a.png') && args.includes('b.png'));
  assert.match(args.at(-1), /raw\/01\.png/);
  assert.match(args.at(-1), /draw x/);
});

test('manual generate writes prompt file and returns ok=false', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const out = join(dir, '01.png');
  const r = await generate({ backend: 'manual', prompt: 'hello', out, cwd: dir });
  assert.equal(r.ok, false);
  assert.ok(existsSync(out + '.prompt.txt'));
  assert.match(readFileSync(out + '.prompt.txt', 'utf8'), /hello/);
});

test('codex generate runs codex and reports ok when file appears', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const out = join(dir, '01.png');
  const calls = [];
  const run = async (cmd, args) => { calls.push([cmd, args]); const { writeFileSync } = await import('node:fs'); writeFileSync(out, 'png'); return { code: 0, stdout: '', stderr: '' }; };
  const r = await generate({ backend: 'codex', prompt: 'p', out, cwd: dir, run });
  assert.equal(r.ok, true);
  assert.equal(calls[0][0], 'codex');
});

test('codex generate passes a multi-line prompt containing double quotes intact to run()', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-'));
  const out = join(dir, '01.png');
  const tricky = 'draw "Flow" the blob\nline two with "quotes" and `backticks` and $vars';
  let seenArgs;
  const run = async (cmd, args) => {
    seenArgs = args;
    const { writeFileSync } = await import('node:fs');
    writeFileSync(out, 'png');
    return { code: 0, stdout: '', stderr: '' };
  };
  const r = await generate({ backend: 'codex', prompt: tricky, out, cwd: dir, run });
  assert.equal(r.ok, true);
  // the instruction (last arg) must contain the tricky prompt byte-for-byte, unmangled
  assert.ok(seenArgs.at(-1).includes(tricky));
});

test('defaultRun passes a tricky argument (quotes, $vars, backticks, cmd.exe metachars) through a real spawned process', async () => {
  const { defaultRun } = await import('../scripts/lib/backends.mjs');
  const { writeFileSync, mkdtempSync: mkdtemp, readFileSync: readFile } = await import('node:fs');
  const dir = mkdtemp(join(tmpdir(), 'smh-echo-'));
  const echoScript = join(dir, 'echo-argv.mjs');
  // Dumps its argv (everything after the script path) to a JSON file, so we can assert the
  // tricky argument arrived intact through whatever spawn strategy defaultRun uses on this
  // platform (see scripts/lib/backends.mjs for why win32 needs manual cmd.exe escaping).
  writeFileSync(echoScript, `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(join(dir, 'argv.json'))}, JSON.stringify(process.argv.slice(2)));\n`);
  const tricky = 'line one\nline two with "double quotes" and $vars and `backticks` and 100% done and a & b and ^caret and | pipe';
  const r = await defaultRun(process.execPath, [echoScript, 'exec', tricky], { cwd: dir });
  assert.equal(r.code, 0, `expected exit 0, got ${r.code}, stderr: ${r.stderr}`);
  const recorded = JSON.parse(readFile(join(dir, 'argv.json'), 'utf8'));
  assert.equal(recorded[0], 'exec');
  if (process.platform === 'win32') {
    // cmd.exe cannot carry a literal newline in an argument under any escaping scheme;
    // defaultRun collapses newlines to spaces on win32 as a documented tradeoff. Everything
    // else -- quotes, $vars, backticks, and cmd.exe metacharacters -- must survive exactly.
    assert.equal(recorded[1], tricky.replace(/\r?\n/g, ' '));
  } else {
    assert.equal(recorded[1], tricky);
  }
});

// Shared helper for the backslash-edge-case tests below: spawns a real child process via
// defaultRun and returns the argv it actually received, so these tests exercise the real
// win32 escaping path end-to-end rather than just calling escapeArgForWindowsShell directly.
async function realSpawnArgv(arg) {
  const { defaultRun } = await import('../scripts/lib/backends.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'smh-bs-'));
  const echoScript = join(dir, 'echo-argv.mjs');
  writeFileSync(echoScript, `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(join(dir, 'argv.json'))}, JSON.stringify(process.argv.slice(2)));\n`);
  const r = await defaultRun(process.execPath, [echoScript, arg], { cwd: dir });
  assert.equal(r.code, 0, `expected exit 0, got ${r.code}, stderr: ${r.stderr}`);
  return JSON.parse(readFileSync(join(dir, 'argv.json'), 'utf8'));
}

// These only exercise defaultRun's win32 escaping path (escapeArgForWindowsShell); on POSIX,
// defaultRun uses plain shell:false argv passing, which cannot mangle backslashes, so there's
// nothing platform-specific to verify there.
test('defaultRun preserves two trailing backslashes (real spawn)', { skip: process.platform !== 'win32' }, async () => {
  const arg = 'C:\\some\\dir\\\\';
  const recorded = await realSpawnArgv(arg);
  assert.deepEqual(recorded, [arg]);
});

test('defaultRun preserves an even run of backslashes immediately before an embedded quote (real spawn)', { skip: process.platform !== 'win32' }, async () => {
  const arg = 'say \\\\"hi\\\\" now'; // two literal backslashes before each embedded quote
  const recorded = await realSpawnArgv(arg);
  assert.deepEqual(recorded, [arg]);
});

test('defaultRun preserves a single trailing backslash, e.g. a Windows dir path (real spawn)', { skip: process.platform !== 'win32' }, async () => {
  const arg = 'C:\\Users\\someone\\';
  const recorded = await realSpawnArgv(arg);
  assert.deepEqual(recorded, [arg]);
});

test('backend.mjs CLI detect prints codex or manual note', () => {
  const out = execFileSync(process.execPath, ['scripts/backend.mjs', 'detect']).toString();
  assert.match(out, /^backend: (codex \(ChatGPT subscription\)|manual \(no image CLI found[^)]*\))\n$/);
});

test('backend.mjs CLI generate writes a prompt file and exits 0 when pinned to manual', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smh-cli-'));
  writeFileSync(join(dir, 'design.md'), '## Output\nbackend: manual\n');
  const promptFile = join(dir, 'p.txt');
  writeFileSync(promptFile, 'a deadpan blob doing taxes');
  const out = join(dir, 'raw', '01.png');
  const stdout = execFileSync(process.execPath, [
    join(process.cwd(), 'scripts/backend.mjs'), 'generate',
    '--prompt-file', promptFile, '--out', out, '--cwd', dir,
  ]).toString();
  const result = JSON.parse(stdout);
  assert.equal(result.ok, false);
  assert.equal(result.backend, 'manual');
  assert.ok(existsSync(out + '.prompt.txt'));
  assert.match(readFileSync(out + '.prompt.txt', 'utf8'), /deadpan blob doing taxes/);
});

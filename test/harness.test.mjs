import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const skillsDir = new URL('../skills/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : [];
  });
}

// The skills run under Claude Code, Codex and OpenCode from one source tree. Anything that only
// one harness understands may be named as that harness's variant, but never used bare as if every
// harness had it.
test('Claude-Code-only tokens appear only on lines that name the harness', () => {
  const claudeOnly = [/run_in_background/, /\bAskUserQuestion\b/, /\bTask\(/, /CLAUDE_PLUGIN_ROOT/];
  for (const f of walk(skillsDir)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      for (const re of claudeOnly) {
        if (re.test(line)) assert.match(line, /Claude Code/, `${f}: ${re} used without naming Claude Code:\n${line}`);
      }
    }
  }
});

test('no skill interpolates a harness variable; script paths go through PLUGIN', () => {
  for (const f of walk(skillsDir)) {
    const text = readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /\$\{CLAUDE_PLUGIN_ROOT\}/, `${f} interpolates CLAUDE_PLUGIN_ROOT`);
    for (const m of text.matchAll(/node "([^"]*scripts\/[a-z]+\.mjs)"/g)) {
      assert.match(m[1], /^\$PLUGIN\//, `${f}: ${m[0]} does not start with $PLUGIN`);
    }
  }
});

test('codex plugin manifest mirrors the claude one', () => {
  const claude = JSON.parse(readFileSync(new URL('.claude-plugin/plugin.json', root)));
  const codex = JSON.parse(readFileSync(new URL('.codex-plugin/plugin.json', root)));
  for (const k of ['name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords']) {
    assert.deepEqual(codex[k], claude[k], `${k} differs between manifests`);
  }
  assert.equal(codex.skills, './skills/');
  const pkg = JSON.parse(readFileSync(new URL('package.json', root)));
  assert.equal(codex.version, pkg.version);
});

test('release-please bumps the codex manifest too', () => {
  const cfg = JSON.parse(readFileSync(new URL('release-please-config.json', root)));
  const paths = cfg.packages['.']['extra-files'].map((f) => f.path);
  assert.ok(paths.includes('.codex-plugin/plugin.json'));
});

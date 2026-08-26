import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXAMPLES = fileURLToPath(new URL('../examples/', import.meta.url));

const folders = readdirSync(EXAMPLES).filter((f) => statSync(join(EXAMPLES, f)).isDirectory());

test('there is at least one example storybook', () => {
  assert.ok(folders.length >= 1);
});

for (const slug of folders) {
  test(`examples/${slug} is a storybook: <slug>.md + NN.webp only`, () => {
    const files = readdirSync(join(EXAMPLES, slug)).sort();
    const pngs = files.filter((f) => /^\d{2}\.webp$/.test(f));
    assert.deepEqual(files, [...pngs, `${slug}.html`, `${slug}.md`].sort(), `unexpected files in ${slug}: ${files}`);
    assert.ok(pngs.length >= 1);
    pngs.forEach((p, i) => assert.equal(p, `${String(i + 1).padStart(2, '0')}.webp`));

    const md = readFileSync(join(EXAMPLES, slug, `${slug}.md`), 'utf8');
    assert.match(md, /^# .+/m, 'has a title');
    assert.equal(/^##\s/m.test(md), false, 'no ## section headings');
    const captions = (md.match(/^### .+/gm) || []).length;
    assert.equal(captions, pngs.length, 'one ### caption per panel');
    const links = [...md.matchAll(/!\[[^\]]*\]\((\d{2})\.webp\)/g)].map((m) => m[1]);
    assert.deepEqual(links, pngs.map((p) => p.slice(0, 2)), 'images linked in order, relative, all present');
    assert.match(md, /^\*\*Remember:\*\* .+/m);
    assert.match(md, /<details><summary>Sources<\/summary>/);

    const html = readFileSync(join(EXAMPLES, slug, `${slug}.html`), 'utf8');
    assert.equal((html.match(/data:image\/webp;base64,/g) || []).length, pngs.length, 'every panel inlined in the html');
    assert.equal(/\.(png|webp)"/.test(html), false, 'html has no relative image links');
  });
}

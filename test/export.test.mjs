import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderStorybookHtml, exportStorybook } from '../scripts/lib/export.mjs';
import { whitePng } from './fixtures/make-fixture.mjs';

const MD = `# How labels land

Every panel is drawn twice.

![The picture arrives](01.png)

### The picture arrives with no words on it.

The backend draws \`line art\` only — no letters.

![Labels drop in](02.png)

### Each label lands where its fractions say.

Fractions of the canvas, not pixels.

**Remember:** 0.5 is the middle whatever the image size.

<details><summary>Sources</summary>

- scripts/label.mjs
- test/label.test.mjs
</details>
`;

async function fixtureDir() {
  const dir = mkdtempSync(join(tmpdir(), 'smh-export-'));
  await whitePng(join(dir, '01.png'));
  await whitePng(join(dir, '02.png'));
  writeFileSync(join(dir, 'how-labels-land.md'), MD);
  return dir;
}

test('renderStorybookHtml inlines images and keeps the storybook structure', async () => {
  const dir = await fixtureDir();
  const html = renderStorybookHtml(MD, dir);
  assert.match(html, /<title>How labels land<\/title>/);
  assert.match(html, /<h1>How labels land<\/h1>/);
  assert.equal((html.match(/<img src="data:image\/png;base64,/g) || []).length, 2, 'both images inlined');
  assert.equal(html.includes('src="01.png"'), false, 'no relative image links remain');
  assert.equal(html.includes('<h3>'), false, 'panel captions are in the image strip, not repeated as headings');
  assert.match(html, /<\/figure>
<p>The backend draws/);
  assert.match(html, /<code>line art<\/code>/);
  assert.match(html, /<strong>Remember:<\/strong> 0\.5 is the middle/);
  assert.match(html, /<details><summary>Sources<\/summary>/);
  assert.match(html, /<li>scripts\/label\.mjs<\/li>/);
  assert.equal(html.includes('<script'), false, 'static page, no scripts');
  assert.equal(html.includes('href="http'), false, 'self-contained: no external links in the head');
});

test('renderStorybookHtml escapes html in text', () => {
  const html = renderStorybookHtml('# a <b> & c\n\ntext <i>x</i>\n', '.');
  assert.match(html, /<h1>a &lt;b&gt; &amp; c<\/h1>/);
  assert.match(html, /text &lt;i&gt;x&lt;\/i&gt;/);
});

test('exportStorybook writes <slug>.html next to the doc', async () => {
  const dir = await fixtureDir();
  const r = exportStorybook(join(dir, 'how-labels-land.md'));
  assert.equal(r.out, join(dir, 'how-labels-land.html'));
  assert.ok(existsSync(r.out));
  assert.match(readFileSync(r.out, 'utf8'), /<h1>How labels land<\/h1>/);
});

// Size budget: 15 KB. Check: wc -c; gate: token-budget.mjs --check.
// Tests for the framework's maintenance tools: reflow-md, split-skill and the token-budget gate.
//
// These are not hooks, but they rewrite the framework's own files in bulk, which makes a
// defect in them more dangerous than a defect in most hooks: one bad run touches hundreds of
// files. Every test below pins something that actually went wrong, or nearly did, on
// 2026-09-21 — the notes say which.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const node = (script, args, env = {}) => {
  const r = spawnSync(process.execPath, [join(SCRIPTS, script), ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const tmp = () => mkdtempSync(join(tmpdir(), 'tools-test-'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const LONG = (words) => Array.from({ length: words }, (_, i) => `word${i}`).join(' ');

describe('reflow-md — rewraps prose without changing what the document says', () => {
  const reflow = (text, mode = '--write') => {
    const f = join(tmp(), 'doc.md');
    writeFileSync(f, text);
    const r = node('reflow-md.mjs', [mode, f]);
    return { ...r, text: readFileSync(f, 'utf8') };
  };

  test('wraps an over-long paragraph to the limit with the text unchanged', () => {
    const src = `# T\n\n${LONG(40)}\n`;
    const r = reflow(src);
    assert.equal(r.code, 0);
    assert.ok(r.text.split('\n').every((l) => l.length <= 100), 'every line within 100 columns');
    assert.equal(norm(r.text), norm(src), 'only line breaks may change');
  });

  test('never turns a " + " conjunction into a bullet', () => {
    // The real incident: "... component library specs, IA + flows" broke before "+", the
    // continuation "+ flows" became a list item, and a later lint fix rewrote it to "- flows".
    // This exact line is 108 columns and its natural break falls immediately before "+".
    const src = `**Triggers:** \`design/\`, \`figma/\`, design tokens, design system configs, component library specs, IA + flows\n`;
    const r = reflow(src);
    const lines = r.text.trimEnd().split('\n');
    assert.ok(!lines.some((l) => /^\s*[-*+]\s/.test(l)), 'no line may start as a bullet');
    // Not bulleting is necessary but not sufficient: refusing to wrap at all also avoids the
    // bullet. An earlier version of this test asserted only the first property, so it passed
    // with the break-earlier logic deleted. The line must actually come out wrapped.
    assert.ok(lines.length > 1 && lines.every((l) => l.length <= 100), 'wrapped, within the limit');
    assert.equal(lines[lines.length - 1], 'IA + flows', 'the conjunction travels with its neighbours');
    assert.equal(norm(r.text), norm(src));
  });

  test('does not avoid a break before **bold**, which is not a bullet', () => {
    // The first guard matched `*` without requiring a following space, so it treated `**bold**`
    // as a list marker. With nowhere earlier to break, the line was left over the limit.
    const src = `${'x'.repeat(95)} **important** rest of the sentence\n`;
    const lines = reflow(src).text.trimEnd().split('\n');
    assert.ok(lines.every((l) => l.length <= 100), 'wrapped, within the limit');
    assert.ok(lines[1].startsWith('**important**'), 'bold may start a continuation line');
  });

  test('does not avoid a break before a -flag, which is not a bullet', () => {
    const src = `${'x'.repeat(95)} -count=1 -race ./... to finish\n`;
    const lines = reflow(src).text.trimEnd().split('\n');
    assert.ok(lines.every((l) => l.length <= 100));
    assert.ok(lines[1].startsWith('-count=1'), 'a flag may start a continuation line');
  });

  test('continues a wrapped list item under its own text, not as a new item', () => {
    const src = `- ${LONG(30)}\n`;
    const r = reflow(src);
    const lines = r.text.trimEnd().split('\n');
    assert.ok(lines.length > 1);
    assert.equal(lines.filter((l) => /^- /.test(l)).length, 1, 'still exactly one list item');
    assert.ok(lines.slice(1).every((l) => l.startsWith('  ')), 'continuations indent under the text');
  });

  test('leaves frontmatter, fences, tables, headings and blockquotes alone', () => {
    const long = LONG(30);
    const src = [
      '---', `description: ${long}`, '---', '',
      `# ${long}`, '',
      '```', long, '```', '',
      `| ${long} | x |`, '',
      `> ${long}`, '',
    ].join('\n');
    const r = reflow(src);
    assert.equal(r.text, src, 'none of these may be rewrapped');
  });

  test('--check reports without writing', () => {
    const src = `${LONG(40)}\n`;
    const r = reflow(src, '--check');
    assert.equal(r.text, src);
    assert.match(r.out, /would rewrite 1/);
  });
});

describe('split-skill — moves detail out of SKILL.md and loses nothing', () => {
  const FRONT = '---\nname: demo\ndescription: A demo skill.\npaths:\n  - "**/*.demo"\n---\n';
  const section = (h, n) => `## ${h}\n\n${Array.from({ length: n }, (_, i) => `${h} line ${i}: ${LONG(12)}`).join('\n')}\n`;
  const skill = (body) => {
    const d = join(tmp(), 'demo');
    mkdirSync(d);
    writeFileSync(join(d, 'SKILL.md'), FRONT + body);
    return d;
  };
  const BIG = [
    '# Demo', '',
    section('Purpose', 3),
    section('When to Activate', 3),
    section('Core Patterns', 120),
    section('Deep Dive', 120),
    section('Anti-Patterns', 5),
    section('Cross-References', 3),
    '<!-- ============================================================',
    '     Section: legacy-rule.md (from rules/common/)',
    '     ============================================================ -->',
    '', '# Legacy Rule', '', LONG(20), '',
  ].join('\n');

  test('brings SKILL.md under the cap with every original line still present', () => {
    const d = skill(BIG);
    const before = readFileSync(join(d, 'SKILL.md'), 'utf8');
    const r = node('split-skill.mjs', ['--write', d]);
    assert.equal(r.code, 0, r.out);
    const main = readFileSync(join(d, 'SKILL.md'), 'utf8');
    assert.ok(Buffer.byteLength(main) <= 25000);
    const all = [main, ...readdirSync(join(d, 'references')).map((f) => readFileSync(join(d, 'references', f), 'utf8'))].join('\n');
    for (const l of before.split('\n').filter((x) => x.trim())) assert.ok(all.includes(l), `lost: ${l.slice(0, 60)}`);
  });

  // Text moved into references/ sits one directory deeper. The first splits moved it with its
  // links unchanged, and 209 relative links broke across the corpus.
  test('rebases the links in moved text so they still resolve, and leaves URLs alone', () => {
    const root = tmp();
    mkdirSync(join(root, 'rules', 'common'), { recursive: true });
    writeFileSync(join(root, 'rules', 'common', 'r.md'), '# R\n');
    const d = join(root, 'skills', 'demo');
    mkdirSync(d, { recursive: true });
    const linked = section('Core Patterns', 120) +
      '\nSee [the rule](../../rules/common/r.md#core) and [the spec](https://example.com/spec).\n';
    writeFileSync(join(d, 'SKILL.md'), FRONT + BIG.replace(section('Core Patterns', 120), linked));
    const r = node('split-skill.mjs', ['--write', d]);
    assert.equal(r.code, 0, r.out);
    const ref = readFileSync(join(d, 'references', 'core-patterns.md'), 'utf8');
    assert.match(ref, /\]\(\.\.\/\.\.\/\.\.\/rules\/common\/r\.md#core\)/, 'one level deeper, anchor kept');
    assert.ok(existsSync(join(d, 'references', '../../../rules/common/r.md')));
    assert.match(ref, /\]\(https:\/\/example\.com\/spec\)/, 'a URL is not a path');
  });

  // The audit wants citations in SKILL.md. A heading spelled "Standards" rather than
  // "Standards Cited" used to move out, and seven skills were left citing nothing.
  test('keeps a Standards section in SKILL.md however it is titled', () => {
    const d = skill(BIG.replace(section('Cross-References', 3), section('Standards', 3) + section('Cross-References', 3)));
    node('split-skill.mjs', ['--write', d]);
    assert.match(readFileSync(join(d, 'SKILL.md'), 'utf8'), /^## Standards$/m);
  });

  test('keeps the frontmatter byte-identical, since its paths decide when the skill fires', () => {
    const d = skill(BIG);
    node('split-skill.mjs', ['--write', d]);
    assert.ok(readFileSync(join(d, 'SKILL.md'), 'utf8').startsWith(FRONT));
  });

  test('keeps the sections the principal-level audit looks for in SKILL.md', () => {
    const d = skill(BIG);
    node('split-skill.mjs', ['--write', d]);
    const main = readFileSync(join(d, 'SKILL.md'), 'utf8');
    for (const h of ['## Purpose', '## When to Activate', '## Anti-Patterns', '## Cross-References']) {
      assert.ok(main.includes(h), `${h} must stay in SKILL.md`);
    }
    assert.ok(!main.includes('Core Patterns line 5'), 'detail should have moved out');
  });

  test('moves a migrated rule WITH its provenance banner', () => {
    // Six banners were lost this way by the first round of splits and had to be restored.
    const d = skill(BIG);
    node('split-skill.mjs', ['--write', d]);
    const ref = readFileSync(join(d, 'references', 'legacy-rule.md'), 'utf8');
    assert.match(ref, /Section: legacy-rule\.md \(from rules\/common\/\)/);
    assert.match(ref, /# Legacy Rule/);
  });

  test('every link in the reference map resolves', () => {
    const d = skill(BIG);
    node('split-skill.mjs', ['--write', d]);
    const main = readFileSync(join(d, 'SKILL.md'), 'utf8');
    const links = [...main.matchAll(/\]\(references\/([^)]+)\)/g)].map((m) => m[1]);
    assert.ok(links.length >= 2);
    for (const l of links) assert.ok(existsSync(join(d, 'references', l)), `dangling ${l}`);
  });

  // A document's first line is its title (markdownlint MD041). The first round of splits put
  // the budget note above the title in 57 skills and the routing note above it in 307
  // references, so every one of those files opened with a blockquote instead of a heading.
  const firstContent = (text) =>
    text.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').find((l) => l.trim());

  test('keeps the title as the first line of SKILL.md, with the budget note under it', () => {
    const d = skill(BIG);
    node('split-skill.mjs', ['--write', d]);
    const main = readFileSync(join(d, 'SKILL.md'), 'utf8');
    assert.equal(firstContent(main), '# Demo');
    assert.ok(main.indexOf('Size budget') > main.indexOf('# Demo'), 'budget note follows the title');
  });

  test('opens every reference with a title, including a migrated document with its own', () => {
    const d = skill(BIG);
    node('split-skill.mjs', ['--write', d]);
    for (const f of readdirSync(join(d, 'references'))) {
      const text = readFileSync(join(d, 'references', f), 'utf8');
      assert.match(firstContent(text), /^# /, `${f} must open with a title`);
      assert.equal((text.match(/^# /gm) || []).length, 1, `${f} must have exactly one title`);
    }
  });

  test('replaces a budget the skill already declared instead of adding a second one', () => {
    // design-thinking already carried "Size budget: 30 KB" (sized before the split) and came
    // out with that line plus the splitter's own — two budgets, the larger above the cap.
    const d = skill(BIG.replace('# Demo\n', '# Demo\n\n> **Size budget: 30 KB** — `token-budget.mjs --check`.\n'));
    node('split-skill.mjs', ['--write', d]);
    const main = readFileSync(join(d, 'SKILL.md'), 'utf8');
    assert.equal((main.match(/Size budget:/g) || []).length, 1, 'exactly one budget');
    assert.match(main, /Size budget: 25 KB/, 'and it is the cap');
  });

  test('--check plans without writing', () => {
    const d = skill(BIG);
    const r = node('split-skill.mjs', ['--check', d]);
    assert.equal(r.code, 0);
    assert.match(r.out, /PLAN/);
    assert.ok(!existsSync(join(d, 'references')));
  });

  test('refuses a skill with no frontmatter rather than guessing', () => {
    const d = join(tmp(), 'bare');
    mkdirSync(d);
    writeFileSync(join(d, 'SKILL.md'), `# Bare\n\n${LONG(10)}\n`);
    const r = node('split-skill.mjs', ['--write', d]);
    assert.equal(r.code, 1);
    assert.match(r.out, /ERROR/);
  });
});

describe('token-budget --check — the gate fails when a file exceeds its own budget', () => {
  // A gate nobody has seen fail is usually misconfigured (functional-test-coverage rule 9),
  // so both halves are pinned: it fails on an overage and passes within budget.
  const home = (bytes, budgetKb) => {
    const h = tmp();
    mkdirSync(join(h, '.claude', 'rules', 'common'), { recursive: true });
    writeFileSync(
      join(h, '.claude', 'rules', 'common', 'r.md'),
      `# R\n\n> **Size budget: ${budgetKb} KB** — \`token-budget.mjs --check\`.\n\n${'x'.repeat(bytes)}\n`
    );
    return h;
  };

  test('exits non-zero and names the file when it is over its declared budget', () => {
    const r = node('token-budget.mjs', ['--check'], { HOME: home(3000, 1) });
    assert.equal(r.code, 1);
    assert.match(r.out, /OVER\s+r\.md/);
  });

  test('passes when every declaring file is within budget', () => {
    const r = node('token-budget.mjs', ['--check'], { HOME: home(500, 8) });
    assert.equal(r.code, 0);
    assert.match(r.out, /within budget/);
  });

  test('finds a budget declared after a long front matter', () => {
    // coding-quality-rules lists 32 `paths:` globs, so its budget sits on line 45. A window
    // counted from line 1 missed it and reported a declared file as UNMEASURED.
    const h = tmp();
    mkdirSync(join(h, '.claude', 'rules', 'common'), { recursive: true });
    const globs = Array.from({ length: 45 }, (_, i) => `  - "**/*.x${i}"`).join('\n');
    writeFileSync(join(h, '.claude', 'rules', 'common', 'r.md'),
      `---\npaths:\n${globs}\n---\n\n# R\n\n> **Size budget: 1 KB** — \`token-budget.mjs --check\`.\n\n${'x'.repeat(3000)}\n`);
    const r = node('token-budget.mjs', ['--check'], { HOME: h });
    assert.equal(r.code, 1, 'the declaration must be found, and the overage caught');
    assert.doesNotMatch(r.out, /UNMEASURED/);
  });

  test('counts a file with no declared budget as UNMEASURED, not as passing', () => {
    const h = tmp();
    mkdirSync(join(h, '.claude', 'rules', 'common'), { recursive: true });
    writeFileSync(join(h, '.claude', 'rules', 'common', 'r.md'), '# R\n\nno budget here\n');
    const r = node('token-budget.mjs', ['--check'], { HOME: h });
    assert.match(r.out, /UNMEASURED/);
  });
});

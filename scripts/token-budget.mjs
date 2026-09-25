#!/usr/bin/env node
// Measure what the Council actually costs per turn.
//
//   node ~/.claude/scripts/token-budget.mjs          # summary
//   node ~/.claude/scripts/token-budget.mjs --full   # every over-cap skill
//   node ~/.claude/scripts/token-budget.mjs --json   # machine-readable
//   node ~/.claude/scripts/token-budget.mjs --check  # GATE: exit 1 if any file is
//                                                    # over the budget it declares
//
// WHY THIS EXISTS. CLAUDE.md carries a measured Floor figure and an instruction to re-measure
// before quoting it, because the number before it ("~110-130 KB") "was never true and went
// unchecked because nobody ran the command". The same drift recurred: the file said ~65,000
// tokens and the real figure on 2026-09-21 was 72,039. A number that is expensive to check
// gets quoted from memory, so this makes checking free.
//
// The estimate is bytes/4, which is the rough English-prose ratio. It is deliberately crude:
// the decisions it informs (is this skill four times the size of the cap?) do not turn on
// tokenizer precision, and a dependency on a real tokenizer would make the script something
// people stop running.
// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ROOT = join(homedir(), '.claude');
const SKILL_CAP = 25_000; // bytes; CLAUDE.md's progressive-disclosure threshold
// Installed and updated by their own tools, not authored here: `synced` by the claude.ai skill
// sync, `graphify` by the graphify installer. Neither is ours to split, budget or reformat, and
// the markdownlint config excludes them for the same reason. They are reported, not counted.
const VENDORED = new Set(['synced', 'graphify']);
const tok = (bytes) => Math.round(bytes / 4);
const fmt = (n) => n.toLocaleString('en-US');

function bytesOf(files) {
  return files.reduce((sum, f) => {
    try {
      return sum + statSync(f).size;
    } catch {
      return sum;
    }
  }, 0);
}

function mdIn(dir, depth = 3) {
  const out = [];
  const walk = (d, left) => {
    if (left < 0) return;
    let entries = [];
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p, left - 1);
      else if (e.name.endsWith('.md')) out.push(p);
    }
  };
  walk(dir, depth);
  return out;
}

// The Floor: loaded on every single turn, whatever the task.
const floorFiles = [
  ...mdIn(join(ROOT, 'rules', 'common'), 0),
  join(ROOT, 'CLAUDE.md'),
].filter((f) => existsSync(f));
const floorBytes = bytesOf(floorFiles);

// Per-rule breakdown, largest first.
const floorRules = floorFiles
  .map((f) => ({ name: f.split('/').pop(), bytes: statSync(f).size }))
  .sort((a, b) => b.bytes - a.bytes);

// Skills: lazy, but a gated skill is deferred rather than free. When it fires it is added to
// the Floor, so its size is what one matching file actually costs.
const skillsDir = join(ROOT, 'skills');
const skills = [];
try {
  for (const d of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!d.isDirectory() || VENDORED.has(d.name)) continue;
    const main = join(skillsDir, d.name, 'SKILL.md');
    if (!existsSync(main)) continue;
    const bytes = statSync(main).size;
    const refs = mdIn(join(skillsDir, d.name), 2).filter((f) => !f.endsWith('SKILL.md')).length;
    skills.push({ name: d.name, bytes, refs });
  }
} catch (err) {
  // An install with no skills directory is valid, so this is not fatal — but say so rather
  // than reporting "0 skills over cap", which reads as a clean bill of health.
  process.stderr.write(`token-budget: skills not readable (${err.code || 'error'})\n`);
}
skills.sort((a, b) => b.bytes - a.bytes);
const over = skills.filter((s) => s.bytes > SKILL_CAP);

const report = {
  floor: { bytes: floorBytes, tokens: tok(floorBytes), files: floorFiles.length },
  worstCase: {
    skill: skills[0]?.name ?? null,
    tokens: tok(floorBytes + (skills[0]?.bytes ?? 0)),
  },
  skills: {
    total: skills.length,
    overCap: over.length,
    overCapTokens: tok(over.reduce((s, x) => s + x.bytes, 0)),
    withProgressiveDisclosure: over.filter((s) => s.refs > 0).length,
  },
};

// --check is the gate half of no-bloat.md rule 10: a budget with no gate is exceeded
// by most of its population, silently. A file declares its own budget in its first 40
// lines (`Size budget: 16 KB`); this holds every declaring file to what it said, and
// exits non-zero so a pre-push run can refuse. Files that declare nothing are counted
// and named as UNMEASURED rather than passed — silence is not compliance.
const SIZE_BUDGET = /^[\s>*#/-]*\**\s*Size budget:\s*([\d.]+)\s*(KB|B)\b/i;

function declaredBudget(file) {
  let head;
  try {
    // The window starts AFTER any YAML front matter. A skill with 32 `paths:` globs put its
    // title, and so its budget, on line 45 — past a window counted from the top of the file.
    head = readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n', 40);
  } catch {
    return 0;
  }
  for (const line of head) {
    const m = SIZE_BUDGET.exec(line);
    if (m) return Math.round(parseFloat(m[1]) * (m[2].toUpperCase() === 'KB' ? 1024 : 1));
  }
  return 0;
}

// Every file that COULD declare a budget, not only the Floor: a budget declared on a
// hook or a script and checked by nothing is the defect rule 10 names, so the gate has
// to reach wherever the declaration is allowed.
function budgetCandidates() {
  const out = [];
  const exts = ['.md', '.js', '.mjs', '.sh'];
  const walk = (dir, left) => {
    if (left < 0) return;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.') || VENDORED.has(e.name)) continue;
      const f = join(dir, e.name);
      if (e.isDirectory()) walk(f, left - 1);
      else if (exts.some((x) => e.name.endsWith(x))) out.push(f);
    }
  };
  for (const d of ['rules', 'skills', 'scripts', 'agents', 'hooks']) walk(join(ROOT, d), 4);
  const top = join(ROOT, 'CLAUDE.md');
  if (existsSync(top)) out.push(top);
  return out;
}

if (process.argv.includes('--check')) {
  const over = [];
  let declared = 0;
  const candidates = budgetCandidates();
  for (const f of candidates) {
    const budget = declaredBudget(f);
    if (!budget) continue;
    declared++;
    const bytes = statSync(f).size;
    if (bytes > budget) over.push({ name: f.split('/').pop(), bytes, budget });
  }
  const unmeasured = candidates.length - declared;
  process.stdout.write(
    `${declared} of ${candidates.length} files declare a size budget` +
      (unmeasured ? ` (${unmeasured} UNMEASURED)` : '') + '\n',
  );
  for (const o of over) {
    process.stdout.write(
      `  OVER  ${o.name}: ${fmt(o.bytes)} B > ${fmt(o.budget)} B declared\n`,
    );
  }
  if (over.length) {
    process.stderr.write(`\n${over.length} file(s) over their own declared budget.\n`);
    process.exit(1);
  }
  process.stdout.write('  all declaring files within budget\n');
  process.exit(0);
}

if (process.argv.includes('--json')) {
  // The per-skill list has its own key: under `skills` it overwrote the summary of the same name.
  process.stdout.write(JSON.stringify({ ...report, floorRules, skillList: skills }, null, 2) + '\n');
  process.exit(0);
}

const L = [];
L.push('Council token budget');
L.push('');
L.push(`  Floor (every turn)   ${fmt(report.floor.tokens)} tokens   ${fmt(floorBytes)} B across ${report.floor.files} files`);
L.push(`  Worst single turn    ${fmt(report.worstCase.tokens)} tokens   Floor + ${report.worstCase.skill}`);
L.push('');
L.push('  Largest always-on rules');
for (const r of floorRules.slice(0, 6)) {
  L.push(`    ${String(fmt(tok(r.bytes))).padStart(6)} tok  ${r.name}`);
}
L.push('');
L.push(`  Skills over the ${fmt(SKILL_CAP)} B cap: ${report.skills.overCap} of ${report.skills.total}`);
L.push(`    (vendored, not counted: ${[...VENDORED].join(', ')})`);
L.push(`    ${fmt(report.skills.overCapTokens)} tokens if every one fired`);
L.push(`    ${report.skills.withProgressiveDisclosure} of ${report.skills.overCap} use progressive disclosure (a routing SKILL.md + references/)`);

if (process.argv.includes('--full')) {
  L.push('');
  L.push('  Every over-cap skill');
  for (const s of over) {
    L.push(`    ${String(fmt(tok(s.bytes))).padStart(6)} tok  ${s.name}${s.refs ? ` (${s.refs} refs)` : '  << no references/'}`);
  }
}

L.push('');
L.push('  A gated skill is deferred, not free: when it fires it is added to the Floor.');
L.push('  Per CLAUDE.md, anything over the cap should be a routing table plus references/.');
process.stdout.write(L.join('\n') + '\n');

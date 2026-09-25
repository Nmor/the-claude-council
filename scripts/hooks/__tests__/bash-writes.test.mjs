// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
// lib/bash-writes.js, driven through one-plan-gate.js the way the harness runs it: a Bash
// command is judged on what it WRITES, not on what it mentions. Each refused form is a way a
// second plan got past the gate; each allowed form is real work the gate once refused.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { run, said } from './helpers.mjs';
import { planWorkspace as ws } from './plan-world.mjs';

const bash = (w, command, cwd = w.root) =>
  run('one-plan-gate.js', { tool_name: 'Bash', cwd, tool_input: { command } }, w.env);
const second = '.claude/plans/second.md';

describe('bash-writes — every way a command writes a second plan is refused', () => {
  for (const [form, command] of [
    ['redirect >', `echo '# x' > ${second}`],
    ['append >>', `printf x >> ${second}`],
    ['clobber >|', `echo x >| ${second}`],
    ['read-write <>', `exec 3<> ${second}`],
    ['tee', `echo x | tee ${second}`],
    ['cp', `cp .claude/plans/master.md ${second}`],
    ['cp into the dir', 'cp /tmp/notes.md .claude/plans/'],
    ['cp a glob into the dir', 'cp /x/*.md .claude/plans/'],
    ['cp a directory\'s contents in', 'cp -r /tmp/d/. .claude/plans/'],
    ['rsync', `rsync -a /tmp/a.md ${second}`],
    ['mv in from outside', `mv /tmp/audit.md ${second}`],
    ['touch', `touch ${second}`],
    ['install', `install -m 644 /tmp/a.md ${second}`],
    ['git mv', `git mv docs/x.md ${second}`],
    ['dd of=', `dd if=/dev/null of=${second}`],
    ['curl -o', `curl -o ${second} https://example.invalid/x`],
    ['wget -O', `wget -O ${second} https://example.invalid/x`],
    ['cd then touch', 'cd .claude/plans && touch second.md'],
    ['a subshell', `(echo x > ${second})`],
    ['a brace group', `{ touch ${second}; }`],
    ['if/then', `if true; then touch ${second}; fi`],
    ['env', `env A=1 touch ${second}`],
    ['command / nohup / sudo', `command nohup sudo -u me touch ${second}`],
    ['bash -c', `bash -c 'echo x > ${second}'`],
    ['sh -lc', `sh -lc "touch ${second}"`],
    ['eval', `eval "touch ${second}"`],
    ['a heredoc a shell runs', `bash <<'EOF'\ntouch ${second}\nEOF`],
    ['xargs touch fed by a pipe', `echo ${second} | xargs touch`],
    ['xargs cp {}', 'ls /tmp/*.md | xargs -I {} cp {} .claude/plans/'],
    ['find -exec cp', 'find /tmp -name a.md -exec cp {} .claude/plans/ \\;'],
    ['heredoc written to the plan', `cat > ${second} <<'EOF'\n# plan\nEOF`],
    ['python open w', `python3 -c "open('${second}','w').write('x')"`],
    ['python open wt', `python3 -c "open('${second}', 'wt')"`],
    ['python pathlib touch', `python3 -c "import pathlib; pathlib.Path('${second}').touch()"`],
    ['python os.rename', `python3 -c "import os; os.rename('/tmp/a.md', '${second}')"`],
    ['python shutil.copy', `python3 -c "import shutil; shutil.copy(src, '${second}')"`],
    ['python heredoc script', `python3 - <<'EOF'\nwith open("${second}", "w") as f:\n    f.write("x")\nEOF`],
    ['node writeFileSync', `node -e "require('fs').writeFileSync('${second}','x')"`],
    ['node async writeFile', `node -e "require('fs').writeFile('${second}','x',()=>{})"`],
    ['node copyFile', `node -e "require('fs').copyFile('/tmp/a.md', '${second}', ()=>{})"`],
    ['perl 2-arg open', `perl -e 'open(F, ">${second}")'`],
    ['perl 3-arg open', `perl -e 'open(my $f, ">", "${second}")'`],
    ['ruby File.write', `ruby -e "File.write('${second}', 'x')"`],
    ['a .markdown plan', 'touch .claude/plans/second.markdown'],
    ['a case variant of the dir', null],
    ['a symlink to the dir', null],
    ['quoted absolute target', null],
  ]) {
    test(`refuses creating a second plan via ${form}`, (t) => {
      const w = ws();
      let cmd = command;
      if (form === 'quoted absolute target') cmd = `echo x > "${join(w.dir, 'second plan.md')}"`;
      if (form === 'a symlink to the dir') {
        symlinkSync(w.dir, join(w.root, 'plink'));
        cmd = 'touch plink/second.md';
      }
      if (form === 'a case variant of the dir') {
        if (!existsSync(join(w.root, '.CLAUDE'))) return t.skip('case-sensitive filesystem');
        cmd = 'touch .Claude/Plans/second.md';
      }
      const r = bash(w, cmd);
      assert.equal(r.code, 2, `${cmd}\n${r.stderr}`);
    });
  }
});

describe('bash-writes — naming a plan is not writing one', () => {
  test('~ and $HOME are expanded, so a home-relative second plan is still refused', () => {
    const w = ws({ underHome: true });
    assert.equal(bash(w, 'touch $HOME/work/ws/.claude/plans/second.md').code, 2);
    assert.equal(bash(w, 'touch ~/work/ws/.claude/plans/second.md').code, 2);
  });

  test('a bare cd, or cd ~, moves to $HOME as a shell does, where the shared folder is not blocked', () => {
    const w = ws();
    for (const c of ['cd && touch .claude/plans/x.md', 'cd ~ && touch .claude/plans/x.md'])
      assert.equal(bash(w, c).code, 0, c);
  });

  test('a path through a variable it cannot resolve is not judged, rather than misread as relative', () => {
    // Found live: `$S/ws/...` was joined to cwd as a literal and refused under the cwd's workspace.
    const w = ws();
    for (const c of ['printf x > "$S/new/.claude/plans/master.md"', 'touch $(pwd)/x/.claude/plans/a.md',
      'cd "$S/ws" && touch .claude/plans/second.md', `python3 -c "open(f'{d}/.claude/plans/a.md','w')"`,
      'cp "$f" .claude/plans/'])
      assert.equal(bash(w, c).code, 0, c);
  });

  test('a heredoc that only MENTIONS a plan path writes no plan', () => {
    const w = ws();
    const r = bash(w, `cat > /tmp/notes-${process.pid}.txt <<'EOF'\ntouch ${second}\necho x > ${second}\nEOF`);
    assert.equal(r.code, 0);
  });

  test('a commit message naming a plan path is data, not commands', () => {
    // A consolidation commit message says where the work went; it wrote no file.
    const w = ws();
    const r = bash(w, `git commit -F - <<'EOF'\nConsolidate: audit -> .claude/plans/combined.md\ntouch ${second}\nEOF`);
    assert.equal(r.code, 0, r.stderr);
  });

  test('a script that checks a plan path and writes elsewhere writes no plan', () => {
    // The consolidation check itself: assert the archived plan is gone, write a diff report.
    const w = ws({ plans: ['master.md', 'audit.md'] });
    for (const c of [
      `python3 - <<'EOF'\nimport os\nassert not os.path.exists('.claude/plans/next.md')\nopen('/tmp/report.txt','w').write('ok')\nEOF`,
      `python3 -c "print(open('.claude/plans/master.md').read()); open('/tmp/o','w')"`,
      `python3 -c "import os; os.rename('.claude/plans/audit.md', '/tmp/archive/audit.md')"`,
    ])
      assert.equal(bash(w, c).code, 0, c);
  });

  test('a redirect inside quotes is text, not a write', () => {
    assert.equal(bash(ws(), `echo "then run: echo x > ${second}"`).code, 0);
  });

  test('copying files of another type into a plans dir writes no plan', () => {
    assert.equal(bash(ws(), 'cp /x/*.json .claude/plans/').code, 0);
  });

  test('reading plans is never refused', () => {
    const w = ws({ plans: ['master.md', 'audit.md'] });
    for (const c of [`cat ${second}`, 'grep -n Phase .claude/plans/*.md', 'ls .claude/plans', 'wc -c .claude/plans/master.md 2>/dev/null'])
      assert.equal(bash(w, c).code, 0, c);
  });

  test('appending to the existing sole plan is enrichment, and silent', () => {
    const r = bash(ws(), 'echo "- [ ] new task" >> .claude/plans/master.md');
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
  });

  test('renaming the only plan does not make a second one', () => {
    assert.equal(bash(ws(), 'mv .claude/plans/master.md .claude/plans/plan.md').code, 0);
  });

  test('moving a plan OUT to an archive is allowed (the consolidation step)', () => {
    const w = ws({ plans: ['master.md', 'audit.md'] });
    assert.equal(bash(w, `mkdir -p ${w.home}/.claude/.local/plans && mv .claude/plans/audit.md ${w.home}/.claude/.local/plans/`).code, 0);
  });
});

describe('bash-writes — cost is linear in the command', () => {
  // A regex scan here took 24 s on a 200 KB token, past the hook timeout. The bound is loose so
  // parallel test load cannot flake it; the defect it guards is two orders of magnitude slower.
  for (const [name, command] of [
    ['a 200 KB literal in an inline script', `python3 -c "open('/tmp/o','w').write('${'a'.repeat(200_000)}')" plans`],
    ['a 200 KB token of repeated plan paths', `python3 -c "open('/tmp/o','w'); p='${'.claude/plans/'.repeat(15_000)}x.md'"`],
  ]) {
    test(`judges ${name} in under 2 s`, () => {
      const t0 = Date.now();
      const r = bash(ws(), command);
      assert.equal(r.code, 0);
      assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
    });
  }
});

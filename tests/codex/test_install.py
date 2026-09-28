"""Black-box lifecycle and filesystem preservation tests for the Codex installer."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import tomllib
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('council_install', ROOT / 'bootstrap/codex.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


def snapshot(root):
    return {p.relative_to(root).as_posix(): p.read_bytes()
            for p in root.rglob('*') if p.is_file()}


class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.home = self.base / 'codex home'
        self.home.mkdir()
        (self.home / 'config.toml').write_text('[mcp_servers.example]\nurl = "https://example.invalid"\n')
        (self.home / 'AGENTS.md').write_text('# Personal instructions\nRetain this exact content.\n')
        (self.home / 'hooks.json').write_text(json.dumps({'hooks': {'Stop': [
            {'hooks': [{'type': 'command', 'command': 'echo personal'}]}]}}))
        (self.home / 'skills/my-skill').mkdir(parents=True)
        (self.home / 'skills/my-skill/SKILL.md').write_text('Personal resource')
        self.before = snapshot(self.home)

    def install(self, **kwargs):
        return installer.install(self.home, ROOT, **kwargs)

    def test_install_reinstall_and_uninstall_preserve_personal_files(self):
        first = self.install()
        self.assertGreater(first['files'], 300)
        installer.verify(self.home)
        installed = snapshot(self.home)
        self.assertEqual(installed['config.toml'], self.before['config.toml'])
        self.assertEqual(installed['skills/my-skill/SKILL.md'], b'Personal resource')
        self.assertTrue(installed['AGENTS.md'].startswith(self.before['AGENTS.md']))
        self.install()
        self.assertEqual(snapshot(self.home), installed)
        hooks = json.loads((self.home / 'hooks.json').read_text(encoding="utf-8"))
        self.assertEqual(len(hooks['hooks']['Stop']), 2)
        installer.uninstall(self.home)
        self.assertEqual(snapshot(self.home), self.before)

    @unittest.skipIf(__import__('os').name == 'nt', 'POSIX permission bits')
    def test_private_shared_file_backup_stays_private(self):
        (self.home / 'hooks.json').chmod(0o600)
        self.install()
        self.assertEqual((self.home / 'council/manifest.json').stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.home / 'hooks.json').stat().st_mode & 0o777, 0o600)
        installer.uninstall(self.home)
        self.assertEqual((self.home / 'hooks.json').stat().st_mode & 0o777, 0o600)

    def test_dry_run_writes_nothing_even_to_missing_home(self):
        self.install(dry_run=True)
        self.assertEqual(snapshot(self.home), self.before)
        empty = self.base / 'not-created'
        installer.install(empty, ROOT, dry_run=True)
        self.assertFalse(empty.exists())
        self.install()
        before = snapshot(self.home)
        installer.uninstall(self.home, dry_run=True)
        self.assertEqual(snapshot(self.home), before)

    def test_invalid_existing_hooks_refuses_without_partial_changes(self):
        (self.home / 'hooks.json').write_text('{"hooks": {"Stop": "invalid"}}')
        before = snapshot(self.home)
        with self.assertRaisesRegex(ValueError, 'arrays'):
            self.install()
        self.assertEqual(snapshot(self.home), before)

    def test_collision_refuses_without_partial_changes(self):
        path = self.home / 'skills/council/SKILL.md'
        path.parent.mkdir(parents=True)
        path.write_text('Existing independent council')
        before = snapshot(self.home)
        with self.assertRaisesRegex(ValueError, 'collision'):
            self.install()
        self.assertEqual(snapshot(self.home), before)

    def test_changed_files_refuse_upgrade_and_uninstall(self):
        self.install()
        path = self.home / 'agents/council-planner.toml'
        path.write_text(path.read_text(encoding="utf-8") + '# User customization\n')
        before = snapshot(self.home)
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.install()
        with self.assertRaisesRegex(ValueError, 'changed'):
            installer.uninstall(self.home)
        self.assertEqual(snapshot(self.home), before)

    def test_rollback_restores_existing_and_removes_created_files(self):
        real = installer.atomic_write
        calls = 0
        def failing_once(path, data, mode=0o644):
            nonlocal calls
            calls += 1
            if calls == 12:
                raise OSError('injected disk error')
            return real(path, data, mode)
        with patch.object(installer, 'atomic_write', side_effect=failing_once):
            with self.assertRaisesRegex(OSError, 'injected'):
                self.install()
        self.assertEqual(snapshot(self.home), self.before)
        self.assertFalse((self.home / 'council').exists())

    def test_late_rollback_restores_shared_files_and_previous_install(self):
        self.install()
        before = snapshot(self.home)
        real = installer.atomic_write
        fired = False
        def fail_manifest(path, data, mode=0o644):
            nonlocal fired
            if path.name == 'manifest.json' and not fired:
                fired = True
                raise OSError('late failure')
            return real(path, data, mode)
        with patch.object(installer, 'atomic_write', side_effect=fail_manifest):
            with self.assertRaisesRegex(OSError, 'late failure'):
                self.install()
        self.assertEqual(snapshot(self.home), before)

    def test_project_mapping_reuses_existing_plan_and_merges_roots(self):
        project = self.base / 'project'
        project.mkdir()
        plan = project / 'old-plan.md'
        plan.write_text('Existing plan; never rewrite during install.')
        self.install(projects=[str(project)], plan=str(plan))
        second = self.base / 'second'
        second.mkdir()
        self.install(projects=[str(second)], plan=str(plan))
        mappings = json.loads((self.home / 'council/projects.json').read_text(encoding="utf-8"))['projects']
        self.assertEqual(len(mappings), 2)
        self.assertTrue(all(p['plan'] == str(plan.resolve()) for p in mappings))
        self.assertEqual(plan.read_text(encoding="utf-8"), 'Existing plan; never rewrite during install.')
        self.assertFalse(any('plans/' in p for p in snapshot(self.home)))

    def test_nonexistent_plan_rejected_without_changes(self):
        with self.assertRaisesRegex(ValueError, 'existing file'):
            self.install(projects=[str(self.base)], plan=str(self.base / 'absent.md'))
        self.assertEqual(snapshot(self.home), self.before)

    def test_all_agents_native_no_model_override_and_all_source_references_preserved(self):
        self.install()
        for file in (self.home / 'agents').glob('council-*.toml'):
            agent = tomllib.loads(file.read_text(encoding="utf-8"))
            self.assertEqual(set(agent), {'name', 'description', 'developer_instructions'})
            self.assertTrue(agent['description'])
        source_skills = list((ROOT / 'skills').glob('*/SKILL.md'))
        for file in source_skills:
            if subprocess.run(['git', '-C', str(ROOT), 'ls-files', '--error-unmatch',
                               str(file.relative_to(ROOT))], capture_output=True).returncode:
                continue
            self.assertTrue((self.home / 'skills' / ('council-' + file.parent.name) / 'SKILL.md').is_file())
        for file in installer.tracked_resources(ROOT):
            target = self.home / 'council/resources' / file
            expected = (ROOT / file).read_bytes()
            if file.endswith('.md'):
                expected = installer.adapt_reference(expected.decode(), self.home).encode()
            self.assertEqual(target.read_bytes(), expected, file)

    def test_migrated_rule_references_resolve_without_rewriting_runtime_plan(self):
        converted = installer.adapt_reference(
            '~/.claude/rules/common/no-discards.md ~/.claude/plans/example.md', self.home)
        self.assertIn('resources/rules-library/common/no-discards.md', converted)
        self.assertIn('~/.claude/plans/example.md', converted)

    def test_override_instructions_refused_not_silently_shadowed(self):
        (self.home / 'AGENTS.override.md').write_text('Override')
        before = snapshot(self.home)
        with self.assertRaisesRegex(ValueError, 'shadows'):
            self.install()
        self.assertEqual(snapshot(self.home), before)

    def test_symlink_target_refused(self):
        external = self.base / 'external'
        external.mkdir()
        try:
            (self.home / 'council').symlink_to(external, target_is_directory=True)
        except OSError:
            self.skipTest('Host does not permit symlink creation')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.install()
        self.assertEqual(snapshot(external), {})

    def test_manifest_traversal_refused(self):
        (self.home / 'council').mkdir()
        (self.home / 'council/manifest.json').write_text(json.dumps({'version': 1, 'files': {
            '../outside': {'sha256': 'x', 'original': None}}}))
        with self.assertRaisesRegex(ValueError, 'Unexpected managed path'):
            installer.uninstall(self.home)


if __name__ == '__main__':
    unittest.main()

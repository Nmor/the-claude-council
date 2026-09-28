"""Cost-profile migration must preserve personal settings and be safely reversible."""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import tomllib
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('context_migration', ROOT / 'bootstrap/context.py')
context = importlib.util.module_from_spec(spec)
spec.loader.exec_module(context)


def snapshot(root):
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob('*') if p.is_file()}


class ContextTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.settings = {
            'model': 'chosen-primary', 'effortLevel': 'high',
            'autoCompactEnabled': False,
            'env': {'PERSONAL': 'keep', 'autoCompactEnabled': 'false'},
            'hooks': {'UserPromptSubmit': [{'hooks': [
                {'type': 'command', 'command': 'python3 ~/.claude/hooks/improve-prompt.py'},
                {'type': 'command', 'command': 'echo personal'}]}],
                'Stop': [{'hooks': [{'type': 'command', 'command': 'echo stop'}]}]}}
        (self.home / 'settings.json').write_text(json.dumps(self.settings))
        (self.home / 'CLAUDE.md').write_text('Personal original guidance\n')
        (self.home / 'plans').mkdir()
        (self.home / 'plans/existing.md').write_text('Only authoritative plan')
        (self.home / 'config.toml').write_text(
            '# personal comment\nmodel = "chosen-primary"\nmodel_reasoning_effort = "high"\n'
            '[agents] # existing agent options\nmax_threads = 8\nmax_depth = 2\n'
            '[mcp_servers.personal]\nurl = "https://example.invalid"\n')
        self.before = snapshot(self.home)

    def test_claude_preserves_settings_runtime_data_and_originals(self):
        context.apply(self.home, 'claude')
        installed = snapshot(self.home)
        actual = json.loads(installed['settings.json'])
        self.assertEqual(actual['model'], self.settings['model'])
        self.assertEqual(actual['effortLevel'], 'high')
        self.assertEqual(actual['env']['PERSONAL'], 'keep')
        self.assertEqual(actual['hooks']['Stop'], self.settings['hooks']['Stop'])
        self.assertEqual(actual['hooks']['UserPromptSubmit'][0]['hooks'], [
            {'type': 'command', 'command': 'echo personal'}])
        self.assertEqual(actual['autoCompactWindow'], 100000)
        self.assertTrue(actual['autoCompactEnabled'])
        self.assertNotIn('autoCompactEnabled', actual['env'])
        self.assertTrue(actual['disableWorkflows'])
        self.assertEqual(actual['env']['CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH'], '1')
        self.assertEqual(installed['plans/existing.md'], self.before['plans/existing.md'])
        self.assertTrue((self.home / 'rules-library/council-detail/council-doctrine.md').is_file())
        self.assertTrue((self.home / 'skills/brag/LICENSE').is_file())
        self.assertTrue((self.home / 'skills/brag/scripts/brag.py').is_file())
        context.apply(self.home, 'claude')
        self.assertEqual(snapshot(self.home), installed)
        context.apply(self.home, 'claude', restore=True)
        self.assertEqual(snapshot(self.home), self.before)

    def test_existing_brag_skill_collision_preserves_everything(self):
        skill = self.home / 'skills/brag/SKILL.md'
        skill.parent.mkdir(parents=True)
        skill.write_text('Independent customized BRAG skill')
        before = snapshot(self.home)
        with self.assertRaisesRegex(ValueError, 'collision'):
            context.apply(self.home, 'claude')
        self.assertEqual(snapshot(self.home), before)

    def test_codex_config_parse_preservation_and_restore(self):
        context.apply(self.home, 'codex')
        text = (self.home / 'config.toml').read_text()
        actual = tomllib.loads(text)
        original = tomllib.loads(self.before['config.toml'].decode())
        self.assertEqual(actual['model'], original['model'])
        self.assertEqual(actual['model_reasoning_effort'], 'high')
        self.assertEqual(actual['mcp_servers'], original['mcp_servers'])
        self.assertIn('# personal comment', text)
        self.assertEqual(actual['model_auto_compact_token_limit'], 100000)
        self.assertEqual(actual['agents'], {'max_threads': 1, 'max_depth': 2,
                                          'max_concurrent_threads_per_session': 1})
        context.apply(self.home, 'codex', restore=True)
        self.assertEqual(snapshot(self.home), self.before)

    def test_dry_run_and_conflict_do_not_mutate(self):
        context.apply(self.home, 'claude', dry_run=True)
        self.assertEqual(snapshot(self.home), self.before)
        context.apply(self.home, 'claude')
        installed = snapshot(self.home)
        context.apply(self.home, 'claude', dry_run=True, restore=True)
        self.assertEqual(snapshot(self.home), installed)
        (self.home / 'CLAUDE.md').write_text('Changed after migration')
        changed = snapshot(self.home)
        for restore in (False, True):
            with self.assertRaisesRegex(ValueError, 'changed'):
                context.apply(self.home, 'claude', restore=restore)
        self.assertEqual(snapshot(self.home), changed)

    def test_handled_failure_rolls_back(self):
        real = context.core.atomic_write
        fired = False
        def fail_once(path, content, mode):
            nonlocal fired
            if path.name == context.MANIFEST and not fired:
                fired = True
                raise OSError('injected late failure')
            return real(path, content, mode)
        with patch.object(context.core, 'atomic_write', side_effect=fail_once):
            with self.assertRaisesRegex(OSError, 'injected'):
                context.apply(self.home, 'claude')
        self.assertEqual(snapshot(self.home), self.before)

    def test_manifest_rejects_arbitrary_files_and_bad_shapes(self):
        path = self.home / context.MANIFEST
        cases = [[], {'version': 1, 'kind': 'codex', 'files': {'config.toml': None}},
                 {'version': 1, 'kind': 'claude', 'files': {}},
                 {'version': 1, 'kind': 'codex', 'files': {'settings.json': {
                     'sha256': hashlib.sha256(self.before['settings.json']).hexdigest(),
                     'original': base64.b64encode(b'overwritten').decode()}}}]
        for value in cases:
            path.write_text(json.dumps(value))
            before = snapshot(self.home)
            with self.assertRaises(ValueError):
                context.apply(self.home, 'codex', restore=True)
            self.assertEqual(snapshot(self.home), before)

    def test_inline_agents_refused_without_changes(self):
        (self.home / 'config.toml').write_text('agents = { max_depth = 2 }\n')
        before = snapshot(self.home)
        with self.assertRaisesRegex(ValueError, 'standard'):
            context.apply(self.home, 'codex')
        self.assertEqual(snapshot(self.home), before)

    def test_exclusive_lock(self):
        (self.home / '.council-context.lock').mkdir()
        with self.assertRaises(FileExistsError):
            context.apply(self.home, 'codex')
        self.assertEqual(snapshot(self.home), self.before)

    @unittest.skipIf(os.name == 'nt', 'POSIX permissions and symlinks')
    def test_private_backups_and_symlink_refusal(self):
        context.apply(self.home, 'codex')
        self.assertEqual((self.home / context.MANIFEST).stat().st_mode & 0o777, 0o600)
        context.apply(self.home, 'codex', restore=True)
        outside = self.home / 'outside'
        outside.write_text('private')
        (self.home / 'config.toml').unlink()
        (self.home / 'config.toml').symlink_to(outside)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            context.apply(self.home, 'codex')
        self.assertEqual(outside.read_text(), 'private')


if __name__ == '__main__':
    unittest.main()

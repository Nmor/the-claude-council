"""Optional real Codex discovery check; no model turn, API call or hook trust bypass."""
import importlib.util
import json
import os
from pathlib import Path
import queue
import subprocess
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('runtime_installer', ROOT / 'bootstrap/codex.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


@unittest.skipUnless(os.environ.get('COUNCIL_CODEX_BIN'), 'Set COUNCIL_CODEX_BIN for local Codex discovery')
class RuntimeTests(unittest.TestCase):
    def test_native_discovery_and_untrusted_hooks(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory) / 'codex'
            installer.install(home, ROOT)
            process = subprocess.Popen(
                [os.environ['COUNCIL_CODEX_BIN'], 'app-server'],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                text=True, encoding='utf-8', env={**os.environ, 'CODEX_HOME': str(home)})
            messages = queue.Queue()
            def read():
                for line in process.stdout:
                    try:
                        messages.put(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            reader = threading.Thread(target=read, daemon=True)
            reader.start()
            def request(identifier, method, params):
                process.stdin.write(json.dumps({'id': identifier, 'method': method, 'params': params}) + '\n')
                process.stdin.flush()
                while True:
                    result = messages.get(timeout=20)
                    if result.get('id') == identifier:
                        self.assertNotIn('error', result, result)
                        return result['result']
            try:
                request(1, 'initialize', {'clientInfo': {'name': 'council-test', 'version': '1'},
                                        'capabilities': {'experimentalApi': True}})
                process.stdin.write('{"method":"initialized"}\n')
                process.stdin.flush()
                result = request(2, 'skills/list', {'cwds': [directory], 'forceReload': True})
                entry = result['data'][0]
                expected = {p.parent.name for p in (home / 'skills').glob('council*/SKILL.md')}
                discovered = {s['name'] for s in entry['skills'] if s['enabled']}
                self.assertTrue(expected <= discovered, expected - discovered)
                self.assertEqual(entry.get('errors', []), [])
                result = request(3, 'hooks/list', {'cwds': [directory]})
                entry = result['data'][0]
                self.assertEqual(entry['errors'], [])
                self.assertEqual(len(entry['hooks']), 5)
                self.assertTrue(all(h['trustStatus'] == 'untrusted' for h in entry['hooks']))
                self.assertTrue(all(h['enabled'] for h in entry['hooks']))
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=10)
                reader.join(timeout=5)
                process.stdin.close()
                process.stdout.close()


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""Apply reversible Council context/cost settings to existing Claude and Codex homes."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('council_installer', ROOT / 'bootstrap/codex.py')
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
MANIFEST = '.council-context.json'


def target(home, name):
    relative = PurePosixPath(name)
    if relative.is_absolute() or '..' in relative.parts or '\\' in name:
        raise ValueError(f'Unsafe managed path: {name}')
    path = home / name
    for parent in (path, *path.parents):
        if parent == home.parent:
            break
        if parent.is_symlink():
            raise ValueError(f'Refusing symlink: {parent}')
    if path.exists() and not path.is_file():
        raise ValueError(f'Not a regular file: {path}')
    return path


def claude_payload(home):
    paths = ['CLAUDE.md', 'settings.json', 'scripts/token-budget.mjs']
    paths += [p.relative_to(ROOT).as_posix() for p in (ROOT / 'rules/common').glob('*.md')]
    paths += [p.relative_to(ROOT).as_posix() for p in (ROOT / 'rules-library/council-detail').glob('*.md')]
    paths += ['docs/CONTEXT.md', 'rules-library/common/agents.md',
              'skills/council-rules/references/agent-delegation.md', 'skills/mcp-builder/SKILL.md',
              'skills/council-protocol/SKILL.md', 'skills/iterative-retrieval/SKILL.md']
    result = {name: (ROOT / name).read_bytes() for name in paths if name != 'settings.json'}
    settings = json.loads(target(home, 'settings.json').read_text(encoding='utf-8'))
    if not isinstance(settings, dict) or not isinstance(settings.get('env', {}), dict):
        raise ValueError('Claude settings must contain JSON objects')
    settings.update(autoCompactEnabled=True, autoCompactWindow=100000, disableWorkflows=True, workflowSizeGuideline='small')
    settings.setdefault('env', {}).pop('autoCompactEnabled', None)  # Not an environment variable.
    settings.setdefault('env', {}).update(CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH='1',
                                         CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY='2')
    groups = settings.get('hooks', {}).get('UserPromptSubmit', [])
    retained = []
    for group in groups:
        hooks = [h for h in group.get('hooks', []) if 'hooks/improve-prompt.py' not in h.get('command', '')]
        if hooks:
            retained.append({**group, 'hooks': hooks})
    if groups:
        if retained:
            settings['hooks']['UserPromptSubmit'] = retained
        else:
            del settings['hooks']['UserPromptSubmit']
    result['settings.json'] = core.json_bytes(settings)
    return result


def set_toml(text, key, value, section=None):
    """Replace a simple native setting while preserving unrelated TOML text and comments."""
    lines = text.splitlines(keepends=True)
    headers = [(i, line.split('#', 1)[0].strip()) for i, line in enumerate(lines) if re.match(r'^\s*\[', line)]
    if section is None:
        start, end = 0, headers[0][0] if headers else len(lines)
    else:
        found = [i for i, header in headers if header == f'[{section}]']
        if not found:
            return text.rstrip() + f'\n\n[{section}]\n{key} = {value}\n'
        start = found[0] + 1
        end = next((i for i, _ in headers if i >= start), len(lines))
    pattern = re.compile(r'^\s*' + re.escape(key) + r'\s*=')
    for i in range(start, end):
        if pattern.match(lines[i]):
            lines[i] = f'{key} = {value}\n'
            return ''.join(lines)
    lines.insert(start, f'{key} = {value}\n')
    return ''.join(lines)


def codex_payload(home):
    path = target(home, 'config.toml')
    text = path.read_text(encoding='utf-8') if path.exists() else ''
    parsed = tomllib.loads(text)
    agents = parsed.get('agents', {})
    # Inline/dotted agent tables need a real TOML editor; never flatten user settings.
    if agents and not re.search(r'^\s*\[agents\][ \t]*(?:#[^\n]*)?$', text, re.M):
        raise ValueError('Use a standard [agents] table before applying the cost profile')
    text = set_toml(text, 'model_auto_compact_token_limit', 100000)
    text = set_toml(text, 'max_concurrent_threads_per_session', 1, 'agents')
    if 'max_threads' in agents:
        text = set_toml(text, 'max_threads', 1, 'agents')
    tomllib.loads(text)
    return {'config.toml': text.encode()}


def _apply(home, kind, dry_run=False, restore=False):
    home = home.expanduser().absolute()
    if not home.is_dir():
        raise ValueError(f'Existing {kind} home required: {home}')
    manifest_path = target(home, MANIFEST)
    old = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {'files': {}}
    if (not isinstance(old, dict) or not isinstance(old.get('files'), dict) or
            (manifest_path.exists() and (old.get('version') != 1 or old.get('kind') != kind))):
        raise ValueError('Invalid context migration manifest')
    allowed = {'config.toml'} if kind == 'codex' else set(claude_payload(home))
    for name, entry in old['files'].items():
        if name not in allowed or not isinstance(entry, dict) or not isinstance(entry.get('sha256'), str):
            raise ValueError('Invalid context migration entry')
        if 'original' not in entry:
            raise ValueError('Missing original backup')
        if entry['original'] is not None:
            base64.b64decode(entry['original'], validate=True)
        path = target(home, name)
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError(f'Managed file changed; preserve/reconcile it before retrying: {path}')
    if restore:
        if not old['files']:
            raise ValueError('No context migration to restore')
        payload = {name: base64.b64decode(entry['original']) if entry['original'] is not None else None
                   for name, entry in old['files'].items()}
        payload[MANIFEST] = None
    else:
        payload = claude_payload(home) if kind == 'claude' else codex_payload(home)
        entries = {}
        for name, content in payload.items():
            path = target(home, name)
            original = old['files'].get(name, {}).get('original') if name in old['files'] else (
                base64.b64encode(path.read_bytes()).decode() if path.exists() else None)
            entries[name] = {'sha256': hashlib.sha256(content).hexdigest(), 'original': original}
        payload[MANIFEST] = core.json_bytes({'version': 1, 'kind': kind, 'files': entries})
    if not dry_run:
        snapshots = {}
        created = []
        try:
            for name, content in payload.items():
                path = target(home, name)
                snapshots[name] = (path.read_bytes() if path.exists() else None,
                                   path.stat().st_mode & 0o777 if path.exists() else 0o644)
                missing = []
                parent = path.parent
                while not parent.exists():
                    missing.append(parent)
                    parent = parent.parent
                for folder in reversed(missing):
                    folder.mkdir()
                    created.append(folder)
                if content is None:
                    path.unlink(missing_ok=True)
                else:
                    core.atomic_write(path, content, 0o600 if name == MANIFEST else snapshots[name][1])
        except BaseException:
            for name, (content, mode) in reversed(list(snapshots.items())):
                path = home / name
                if content is None:
                    path.unlink(missing_ok=True)
                else:
                    core.atomic_write(path, content, mode)
            for folder in reversed(created):
                folder.rmdir()
            raise
    return {'client': kind, 'files': len(payload) - 1, 'dry_run': dry_run, 'restored': restore}


def apply(home, kind, dry_run=False, restore=False):
    if kind not in ('claude', 'codex'):
        raise ValueError('Unsupported client')
    home = home.expanduser().absolute()
    target(home, MANIFEST)
    lock = home / '.council-context.lock'
    if dry_run:
        return _apply(home, kind, True, restore)
    lock.mkdir()  # Exclusive creation; do not overwrite another migration's lock.
    try:
        return _apply(home, kind, False, restore)
    finally:
        lock.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('apply', 'restore'))
    parser.add_argument('--claude-home', type=Path)
    parser.add_argument('--codex-home', type=Path)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    if not args.claude_home and not args.codex_home:
        parser.error('Choose --claude-home and/or --codex-home explicitly')
    try:
        for kind, home in [('claude', args.claude_home), ('codex', args.codex_home)]:
            if home:
                print(json.dumps(apply(home, kind, args.dry_run, args.action == 'restore')))
    except (ValueError, OSError, TypeError, KeyError) as error:
        print(f'Council context: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

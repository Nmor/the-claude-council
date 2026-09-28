#!/usr/bin/env python3
"""Transactional, additive Council installer for Codex (Python 3.11+, Git checkout)."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import subprocess
import sys
import tempfile
import tomllib

SOURCE = Path(__file__).resolve().parents[1]
BEGIN = '<!-- council-codex:begin -->'
END = '<!-- council-codex:end -->'
MANIFEST = 'council/manifest.json'
SURFACES = ('skills', 'agents', 'commands', 'rules', 'rules-library', 'templates',
            'contexts', 'scripts', 'hooks', 'docs')


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()


def managed_path(name: str) -> bool:
    parts = PurePosixPath(name).parts
    if not parts or '..' in parts or PurePosixPath(name).is_absolute() or '\\' in name:
        return False
    return (name in ('AGENTS.md', 'hooks.json', MANIFEST, 'council/projects.json',
                     'council/hooks.py', 'council/catalog.md')
            or name.startswith('council/resources/')
            or (len(parts) >= 3 and parts[0] == 'skills'
                and (parts[1] == 'council' or parts[1].startswith('council-')))
            or (len(parts) == 2 and parts[0] == 'agents'
                and parts[1].startswith('council-') and parts[1].endswith('.toml')))


def safe_target(home: Path, name: str) -> Path:
    if not managed_path(name):
        raise ValueError(f'Unexpected managed path: {name}')
    target = home / name
    for parent in (target, *target.parents):
        if parent == home.parent:
            break
        if parent.is_symlink():
            raise ValueError(f'Refusing symlink destination: {parent}')
    if target.exists() and not target.is_file():
        raise ValueError(f'Not a regular file: {target}')
    return target


def read_optional(path: Path) -> bytes | None:
    return path.read_bytes() if path.exists() else None


def load_manifest(home: Path) -> dict:
    path = safe_target(home, MANIFEST)
    if not path.exists():
        return {'version': 1, 'files': {}}
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get('version') != 1 or not isinstance(value.get('files'), dict):
        raise ValueError('Unsupported or invalid Council manifest')
    for name, entry in value['files'].items():
        safe_target(home, name)
        if name == MANIFEST or not isinstance(entry.get('sha256'), str):
            raise ValueError('Invalid Council manifest entry')
        if entry.get('original') is not None:
            base64.b64decode(entry['original'], validate=True)
    return value


def check_installed(home: Path, manifest: dict) -> None:
    for name, entry in manifest['files'].items():
        content = read_optional(safe_target(home, name))
        if content is None or digest(content) != entry['sha256']:
            raise ValueError(f'Managed file changed or missing; preserve/reconcile it first: {name}')


def tracked_resources(source: Path) -> list[str]:
    result = subprocess.run(['git', '-C', str(source), 'ls-files', '-z', '--', *SURFACES],
                            check=True, capture_output=True)
    names = []
    for raw in result.stdout.decode().split('\0'):
        if not raw:
            continue
        parts = PurePosixPath(raw).parts
        if any(part.startswith('.') or part in ('node_modules', '__pycache__') for part in parts):
            continue
        if re.search(r'\.(?:bak|orig|tmp)(?:-|$)', raw) or raw.startswith('hooks/cbm-'):
            continue
        file = source / raw
        if file.is_symlink() or not file.is_file():
            raise ValueError(f'Resource must be a regular file: {raw}')
        names.append(raw)
    if not any(p.endswith('/SKILL.md') for p in names):
        raise ValueError('Install from a complete Git checkout of the Council repository')
    return sorted(names + [name for name in ('CLAUDE.md', 'README.md', 'INSTALL.md', 'LICENSE')
                           if (source / name).is_file()])


def metadata(text: str) -> tuple[str, str, str]:
    """Read the scalar name/description fields used by source, without a YAML dependency."""
    match = re.match(r'^---\r?\n(.*?)\r?\n---\r?\n(.*)', text, re.S)
    if not match:
        return '', '', text
    front, body = match.groups()
    fields = {}
    for key in ('name', 'description'):
        m = re.search(r'^' + key + r':\s*(.+)$', front, re.M)
        if m:
            value = m.group(1).strip()
            if value[:1] in ('"', "'") and value[-1:] == value[:1]:
                value = value[1:-1]
            if value in ('>', '|', '>-', '|-'):
                raise ValueError(f'Unsupported multiline {key}; add explicit metadata support')
            fields[key] = value
    return fields.get('name', ''), fields.get('description', ''), body


def render(text: str, home: Path) -> str:
    return text.replace('@CODEX_HOME@', home.as_posix()).replace(
        '@COUNCIL_HOME@', (home / 'council').as_posix())


def adapt_reference(text: str, home: Path) -> str:
    # Rewrite available guidance, not Claude runtime paths or example plan locations.
    def replace(match):
        name = match.group(1)
        if name.startswith('rules/') and not (SOURCE / name).exists():
            migrated = 'rules-library/' + name[len('rules/'):]
            if (SOURCE / migrated).exists():
                name = migrated
        if name.split('/')[0] not in SURFACES and name not in ('CLAUDE.md', 'README.md', 'INSTALL.md'):
            return match.group(0)
        return (home / 'council/resources').as_posix() + '/' + name
    return re.sub(r'~\/.claude/([A-Za-z0-9_.*/-]+)', replace, text)


def entrypoint(name: str, description: str, reference: Path, home: Path) -> bytes:
    # Original long discovery descriptions remain in the linked source.
    description = re.sub(r'\s+', ' ', description).strip() or name.replace('-', ' ')
    if len(description) > 220:
        description = description[:217].rsplit(' ', 1)[0] + '...'
    return (f'---\nname: {name}\ndescription: {json.dumps(description, ensure_ascii=False)}\n---\n\n'
            f'# {name}\n\nRead `{home.as_posix()}/council/resources/docs/CODEX.md` for the Codex\n'
            'compatibility contract, then read the full procedure below and only the\n'
            'supporting references relevant to the task. Imported rules do not override\n'
            'user scope, existing authorization, or higher-priority instructions.\n\n'
            f'[{name} procedure](<{reference.as_posix()}>)\n').encode()


def agent_toml(name: str, description: str, body: str, home: Path) -> bytes:
    instructions = (f'Read {home.as_posix()}/council/resources/docs/CODEX.md before using the '
                    'imported role below. User scope, existing authorization and higher-priority '
                    'instructions govern. Use available native tools; inherit the parent model. '
                    'Update the existing authoritative plan, never create a competing plan. '
                    'Do not execute archived Claude scripts.\n\n' + adapt_reference(body, home))
    value = '\n'.join(f'{key} = {json.dumps(val, ensure_ascii=False)}' for key, val in (
        ('name', name), ('description', description), ('developer_instructions', instructions))) + '\n'
    tomllib.loads(value)
    return value.encode()


def hook_groups(home: Path) -> dict:
    argv = [sys.executable, str(home / 'council/hooks.py'), '--home', str(home)]
    handler = {'type': 'command', 'command': shlex.join(argv),
               'commandWindows': subprocess.list2cmdline(argv), 'timeout': 10,
               'statusMessage': 'Council native checks'}
    return {event: [{'hooks': [handler], **({'matcher': 'Bash|apply_patch|Edit|Write'}
             if event in ('PreToolUse', 'PostToolUse') else {})}]
            for event in ('SessionStart', 'PreToolUse', 'PostToolUse', 'PreCompact', 'Stop')}


def original_bytes(manifest: dict, home: Path, name: str) -> bytes | None:
    if name in manifest['files']:
        original = manifest['files'][name]['original']
        return base64.b64decode(original) if original is not None else None
    return read_optional(safe_target(home, name))


def build_payload(source: Path, home: Path, manifest: dict,
                  projects: list[str], plan: str | None) -> dict[str, bytes]:
    payload = {}
    names = tracked_resources(source)
    catalog = ['# Council resource catalog', '', 'Read CODEX.md before imported procedures.', '']
    for name in names:
        raw = (source / name).read_bytes()
        if name.endswith('.md'):
            raw = adapt_reference(raw.decode(), home).encode()
        payload['council/resources/' + name] = raw
        if name.endswith('/SKILL.md') and name.startswith('skills/'):
            slug = PurePosixPath(name).parts[1]
            _, desc, _ = metadata((source / name).read_text(encoding="utf-8"))
            native = 'council-' + slug
            payload[f'skills/{native}/SKILL.md'] = entrypoint(
                native, desc, home / 'council/resources' / name, home)
            catalog.append(f'- Skill `{native}`: [{slug}](resources/{name})')
        elif name.startswith(('agents/', 'commands/')) and len(PurePosixPath(name).parts) == 2 and name.endswith('.md'):
            slug = Path(name).stem
            _, desc, body = metadata((source / name).read_text(encoding="utf-8"))
            if name.startswith('agents/'):
                native = 'council-' + slug
                payload[f'agents/{native}.toml'] = agent_toml(native, desc, body, home)
                catalog.append(f'- Agent `{native}`: [{slug}](resources/{name})')
            else:
                native = 'council-command-' + slug
                payload[f'skills/{native}/SKILL.md'] = entrypoint(
                    native, desc, home / 'council/resources' / name, home)
                catalog.append(f'- Command skill `{native}`: [{slug}](resources/{name})')
        elif name.startswith(('rules/', 'rules-library/')) and name.endswith('.md'):
            catalog.append(f'- Rule [{name}](resources/{name})')
    payload['council/catalog.md'] = ('\n'.join(catalog) + '\n').encode()
    payload['council/resources/docs/CODEX.md'] = (source / 'docs/CODEX.md').read_bytes()
    payload['council/hooks.py'] = (source / 'codex/hooks.py').read_bytes()
    payload['skills/council/SKILL.md'] = render((source / 'codex/SKILL.md.in').read_text(encoding="utf-8"), home).encode()
    original = original_bytes(manifest, home, 'AGENTS.md') or b''
    if BEGIN.encode() in original or END.encode() in original:
        raise ValueError('Unmanaged Council AGENTS marker already exists; reconcile it first')
    block = render((source / 'codex/AGENTS.md.in').read_text(encoding="utf-8"), home)
    payload['AGENTS.md'] = original + (b'\n' if original else b'') + f'{BEGIN}\n{block}\n{END}\n'.encode()
    hooks_raw = original_bytes(manifest, home, 'hooks.json')
    hooks = json.loads(hooks_raw) if hooks_raw else {}
    if not isinstance(hooks, dict) or not isinstance(hooks.get('hooks', {}), dict):
        raise ValueError('Existing hooks.json must contain an object of hook events')
    registered = hooks.setdefault('hooks', {})
    if any(not isinstance(groups, list) for groups in registered.values()):
        raise ValueError('Existing hook event groups must be arrays')
    for event, groups in hook_groups(home).items():
        registered.setdefault(event, []).extend(groups)
    payload['hooks.json'] = json_bytes(hooks)
    project_path = safe_target(home, 'council/projects.json')
    mapping = json.loads(project_path.read_text(encoding="utf-8")) if project_path.exists() else {'projects': []}
    if bool(projects) != bool(plan):
        raise ValueError('--project and --plan must be supplied together')
    if plan:
        active = Path(plan).expanduser().resolve()
        if not active.is_file():
            raise ValueError('--plan must reference an existing file')
        for project in projects:
            root = Path(project).expanduser().resolve()
            if not root.is_dir():
                raise ValueError(f'Project root is not a directory: {root}')
            mapping['projects'] = [p for p in mapping['projects'] if p['root'] != str(root)]
            mapping['projects'].append({'root': str(root), 'plan': str(active)})
    payload['council/projects.json'] = json_bytes(mapping)
    return payload


def atomic_write(path: Path, content: bytes, mode: int = 0o644) -> None:
    fd, temp = tempfile.mkstemp(prefix='.council-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(content)
        os.chmod(temp, mode)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def transact(home: Path, changes: dict[str, bytes | None]) -> None:
    """Rollback handled failures; every replacement is atomic. No crash-recovery claim."""
    snapshots = {}
    created_dirs = []
    try:
        for name, content in changes.items():
            path = safe_target(home, name)
            snapshots[name] = (read_optional(path), path.stat().st_mode & 0o777 if path.exists() else 0o644)
            missing = []
            parent = path.parent
            while not parent.exists():
                missing.append(parent)
                parent = parent.parent
            for directory in reversed(missing):
                directory.mkdir()
                created_dirs.append(directory)
            if content is None:
                path.unlink(missing_ok=True)
            else:
                atomic_write(path, content, 0o600 if name == MANIFEST else snapshots[name][1])
    except BaseException:
        for name, (old, mode) in reversed(list(snapshots.items())):
            path = home / name
            if old is None:
                path.unlink(missing_ok=True)
            else:
                atomic_write(path, old, mode)
        for directory in reversed(created_dirs):
            directory.rmdir()
        raise


def install(home: Path, source: Path, projects=(), plan=None, dry_run=False) -> dict:
    manifest = load_manifest(home)
    check_installed(home, manifest)
    if (home / 'AGENTS.override.md').exists():
        raise ValueError('AGENTS.override.md shadows AGENTS.md; reconcile the override before installation')
    payload = build_payload(source, home, manifest, list(projects), plan)
    records = {}
    for name, content in payload.items():
        existing = read_optional(safe_target(home, name))
        if existing is not None and name not in manifest['files'] and name not in ('AGENTS.md', 'hooks.json'):
            raise ValueError(f'Unmanaged file collision: {name}')
        original = original_bytes(manifest, home, name)
        records[name] = {'sha256': digest(content), 'original':
                         base64.b64encode(original).decode() if original is not None else None}
    changes = dict(payload)
    for name in manifest['files'].keys() - records.keys():
        changes[name] = original_bytes(manifest, home, name)
    revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    result = {'version': 1, 'source_revision': revision, 'files': records}
    changes[MANIFEST] = json_bytes(result)
    if not dry_run:
        transact(home, changes)
    return {'files': len(records), 'source_revision': revision, 'dry_run': dry_run}


def uninstall(home: Path, dry_run=False) -> dict:
    manifest = load_manifest(home)
    if not manifest['files']:
        raise ValueError('No Council installation found')
    check_installed(home, manifest)
    changes = {name: original_bytes(manifest, home, name) for name in manifest['files']}
    changes[MANIFEST] = None
    if not dry_run:
        transact(home, changes)
    return {'files': len(manifest['files']), 'dry_run': dry_run}


def verify(home: Path) -> dict:
    manifest = load_manifest(home)
    if not manifest['files']:
        raise ValueError('No Council installation found')
    check_installed(home, manifest)
    for name in manifest['files']:
        if name.startswith('agents/'):
            parsed = tomllib.loads((home / name).read_text(encoding="utf-8"))
            if set(parsed) != {'name', 'description', 'developer_instructions'}:
                raise ValueError(f'Unexpected agent configuration: {name}')
        if name.startswith('skills/') and name.endswith('SKILL.md'):
            skill, desc, _ = metadata((home / name).read_text(encoding="utf-8"))
            if not re.fullmatch('[a-z0-9-]{1,64}', skill) or not desc:
                raise ValueError(f'Invalid skill: {name}')
    return {'files': len(manifest['files']), 'source_revision': manifest['source_revision'],
            'integrity': 'passed', 'runtime': 'not checked', 'hooks': 'review trust with /hooks'}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('install', 'verify', 'uninstall'))
    parser.add_argument('--home', type=Path, default=Path(os.environ.get('CODEX_HOME', Path.home() / '.codex')))
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--project', action='append', default=[])
    parser.add_argument('--plan')
    args = parser.parse_args()
    home = args.home.expanduser().absolute()
    lock = home / '.council-install.lock'
    locked = False
    try:
        if home.is_symlink():
            raise ValueError(f'Refusing symlink home: {home}')
        if not args.dry_run and args.action != 'verify':
            home.mkdir(parents=True, exist_ok=True)
            lock.mkdir()
            locked = True
        if args.action == 'install':
            result = install(home, SOURCE, args.project, args.plan, args.dry_run)
        elif args.action == 'uninstall':
            result = uninstall(home, args.dry_run)
        else:
            result = verify(home)
        print(json.dumps(result, indent=2))
        return 0
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Council: {error}', file=sys.stderr)
        return 1
    finally:
        if locked:
            lock.rmdir()


if __name__ == '__main__':
    sys.exit(main())

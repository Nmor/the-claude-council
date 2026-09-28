#!/usr/bin/env python3
"""Offline dependency checks and artifact verification for Council BRAG."""
# Size budget: 8 KB.
import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys

FORMATS = {'landscape': (1920, 1080), 'vertical': (1080, 1920), 'square': (1080, 1080)}


def doctor(full=False):
    names = ['ffmpeg', 'ffprobe'] + (['node', 'hyperframes'] if full else [])
    found = {name: shutil.which(name) for name in names}
    if full and not found['hyperframes']:
        suffix = '.cmd' if sys.platform == 'win32' else ''
        isolated = Path.home() / '.local/share/council-media/node_modules/.bin' / ('hyperframes' + suffix)
        if isolated.is_file():
            found['hyperframes'] = str(isolated)
    issues = [f'Missing executable: {name}' for name, value in found.items() if not value]
    if full and found['node']:
        result = subprocess.run([found['node'], '--version'], capture_output=True, text=True, timeout=10)
        try:
            major = int(result.stdout.strip().lstrip('v').split('.')[0])
        except ValueError:
            major = 0
        if result.returncode or major < 22:
            issues.append('Hyperframes requires Node.js 22 or newer')
    return {'ready': not issues, 'mode': 'full' if full else 'slim', 'tools': found,
            'issues': issues, 'rendered': False}


def probe(path):
    binary = shutil.which('ffprobe')
    if not binary:
        raise ValueError('ffprobe is required for media verification')
    result = subprocess.run([binary, '-v', 'error', '-show_streams', '-show_format',
                             '-of', 'json', str(path)], capture_output=True, text=True, timeout=30)
    if result.returncode:
        raise ValueError(f'ffprobe failed for {path.name}: {result.stderr.strip()[:300]}')
    return json.loads(result.stdout)


def verify(output, duration, format_name, audio='optional'):
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError('Target duration must be a positive finite number')
    output = output.expanduser().resolve()
    for name in ('brag.mp4', 'brag.jpg', 'share-copy.txt', 'storyboard.md'):
        path = output / name
        if not path.is_file() or path.stat().st_size == 0:
            raise ValueError(f'Missing or empty artifact: {name}')
    for name in ('share-copy.txt', 'storyboard.md'):
        if not (output / name).read_text(encoding='utf-8').strip():
            raise ValueError(f'Empty text artifact: {name}')
    video = probe(output / 'brag.mp4')
    poster = probe(output / 'brag.jpg')
    streams = video.get('streams', [])
    pictures = [s for s in streams if s.get('codec_type') == 'video']
    images = [s for s in poster.get('streams', []) if s.get('codec_type') == 'video']
    if len(pictures) != 1 or len(images) != 1:
        raise ValueError('Expected one video stream and one poster image')
    width, height = FORMATS[format_name]
    for label, stream in [('video', pictures[0]), ('poster', images[0])]:
        if (stream.get('width'), stream.get('height')) != (width, height):
            raise ValueError(f'{label} dimensions do not match {format_name}')
    if images[0].get('codec_name') != 'mjpeg':
        raise ValueError('Poster must be a JPEG image')
    actual_duration = float(video.get('format', {}).get('duration', 0))
    if not math.isfinite(actual_duration) or abs(actual_duration - duration) > 0.15:
        raise ValueError(f'Duration {actual_duration:g}s does not match target {duration:g}s')
    numerator, denominator = pictures[0].get('avg_frame_rate', '0/1').split('/')
    fps = float(numerator) / float(denominator)
    if not math.isfinite(fps) or abs(fps - 30) > 0.05:
        raise ValueError(f'Expected 30 fps, got {fps:g}')
    has_audio = any(s.get('codec_type') == 'audio' for s in streams)
    if audio == 'required' and not has_audio:
        raise ValueError('Requested audio stream is missing')
    if audio == 'none' and has_audio:
        raise ValueError('Audio present despite requested silence')
    return {'verified': True, 'output': str(output), 'duration': actual_duration,
            'format': format_name, 'fps': fps, 'audio': has_audio,
            'manual_checks': ['visual quality', 'audio mix', 'poster in frame zero', 'claim accuracy']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    check = commands.add_parser('doctor', help='Inspect local dependencies; never install or call a model')
    check.add_argument('--full', action='store_true')
    render = commands.add_parser('verify', help='Check completed artifacts using ffprobe')
    render.add_argument('--output', type=Path, required=True)
    render.add_argument('--duration', type=float, default=20)
    render.add_argument('--format', choices=FORMATS, default='landscape')
    render.add_argument('--audio', choices=('optional', 'required', 'none'), default='optional')
    args = parser.parse_args()
    try:
        result = doctor(args.full) if args.command == 'doctor' else verify(
            args.output, args.duration, args.format, args.audio)
        print(json.dumps(result, indent=2))
        return 0 if result.get('ready', result.get('verified')) else 1
    except (ValueError, OSError, KeyError, ZeroDivisionError, subprocess.SubprocessError) as error:
        print(json.dumps({'verified': False, 'error': str(error)}))
        return 1


if __name__ == '__main__':
    sys.exit(main())

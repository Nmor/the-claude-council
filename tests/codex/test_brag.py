"""BRAG's mechanical checks must reject incomplete and mismatched deliverables."""
import importlib.util
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('brag', ROOT / 'skills/brag/scripts/brag.py')
brag = importlib.util.module_from_spec(spec)
spec.loader.exec_module(brag)


class BragTests(unittest.TestCase):
    def test_doctor_does_not_install_or_run_model(self):
        with patch.object(brag.shutil, 'which', return_value=None), patch.object(
                brag.subprocess, 'run', side_effect=AssertionError('No subprocess expected')):
            report = brag.doctor()
        self.assertFalse(report['ready'])
        self.assertFalse(report['rendered'])
        self.assertEqual(len(report['issues']), 2)

    def test_missing_artifact_is_not_success(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, 'Missing or empty'):
                brag.verify(Path(directory), 20, 'landscape')

    def test_invalid_duration_is_not_success(self):
        for duration in (0, -1, float('nan'), float('inf')):
            with self.assertRaisesRegex(ValueError, 'positive finite'):
                brag.verify(Path('.'), duration, 'landscape')


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'Optional real FFmpeg media checks')
class RenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.output = Path(cls.temp.name)
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=1920x1080:r=30',
                        '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '1',
                        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', str(cls.output / 'brag.mp4')], check=True, timeout=30)
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(cls.output / 'brag.mp4'),
                        '-frames:v', '1', str(cls.output / 'brag.jpg')], check=True, timeout=30)
        (cls.output / 'share-copy.txt').write_text('Synthetic pipeline fixture, not a launch demo.')
        (cls.output / 'storyboard.md').write_text('One second of blue and tone for media verification.')

    def test_real_render_passes(self):
        result = brag.verify(self.output, 1, 'landscape', 'required')
        self.assertTrue(result['verified'])
        self.assertTrue(result['audio'])
        self.assertEqual(result['fps'], 30)

    def test_wrong_format_and_duration_fail(self):
        for duration, format_name, message in [(20, 'landscape', 'Duration'), (1, 'vertical', 'dimensions')]:
            with self.assertRaisesRegex(ValueError, message):
                brag.verify(self.output, duration, format_name)

    def test_unrequested_audio_fails(self):
        with self.assertRaisesRegex(ValueError, 'Audio present'):
            brag.verify(self.output, 1, 'landscape', 'none')

    def test_missing_requested_audio_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            for name in ('brag.jpg', 'share-copy.txt', 'storyboard.md'):
                shutil.copyfile(self.output / name, output / name)
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(self.output / 'brag.mp4'),
                            '-an', '-c:v', 'copy', str(output / 'brag.mp4')], check=True, timeout=30)
            with self.assertRaisesRegex(ValueError, 'audio stream is missing'):
                brag.verify(output, 1, 'landscape', 'required')


if __name__ == '__main__':
    unittest.main()

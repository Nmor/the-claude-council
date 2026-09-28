# BRAG launch videos

Council adapts [latent-spaces/brag](https://github.com/latent-spaces/brag) for requested
project and website launch videos. It creates a video, poster, creative storyboard and
share copy. Nothing runs automatically after a code change and nothing is published.

## Use

- Claude: `/brag`, optionally with a URL, `--tone polished`, `--format vertical`,
  `--duration 20`, `--no-music`, `--no-sfx` or `--title`.
- Codex compact profile: ask `$council` to use its BRAG workflow for the project or URL.
  The catalog points to the same source skill; it adds no separate discovery overhead.
- Codex full profile: `$council-brag` exposes the direct skill entrypoint.
- Add `--full` for Hyperframes or `--voice` for explicit Kokoro narration.

The lean route is the default on every model. It uses available local rendering tools
and keeps the chosen model. The full route requires separate Hyperframes dependencies.
Read only the selected route; no fan-out or new implementation-plan file is required.

## Install and check

Fresh Council installs include the skill. Existing installations can update in place:

```bash
python3 bootstrap/context.py apply --claude-home ~/.claude --dry-run
python3 bootstrap/context.py apply --claude-home ~/.claude
python3 bootstrap/codex.py install
python3 bootstrap/codex.py verify
```

The Claude migration includes the context controls described in [CONTEXT.md](CONTEXT.md).
It preserves original files for restoration and refuses modified managed files. Restart
for new skill discovery. Native Codex source resources include the skill, attribution,
license and verifier in either discovery profile.

FFmpeg and ffprobe must be available for local encoding and media verification.
Install them with your platform's package manager. For example, macOS uses
`brew install ffmpeg`; Debian/Ubuntu provides the `ffmpeg` package. For the full route,
Node.js 22+ is required. An isolated, versioned Hyperframes installation is supported:

```bash
npm install --prefix ~/.local/share/council-media hyperframes@0.8.82
python3 skills/brag/scripts/brag.py doctor
python3 skills/brag/scripts/brag.py doctor --full
```

Run those Python commands from the Council checkout, or substitute the installed
skill's path. `doctor` finds tools on PATH and Hyperframes in the isolated location.
Use the executable path it reports for Hyperframes commands if it is not on PATH.
Run that executable's `doctor` for its own renderer/browser requirements. Council's
check does not download packages, run a model, register MCP services or prove a render.

Hyperframes initialization can install additional agent skills by default. Set
`HYPERFRAMES_SKIP_SKILLS=1` for its `init` command to keep Council discovery bounded;
use one render worker initially. Its optional speech/transcription/music model stacks
are separate, downloaded only when needed. Core video rendering does not require them.

## Output and verification

Output goes to a new `brag-output/` or timestamped sibling. Intermediates stay in its
`work/` folder. `storyboard.md` is the creative scene timing; project progress stays in
the one existing implementation plan. The deliverables are `brag.mp4`, `brag.jpg` and
`share-copy.txt`. Review scene/transition frames and listen to the audio before claiming
quality, then verify artifact presence, dimensions, frame rate, duration and audio:

```bash
python3 skills/brag/scripts/brag.py verify \
  --output /path/to/brag-output --duration 20 --format landscape --audio required
```

Formats: landscape 1920×1080, vertical 1080×1920, square 1080×1080, all at 30 fps.
Use the actual requested duration. `--audio none` checks intentional silence.
The verifier does not judge creativity, verify marketing claims or prove frame zero
matches the poster; inspect those separately. Installation and dependency checks are
not evidence that a launch video was generated.

## Provenance and audio

See [the pinned source and MIT attribution](../skills/brag/UPSTREAM.md).
Council uses original/generated or appropriately licensed user audio; upstream's music
bundle is excluded because its redistribution terms were not established by the checkout.
The full workflow does not need the optional upstream Python beat-analysis stack.

Primary references: [Hyperframes](https://hyperframes.heygen.com/) and
[FFmpeg documentation](https://ffmpeg.org/documentation.html).

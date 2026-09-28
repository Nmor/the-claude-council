# Full BRAG with Hyperframes

> Size budget: 5 KB.

Use this route only for `--full` or explicitly requested narration. Keep the
[lean creative rules](slim.md) and [Council contract](../SKILL.md). The composition
brief is a bounded implementation handoff, not a request to spawn another model.

## Dependencies

Node.js 22+, FFmpeg/ffprobe and Hyperframes are required. Consult the installed CLI's
help and [official Hyperframes documentation](https://hyperframes.heygen.com/).
Use `hyperframes doctor` before building. For an isolated installation, substitute
the executable path reported by Council's doctor in every command below. If domain skills such as `hyperframes-core`,
`hyperframes-animation` or `hyperframes-cli` are available, read only the ones needed;
otherwise use the CLI/documentation rather than claiming those skills are installed.

## Compose

Keep the story and timing in `storyboard.md`. Write `composition-brief.md` with product
source paths, verifiable copy, tone, dimensions, durations, assets and audio direction.
Create the composition under `<output-dir>/composition/`. When using `init`, set
`HYPERFRAMES_SKIP_SKILLS=1` so it does not install another full skill catalog;
the current CLI ignores the older `--skip-skills` flag. Reuse real product components
and styles. Keep downloaded or generated assets inside the output directory and use
composition-relative paths so the renderer can resolve them.

Use original music/SFX or user-supplied licensed material; Council does not ship the
upstream audio bundle. Music and SFX are independent options. If a requested audio
component cannot be produced, report it instead of silently delivering a muted video.
Do not require optional beat analysis for a simple launch video.

## Voice, only when requested

Generate Kokoro narration through Hyperframes, after checking the current CLI flags:

```bash
hyperframes tts --help
hyperframes tts "path/to/narration.txt" --voice af_heart --output composition/assets/voiceover.wav
```

Write narration in the storyboard, complementing rather than reading screen copy.
Measure the resulting audio, adjust scene timing, and duck music under the voice.
Without `--voice` or equivalent user direction, omit narration and voice setup entirely.

## Check and render

From the composition directory:

```bash
hyperframes check
hyperframes snapshot
hyperframes render --workers 1 --output ../brag.mp4
```

Fix check errors, inspect scene and transition frames, and render locally under the
existing request. A preview is useful but does not introduce a new approval requirement.
Pick a settled poster frame, then replace the first frame without changing audio timing:

```bash
ffmpeg -ss 3.2 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg
ffmpeg -i brag.mp4 -i brag.jpg \
  -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 18 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart work/brag-poster.mp4
```

Choose the actual settled timestamp; `3.2` is an example. Validate the new file before
replacing `brag.mp4`. Keep the poster, copy and storyboard together and run the Council
media verifier with the requested format, duration and audio expectation. Publishing
or uploading remains a separate user-authorized action.

Primary references: [upstream BRAG](https://github.com/latent-spaces/brag) and
[FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html).

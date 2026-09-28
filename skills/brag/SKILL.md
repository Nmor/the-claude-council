---
name: brag
description: Create a short launch video, poster and share copy from a project or website when the user asks to brag about it or make a product demo video.
---

# BRAG for Council

> Size budget: 4 KB.

Adapted from [latent-spaces/brag](https://github.com/latent-spaces/brag).
Use this skill for a requested video, not automatically after coding or a release.
Work in the main session with the user's model; do not launch a Council review team.

## Choose the route

- Default: read [the lean workflow](references/slim.md). It works with the available
  rendering tools and does not require Hyperframes or a specific model.
- `--full` or `--voice`: read the lean creative guidance, then
  [the Hyperframes route](references/hyperframes.md). Voice is explicitly opt-in.
- Keep tone, format, duration, `--no-music`, `--no-sfx` and title direction from the
  request. Default: about 20 seconds, landscape 1920×1080, 30 fps, no narration.

Resolve scripts relative to this skill directory, including when accessed through
Codex's Council catalog. Run `python3 <skill-dir>/scripts/brag.py doctor` first;
add `--full` for the Hyperframes route. It checks local tools without installing or
calling a model. Report missing dependencies, install them within the user's scope,
and verify again. Read only relevant project files or the requested website.

## One plan, honest content

Reuse the project's existing implementation plan for progress and handoffs. Record
creative scene timing in `brag-output/storyboard.md`; it is a media artifact, not
another implementation plan. Never create `brag-plan.md` or run a plan scaffold.
Use a timestamped output folder when prior output exists; keep intermediates in `work/`.

Use the real product, its visual identity and verifiable claims. Do not expose secrets,
private customer data or unpublished material in a public demo. Use synthetic demo data
where needed. Upstream music files are not bundled: generate original audio or use
assets the user has rights to use. Keep attribution with the deliverables when needed.

A request to create the video authorizes local rendering; no extra preview approval
is needed. Creating share copy does not authorize posting, uploading or messaging.
Do not send project material to an external generation service without authorization.

## Deliver and verify

Deliver `brag.mp4`, `brag.jpg`, `share-copy.txt` and `storyboard.md`. Inspect settled
frames and transitions, listen to the mix, and check readability and actual product
behavior. Bake the chosen poster into frame zero without extending the duration.

Run `python3 <skill-dir>/scripts/brag.py verify --output <output-dir> --duration 20
--format landscape` with the actual target duration and format. Use `--audio required`
when music, SFX or voice were requested, or `--audio none` for intentional silence.
The verifier checks artifacts and media properties; it does not judge visual quality,
prove the poster is frame zero, or establish the truth of marketing claims.
Report the files, checks and any limitation concisely. Keep progress in the existing plan.

See [provenance and license](UPSTREAM.md) and [Council installation](../../docs/BRAG.md).

## Standards cited

Use [W3C WCAG 2.2, SC 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG22/#contrast-minimum)
when checking readable foreground/background text in scene frames. Apply the project's
accessibility requirements to narration/captions and motion as relevant.

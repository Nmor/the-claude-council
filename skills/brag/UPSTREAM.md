# BRAG provenance

> Size budget: 3 KB.

Source: [latent-spaces/brag](https://github.com/latent-spaces/brag), pinned at
[`c893c5ed52aed84e3e2ee56787de869fccdae6b0`](https://github.com/latent-spaces/brag/tree/c893c5ed52aed84e3e2ee56787de869fccdae6b0).
Copyright (c) 2026 Shunit Haviv Hakimi. The [MIT License](LICENSE) is included.

`references/slim.md` adapts upstream `skills/brag-slim/SKILL.md`: it removes discovery
metadata, adds the Council contract, and renames the creative output to `storyboard.md`.
Council's entrypoint, dependency/media verifier and Hyperframes routing are maintained
here. They preserve the user's model, one implementation plan and on-demand loading.

No upstream music or SFX binaries are redistributed. Upstream's music README explicitly
asks distributors to verify and document exact music license terms; the checkout did
not establish those terms. Use original/generated or appropriately licensed user assets.
The optional upstream cue analyzer and its Python dependencies are not required by this
adaptation. Hyperframes and FFmpeg are external rendering tools, installed separately.

When updating, review upstream changes at a concrete commit, retain attribution,
reconcile the Council contract and rerun packaging plus media-verifier tests. Do not
replace the short router with an eager import of the upstream library.

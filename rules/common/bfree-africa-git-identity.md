# Per-Org Git Identity Rule (Global Default)

> Auto-fires on every git operation. Sister to `git-workflow.md`,
> `secrets-management.md`, and `repo-setup-checklist.md`.

## Core Principle

**Every commit and push uses the git identity that matches the remote.**
The user operates two distinct GitHub identities. The mapping is:

| Remote pattern | Identity |
| --- | --- |
| `github.com/bfree-africa/*` (HTTPS or SSH) | `le-yanu <moses@bfree.africa>` |
| Everything else | `Nmor <nmor.moses@gmail.com>` (the global default) |

The global git config (`~/.gitconfig`) is set to `Nmor` so
everything-else inherits automatically. The override happens
**per-bfree-africa-repo** via local config — never globally,
because flipping the global would silently break attribution on
the non-bfree projects.

Commits authored under the wrong identity are attribution
accidents — fix by re-authoring before push when possible, OR by
reverting + re-committing under the correct identity. **Never
rewrite already-pushed history without explicit user
authorization** (per the destructive-actions policy).

## Hard rules

1. **First touch of a bfree-africa repo** (clone, first-time edit,
   first-time push from this machine) MUST set local git config
   before any commit is made:
   ```bash
   git config user.name "le-yanu"
   git config user.email "moses@bfree.africa"
   ```
   This is a per-repo local config, NOT a global config change —
   the user's non-bfree projects keep the default Nmor identity.

2. **First touch of a non-bfree repo** does NOT require any
   per-repo config — the global default (`Nmor <nmor.moses@gmail.com>`)
   is correct. The agent confirms `git config user.email` is
   `nmor.moses@gmail.com` before pushing to any non-bfree-africa
   remote. If a non-bfree repo somehow has a local override set
   to le-yanu, that's an attribution accident — unset it before
   the next commit:
   ```bash
   git config --unset user.name
   git config --unset user.email
   ```

3. **Pushes from this machine** are vetted against the remote
   before the push. Pre-push checklist:
   - `remote=$(git remote get-url origin)`
   - If `remote` matches `github.com[/:]bfree-africa/`:
     confirm `git config user.email` is `moses@bfree.africa`.
   - Otherwise: confirm `git config user.email` is
     `nmor.moses@gmail.com`.
   - Mismatched identity = stop and reconfigure before pushing.

4. **Signing keys are per GitHub account.** Each identity has
   its OWN ed25519 SSH signing key, registered as a "Signing
   Key" on its OWN GitHub account. The mapping:

   | Identity | SSH key | Registered on |
   | --- | --- | --- |
   | Nmor | `~/.ssh/id_ed25519_signing` | @Nmor GitHub (Signing Key) |
   | le-yanu | `~/.ssh/id_ed25519_signing_leyanu` | @le-yanu GitHub (Signing Key) |

   Git picks the right key automatically via a `[includeIf
   "hasconfig:remote.*.url:https://github.com/bfree-africa/**"]`
   block in `~/.gitconfig` that loads `~/.gitconfig-leyanu`.
   The included config overrides `user.name`, `user.email`,
   AND `user.signingkey` whenever the cwd's repo has a
   bfree-africa remote. Non-bfree repos inherit the global
   [user] block (Nmor + Nmor's signing key).

   On a fresh machine the first-touch protocol for a
   bfree-africa repo includes:
   - Confirm `~/.ssh/id_ed25519_signing_leyanu` exists.
     If not, generate it:
     ```bash
     ssh-keygen -t ed25519 \
       -f ~/.ssh/id_ed25519_signing_leyanu \
       -C "le-yanu signing key (moses@bfree.africa) (created $(date +%Y-%m-%d))" \
       -N ""
     ```
     Passphrase-less because git SSH-signing runs
     non-interactively per-commit (existing
     `id_ed25519_signing` follows the same pattern).
   - Confirm `~/.gitconfig` has the `[includeIf
     "hasconfig:remote.*.url:https://github.com/bfree-africa/**"]`
     block pointing at `~/.gitconfig-leyanu`.
   - Confirm the public key is registered under @le-yanu's
     GitHub account at Settings → SSH and GPG keys →
     **with key type "Signing Key"** (separate from
     "Authentication Key"). If only Authentication-Key is
     registered, signed commits push successfully but show
     as **Unverified** — GitHub treats the two key types
     as different scopes.
   - Append the new key to `~/.ssh/allowed_signers` so local
     `git log --show-signature` validates correctly.

3. **Existing commits with the wrong author** (e.g. authored as
   `Nmor <nmor.moses@gmail.com>` before this rule was applied) are
   left in place historically — rewriting published history is
   destructive. Going forward all new commits use le-yanu. If the
   user explicitly asks to scrub historic attribution, that's a
   separate destructive operation requiring confirmation per the
   "Executing actions with care" policy.

4. **PR descriptions** referencing the author do not need updating
   — GitHub renders the commit-time identity automatically.

5. **Co-Authored-By trailer** stays as the Anthropic noreply per
   `~/.claude/rules/common/git-workflow.md`. Only the primary
   `Author:` line shifts to le-yanu.

## Repo coverage (auto-discovered)

Apply the rule to every directory whose `origin` remote URL
matches `github.com[/:]bfree-africa/`. Currently in scope on this
machine (verify with `git remote get-url origin` per dir):

- `/Users/APPLE/BFREE-Africa/*` (21 repos as of 2026-05-25)
- `/Users/APPLE/Documents/bfree-security-tools/`

If a new bfree-africa repo is cloned outside these paths, the
first-touch protocol in rule 1 applies — the agent sets the local
config automatically and reports it as part of the repo-setup
checklist.

## Mechanical sweep

To verify every local repo is configured to the right identity for
its remote (handles both directions — bfree → le-yanu, non-bfree →
Nmor):

```bash
for d in $(find /Users/APPLE -maxdepth 4 -type d -name ".git" 2>/dev/null | sed 's|/.git$||'); do
  ( cd "$d" 2>/dev/null || exit 0
    remote=$(git remote get-url origin 2>/dev/null) || exit 0
    name=$(git config user.name)
    email=$(git config user.email)
    if [[ "$remote" =~ bfree-africa/ ]]; then
      expected_name="le-yanu"
      expected_email="moses@bfree.africa"
    else
      expected_name="Nmor"
      expected_email="nmor.moses@gmail.com"
    fi
    if [ "$name" = "$expected_name" ] && [ "$email" = "$expected_email" ]; then
      echo "OK  $d"
    else
      echo "BAD $d (got $name<$email>; want $expected_name<$expected_email>)"
    fi
  )
done
```

The same check runs on first touch of any repo. Mismatch → fix
before the next commit.

## Cross-references

- `git-workflow.md` — general commit-message + PR conventions.
- `repo-setup-checklist.md` — 20-point first-touch checklist;
  this rule is item 21 for bfree-africa repos.
- `secrets-management.md` — same family of "right identity at every
  step" rules.
- `feedback_bfree_africa_le_yanu_identity` — durable memory entry
  recording this directive.

## Why this rule exists

User directive 2026-05-25: "pushes to bfree-africa going forward
should be done using @le-yanu git user". Set after the agent
pushed PR #19 on `bfree-africa/.github` authored as
`Nmor <nmor.moses@gmail.com>` (the global default). That author
stays on the merged commit (published history), but every
subsequent commit + push must carry the le-yanu identity.

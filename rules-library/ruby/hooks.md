# Ruby Hooks

> Auto-fires on every `*.rb`, `Gemfile`, `Rakefile` file. Sister to
> `~/.claude/rules/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Only run on staged Ruby files for speed
staged_ruby=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(rb|rake)$' || true)
[ -z "$staged_ruby" ] && exit 0

bundle exec rubocop --force-exclusion --parallel $staged_ruby
bundle exec brakeman --no-pager --quiet --confidence-level 2
bundle exec bundler-audit check --update
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail
bundle exec rspec --fail-fast
```

## Rails initializer hooks

```ruby
# config/initializers/security.rb
Rails.application.config.action_dispatch.default_headers.merge!({
  "X-Frame-Options" => "DENY",
  "X-Content-Type-Options" => "nosniff",
  "Referrer-Policy" => "strict-origin-when-cross-origin",
  "Permissions-Policy" => "geolocation=(), microphone=(), camera=()"
})

# config/initializers/filter_parameter_logging.rb
Rails.application.config.filter_parameters += [
  :password, :ssn, :credit_card, :secret, :token, :api_key
]
```

## CI workflow

```yaml
- name: Setup Ruby
  uses: ruby/setup-ruby@<sha>
  with:
    bundler-cache: true
    ruby-version: .ruby-version

- name: Lint
  run: bundle exec rubocop

- name: Security
  run: |
    bundle exec brakeman --no-pager --confidence-level 2
    bundle exec bundler-audit check --update

- name: Test
  run: bundle exec rspec --format documentation

- name: Coverage
  run: |
    coverage=$(cat coverage/.last_run.json | jq '.result.line')
    if (( $(echo "$coverage < 80" | bc -l) )); then exit 1; fi
```

## Cross-references

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/ruby/no-discards.md`
- `~/.claude/rules/ruby/security.md`
- `~/.claude/rules/ruby/testing.md`

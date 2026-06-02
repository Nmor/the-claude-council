# Ruby — No-Discards Extension

> Auto-fires on every `*.rb` file. Extends
> `~/.claude/rules/common/no-discards.md`. Tooling: RuboCop with
> strict cops + rubocop-performance + rubocop-rails + Brakeman.

## Core Principle

**Every `rescue` is specific (named exception class); no `rescue
nil`; no `rescue => e` without logging + re-raise or named
handling; `Bundler.require` in initializers only; `eval` /
`instance_eval` / `class_eval` with user input forbidden;
mutations on shared state require explicit synchronisation.**

## Banned patterns

### 1. Bare `rescue`

```ruby
# FORBIDDEN — catches every StandardError silently
begin
  thing
rescue
  fallback
end

# FORBIDDEN — catches Exception (incl. SystemExit, Interrupt)
begin
  thing
rescue Exception
end

# CORRECT
begin
  thing
rescue SomeSpecificError => e
  logger.warn("thing failed", error: e.message, backtrace: e.backtrace.first(5))
  raise ServiceError, "thing failed: #{e.message}"
end
```

RuboCop: `Style/RescueStandardError: only_qualified`,
`Lint/RescueException: enabled`.

### 2. `rescue nil` / `rescue {}`

```ruby
# FORBIDDEN
value = risky_call rescue nil
data = parse(json) rescue {}

# CORRECT
value = begin
  risky_call
rescue SpecificError => e
  logger.warn("risky_call failed", error: e.message)
  nil
end
```

RuboCop: `Style/RescueModifier: enabled`.

### 3. `Object#send` / `public_send` with user input

```ruby
# FORBIDDEN — RCE
user.send(params[:method])

# CORRECT — explicit whitelist
ALLOWED = %w[name email created_at].freeze
attribute = params[:attribute]
raise BadRequest unless ALLOWED.include?(attribute)
user.public_send(attribute)
```

### 4. `eval` / `instance_eval` / `class_eval` with user input

```ruby
# FORBIDDEN
result = eval(user_input)
obj.instance_eval(user_code)

# CORRECT — never
```

Brakeman + RuboCop `Security/Eval` ENFORCED.

### 5. `rubocop:disable` / `nodoc` suppressions

NEVER. Fix the underlying issue, OR change the rubocop config
project-wide (per `~/.claude/rules/common/extreme-lint-policy.md`).

### 6. `Hash#[]=` race conditions

```ruby
# FORBIDDEN — Hash is NOT thread-safe
@cache = {}
def get(k)
  @cache[k] ||= expensive(k)  # race
end

# CORRECT — Mutex or Concurrent::Map
require "concurrent"
@cache = Concurrent::Map.new
def get(k)
  @cache.compute_if_absent(k) { expensive(k) }
end
```

### 7. `puts` / `print` in production code

```ruby
# FORBIDDEN
puts "got request #{req.id}"

# CORRECT
Rails.logger.info("got request", request_id: req.id)
# or with structured logger
logger.info("got_request", request_id: req.id)
```

`Rails/Output: enabled`.

### 8. `Time.now` / `DateTime.now` / `Date.today`

```ruby
# FORBIDDEN — uses system zone; tests can't control time
Time.now
DateTime.now
Date.today

# CORRECT — explicit zone + injected
Time.current      # Rails: respects Time.zone
Date.current
Time.zone.now

# Inject for testability (per no-ambient-globals.md)
def initialize(clock: -> { Time.zone.now })
  @clock = clock
end
```

### 9. `ENV["FOO"]` deep in the call stack

```ruby
# FORBIDDEN
def call_api
  uri = URI("#{ENV['API_URL']}/endpoint")
  ...
end

# CORRECT — validated at boot
class Settings
  def self.load!
    @settings = OpenStruct.new(
      api_url: required_env("API_URL"),
      stripe_key: required_env("STRIPE_KEY")
    )
  end

  def self.required_env(key)
    ENV.fetch(key) { raise "missing env: #{key}" }
  end
end
```

Per `~/.claude/rules/common/no-ambient-globals.md`.

### 10. `monkey_patch` / `open class` of Ruby builtins

```ruby
# FORBIDDEN — pollutes every consumer of String
class String
  def reverse_words
    split.reverse.join(" ")
  end
end

# CORRECT — refinement (scoped) or module method
module StringExtensions
  refine String do
    def reverse_words = split.reverse.join(" ")
  end
end

# Or as a module method
module TextUtils
  def self.reverse_words(s) = s.split.reverse.join(" ")
end
```

### 11. `find_each` without ordering by primary key

```ruby
# FORBIDDEN — find_each requires ordered by PK; default is random
Order.where(status: "pending").find_each { |o| ... }
# above WORKS but issues a warning; explicit:

# CORRECT
Order.where(status: "pending").order(:id).find_each { |o| ... }
```

### 12. `update_columns` / `update_all` skipping callbacks

```ruby
# FORBIDDEN unless intentional
order.update_columns(status: "paid")  # skips validations, callbacks

# CORRECT — when callbacks needed
order.update!(status: "paid")

# OR document the skip
order.update_columns(status: "paid")  # SAFE: status change doesn't trigger any side-effect callback (verified 2026-05-26)
```

### 13. `class << self` for class methods (style choice — pick one)

```ruby
# Two equivalent forms — be consistent

# Style A
class Foo
  def self.bar = "bar"
end

# Style B
class Foo
  class << self
    def bar = "bar"
  end
end
```

RuboCop's `Style/ClassMethods` picks one project-wide.

### 14. `for ... in` loop (use `.each`)

```ruby
# FORBIDDEN
for x in items
  process(x)
end

# CORRECT
items.each { |x| process(x) }
```

`Style/For: enabled`.

### 15. Multiple assignment with `_` for missing handler

```ruby
# FORBIDDEN — second return discarded
result, _ = some_multi_return

# CORRECT — bind + use OR document
result, error = some_multi_return
if error
  logger.warn("operation returned error", error:)
  return failure
end
```

## Required tooling

```bash
bundle exec rubocop --enable-pending-cops
bundle exec brakeman --no-pager
bundle exec bundler-audit check --update
bundle exec rspec
```

## Verification block

```text
Ruby sweep (this turn):
  - rubocop: 0 offenses
  - brakeman: 0 issues
  - bundler-audit: clean
  - rspec: PASS (92% coverage)
```

## Cross-references

- `~/.claude/rules/common/no-discards.md`
- `~/.claude/rules/common/no-silent-failures.md`
- `~/.claude/rules/common/error-handling-with-context.md`
- `~/.claude/rules/ruby/coding-style.md`
- `~/.claude/rules/ruby/security.md`
- `~/.claude/rules/common/extreme-lint-policy.md`

# Ruby Coding Style

> Auto-fires on every `*.rb`, `*.rake`, `*.gemspec`, `Gemfile`,
> `Rakefile`, `config.ru` file. Standards: **Ruby Style Guide
> (rubocop-hq)**, **Rails Guides**, **Sandi Metz Rules**, **POODR**.

## Core Principle

**Idiomatic Ruby (3.3+) with consistent style enforced by RuboCop
at strictest config; small classes (Sandi Metz: 100-line max),
small methods (5-line ideal), explicit return types via Sorbet /
RBS where the team adopts gradual typing; frozen string literals
mandatory; no monkey-patching outside dedicated `Refinements` or
`Module#prepend`.**

## Naming

- Class / module: PascalCase — `OrderProcessor`, `Payments::Gateway`
- Method / variable / file: snake_case — `calculate_total`,
  `user_email`, `order_processor.rb`
- Constant: SCREAMING_SNAKE_CASE — `MAX_RETRIES`
- Predicate methods: end with `?` — `active?`, `valid?`
- Destructive methods: end with `!` — `save!`, `update!`

## Sandi Metz rules (the floor)

1. Classes ≤ 100 lines (excluding comments)
2. Methods ≤ 5 lines (excluding signature + end)
3. Pass ≤ 4 arguments
4. Controllers instantiate ≤ 1 object; views reference ≤ 2 instance
   variables

Per `~/.claude/rules/common/extreme-lint-policy.md`, the
project-wide caps are tighter (cognitive complexity ≤ 10).

## Frozen string literals (mandatory)

```ruby
# frozen_string_literal: true

class Order
  STATUS = "pending"  # frozen at top of file
  ...
end
```

`Style/FrozenStringLiteralComment: enforced_style: always`.

## Modern Ruby idioms

```ruby
# Endless methods (Ruby 3.0+)
def total = items.sum(&:price)

# Pattern matching (Ruby 3.0+)
case response
in { status: 200, body: { user: { id:, name: } } }
  User.new(id: id, name: name)
in { status: 401 }
  raise Unauthorized
in { status: }
  raise UnexpectedStatus, status
end

# Hash shorthand (Ruby 3.1+)
def find(id:, status:)
  Order.where(id:, status:).first
end

# Numbered block parameters
items.map { _1.price }
```

## Class structure

```ruby
class Order
  # 1. Constants
  STATUS_VALUES = %w[pending paid shipped].freeze

  # 2. Class macros / declarations
  include Comparable
  attr_reader :id, :total

  # 3. Class methods
  def self.find(id)
    repository.fetch(id)
  end

  # 4. Initialiser
  def initialize(id:, total:)
    @id = id
    @total = total
  end

  # 5. Public methods
  def <=>(other)
    total <=> other.total
  end

  # 6. Private
  private

  def repository
    @repository ||= OrderRepository.new
  end
end
```

## Modules + mixins

```ruby
# Use modules for namespacing
module Payments
  class Gateway
    ...
  end
end

# Mixin for shared behaviour (composition over inheritance)
module Cacheable
  extend ActiveSupport::Concern

  class_methods do
    def cached(id)
      Rails.cache.fetch("#{name}/#{id}") { find(id) }
    end
  end
end
```

## Rails-specific

- Skinny controllers; fat models bad too — extract to service
  objects / form objects / query objects
- Prefer scopes over class methods for query composition
- `strong_parameters` everywhere on user input
- `:through` associations + `inverse_of:` to avoid N+1

## Required tooling

```text
.rubocop.yml           # rubocop config (see below)
.rubocop-todo.yml      # generated; tracked + decreasing
Gemfile.lock           # committed
.rspec                 # rspec config
```

`.rubocop.yml` (strict baseline):

```yaml
AllCops:
  TargetRubyVersion: 3.3
  NewCops: enable
  Exclude:
    - 'bin/**/*'
    - 'db/schema.rb'
    - 'vendor/**/*'

require:
  - rubocop-rspec
  - rubocop-rails
  - rubocop-performance
  - rubocop-thread_safety

# Per extreme-lint-policy
Metrics/ClassLength:
  Max: 100
Metrics/MethodLength:
  Max: 10
  CountAsOne: ['array', 'hash', 'heredoc']
Metrics/CyclomaticComplexity:
  Max: 7
Metrics/PerceivedComplexity:
  Max: 7
Metrics/AbcSize:
  Max: 15
Metrics/BlockLength:
  Max: 25
Metrics/ParameterLists:
  Max: 5
Layout/LineLength:
  Max: 120

Style/FrozenStringLiteralComment:
  EnforcedStyle: always
Style/Documentation:
  Enabled: true
Style/StringLiterals:
  EnforcedStyle: double_quotes
```

## Cross-references

- `~/.claude/rules/common/coding-style.md`
- `~/.claude/rules/ruby/no-discards.md`
- `~/.claude/rules/ruby/security.md`
- `~/.claude/rules/ruby/testing.md`
- `~/.claude/rules/ruby/patterns.md`
- Ruby Style Guide (rubocop-hq/ruby-style-guide)
- Sandi Metz: 99 Bottles of OOP / Practical OOD in Ruby

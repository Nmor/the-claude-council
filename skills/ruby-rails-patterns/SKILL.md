---
name: ruby-rails-patterns
description: Ruby 3.3+ / Rails 7-8 discipline — Sandi Metz rules (classes ≤ 100 LOC, methods ≤ 5 LOC, ≤ 4 args), frozen_string_literal mandatory, RuboCop at strict (cyclomatic ≤ 7, AbcSize ≤ 15), modern Ruby idioms (endless methods, pattern matching, hash shorthand, numbered block params), service objects + form objects + query objects + value objects, Rails 8 Solid Queue / Solid Cache / Solid Cable defaults, no monkey-patching outside Refinements / Module#prepend, Brakeman + bundler-audit + RSpec at strict. Auto-fires on Ruby / Rails project files.
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.gemspec"
  - "**/Gemfile"
  - "**/Gemfile.lock"
  - "**/Rakefile"
  - "**/config.ru"
  - "**/.rspec"
  - "**/spec/**/*.rb"
---

> Migrated 2026-06-02 from `~/.claude/rules-library/ruby/` as part of the lazy-rules-loading plan. Phase H will delete the source files.

# ruby-rails-patterns


<!-- ============================================================
     Section: ruby/coding-style.md
     ============================================================ -->

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

Per `~/.claude/rules-library/common/extreme-lint-policy.md`, the
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

```
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

- `~/.claude/rules-library/common/coding-style.md`
- `~/.claude/rules-library/ruby/no-discards.md`
- `~/.claude/rules-library/ruby/security.md`
- `~/.claude/rules-library/ruby/testing.md`
- `~/.claude/rules-library/ruby/patterns.md`
- Ruby Style Guide (rubocop-hq/ruby-style-guide)
- Sandi Metz: 99 Bottles of OOP / Practical OOD in Ruby

---

<!-- ============================================================
     Section: ruby/hooks.md
     ============================================================ -->

# Ruby Hooks

> Auto-fires on every `*.rb`, `Gemfile`, `Rakefile` file. Sister to
> `~/.claude/rules-library/common/hooks.md`.

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

- `~/.claude/rules-library/common/hooks.md`
- `~/.claude/rules-library/ruby/no-discards.md`
- `~/.claude/rules-library/ruby/security.md`
- `~/.claude/rules-library/ruby/testing.md`

---

<!-- ============================================================
     Section: ruby/no-discards.md
     ============================================================ -->

# Ruby — No-Discards Extension

> Auto-fires on every `*.rb` file. Extends
> `~/.claude/rules-library/common/no-discards.md`. Tooling: RuboCop with
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
project-wide (per `~/.claude/rules-library/common/extreme-lint-policy.md`).

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

Per `~/.claude/rules-library/common/no-ambient-globals.md`.

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

```
Ruby sweep (this turn):
  - rubocop: 0 offenses
  - brakeman: 0 issues
  - bundler-audit: clean
  - rspec: PASS (92% coverage)
```

## Cross-references

- `~/.claude/rules-library/common/no-discards.md`
- `~/.claude/rules-library/common/no-silent-failures.md`
- `~/.claude/rules-library/common/error-handling-with-context.md`
- `~/.claude/rules-library/ruby/coding-style.md`
- `~/.claude/rules-library/ruby/security.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`

---

<!-- ============================================================
     Section: ruby/patterns.md
     ============================================================ -->

# Ruby / Rails Patterns

> Auto-fires on every `*.rb` file. Standards: **POODR (Sandi Metz)**,
> **Rails Guides**, **Sustainable Web Dev with Ruby on Rails (David
> Bryant Copeland)**, **Hexagonal Rails (Cohn)**.

## Core Principle

**Rails conventions for CRUD; service objects for business logic;
form objects for complex inputs; query objects for non-trivial
queries; value objects (struct / data) for first-class concepts;
single-responsibility per Sandi Metz; tell-don't-ask; composition
over inheritance.**

## Service objects

```ruby
# app/services/place_order.rb
class PlaceOrder
  def self.call(...) = new(...).call

  def initialize(customer:, items:)
    @customer = customer
    @items = items
  end

  def call
    return failure(:no_items) if @items.empty?
    return failure(:insufficient_funds) unless @customer.balance.enough?(total)

    order = Order.create!(customer: @customer, items: @items, total:)
    PaymentService.charge!(@customer, total)
    OrderMailer.confirmation(order).deliver_later
    success(order)
  end

  private

  def total
    @total ||= Money.sum(@items.map(&:price))
  end

  def success(order) = Result.new(success: true, order:)
  def failure(reason) = Result.new(success: false, error: reason)
end

# Usage
result = PlaceOrder.call(customer: current_user, items: cart.items)
if result.success?
  redirect_to result.order
else
  flash.alert = t("errors.#{result.error}")
  redirect_to cart_path
end
```

## Form objects

```ruby
# app/forms/registration_form.rb
class RegistrationForm
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :email, :string
  attribute :password, :string
  attribute :name, :string
  attribute :tos_accepted, :boolean

  validates :email, presence: true, format: URI::MailTo::EMAIL_REGEXP
  validates :password, length: { minimum: 12 }
  validates :tos_accepted, acceptance: true

  def save
    return false unless valid?
    User.create!(email:, password:, name:)
  end
end

# Controller
def create
  form = RegistrationForm.new(registration_params)
  if user = form.save
    sign_in(user)
    redirect_to root_path
  else
    render :new, status: :unprocessable_entity
  end
end
```

## Query objects

```ruby
# app/queries/active_orders_query.rb
class ActiveOrdersQuery
  def self.call(...) = new(...).call

  def initialize(scope: Order.all, customer:, since: 30.days.ago)
    @scope = scope
    @customer = customer
    @since = since
  end

  def call
    @scope
      .where(customer: @customer)
      .where(status: %w[pending paid shipped])
      .where("created_at >= ?", @since)
      .includes(:items)
      .order(created_at: :desc)
  end
end

# Usage
ActiveOrdersQuery.call(customer: current_user, since: 7.days.ago)
```

## Value objects

```ruby
# app/values/money.rb
class Money
  include Comparable

  attr_reader :amount_cents, :currency

  def self.zero(currency = "USD") = new(0, currency)
  def self.from_dollars(dollars, currency = "USD") = new((dollars * 100).round, currency)

  def initialize(amount_cents, currency)
    raise ArgumentError, "negative" if amount_cents.negative?
    @amount_cents = amount_cents
    @currency = currency.to_s.upcase
    freeze
  end

  def +(other) = self.class.new(amount_cents + other.amount_cents, currency)
  def -(other) = self.class.new(amount_cents - other.amount_cents, currency)
  def <=>(other) = amount_cents <=> other.amount_cents

  def to_s = "#{currency} #{format('%.2f', amount_cents / 100.0)}"

  def hash = [amount_cents, currency].hash
  def eql?(other) = self.class == other.class && hash == other.hash
end
```

## Concerns vs inheritance

```ruby
# Use concerns for behaviour ACROSS models
module Auditable
  extend ActiveSupport::Concern

  included do
    has_many :audit_logs, as: :auditable
    after_create_commit :audit_create
    after_update_commit :audit_update
  end

  private

  def audit_create
    audit_logs.create!(event: "created", actor: Current.user)
  end
end

class Order < ApplicationRecord
  include Auditable
end
```

## ActiveRecord pitfalls

| Pitfall | Fix |
| --- | --- |
| `find_or_create_by` race | `find_or_create_by` + unique index + rescue |
| N+1 queries | `.includes` / `.preload` / `.eager_load` |
| Mass assignment | strong_parameters + `attr_protected` |
| Callbacks proliferation | Move to service objects |
| `where("name LIKE '%foo%'")` injection | `where("name LIKE ?", "%#{ActiveRecord::Base.sanitize_sql_like(input)}%")` |
| `update_columns` skips callbacks | Use intentionally; document |

## Reuse-first

- Devise for auth (don't roll your own)
- Pundit / CanCanCan for authorisation
- Sidekiq / Solid Queue for background jobs (Rails 8 default:
  Solid Queue)
- Rails 8 Solid Cache + Solid Cable + Solid Queue replace Redis
  in many setups
- ActiveJob abstraction over the queue backend

Per `~/.claude/rules-library/common/reuse-first.md`.

## Cross-references

- `~/.claude/rules-library/common/patterns.md`
- `~/.claude/rules-library/common/reuse-first.md`
- `~/.claude/rules-library/ruby/coding-style.md`
- `~/.claude/rules-library/common/no-ambient-globals.md`
- POODR / 99 Bottles (Sandi Metz)
- Sustainable Web Dev with Ruby on Rails

---

<!-- ============================================================
     Section: ruby/security.md
     ============================================================ -->

# Ruby / Rails Security

> Auto-fires on every `*.rb`, `Gemfile`, `config/*.rb` file. Sister
> to `~/.claude/rules-library/common/security.md`. Tooling: **Brakeman**,
> **bundler-audit**, **rubocop-rspec**, **dawnscanner**.

## Core Principle

**Rails defaults are mostly secure; deviations require justification.
Strong parameters everywhere; parameterised queries (never string
interpolation); CSRF tokens on every form; XSS-escaped by default;
no `eval` / `send` with user input; secrets in environment, not
source.**

## OWASP Top 10 — Rails specifics

### A01 — Broken Access Control

```ruby
# WRONG — IDOR
def show
  @order = Order.find(params[:id])
end

# RIGHT — scoped to current user
def show
  @order = current_user.orders.find(params[:id])
end

# BETTER — use Pundit / CanCanCan
def show
  @order = Order.find(params[:id])
  authorize @order
end
```

### A02 — Cryptographic Failures

```ruby
# WRONG — Digest::MD5 / SHA1
Digest::MD5.hexdigest(data)

# RIGHT
Digest::SHA256.hexdigest(data)
# or for keyed hashing
OpenSSL::HMAC.hexdigest("SHA256", key, data)

# RIGHT — Argon2id / BCrypt for passwords (Rails has_secure_password)
class User < ApplicationRecord
  has_secure_password  # uses bcrypt
end

# RIGHT — Rails encrypted attributes (Rails 7+)
class Patient < ApplicationRecord
  encrypts :ssn, deterministic: false
end
```

### A03 — Injection

```ruby
# WRONG — SQL injection
User.where("email = '#{params[:email]}'")

# RIGHT — parameterised
User.where(email: params[:email])
User.where("email = ?", params[:email])

# WRONG — command injection
`ls #{params[:dir]}`

# RIGHT
Open3.capture3("ls", params[:dir])

# WRONG — XSS (raw)
<%= raw user_input %>
<%= user_input.html_safe %>

# RIGHT — escape by default
<%= user_input %>
```

### A04 — Insecure Design

- `before_action :authenticate_user!` — default-deny
- Strong parameters whitelist
- Devise / similar for auth (battle-tested per `reuse-first.md`)

### A05 — Security Misconfiguration

```ruby
# config/application.rb — production
config.force_ssl = true
config.assume_ssl = true                # behind load balancer
config.action_controller.default_url_options = { protocol: 'https' }

# config/environments/production.rb
config.consider_all_requests_local = false  # default
config.log_level = :info                     # never :debug in prod
```

### A06 — Vulnerable Components

```bash
bundle audit check --update
brakeman --no-pager --quiet --confidence-level 2
```

Per `~/.claude/rules-library/common/dependency-vulnerabilities.md`.

### A07 — Identification + Auth

- Devise's defaults are sane (Argon2id since v4.10)
- Two-factor: devise-two-factor / rotp
- Lockout: devise lockable module
- Session timeout: `Devise.timeout_in = 30.minutes`

### A08 — Software / Data Integrity

- Gemfile.lock committed
- Signed releases via rubygems.org gem-signing
- Verify checksums on dep installs (`bundle config --local
  global_gem_cache true`)

### A09 — Logging + Monitoring

```ruby
# Rails 7+ — filter sensitive params automatically
config.filter_parameters += [:password, :ssn, :credit_card, :secret, :token]

# Don't log emails / IPs in EU (per gdpr-ccpa.md)
config.filter_parameters += [:email, :remote_ip]
```

### A10 — SSRF

```ruby
# WRONG
HTTParty.get(params[:url])

# RIGHT — validate destination
require "uri"
uri = URI.parse(params[:url])
raise InvalidURL unless ALLOWED_HOSTS.include?(uri.host)
raise InvalidURL if PRIVATE_NETS.any? { |net| net.include?(IPAddr.new(Resolv.getaddress(uri.host))) }
HTTParty.get(uri.to_s)
```

## CSRF + Strong Parameters

```ruby
# ApplicationController
protect_from_forgery with: :exception

# In every controller action receiving params
def user_params
  params.require(:user).permit(:name, :email)  # whitelist
end
```

## Secrets

- `config/credentials.yml.enc` (Rails encrypted credentials)
- `RAILS_MASTER_KEY` in environment OR per-env credentials
- NEVER commit unencrypted secrets

Per `~/.claude/rules-library/common/secrets-management.md`.

## Required tooling

```bash
bundle audit check --update
brakeman --no-pager
rubocop --enable-pending-cops
rspec --fail-fast
```

## Cross-references

- `~/.claude/rules-library/common/security.md`
- `~/.claude/rules-library/common/secrets-management.md`
- `~/.claude/rules-library/common/dependency-vulnerabilities.md`
- `~/.claude/rules-library/ruby/no-discards.md`
- `~/.claude/rules-library/ruby/coding-style.md`
- OWASP Ruby on Rails Cheat Sheet
- Rails Security Guide

---

<!-- ============================================================
     Section: ruby/testing.md
     ============================================================ -->

# Ruby Testing

> Auto-fires on every `*_spec.rb`, `*_test.rb`, `spec/**`, `test/**`
> file. Standards: **RSpec 3+**, **Minitest**, **FactoryBot**,
> **VCR**, **SimpleCov**, **Capybara** (system tests), **Cuprite**
> (browser driver).

## Core Principle

**RSpec preferred for new projects; Minitest equally acceptable
when team conventions require. FactoryBot replaces fixtures;
WebMock + VCR for external HTTP; Capybara + Cuprite for system
tests; coverage ≥ 90% on touched files; tests run in randomised
order.**

## Test pyramid (Rails)

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit (POROs) | RSpec / Minitest | Plain Ruby classes |
| Model | RSpec + FactoryBot | ActiveRecord behaviour |
| Service | RSpec | Service objects, form objects |
| Request | RSpec request specs | Controller through to DB |
| System | Capybara + Cuprite | Full browser test |
| Job | RSpec + ActiveJob::TestHelper | Background jobs |

## RSpec idioms

```ruby
# spec/models/order_spec.rb
require "rails_helper"

RSpec.describe Order, type: :model do
  describe "validations" do
    it { is_expected.to validate_presence_of(:customer) }
    it { is_expected.to validate_numericality_of(:total).is_greater_than(0) }
  end

  describe "#total_with_tax" do
    subject(:total) { order.total_with_tax }

    let(:order) { build(:order, total: 100_00, tax_rate: 0.08) }

    it "adds tax" do
      expect(total).to eq(108_00)
    end

    context "with no tax" do
      let(:order) { build(:order, total: 100_00, tax_rate: 0) }

      it { is_expected.to eq(100_00) }
    end
  end
end
```

## FactoryBot

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    name { "Test User" }

    trait :admin do
      role { "admin" }
    end

    trait :with_orders do
      after(:create) do |user|
        create_list(:order, 3, customer: user)
      end
    end
  end
end

# In specs
user = create(:user, :admin, :with_orders)
```

## External HTTP — WebMock + VCR

```ruby
# spec/support/vcr.rb
VCR.configure do |c|
  c.cassette_library_dir = "spec/fixtures/vcr_cassettes"
  c.hook_into :webmock
  c.filter_sensitive_data("<API_KEY>") { ENV["STRIPE_API_KEY"] }
  c.default_cassette_options = {
    record: :none,         # never record in CI
    match_requests_on: %i[method uri body]
  }
end

# In specs
it "creates a charge" do
  VCR.use_cassette("stripe/charge_success") do
    expect(charge_service.charge(amount: 1000)).to be_success
  end
end
```

## System tests with Capybara + Cuprite

```ruby
# spec/system/sign_up_spec.rb
require "rails_helper"

RSpec.describe "Sign up", type: :system do
  it "creates a new account" do
    visit new_user_registration_path
    fill_in "Email", with: "new@example.com"
    fill_in "Password", with: "supersecret"
    click_button "Sign up"
    expect(page).to have_content("Welcome!")
    expect(User.find_by(email: "new@example.com")).to be_present
  end
end

# config/application.rb (test)
Capybara.javascript_driver = :cuprite
Capybara.default_max_wait_time = 5
```

## Hard rules

### 1. No real network in tests

Every external call is stubbed via WebMock (and recorded via VCR
for replay). CI runs with `WebMock.disable_net_connect!`.

### 2. No `Time.now` / `Date.today` in tests

Use Timecop / ActiveSupport's `travel_to`:

```ruby
travel_to Time.zone.local(2026, 5, 26, 14, 30) do
  expect(Order.new.created_at).to eq(Time.zone.local(2026, 5, 26, 14, 30))
end
```

Per `~/.claude/rules-library/common/no-ambient-globals.md`.

### 3. Randomised order

```ruby
# .rspec
--order random
--format documentation
```

Tests that fail under random order have hidden coupling. Fix.

### 4. No DB cleaner — use Rails transactional fixtures

```ruby
# spec/rails_helper.rb
RSpec.configure do |config|
  config.use_transactional_fixtures = true
end
```

For system tests with multiple processes (browser + server),
DatabaseCleaner with truncation strategy.

### 5. SimpleCov

```ruby
# spec/spec_helper.rb (top of file)
require "simplecov"
SimpleCov.start "rails" do
  minimum_coverage 80
  minimum_coverage_by_file 70  # tightened to 90 for touched files in CI
end
```

### 6. Mutation testing

```bash
mutant --include lib --use rspec MyClass
```

Mutant is comprehensive but slow; run on critical-path packages
quarterly.

### 7. No skipped tests without ticket

```ruby
# WRONG
skip "broken"

# RIGHT
skip "investigating flaky behaviour — see #PROJ-1234"
```

A skipped test is broken software pretending to be fine.

### 8. Test naming as behaviour

Per `~/.claude/rules-library/java/testing.md` § 9 — same rule:

```ruby
# WRONG
it "works" { ... }
it "test_total" { ... }

# RIGHT
it "returns zero when no line items exist" { ... }
it "adds tax when tax_rate is positive" { ... }
```

### 9. Background job tests

```ruby
RSpec.describe ProcessOrderJob, type: :job do
  include ActiveJob::TestHelper

  it "enqueues a charge job" do
    expect {
      described_class.perform_later(order_id: 1)
    }.to have_enqueued_job(ProcessOrderJob)
  end

  it "processes immediately when perform_now" do
    expect(Stripe::Charge).to receive(:create)
    perform_enqueued_jobs do
      described_class.perform_now(order_id: 1)
    end
  end
end
```

### 10. CI same as local

`bundle exec rspec` runs the same gates locally + in CI. CI
re-runs failures once for transient infra failures, then fails
hard.

## Cross-references

- `~/.claude/rules-library/common/testing.md`
- `~/.claude/rules-library/common/extreme-lint-policy.md`
- `~/.claude/rules-library/ruby/coding-style.md`
- `~/.claude/rules-library/common/no-ambient-globals.md`
- RSpec docs
- Better Specs (betterspecs.org)

---

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

Per `~/.claude/rules/common/reuse-first.md`.

## Cross-references

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/ruby/coding-style.md`
- `~/.claude/rules/common/no-ambient-globals.md`
- POODR / 99 Bottles (Sandi Metz)
- Sustainable Web Dev with Ruby on Rails

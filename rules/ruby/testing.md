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

Per `~/.claude/rules/common/no-ambient-globals.md`.

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

Per `~/.claude/rules/java/testing.md` § 9 — same rule:

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

- `~/.claude/rules/common/testing.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/ruby/coding-style.md`
- `~/.claude/rules/common/no-ambient-globals.md`
- RSpec docs
- Better Specs (betterspecs.org)

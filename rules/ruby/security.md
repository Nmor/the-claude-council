# Ruby / Rails Security

> Auto-fires on every `*.rb`, `Gemfile`, `config/*.rb` file. Sister
> to `~/.claude/rules/common/security.md`. Tooling: **Brakeman**,
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

Per `~/.claude/rules/common/dependency-vulnerabilities.md`.

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

Per `~/.claude/rules/common/secrets-management.md`.

## Required tooling

```bash
bundle audit check --update
brakeman --no-pager
rubocop --enable-pending-cops
rspec --fail-fast
```

## Cross-references

- `~/.claude/rules/common/security.md`
- `~/.claude/rules/common/secrets-management.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/ruby/no-discards.md`
- `~/.claude/rules/ruby/coding-style.md`
- OWASP Ruby on Rails Cheat Sheet
- Rails Security Guide

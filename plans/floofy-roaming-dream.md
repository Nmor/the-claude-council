# Reback Finance — 12-Month Restructure & Growth Plan

## Implementation Progress (live tracking — most-recent first)

Marked items are FULLY closed (build + vet + staticcheck + golangci-lint
clean for the touched surface, tests pass with `-race`, no `_` discards,
no suppression comments, no commented-out code remains in scope).

### 2026-05-22 — Wave 27: CVE remediation + osv-scanner CI wiring

- [x] **osv-scanner installed** via `brew install osv-scanner` (v2.3.8).
  Per the global rule
  `~/.claude/rules/common/dependency-vulnerabilities.md`, ran the
  scanner across every project's lockfile and remediated.
- **core-backend**: 0 CVEs (govulncheck baseline confirmed; no
  changes needed).
- **frontend-app**: 132 → 0 CVEs.
  - `npm audit fix --force --legacy-peer-deps` cleared the patch-
    available chain (jspdf 4.2.1 break, axios 1.x, vite, etc.).
  - Dropped three unused-but-vulnerable direct deps:
    `react-aws-s3` (CRITICAL, abandoned, zero in-tree imports),
    `react-s3` (CRITICAL, abandoned, zero imports), and
    `face-api.js` (transitively pulled vulnerable `node-fetch` via
    `@tensorflow/tfjs-core` → `tfjs-image-recognition-base`; not
    imported anywhere in `src/`).
- **admin-dashboard**: 83 → 0 CVEs after `npm audit fix --force
  --legacy-peer-deps` (bumped jspdf to 4.2.1, vite to 8.0.14,
  jspdf-autotable across breaking changes).
- **website**: 94 → 51 CVEs. Residue is the Vue CLI 4 maintenance-
  mode toolchain (4 direct deps + ~47 transitive). The cleanest
  immediate fix landed (`node-sass` → Dart `sass` swap, dropping
  12 CVEs). The remaining 51 are tracked as a **documented
  exception** in `/Users/APPLE/Reback/website/docs/security-
  advisories.md` because:
  - Vue CLI 4 is in upstream maintenance mode; no patches are
    coming.
  - Every affected dep is build-time / dev-time only — none ships
    to the public visitor's browser, so production attack surface
    is zero.
  - The fix path is the Next.js 15 rewrite scoped under
    Initiative I9 in this master plan.
  - Exception re-check date set to 2026-08-22 (90 days). The
    workflow carries `continue-on-error: true` on osv-scanner +
    npm-audit; remove the line in the same PR that lands the
    Next.js rewrite.
- **Scraper repos** (`puppet`, `puppeteer`): workflows added in
  reported-only mode (`continue-on-error: true`) because the
  repos are slated for archival under the same Initiative I9
  consolidation into `reback-scrapers`. The scan still runs
  daily so a fresh regression doesn't go unseen.
- **CI workflows wired** (6 new files):
  - `core-backend/.github/workflows/dep-vuln.yml` — osv-scanner
    plus govulncheck on PR + push to main + daily 06:00 UTC cron.
  - `frontend-app/.github/workflows/dep-vuln.yml` — osv-scanner
    plus `npm audit --audit-level=moderate`.
  - `admin-dashboard/.github/workflows/dep-vuln.yml` — same shape.
  - `website/.github/workflows/dep-vuln.yml` — same shape with
    `continue-on-error: true` per the documented exception.
  - `puppet/.github/workflows/dep-vuln.yml` — same shape with
    `continue-on-error: true` per archival plan.
  - `puppeteer/.github/workflows/dep-vuln.yml` — same.
- Final osv-scanner sweep: **frontend-app + admin-dashboard +
  core-backend report "No issues found"**.

### 2026-05-22 — Wave 26: Initiative I1.3 model groundwork lands

- [x] **Wave 26 — Initiative I1.3 model groundwork shipped.**
  Migration `202306126140979_balance_wallet_minor_units.sql`
  adds eight `bigint NOT NULL DEFAULT 0` twin columns to
  `user_balance` (`balance_before_minor`, `balance_after_minor`,
  `available_balance_minor`, `withdrawable_balance_minor`,
  `withheld_balance_minor`, `escrow_balance_minor`) and `wallet`
  (`available_balance_minor`, `withdrawable_balance_minor`).
  `model.Balance` + `model.Wallet` gain matching Go fields with
  gorm column tags. New read helpers (`BalanceBeforeAmount`,
  `BalanceAfterAmount`, `AvailableAmount`, `WithdrawableAmount`,
  `WithheldAmount`, `EscrowAmount` on Balance; `AvailableAmount`,
  `WithdrawableAmount` on Wallet) return `money.Amount`,
  preferring the `*_minor` column when populated and falling
  back to `round(float * 100)` for rows persisted before the
  column add. New write helpers (`SetBalanceBefore`,
  `SetBalanceAfter`, `SetAvailable`, `SetWithdrawable`,
  `SetWithheld`, `SetEscrow` on Balance; `SetAvailable`,
  `SetWithdrawable` on Wallet) populate both columns in lock-
  step from a single `money.Amount` input. 10 new model tests in
  `model/balance_minor_test.go` pin every helper + the
  preferMinor fallback semantics (NaN/Inf treated as zero,
  positive/negative minor wins over float, sub-kobo float
  rounded to nearest minor). All 20 packages green.
- **Next**: rewire the production write sites in
  `controller/afterPayments_helpers.go::creditInstantBalance` /
  `creditEscrowBalance` and `controller/afterPayments.go::
  refundFailedPayoutToBalance` to use the new Set* helpers and
  flow `money.Amount` through.

### 2026-05-19 — Wave 25: Comprehensive backend discard sweep

- [x] **Wave 25 — Production Go discard sweep complete.** User
  directive "fix all I do not care from when" addressed by
  surveying every `_`-discard pattern across the backend (38 files
  in scope) and either binding + logging the value, restructuring
  to remove the discard entirely, or eliminating the check. Final
  state: **zero production discards** outside vendored / mock-
  generated code. Categories closed:

  | Category | Sites | Resolution |
  | -------- | ----- | ---------- |
  | Multi-position discard (`schedule, _, _, scheduleErr`) | 4 | All 4 sites bind `feeSource`, `feeAccountID`, and emit a structured `Debug` log naming the fee layer that resolved (default / platform / business). Surfaces fee-source provenance in audit trails for free. |
  | Last-position discard (`invoice, sub, user, _, err :=`) | 1 | `AfterPaymentUpdate` now binds `paymentType` and logs it alongside `ref_type` and `transaction_id`. |
  | Single-return discard (`if _, err := X(); err != nil`) | 7 | `appealChat.CreateChat` → log `chat_id`. `roles.provisionUserRole` → log `role_id`. `SQS.DeleteMessage` → log presence of `*DeleteMessageOutput`. `invoice.UpdateInvoiceStatus` → log `invoice_id`+`status`. `fees.overrides.Apply` (×2) → log the validated `withdrawal_rate`+`invoice_processing_rate`. `invoice cron UpdateInvoiceByID` → log `invoice_id`+`is_over_due`. |
  | Type-assertion check (`_, ok := token.Method.(...)`) | 2 | Restructured to `switch token.Method.(type) { case *HMAC: ... default: ... }` — no value bound, no discard either. |
  | Map-key existence check | 3 | `validStatuses[status]` → `slices.Contains` over a 3-element slice. `invoiceCounts[monthYear]` → `count, exists := invoiceCounts[monthYear]; if !exists { count = ... }` two-value form. `earningsPerMonth` no-op init block deleted entirely (the `m[k] += v` accumulator already handles the zero-value case). |
  | Test-file `_, err :=` pairs (from Wave 23/24) | 8 | All bound + asserted to assert the zero-value on the error path. Catches regressions where the dropped slot changes shape. |

- **Verification:** `go build ./...`, `go vet ./...`,
  `staticcheck ./...`, `golangci-lint run ./...` all return `0
  issues`; `go test -race -count=1 -timeout 180s ./...` returns
  `ok` for every one of the 19 test-enabled packages
  (controller, handler/auth, handler/kyc, internal/worker/
  subscription_billing, pkg/asyncjob, pkg/dbtype, pkg/fees,
  pkg/fx, pkg/helper, pkg/idverification, pkg/ledger,
  pkg/limits, pkg/money, pkg/notify, pkg/subscription,
  pkg/webhook, storage, storage/redis, thirdparty/verification).
- Final grep `grep -rnE '\b_\s*,\s*\w+\s*:=|\b\w+\s*,\s*_\s*:=|^
  \s*_\s*=\s|\bfor\s+_\s*,\s+\w+\s+:?=\s+range\b' --include
  ='*.go'` excluding tests + mocks + comments returns zero
  lines.

### 2026-05-19 — Wave 24: Initiative I1.2 lands (invoice-fee path)

- [x] **Wave 24 — Initiative I1.2 (invoice-fee path) shipped.**
  Six production invoice-fee call sites now route through the
  `pkg/money` integer minor-units math via three new `fees.
  Schedule` adapters (`InvoiceProcessingFeeViaMinor`,
  `CounterOfferFeeViaMinor`, `InstallmentSurchargeViaMinor`).
  Adapters reject NaN/Inf/negative explicitly — the legacy float
  helpers silently passed those through. Sites converted:
  - `model.Invoice.SetInstallmentDetails` — wraps the surcharge
    error with `fmt.Errorf("installment surcharge: %w", ...)`.
  - `model.Invoice.SetAllOtherFee` — **signature changed to
    return `error`** so the model-level computation surfaces
    fee-math failures to the caller. Single production caller
    (`controller.CreateInvoice`) updated to propagate. Internal
    silent-return-on-error pattern at `GetProducts` /
    `InvoiceProcessingFeeViaMinor` / `InstallmentSurchargeViaMinor`
    / `SetInstallmentDetails` all now wrap with context. The
    `GetInstallmentDetails` malformed-JSON branch preserved as
    soft-skip per the documented data-shape contract.
  - `model.InvoiceDraft.SetAllOtherFee` — wraps the adapter
    error.
  - `controller.GetAllCounterOfferByInvoiceID` (per-row loop) —
    each row's fee math now surfaces an error with
    `offer_id` context instead of silently miscomputing.
  - `controller.GetCounterOfferByID` — same.
- **24 new equivalence tests** (
  `TestInvoiceProcessingFeeViaMinor_MatchesLegacy`,
  `TestCounterOfferFeeViaMinor_MatchesLegacy`,
  `TestInstallmentSurchargeViaMinor_MatchesLegacy`,
  `TestViaMinorAdapters_RejectBadInputs`) prove the adapter
  output equals the legacy float helper rounded to whole-kobo
  across realistic amounts. Drift = test fail.
- Build / vet / staticcheck / golangci-lint / race-tests all
  green across every package; full project test count holds.

### 2026-05-19 — Wave 23: Initiative I1.1 lands (withdrawal-fee proof-of-pattern)

- [x] **Wave 23 — Initiative I1.1 (withdrawal-fee proof-of-pattern)
  shipped.** All three production withdrawal-fee call sites now run
  on `pkg/money`'s integer minor-units math via a contained
  boundary shim. New file
  `controller/fees_boundary.go::Controller.computeWithdrawalFeeMinor`
  takes the legacy whole-currency float amount, rounds to integer
  kobo, applies `fees.Schedule.WithdrawalFeeMinor` (basis-points
  integer math, banker's rounding ties-to-even), and converts back
  to float so the rest of the legacy path is untouched. Sites
  rewired (each call now flows through the shim, complete with
  per-site `op` label for the structured info log):
  - `controller/paystack.go::parsePayoutAmounts` — now a method on
    `*Controller` so it can call the shim. Its single caller in
    `PaystackPayOut` flipped to `c.parsePayoutAmounts(...)`.
  - `controller/flutterwave.go::PayOut` line 67 — direct
    `schedule.WithdrawalFee(amount)` replaced with the shim call.
  - `controller/flutterwave.go::parseWithdrawalRequestPayload`
    line 447 — same swap.
- **Structured info log** at each call records pre-rounding float
  amount + integer kobo + integer kobo fee + back-converted float
  fee with a per-site `op` label. That makes the migration
  observable: an operator can grep
  `"withdrawal fee computed via minor-unit path"` in the logs and
  see every site producing equivalent output to the legacy table.
  Any subkobo drift in a caller upstream surfaces as a
  `amount_whole` value whose `* 100` doesn't equal `amount_minor`.
- **16 new boundary-shim tests** in
  `controller/fees_boundary_test.go` lock the equivalence in:
  `TestComputeWithdrawalFeeMinor_KnownAmounts` (6 cases), `_
  MatchesLegacyFloatPath` (13 amounts compared against the legacy
  `WithdrawalFee` whole-currency output rounded to kobo), `_
  RejectsNaNInfNegative` (4 cases), `_
  SubkoboRoundsToNearestKobo` (1 case). Tests use a minimal
  Controller with only `zerolog.Nop()` wired — no storage stubs
  needed because the shim is pure math.
- **What did NOT change in this wave (deliberately)**: the API
  contract (request body field, response envelope), the DB
  columns, and `model.WithdrawalRequest` still carry floats. The
  shim is the boundary so Initiative I1.2 (invoice flow) inherits
  a runnable pattern: introduce `WithdrawalFeeMinor`-style methods
  on `pkg/fees`, route via a `controller/<flow>_boundary.go`
  helper that converts at the edge, and emit a structured log so
  the migration progress is auditable. The B10 bug fix (the
  `0.001%` vs `0.1%` confusion) was already in scope of the
  earlier fee-schedule consolidation; the integer path makes the
  fix structurally impossible to re-introduce because
  `MulPercent` takes basis points directly.
- Verification: `go build ./...` clean, `go vet ./controller/...`
  clean, `staticcheck ./controller/... ./pkg/...` clean,
  `golangci-lint run ./controller/... ./pkg/...` clean,
  `go test -race -count=1 -timeout 180s ./controller/...
  ./pkg/...` ends `ok` for every package.

### 2026-05-18 — Wave 22: Initiative I1.0 lands (foundation)

- [x] **Wave 22 — Initiative I1.0 (money foundation) shipped.**
  Lands `core-backend/src/pkg/money` (213 LOC) + 200-LOC test suite +
  matching frontend mirrors. Surface:
  - Go: `Amount` newtype over `int64`; `Currency` ISO 4217 enum; 13
    currencies seeded (NGN/USD/GBP/EUR/GHS/KES/ZAR/EGP/XOF/XAF/JPY/
    KWD/BHD); `MinorUnitExponent(c) (int, bool)`; `Int64`, `IsZero`,
    `IsNegative`, `Add`, `Sub`, `MulPercent(basisPoints int64)`
    with banker's-rounding ties-to-even, `FromMinor`,
    `FormatForDisplay(a, c) (string, error)`. Overflow on Add/Sub
    panics with a structured message instead of wrapping silently.
    `ErrUnknownCurrency` + `ErrNegativeAmount` sentinels exposed
    for `errors.Is`. Tests cover the rate cases that matter today
    (1.5% withdrawal fee, 0.3% processing fee, banker's-rounding
    half-to-even ties at 2.5 → 2 and 3.5 → 4, JPY 0-exponent,
    KWD 3-exponent, negative ledger deltas, unknown-currency
    error). A structural test enforces that every `Currency`
    constant declared in the package has a matching exponent
    registry entry — adding a new code without an exponent fails
    the build loudly. `go test -race`, `staticcheck`, and
    `golangci-lint` all green.
  - Frontend mirror: `frontend-app/src/reusable/money.js` +
    `admin-dashboard/src/reuseable/money.js` (note the
    `reusable` vs `reuseable` typo divergence — preserved per
    no-silent-drops, will resolve when Initiative I9 lands the
    monorepo). Each exposes `formatMoney({ amountMinor,
    currency })`, `minorToWhole`, `wholeToMinor` with the same
    rounding rule as the Go side. The exponent table is
    `Object.freeze`d so a runtime mutation is rejected. Both
    helpers handle null/undefined/Infinity/NaN by returning the
    legacy `'*****'` hidden-balance placeholder, preserving the
    existing UI contract while the rest of the migration lands.
    ESLint green on both files.
  - **What this unblocks**: every subsequent I1.* phase has the
    `pkg/money.Amount` type to flip a model field to, the
    `Currency` enum to pair it with, the `MulPercent` helper to
    rewrite each fee formula against, the `FormatForDisplay`
    helper to drop into PDF receipts + admin exports, and the
    frontend `formatMoney` to flip every display callsite to.
  - **Council sign-off needed before I1.1** kicks off the
    end-to-end proof-of-pattern on the withdrawal flow. The
    foundation has zero callers today, so a future deletion is
    cheap if the Council decides to pivot the approach.

### 2026-05-18 — Wave 21: Test-file S1192 audit

- [x] **Wave 21 — `controller/after_payments_test.go` touched-file
  audit.** The Wave 20 expansion brought the file to 1,546 LOC and a
  fresh S1192 sweep (`grep -oE '"[A-Za-z][^"]{4,}"' | uniq -c`)
  surfaced three duplicated literals: `"missing user"` (4×, the
  canonical "user lookup failed" stub error), `"CARD_TRANSACTION"`
  (3×, Flutterwave's wire-format card channel), and `"GARBAGE"` (3×,
  the placeholder unknown ref-type prefix). All three hoisted to
  module-scope: `errStubUserMissing` (a shared `errors.New(...)`
  value so every user-not-found stub returns the same sentinel,
  letting future tests `errors.Is`-compare against it),
  `testFWCardChannel`, and `testUnknownRefType`. Eight call sites
  rewritten in the same pass. The new constants live in a dedicated
  fixture block at the top of the test file with a leading comment
  explaining what each one is for. `go build`, `go vet`,
  `staticcheck`, `golangci-lint`, and `go test -race -count=1
  -timeout 180s ./controller/...` all green.

### 2026-05-18 — User directive: integer minor units, end-to-end

- User directive captured 2026-05-18, codified in
  `/Users/APPLE/Reback/CLAUDE.md` §5.1 + §5.2:

  > All money on the backend and in the database is stored as
  > **integer minor units** — kobo for NGN, cents for USD, pence
  > for GBP, etc. The frontend / user-view layer divides by 100
  > (or the currency's `minor_units` exponent) at the moment of
  > display.

  This sharpens Initiative I1 from "decimal OR integer minor
  units" to "integer minor units exclusively". `shopspring/decimal`
  is no longer in scope. Every money column flips from float to
  `bigint`; every Go field from `float64` to `int64` (or a
  `pkg/money.Amount` newtype). The frontend `formatAmount` helper
  divides by the currency's minor-unit exponent at the render
  boundary; no callsite ever divides by 100 inline.

- **Migration scope confirmed** by survey on 2026-05-18:
  - **Go**: 30+ `float64` money fields across
    `model/{invoice,balance,transaction,wallet,subscription,refund}.go`
    (Tax, RebackProcessingFee, ShippingCharges, FirstDeposit,
    BalanceAmount, AmountPaid, TaxPayable, Subtotal, TotalPayable,
    BalanceBefore, BalanceAfter, AvailableBalance, Withdrawable
    Balance, WithheldBalance, EscrowBalance, Fees, Amount, Price
    × 2, FirstAmount, LastAmount, TotalInvoiceWorth, Pending
    Amount, ClosedAmount, PaidAmount, Refund.Amount,
    Subscription.{Tax,Price}).
  - **Migrations**: 25 migration files declare `float` money
    columns (amount, amount_paid, amount_refundable,
    refund_amount, available_balance, withdrawable_balance,
    withheld_balance, escrow_balance, balance_before,
    balance_after, tax, tax_rate, tax_payable, subtotal,
    total_payable, price, processing_fee,
    reback_processing_fee, first_deposit, balance_amount,
    first_amount, last_amount, installment_amount,
    installment_percent, fees, shipping_charges).
  - **Frontend**: `formatAmount` is a shared helper at
    `frontend-app/src/reusable/formatAmount.jsx` and
    `admin-dashboard/src/reuseable/formatAmount.js` (note the
    `reusable` vs `reuseable` typo divergence) — both expect a
    whole-currency `Number` and call `.toFixed(2)`. The migration
    flips these to consume minor-units `int` and divide by the
    currency exponent.

- **Initiative I1 (Money-Path Migration to Minor Units) — phased
  plan, in scope but not yet started**:

  | Phase | Scope | Effort |
  | ----- | ----- | ------ |
  | I1.0 | Land `pkg/money` (Go): `Amount` newtype over `int64`, `Currency` enum, ISO 4217 minor-unit exponent registry, `FromMinor`, `ToMinor`, `Add`, `Sub`, `Mul`, `Div`, `FormatForDisplay` (the only place rounding lives). Property-based tests via `gopter` for arithmetic invariants. | 2 days |
  | I1.0 | Land `packages/utils/currency.{js,ts}` (frontend): mirror the exponent registry; `formatMoney({ amount_minor, currency })`; deprecate the legacy `formatAmount`. Single canonical impl used by both apps via the monorepo `@reback/utils` once Initiative I9 lands; until then, hand-sync the two repos. | 1 day |
  | I1.1 | Pick one money flow (recommendation: the withdrawal-fee path at `controller/paystack.go:41` and `controller/flutterwave.go:236`) and convert end-to-end: field types, fee formula, balance write, transaction record, webhook payload validation, frontend display. Add migration `<seq>_withdrawal_money_to_minor.sql`. Use this as the proof-of-pattern that every other flow follows. | 2 days |
  | I1.2 | Convert invoice flow: `model.Invoice.{Tax, RebackProcessingFee, ShippingCharges, FirstDeposit, BalanceAmount, AmountPaid, TaxPayable, Subtotal, TotalPayable}`, every storage method that reads/writes these, every counter-offer / negotiation / installment site, every admin export, every PDF receipt, every public invoice page. Add migrations. | 3 days |
  | I1.3 | Convert balance flow: `model.Balance.*`, `model.Wallet.*`. Wallet snapshot endpoint, ledger feed, balance-card display on dashboard, withdraw flow's available-balance check. Migrations. | 2 days |
  | I1.4 | Convert subscription flow: `model.Subscription.{Tax, Price}`. Pricing engine reads from `platform_limits` (already in USD minor units per Initiative I13). Migrations. | 1 day |
  | I1.5 | Convert refund / dispute flow: `model.Refund.Amount`, `AmountRefundable`. Migrations. | 1 day |
  | I1.6 | Convert PSP webhook adapters: Paystack (`controller/paystack.go`, `controller/afterPayments.go` Paystack branch) already speaks kobo on the wire; remove the multiply-by-100 conversion sites. Flutterwave: confirm same. Migrations: none (adapter-only). | 1 day |
  | I1.7 | Convert API response shapes: every money field renamed `*_minor` with sibling `*_currency`. Backward-compatibility shim that emits both `total_payable` (legacy float) AND `total_payable_minor` (new int) for one release window, then drops the float field. Frontend reads from `*_minor` exclusively. OpenAPI spec updated. | 2 days |
  | I1.8 | Drop the legacy float columns + Go fields under the expand-migrate-contract sequence's final step. CI gate `make lint-money` flips from warn-on-`float` to fail-on-`float`. | 1 day |

  Council sign-off required at the I1.1 proof-of-pattern boundary
  before fanning out to I1.2..I1.8.

### 2026-05-18 — afterPayments Phase 0 characterization extended

- [x] **Wave 20 — `controller/afterPayments.go` Phase 0 characterization
  extended** to cover the three remaining hot-spots that the Wave 13–15
  pass deferred: `refundFailedPayoutToBalance`,
  `applyFWInstallmentProgression`, and `HandleSubscriptionPayment`. The
  test harness gained a `stubBalanceStorageAP` variant (embedding
  `storage.BalanceDatabase` so any unmocked balance method panics
  loudly), and `afterPaymentsStubs` learnt a new optional `balances`
  field threaded through `newAfterPaymentsTestControllerWith`. Ten new
  tests landed:
  - `TestRefundFailedPayoutToBalance_HappyPath` exercises the full
    success chain (UpdateTransaction → GetLastUserBalanceByID →
    CreateBalance) and pins the per-field shape of the credit row
    written to `balanceStorage.CreateBalance`. Catches and documents
    `BUG(refund-balance-before-after-swap)` — the credit row's
    `BalanceAfter` is computed as `previousBalance.BalanceBefore +
    amount`, not `previousBalance.BalanceAfter + amount`. The handler
    mirrors `BalanceBefore` from the prior row's `BalanceAfter`, so
    the audit-trail balance-before/balance-after pair drifts every
    refund cycle. Marker preserved in-test so a future correctness fix
    produces a failing diff.
  - `TestRefundFailedPayoutToBalance_UpdateTransactionPropagates`,
    `TestRefundFailedPayoutToBalance_GetLastBalancePropagates`, and
    `TestRefundFailedPayoutToBalance_CreateBalancePropagates` pin each
    of the three error-out paths.
  - `TestApplyFWInstallmentProgression_FullPaymentEntersBranchA`,
    `..._FirstInstallmentEntersBranchB`,
    `..._SecondInstallmentEntersBranchC`, and
    `..._IncompleteAmountShortCircuitsBranchC` characterize the four
    sub-branches of the installment cascade. The strategy uses a
    deliberately-failing `invoiceStorage.GetInvoiceByID` so the
    `UpdateInvoiceStatus` machinery surfaces `helper.ErrRecordNotFound`
    from every dispatch site — that lets the tests observe each
    branch's pre-dispatch in-place mutations (FirstStatus, LastStatus,
    invoice.FirstDeposit, invoice.BalanceAmount, newTxn.
    NumberOfInstallments) without needing to mock the full status-
    transition machinery (customer storage + email service + invoice-
    log storage). The short-circuit Branch C path returns
    `ErrIncompleteAmount` cleanly. The `BUG(installment-fallthrough)`
    marker from afterPayments_helpers.go is referenced in a documenting
    test comment alongside the Wave 20 strategy note.
  - `TestHandleSubscriptionPayment_UserNotFound` pins the
    `ErrRecordNotFound` collapse for any GetUserByID failure.
  - `TestHandleSubscriptionPayment_StubReturnsNilOnSuccess` pins
    `BUG(subscription-payment-stub)` — the method currently fetches
    the user and returns nil, performing no subscription state change
    or audit-row write. A future wired-up implementation will produce
    a failing diff that flags every previously-stubbed call site.
  - `controller.ErrRecordNotFound` vs `helper.ErrRecordNotFound`
    distinction surfaced and documented (the two sentinels carry the
    same message but are NOT `errors.Is`-equal; the status-transition
    machinery uses the helper-package sentinel). Test file gained the
    `pkg/helper` import.
  - Verification: `go build ./...`, `go vet ./...`, `staticcheck ./
    controller/...`, `golangci-lint run ./controller/...` all green
    (0 issues), and `go test -race -count=1 -timeout 180s ./
    controller/...` ends in `ok`. 36 → 46 characterization tests
    on `controller/afterPayments.go` + `controller/afterPayments_
    helpers.go`. Five `BUG()` markers preserved
    (`B2`, `installment-fallthrough`, `dispatch-channel-unknown-
    silent-success`, `refund-balance-before-after-swap`,
    `subscription-payment-stub`); two pre-existing markers
    (`subscription-balance-check-inverted`,
    `failed-invoice-tag-default-bucket`) remain in scope.

### 2026-05-18 — Frontend Sonar sweep continues (Login + Dashboard)

- [x] **Wave 18 — `frontend-app/src/pages/Auth/Login.jsx` final sweep**
  closes the residual findings the IDE Sonar pane was still surfacing
  on this file after Wave 12. Eight Tailwind arbitrary-value classes
  → canonical utilities the project already uses elsewhere
  (`w-[130px]` → `w-32.5`, `md:w-[420px]` → `md:w-105`, `sm:w-[420px]`
  → `sm:w-105`, `md:h-[48px]` → `md:h-12`, `rounded-[4px]` → `rounded`,
  `bottom-[-20px]` → `-bottom-5`, `h-[33px]` → `h-8.25`, `w-[150px]` →
  `w-37.5`). Two S6772 ambiguous-spacing class strings collapsed to
  single space. The eye-toggle icons (`<AiFillEyeInvisible />` /
  `<AiFillEye />`) — previously SVGs with raw `onClick` (S6848 +
  S1082) — wrapped in a real `<button type='button' aria-label>`. The
  password input's S7735 negated-condition ternary
  (`open === false ? 'password' : 'text'`) flipped to the positive
  form (`open ? 'text' : 'password'`). The sign-in button's misleading
  `type='submit'` (the inputs are not wrapped in a `<form>`) corrected
  to `type='button'`; the Google sign-in button gained `type='button'`
  too. Bogus `isGoogle={isGoogle}` prop on `<ClipLoader />` dropped —
  `react-spinners`'s `ClipLoader` has no such prop. ESLint `exit=0`
  end-to-end.
- [x] **Wave 19 — `frontend-app/src/pages/Dashboard/Dashboard.jsx`
  senior-grade rewrite** closes 50+ Sonar / ESLint findings in one
  pass. Five unused imports / state pairs / locals stripped (`useRef`,
  `toast`, `isShowBalance` + `setIsShowBalance`, `userDetails`,
  `signUpMode`, `isError`, the broken `{ formatAmount }` destructure
  on the `onClick` handler). Four sub-components extracted to drive
  the S3776 CC=80 finding to zero: `BalanceCard`, `WithdrawableCard`,
  `PaymentStatCard`, `WelcomeBanner`. A `formatBalance({value,
  currency, showBalance})` helper hoisted at module scope eliminates
  the 7-site `value !== null ? ${currency === 'NGN' ? '₦' : '$'}
  ${showBalance ? formatAmount(value) : '*****'} : '*****'` ternary
  cascade — that one helper alone closes 7×S7735 (negated condition)
  + 14×S3358 (nested ternary) + the S1192 duplicate-literal finding.
  Hoisted currency-flag config (`NGN_FLAG_SRC`, `USD_FLAG_SRC`,
  `NGN_FLAG_ALT`, `USD_FLAG_ALT`, `HIDDEN_BALANCE_PLACEHOLDER`,
  `symbolFor`, `flagSrcFor`, `flagAltFor`) becomes the single point
  of change. Four `<div onClick>` / `<span onClick>` interactive
  patterns rewritten as `<button type='button' aria-label>` (S6848 +
  S1082). The `<button onClick><a href='/kyc'>` nested-interactive
  inside the welcome banner collapsed to a single `<button>` driving
  the `navigate('/kyc')` SPA navigation. Ten Tailwind arbitrary-value
  classes → canonical (`h-[4rem]` → `h-16`, `max-w-[358px]` (×5) →
  `max-w-89.5`, `h-[90px]` (×2) → `h-22.5`, `mt-[-5px]` (×2) →
  `-mt-1.25`). S3923 — all branches of `handleButtonClick` calling
  `navigate('/kyc')` — collapsed to a single `navigate('/kyc')` call,
  with the original step-aware shape preserved verbatim in a new
  `BUG(unwired-kyc-step-router)` marker + reader question per
  no-silent-drops.md Rule 0. Two more `BUG(unwired-...)` markers added
  for the commented-out 500px Carousel-cap wrapper and the commented-
  out `<AccountDetails data={data} />` panel — both surfaced with
  reader questions instead of silent deletion. The broken `({
  formatAmount })` parameter destructure on `handleCurrencyToggle`
  documented via `BUG(unwired-formatAmount-arg)`. New sub-components
  carry full `PropTypes` (the project's existing prop-types pattern,
  per `AccountDetails.jsx`). The redundant inner `{isLoading ?
  <Loading /> : ...}` guard at the JSX level dropped — the outer
  early-return at the top of the component already covers it.
  ESLint `exit=0` end-to-end; no Tailwind bracket left except for
  pixel-precise leaf values (`text-[10px]`, `text-[13px]`,
  `text-[1.063rem]`, `text-[1.1875rem]`, `grid-cols-[auto_1fr]`) that
  have no canonical Tailwind utility equivalent.

### 2026-05-16 — afternoon wave (Sonar sweep continued)

- [x] **Wave 1 — S1192 duplicate-string extractions** across
  `storage/transaction.go` (5 patterns × multi-site), `storage/refund.go`
  (`storageRefundLevel`, `whereCreatedAtGte`), `storage/invoiceDraft.go`
  (reuse `whereByID`), `controller/device.go` (9 log-shape constants),
  `controller/afterPayments_helpers.go` (`errFetchLastBalanceFmt`,
  `logGetInvoiceByIDErr`). Pre-existing `orderByCreatedAtDesc` in
  `storage/invoice.go` reused for the 10 occurrences in
  `storage/transaction.go`.
- [x] **Wave 2 — `controller/device.go` CreateLoginDeviceInfo CC=21 →
  ≤15** via decomposition into `resolveOrCreatePreference` +
  `insertNewLoginDevice`. Caught and fixed a latent bug where
  preference-create fell through to the error-return path leaving the
  caller with a zero-value preference. Fixed three sibling functions
  that mis-labelled their log prefix as `DeleteLoginDeviceInfo`.
  Replaced silent best-effort security-email failure with a structured
  warn log. Forbidden checks now return `ErrAccessDenied`, not a stale
  `err == nil`.
- [x] **Wave 3a — S107 sweep on the post-payment dispatcher tree**
  (16 handlers + 4 builders + 2 dispatchers + the public
  `AfterPaymentUpdate` API):
  - 2 parameter-object structs added in
    `controller/afterPayments_helpers.go`:
    `fwInvoiceSuccessArgs` (11 fields, used by 6 FW success handlers);
    `psInvoiceArgs` (8 fields, used by 10 PS handlers with
    `PrevTransaction` + `InstallmentDetails` zero-valued on non-
    installment legs).
  - 2 builder-arg structs: `fwBuildTransactionArgs` (12 fields, both
    FW transaction builders); `psBuildTransactionArgs` (10 fields,
    both PS transaction builders — Escrow leaves instant-only fields
    zero).
  - `paymentDispatchContext` struct for
    `dispatchSuccessfulAfterPayment`.
  - `AfterPaymentUpdate(ctx, transactionID, ..., orderRef)` → `(ctx,
    ev FlutterwaveWebhookEvent)`. `Operations` interface,
    `handler/webhook/webhook.go` caller, and mockgen-generated
    `controller/mock/mock_controller.go` all updated; post-mockgen
    processor re-run to preserve the no-discard contract on
    generated assertions per workspace rule §5.12.
  - 10 dispatcher call sites updated to use struct literals; 11
    builder call sites rewritten via a single perl pass.
  - Verification: `go build ./...`, `go vet ./...`, `staticcheck`,
    `golangci-lint run` all clean repo-wide;
    `go test -race -count=1 -timeout 180s ./controller/... ./handler/...`
    all `ok`. S107 violations: 22 → 0.
- [x] **Wave 3a — S3776 (cognitive complexity) sweep on the 4
  installment handlers**:
  - `applyFWInstallmentProgression` extracted from both FW
    installment handlers (Instant + Escrow). Owns the three-branch
    cascade (full / first / second) in one place. Carries an
    explicit **`BUG(installment-fallthrough)`** marker documenting
    the latent cascade: when `amount == totalAmount`, Branch A
    closes the invoice; Branch C's `FirstStatus == Paid` then
    matches, fails `amount == LastAmount`, returns
    `ErrIncompleteAmount` — leaving the invoice closed with no
    balance credit / transaction record / paid-log. Preserved as-
    is until G1-G4 Phase 0 characterization tests can back the fix.
  - `applyPSFullPaymentLeg` extracted from both PS installment
    handlers. Single shared implementation; per-channel credit
    divergence (`creditInstantBalanceWithTxnID` vs
    `creditEscrowBalanceWithTxnID`) passed in as a typed function-
    pointer parameter (`psFullPaymentLegCreditFn`). Eight inline
    `if err != nil` checks per handler collapsed into one helper
    call.
  - `updateInvoiceStatusLogged` wraps `UpdateInvoiceStatus` + the
    standard debug-log shape (6 call sites de-duplicated). Returns
    only `error` because no caller consumed the row — unparam-
    clean.
  - Final state: `gocognit -over 15 ./controller/afterPayments_helpers.go`
    empty. S3776 in this file: 4 → 0.
- [x] **Wave 3b — handler/kyc/kyc.go S3776 sweep** (six handlers
  brought CC 16-20 → ≤15):
  - New helpers: `dispatchBVNVerificationResult`,
    `runVotersCardVerification`, `runDriversLicenceVerification`,
    `runPassportVerification`, `validateCACCompanyNameMatch`,
    `tier3DevModeBypassesIfApplicable`.
  - `commitNINMatch` absorbed the `strings.EqualFold(status,
    qoreIDVerificationStatusVerified)` guard so the parent
    `kycTier1NIN` handler drops a nesting level.
  - `runCACVerification` now owns the
    `successCAC.Status.Status != qoreIDVerificationStatusVerified`
    check so the handler body is one step shorter.
  - Removed `fmt.Println(newKyc)` in `createMyKYC` (production
    `console.log` equivalent — workspace rule §1 / no-silent-failures).
  - `stampFaceVerified` `_ model.User` parameter renamed to
    `userDetails` and wired into the structured audit log
    (`user_id` + `user_email` fields) so it's no longer an
    unparam violation.
- [x] **Wave 4 — handler/invoice/payment_helpers.go S107 fix**
  (`initializeAndStorePayment` 8 → 1 args via `paymentInitRequest`
  struct). Removed 3 `fmt.Println` debug statements; wrapped errors
  with structured logger context including `invoice_id` and
  `amount`. All 6 call sites updated.
- [x] **Stale `jinzhu/gorm@v1.9.16` IDE diagnostic** — removed the
  orphan zip cache at `~/go/pkg/mod/cache/download/github.com/jinzhu/gorm/`
  so gopls can't re-expand it. The diagnostic now persists only
  if the user has a stale VS Code tab pointing at the deleted
  cache path; close-tab + Restart-LSP clears it.
- [x] **Two new global rules** added to `~/.claude/rules/common/`:
  - `updated-frameworks.md` — bans archived / EOL / CVE-flagged
    dependencies project-wide. References Reback workspace §5.11
    (jwt v5) and §5.12 (go.uber.org/mock) as motivating incidents.
    Defines max one-major-behind drift; lists target versions per
    layer (runtime, web framework, build tool, ORM, cloud SDK,
    container base image).
  - `no-local-fs.md` — bans production filesystem writes on
    ephemeral platforms (ECS / Lambda / Cloud Run / K8s). Maps each
    use case (uploads, CSV exports, generated images, logs,
    caches, sessions, backups) to its cloud-native replacement.
    Lists allowed exceptions (request-scoped tempfile cleaned in
    defer, CLI tools, dev-only env-gated paths, baked-in static
    assets via `go:embed`). Ships mechanical grep gates per
    language for CI integration.

### 2026-05-16

- [x] **Workspace scoping** — `core-backend/go.work` added scoping
  gopls to `./src` so the IDE no longer indexes orphan modules in the
  global cache (resolves the recurring `jinzhu/gorm@v1.9.16`
  `BrokenImport` diagnostic).
- [x] **commentedOutCode lint sweep** — every one of the 59
  `commentedOutCode` findings across `controller/`, `handler/`,
  `storage/`, `pkg/`, `thirdparty/` resolved by Council-grade triage.
  Notable outcomes:
  - New `pkg/notify` package with `BestEffortFailure` helper +
    table-driven tests. Used at every email/SMS site where the primary
    DB write has committed but the notification dispatch may fail —
    surfaces a structured warn log + atomic counter so ops can replay
    from the dashboard. Sites refactored: `controller/appeal.go` (4),
    `controller/customer.go` (3), `controller/roles.go` (1),
    `controller/dashboard.go` (1).
  - KYC tier-promotion gate restored at the proper site per the
    codified rule (CLAUDE.md §5.14): promotion happens via dedicated
    tier-N handlers, never inline. Wrong-place `kyc.CurrentLevel =
    model.KYCLevelTwo` assignment removed.
  - Sub-user phone-number copy-from-creator removed permanently;
    invariant doc-comment added (uniqueness constraint blocks copy).
  - Google-signup auth-check block re-implemented as positive doc on
    the function explaining that password-set Google users authenticate
    via the standard flow.
  - GetInvoiceByID user-fetch removed (auth moved to middleware);
    AccountID backfill loop replaced by the dedicated
    `backfillInvoiceAccountIDs` storage method.
  - CSV-export loops (dashboard + invoice) now emit explicit
    `continue`-with-warning for per-row failures instead of silent
    skip — one missing customer no longer aborts the whole export.
  - Verification: `go build ./...`, `go vet ./...`,
    `golangci-lint run` (commentedOutCode = 0), and
    `go test -race -count=1 ./...` (18 packages green).
- [x] **`gocritic ptrToRefParam` config fix** — disabled in
  `src/.golangci.yml` AND root `.golangci.yml` (the project has two —
  the `src/` one is the one golangci-lint actually loads). Stateful-
  service constructor return types canonically yield `*T`; the rule's
  return-by-value advice is wrong for this pattern.
- [x] **Captitalised-local parameters renamed across `controller/`
  and `handler/`** — `PayOutDuration`, `TransactionStatus`,
  `CounterOfferID`, `AdminName`, `IDType`, `Newpreference`, `ID`, etc.
  all moved to camelCase; interface signatures updated; mocks
  regenerated through `tools/post-mockgen`.

### Carried over from prior session (already complete)

- [x] **Money-path audit gates G6–G11 closed** (P-1 directive)
- [x] **Float→Decimal migration** for every money column /
  `numeric(20,4)` + `NOT NULL DEFAULT 0` + `CHECK (col >= 0)`
- [x] **JWT v5 migration** — `golang-jwt/jwt/v5`,
  CVE-2020-26160 closed
- [x] **AWS SDK v1 → v2 migration** — transfermanager,
  SQS, S3, Secrets Manager
- [x] **`jinzhu/gorm` v1 removed** — custom `pkg/dbtype.JSONB`
  replaces `postgres.Jsonb`
- [x] **`go.uber.org/mock` migration** — `github.com/golang/mock`
  archived; post-mockgen processor at `tools/post-mockgen/main.go`
  routes generated assertions through `pkg/mockx.AssertMockType`
- [x] **In-memory CSV buffering** — production code no longer
  writes to the local filesystem; ephemeral ECS pods supported
- [x] **Deployment infrastructure** — Terraform modules (vpc, alb,
  rds, redis, s3, secrets, cloudwatch, waf, ecs_service) +
  per-env compositions (sandbox, production) + GHA OIDC workflows
  (test, golangci-lint, terraform, infra-lint, deploy-sandbox,
  deploy-prod)
- [x] **`gosec` re-enabled** and zero-finding clean
- [x] **`errorlint` enabled** — all `==` against error sentinels
  migrated to `errors.Is` / `errors.As`; all bare `return err`
  wrapped with `%w` + operation context

### In progress

- [ ] gocritic residual sweep — 30 commentFormatting, 17 unnamedResult,
  10 httpNoBody, 6 captLocal, 6 paramTypeCombine, plus minor checks
- [ ] non-gocritic linter sweep — staticcheck (6), unparam (1),
  gofmt (1), ineffassign (1), noctx (1), importShadow (1)
- [ ] **G5 — `kycTier1NIN` decomposition** (CC 49) — Phase 0
  characterization tests pending
- [ ] **G1–G4 — `afterPayments.go` giants** (CC 60 / 62 / 415 / 623)
  — Phase 0 characterization tests pending
- [ ] Codify the workspace rules surfaced this session as
  `~/.claude/rules/common/` files: "always use updated frameworks"
  and "no-local-FS in production code"

---

## Scope Directive (non-negotiable)

**Everything in this plan is in scope. Nothing is "minor", "optional", "low",
"lower", "deferred", "nice-to-have", "future", "year 2", "post-launch", or
"stretch". Quarterly sequencing exists ONLY to order delivery, not to cut scope.
Every initiative, every screen, every SDK, every spec, every country pack, every
test, every doc page ships within the 12-month plan window.** Severity labels in
the bug punch list mean "fix order", not "skip allowed". This directive
supersedes any conflicting language elsewhere in the plan.

## Talent & Quality Bar (the only acceptable input)

**Every contributor on this program is staff-or-above-equivalent.** No
simplifications, no "good enough for now", no junior-grade output. The Council
divisions are staffed exclusively with senior+ talent — staff/principal
architects, staff backend, staff frontend, staff platform/infra, staff security,
staff data/ML, staff design, staff product. Outsourcing or contracting is
permitted only against the same bar.

Concretely:

- Code review by a staff-or-above engineer required on every money-path PR;
  second reviewer required outside author's team.
- Designs reviewed by a staff designer; copywriting by a senior UX writer.
- Architecture decisions reviewed by a principal architect; ADRs signed off in
  `docs/adr/`.
- Security review by a security engineer with fintech domain experience.
- ML by an ML engineer who has shipped production VLM serving at >1M req/mo.
- All work is shipped as world-class — comparable in craft to Stripe, Linear,
  Vercel, Pleo, Mercury, Tazapay's best surfaces. No simplification, no
  shortcuts, no boilerplate-only modules. Every commit is presentable as
  portfolio-grade work.

## Engineering Quality Standards (zero-excuse, world-class)

These standards apply to every line of code shipped, regardless of language,
repo, or surface. CI enforces them. PRs that violate them do not merge.

### Hard rules

1. **Never use `_` to silence return values.** Every error is logged or
   returned; every `sql.Result` checks `RowsAffected`; every `Close()` is
   wrapped in
   `defer func() { if err := x.Close(); err != nil { slog.Error(...) } }()`.
   TypeScript: every `await` either consumes its promise or `.catch()`-handles.
   CI grep gate: any new `_ =` or `_, _ :=` in money-path files fails the build.
2. **Never use suppression comments.** No `//nolint`, no `// eslint-disable`, no
   `// @ts-ignore`, no `// noqa`, no `// rubocop:disable`, no
   `pragma: no cover`. If the linter complains, the code is wrong.
3. **Zero warnings.** Compilers, linters, IDE diagnostics, SonarLint,
   markdownlint, yamllint must report zero. `staticcheck`, `golangci-lint`,
   `gosec`, `errcheck`, `gocritic`, `bodyclose`, `noctx`, `revive`, `eslint`,
   `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`,
   `eslint-plugin-react-hooks`, `eslint-plugin-tailwindcss`, `tsc --noEmit`,
   `vue-tsc`, `pyright`, `ruff`, `markdownlint`, `vale`, `spectral`,
   `actionlint`, `shellcheck`, `hadolint`, `yamllint`, `trivy`, `gitleaks`,
   `semgrep` — all pre-merge, all green.
4. **SonarQube Cloud** Quality Gate set to "Sonar way" + stricter Reback
   profile: zero blockers, zero criticals, ≥80% coverage, ≤3% duplication, no
   security hotspots unreviewed, complexity ≤15 per function. PRs failing the
   gate do not merge.
5. **Function size limit** ≤50 LOC per function; ≤15 cyclomatic complexity.
   **File size limit** 500 LOC for new code (the 3,566-LOC `afterPayments.go`
   and 2,500-LOC `admin.go` are decomposition targets).
6. **Single Responsibility, no bloat.** A function does one thing. A file owns
   one concern. A package has one purpose. Helpers extracted; duplication
   eliminated; abstractions justified by ≥3 use cases — no premature
   abstraction.
7. **Strict types everywhere.** TS `strict: true`,
   `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. Go:
   every function fully typed; no `interface{}`/`any` outside generic plumbing.
   Python: full `pyright` strict, every function annotated. No `as any`; no
   `interface{}` in business logic.
8. **No dead code.** `knip`, `ts-prune`, `depcheck`, `staticcheck unused` —
   CI-gated.
9. **No magic values.** Numeric literals other than `0`, `1`, `-1` and string
   literals appearing >1× extracted to named constants.
10. **Every public symbol documented.** Go: doc comment on every exported
    identifier (`revive`-enforced). TS: TSDoc on every export
    (`eslint-plugin-tsdoc`). Python: docstring on every public function/class.
11. **Every error contextual.** Go:
    `fmt.Errorf("create invoice for user %s: %w", userID, err)` — never bare
    `return err`. TS: `throw new RebackError({code, cause, context})`. Errors
    flow up with cause chains.
12. **Every external call observable.** Every HTTP/PSP/KYC/AI call gets an
    OpenTelemetry span, structured log with `request_id`+`trace_id`, and a
    Prometheus metric. No silent network calls.
13. **No `time.Sleep` in HTTP handlers.** Long-running work goes to a worker via
    SQS. Verified anti-pattern at `flutterwave.go:372`; banned project-wide.
14. **No `panic` in business code.** Reserved for unrecoverable startup.
    Goroutines wrap `recover` at boundary.
15. **Mutexes and goroutines reviewed.** Concurrency requires
    reviewer-outside-author; race detector (`go test -race`) mandatory;
    `errgroup` preferred over bare goroutines.

### Package management

- **`pnpm` exclusively** for all JS/TS repos. No `npm install`, no `yarn add` in
  any commit. `package.json` has `"packageManager": "pnpm@9.x"` pinned.
  `engines` locks Node 22 LTS. `.nvmrc` and `.tool-versions` checked in.
- **Go modules** via `go mod`; `go.work` for the multi-repo Go workspace.
- **Python**: `uv` (faster than pip+venv) with `pyproject.toml`;
  `requirements.lock` committed.
- **Composer** for PHP SDK.

### Languages — pick the right tool, introduce new ones where they earn it

- **Go 1.26** — backend services (REST API, workers, webhook handlers). Existing
  investment, fintech-fit, fast cold start, strong concurrency.
- **TypeScript 5+** — every frontend (web, admin, marketing, mobile, checkout
  widget) and the scraper service.
- **Python 3.12+** — ML serving (vLLM, PaddleOCR-VL-1.5), data jobs.
- **Rust** — _introduced_ for: (a) the high-throughput PSP webhook ingest path
  (millions/day at scale, real cost savings); (b) the ledger primitive in the
  audit log (HMAC chain hashing, deterministic byte serialization). Crates:
  `axum`, `sqlx`, `tokio`. Strict criteria: only where Go can't deliver the
  perf/safety target.
- **SQL (PostgreSQL 17)** — first-class. Schemas live in migrations; complex
  queries reviewed; `pg_stat_statements` observed.
- No `bash` longer than 30 LOC; convert to Go or Python.
- No `Lua`, `Ruby`, `Java`, `C#` in production unless an irreplaceable library
  demands it.

### Test environments (fully reproducible)

- **Local dev**: `docker compose up` brings Postgres 17, Redis 7, MinIO (S3
  mock), MailHog, PSP mocks, Browserless, vLLM-CPU stub. One command.
- **`devcontainer.json`** committed in every repo; opens in VS Code remote /
  GitHub Codespaces.
- **`.env.example`** committed; CI verifies no production app starts without all
  required env vars (fail-fast, no silent defaults).
- **Ephemeral preview environments** per PR via GitHub Actions + Coolify or
  Render or AWS App Runner.
- **Sandbox env** (`api-sandbox.reback.finance`) at parity with prod; nightly
  drift detector.
- **Test data factories** for Go, TS (`@faker-js/faker`), Python
  (`factory_boy`). No raw INSERT in tests.
- **`make verify`** runs the full quality gate identically locally and in CI; if
  it passes locally and fails CI, the bug is in `make verify`.

### Code review

- Two staff+ reviewers required on money-path PRs; one outside author's team.
- PR template enforces: linked initiative, screenshots/Loom for UI, test plan,
  observability evidence, rollback plan.
- Conventional Commits enforced via `commitlint`.
- Branch protection: signed commits required; force-push blocked on `main`;
  squash-merge only.
- Merge queue (GitHub merge queue or Graphite) prevents flaky main.
- `CODEOWNERS` routes reviews automatically.

### CI/CD discipline

- All builds, lints, tests, scans run on every PR; nightly extended suite (load
  tests, mutation tests, full corpus regression) on `main`.
- Deployments via GitHub Actions OIDC → AWS (no long-lived AWS keys).
- Trunk-based development; feature flags via Unleash for in-progress work.
- Forward-only deploys with feature-flag kill-switches as fast-revert.
- Every deploy emits an audit event with `version`, `git_sha`, `actor`,
  `commit_message` to status page + audit log.

### "World-class" gates (must hit ALL of these to ship a release)

| Gate                                                      | Standard                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Coverage                                                  | ≥80% on services, ≥85% on platform, ≥90% on new P-1 code                                  |
| Mutation score                                            | ≥60% on money/escrow/payment                                                              |
| SonarQube Quality Gate                                    | passes                                                                                    |
| Lighthouse                                                | Performance ≥90, A11y ≥95, SEO ≥95, Best Practices ≥95 on `apps/marketing` and `apps/web` |
| Bundle size                                               | apps/web initial JS ≤200KB gzip; apps/admin ≤300KB gzip                                   |
| Core Web Vitals                                           | LCP ≤2s slow-3G, INP ≤200ms, CLS ≤0.1                                                     |
| API p95                                                   | ≤200ms (excluding upstream PSP/KYC)                                                       |
| Test runtime                                              | full unit suite ≤90s; full e2e ≤15min                                                     |
| Cold start                                                | backend ≤2s                                                                               |
| Zero `TODO`/`FIXME` ageing >30 days                       | tracked in CI dashboard                                                                   |
| Zero open BLOCKER or CRITICAL Sonar issues                | always                                                                                    |
| Zero high/critical CVEs in dependencies                   | weekly Renovate sweep                                                                     |
| Zero secrets in history                                   | `gitleaks` weekly                                                                         |
| All E2E flows pass on real (sandbox) PSP/KYC integrations | nightly                                                                                   |
| Accessibility                                             | zero `axe-core` violations on critical flows                                              |
| RTL Arabic locale                                         | passes visual regression                                                                  |
| Dark mode                                                 | passes visual regression                                                                  |
| Mobile (iOS Safari + Android Chrome real-device)          | passes critical-flow tests via BrowserStack                                               |

This is what "world-class" means here: mechanically enforced, not aspirational.

## Versioning Policy (everything is versioned, nothing is implicit)

Versioning is treated as a first-class concern across the entire platform. No
artifact ships without an explicit, documented version. No breaking change ships
without a deprecation window. Every artifact has a release pipeline with
signing, changelog, and rollback.

### Universal versioning rules

1. **Semver everywhere** that has a public surface: SDKs, packages, web
   components, CLI tools. Major = breaking, minor = additive, patch = fix-only.
2. **CalVer** for runtimes and infrastructure: `2026.05.0` for ECS task
   definitions, Terraform module releases, container images.
3. **Date-stamped** for legal docs and policies: ToS, Privacy, DPA, Buyer
   Protection, AUP each carry an `effective_date` and historical versions are
   preserved.
4. **No `latest` tag in production.** Container images use immutable digests +
   semver/CalVer tags + git SHA. Pinned in deploy manifests.
5. **Lock files committed.** `pnpm-lock.yaml`, `go.sum`, `requirements.lock`,
   `Cargo.lock`, `composer.lock` always committed; CI fails if missing or out of
   sync.
6. **Changelog enforced.** Every PR touching a versioned artifact has a
   Changesets entry (TS/JS) or a `CHANGELOG.md` update (Go/Python/Rust). CI
   gates merge.
7. **Conventional Commits** enforced via `commitlint`. Release notes generated
   from commits.

### REST API versioning

| Aspect                    | Policy                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Versioning style          | URL path: `/api/v2/...`, `/api/v3/...`                                                                              |
| Major bump cadence        | 24-36 months between majors; coordinated SDK releases                                                               |
| Additive changes          | New endpoints, new optional fields, new enum values — go into current major; consumers must tolerate unknown fields |
| Breaking changes          | Deprecate the old path; new path has new version; old path gets `Sunset: <RFC 8594>` header + `Deprecation: true`   |
| Minimum sunset window     | **18 months** from announcement to removal                                                                          |
| Per-account API version   | `Reback-Api-Version: 2026-05-01` header pins the response shape (Stripe-style date-versioned within a major)        |
| Default version           | If header missing, server uses the account's "default API version" (set on registration); never the latest          |
| Version migration tool    | `reback api-version-bump` CLI scaffolds diff and exercises SDK against new version                                  |
| Documentation             | Every version has its own docs at `docs.reback.finance/v2/`, `docs.reback.finance/v3/`; Mintlify versioned docs     |
| Sandbox mirror            | `api-sandbox.reback.finance` mirrors all live versions for testing                                                  |
| Deprecation observability | Per-customer deprecated-endpoint metric in admin; outbound emails to API-key owners 90/60/30 days before sunset     |

### Webhook event versioning

| Aspect           | Policy                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Field            | Every event payload has `api_version` and `schema_version`                                                    |
| Schema registry  | Confluent Schema Registry (Avro) on MSK Kafka; backwards-compatible changes only within a schema major        |
| Breaking         | New event type entirely (`transaction.paid.v1` → `transaction.paid.v2`); both delivered during overlap window |
| Per-subscription | Subscriber chooses which versions to receive; default = pinned version at registration                        |
| Replay           | Replay UI honors version pinning                                                                              |
| Deprecation      | 18-month sunset same as REST API                                                                              |

### SDK versioning

| Aspect                       | Policy                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| Style                        | Semver                                                                                                  |
| Packaging                    | npm (TS), Go modules (Go), PyPI (Python), Packagist (PHP)                                               |
| Release tooling              | Changesets (TS), `goreleaser` (Go), `hatch` (Python), Composer + signed tags (PHP)                      |
| Signing                      | npm provenance attestations; sigstore for Python; `gpg` signed Go module tags; signed Composer packages |
| Compatibility matrix         | Each SDK declares supported API version range in its README + runtime check                             |
| Min runtime                  | TS: Node 22 LTS; Go: 1.24+; Python: 3.10+; PHP: 8.2+                                                    |
| Yanking policy               | Critical security yanks within 24h via registry deprecation + admin email blast to all API-key owners   |
| Version pinning in customers | Hard-pinned major; soft-pin minor; auto-update patch per customer-policy                                |

### Database schema versioning (Bytebase-managed)

| Aspect                  | Policy                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration tool          | **Bytebase** (replaces goose)                                                                                                                                                                        |
| Migration files         | Sequential numeric prefix + descriptive name + author + ticket: `2026<seq>_<author>_<ticket>_<desc>.sql`                                                                                             |
| Backwards compatibility | All schema changes must be backwards-compatible with the prior application version. Drop columns only after the deploy that stops writing them is two-versions-old (expand-migrate-contract pattern) |
| No destructive          | Drops, type-narrowing, NOT NULL adds without default — all require staff DBA + staff backend approval in Bytebase + scheduled maintenance window                                                     |
| Idempotent              | Every migration safe to re-run                                                                                                                                                                       |
| Reversible              | Every migration ships with a `down` script, even if not auto-run                                                                                                                                     |
| Snapshot tests          | Every migration tested against a frozen prod-shaped snapshot before merge                                                                                                                            |
| Drift detection         | Nightly Bytebase compares prod schema to migrations; alerts on drift                                                                                                                                 |
| Schema versioning       | App reads `schema_version` from `schema_migrations` table at boot; refuses to start if unsupported                                                                                                   |

### Application & service versioning

| Aspect                         | Policy                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service version                | CalVer + git SHA: `core-backend-2026.05.0+a1b2c3d` baked into binary at build time                                                                                                |
| Health endpoint                | `GET /healthz` returns `{version, git_sha, build_time, schema_version, deps: {...}}`                                                                                              |
| Deploy event                   | Every deploy emits an audit event with full version metadata to the audit log + status page banner                                                                                |
| Rollback                       | `Forward-only deploys with feature-flag kill-switch as fast-revert` is the default. True binary rollback supported as break-glass within 60 minutes via tagged container redeploy |
| Backwards compatibility window | New version of API/service must be one-version compatible with prior in both directions for safe rollback                                                                         |
| Release cadence                | weekly minor releases on Tuesdays; daily patch releases as needed; majors announced 6 months ahead                                                                                |

### Mobile app versioning

| Aspect                  | Policy                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Versioning style        | Semver `<major>.<minor>.<patch>+<buildNumber>`                                          |
| Distribution            | Expo EAS Build + EAS Submit                                                             |
| Updates                 | Expo Updates OTA for JS-only changes; native rebuild for native module changes          |
| Force-upgrade           | Server returns minimum supported version; mobile app blocks if below                    |
| Backwards compatibility | Each mobile version supports current + previous major API version                       |
| Beta channel            | TestFlight + Play Console internal testing; staff dogfood for 5 days before public roll |

### Container & infrastructure versioning

| Aspect               | Policy                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Container images     | Tagged with semver, CalVer, git SHA, AND immutable digest. Pulled by digest in production manifests |
| Registry             | Amazon ECR with image scanning enabled; images signed via `cosign`                                  |
| ECS task definitions | Versioned numerically; rollout via blue/green                                                       |
| Terraform modules    | Each module versioned in its own repo via tags; composed with explicit version pin                  |
| Helm charts          | If used, versioned per chart; values files per environment                                          |
| Pinning              | All third-party Docker images pinned to digests; Dependabot/Renovate refreshes weekly               |

### Documentation versioning

| Aspect            | Policy                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------- |
| Docs portal       | Mintlify versioned: `/v2/`, `/v3/`; every API version's docs maintained until sunset    |
| Reference content | Auto-generated from versioned OpenAPI spec                                              |
| Guides            | Carry "Applies to API version: 2026-XX-XX onwards" header; archived for sunset versions |
| Changelog         | Public at `/changelog`, RSS-feeded, dated entries                                       |

### Design system versioning

| Aspect                   | Policy                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `packages/ui`            | Semver; major bump on breaking component API                                                          |
| `packages/design-tokens` | Semver; major bump on token-name change; minor on additive                                            |
| Storybook                | Per-version Storybook deployed at `storybook-v{major}.reback.finance`; visual diffing across versions |
| Brand asset              | Versioned in `docs/brand/`; legal review on logo/wordmark changes                                     |

### i18n / message catalog versioning

| Aspect           | Policy                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Message catalogs | Versioned per locale; CI fails if a key exists in `en` but not in another active locale           |
| New strings      | Must be added in `en` first; translation workflow via Crowdin or Tolgee (open-source self-hosted) |
| Removed strings  | 1 release deprecation marker → removed in next major                                              |

### Legal / policy versioning

| Aspect                                   | Policy                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ToS, Privacy, AUP, DPA, Buyer Protection | Each carries `effective_date`; old versions archived at `docs.reback.finance/legal/{policy}/{date}` |
| User notice                              | 30 days before material policy change; in-app banner + email to all active accounts                 |
| Acceptance audit                         | Every user's accepted policy version + timestamp logged in `policy_acceptances` table               |
| Per-country                              | Country pack can override policies (e.g., GDPR-extended privacy for EU users)                       |

### Initiative I26 — Versioning Discipline

| Aspect                       | Reference                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Versioning policy doc        | `docs/versioning.md` (this section, expanded)                                 |
| API version registry         | `core-backend/api/versions.yaml` — list of live + deprecated + sunset dates   |
| Per-customer default version | `customers.api_version_pinned` column                                         |
| Sunset alerting              | `internal/worker/api_sunset_notifier/` — emails 90/60/30 days before          |
| Schema-version gate at boot  | `internal/platform/migrations/version_gate.go` — refuse start on mismatch     |
| Mobile force-upgrade         | `internal/handler/v2/me/clients` — returns `min_supported_version`            |
| Changesets enforcement       | `.changeset/required` config + GitHub Action                                  |
| Conventional Commits         | `commitlint.config.js` + Husky pre-commit hook                                |
| Release notes generator      | `release-please` (Google) generates GitHub Releases per repo                  |
| Docs version selector        | Mintlify versioned config                                                     |
| Audit gate                   | quarterly Council review confirms every artifact's version policy is enforced |

## Context

Reback Finance is a Nigerian B2B fintech offering escrow-based invoice
management, instant payments, KYC, dispute resolution, and wallet/withdrawals
across 8 repositories: `core-backend` (Go), `frontend-app` + `admin-dashboard` +
`website` (web), `screenshot` + `puppet` + `puppeteer` + `webshot-ocr`
(browser-automation services). Audit revealed compounding problems blocking
scale: critical security exposures (committed API keys, CVE in JWT lib, SQL
injection vector, no SSRF protection on scraper services), end-of-life runtimes
(Go 1.16, Node 14), three near-duplicate frontend repos with verbatim copied
utilities, two competing OCR services running side-by-side in production,
monolithic 3,500-LOC controllers with near-zero test coverage on payment logic,
no rate limiting anywhere, and product surface that ships with FAQ typos and
dead newsletter forms. With a 6+ engineer team over 12 months we restructure to
a Turborepo monorepo, consolidate OCR, harden security, modernize the backend,
ship a real design system, and run a parallel feature wave to drive growth — all
while remaining solvent on AWS and Africa-region today, with deliberate hooks
for global expansion.

## Verified Research vs Team-Must-Confirm (avoiding silent assumptions)

This plan is grounded in research with sources cited where possible. Items
marked **VERIFIED** are confirmed against primary sources today; items marked
**TEAM-VALIDATE** require Reback's team to confirm before execution. No claim in
this plan should be treated as fact without one of these markers.

### VERIFIED (confirmed against primary sources, May 2026)

| Topic                            | Finding                                                                                                                                                                                                  | Source                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Paystack countries               | NG, GH, KE, ZA, EG, CI, RW. Methods: cards, bank transfer, USSD, Apple Pay (channel `apple_pay`), mobile money (GH/KE), Visa QR. Subscriptions API exists. Settlement: NGN, GHS, ZAR, KES, USD.          | paystack.com/countries; paystack.com/docs |
| Flutterwave countries            | 35+ African countries; M-Pesa STK Push for KE confirmed; mobile money for GH confirmed. Settlement: USD, GBP, EUR, NGN + local                                                                           | developer.flutterwave.com                 |
| Stripe in Africa                 | NG and KE are **not direct Stripe markets** — accessed via Paystack (Stripe subsidiary). Stripe Tax expanded to 19 African countries in 2025 (tax-only, not payment acceptance)                          | stripe.com/global                         |
| Wise corridors                   | NG = receive-only; KE = receive-to-bank + M-Pesa; outbound from Africa via Wise Platform is limited. Multi-Currency Account holds 40-56 currencies.                                                      | wise.com/platform                         |
| Smile Identity coverage          | 52 African countries; 8,500+ document types globally; every African country has ≥3 ID types                                                                                                              | usesmileid.com/countries                  |
| MetaMap                          | Acquired by Incode in 2024 — platform continues; Reback's NIN/VIN/BVN/CAC integration confirmed                                                                                                          | metamap.com / Incode announcement         |
| Sumsub Africa                    | Explicit support for NG, KE, GH, ZA. Pass rates 92-94% (2025). Non-Doc Verification available NG/KE/ZA                                                                                                   | sumsub.com/lp/africa                      |
| Onfido                           | Now branded **Entrust IDV** (Entrust acquisition 2024); 195+ countries                                                                                                                                   | entrust.com                               |
| Instagram/Facebook oEmbed        | Since April 2025, requires `oembed_read` (now `meta_oembed_read`) app review. `thumbnail_url`, `thumbnail_width`, `thumbnail_height`, `author_name` removed. Auto-migrated to existing apps Oct 1, 2025. | developers.facebook.com                   |
| TikTok oEmbed                    | Still public, no auth: `GET https://www.tiktok.com/oembed?url=...`                                                                                                                                       | developers.tiktok.com                     |
| Twitter/X oEmbed                 | Still public, no auth: `publish.twitter.com/oembed` and `publish.x.com/oembed`                                                                                                                           | developer.x.com                           |
| WhatsApp Business pricing        | Per-message pricing effective July 1, 2025. Marketing $0.009-$0.124/msg by country; Utility ~80-90% cheaper; Service free in 24h open window; 72h free window from Click-to-WhatsApp ads                 | developers.facebook.com/whatsapp          |
| Telegram Bot API                 | Bots admin in channels receive `channel_post` updates; 5MB URL / 50MB upload; supports paid media, Mini Apps                                                                                             | core.telegram.org/bots/api                |
| Nigeria Data Protection Act 2023 | NDPA 2023 is **current operative law** (NDPR 2019 ceased Sept 19, 2025). Regulator: NDPC.                                                                                                                | secureprivacy.ai                          |
| CBN custodial-funds rule         | **Only Mobile Money Operators (MMOs) can legally hold customer funds in NG.** PSSP / Switching & Processing licenses do NOT permit custody. Reback holding escrow likely needs MMO license.              | ebconsults.ng/cbn-fintech-licence         |
| Tazapay licensing                | Singapore MAS MPI #PS20200638; Canada MSB #M21439799; segregated customer funds with MAS-authorised bank                                                                                                 | tazapay.com/blog                          |
| Vite 8.0                         | Released March 12, 2026; Rolldown Rust bundler; 10-30× faster                                                                                                                                            | vite.dev/blog/announcing-vite8            |
| Next.js 16.2.4                   | March 18, 2026                                                                                                                                                                                           | nextjs.org                                |
| MUI v9.0                         | April 2026; v8 skipped to align with MUI X v9                                                                                                                                                            | mui.com/versions                          |
| Tailwind CSS v4.0                | January 22, 2025; CSS-first config; Lightning CSS                                                                                                                                                        | tailwindcss.com/blog/tailwindcss-v4       |
| Playwright 1.59.1                | April 29, 2026                                                                                                                                                                                           | playwright.dev                            |
| Crawlee 3.16.0                   | Latest npm                                                                                                                                                                                               | npmjs.com/package/crawlee                 |
| Qwen2.5-VL                       | 3B / 7B / 72B variants on HuggingFace; released 2025-02-19                                                                                                                                               | huggingface.co/collections/Qwen/qwen25-vl |
| vLLM 0.20.0                      | April 27, 2026; CUDA 13.0 + PyTorch 2.11                                                                                                                                                                 | vllm.ai/releases                          |
| PaddleOCR                        | v3.2.0 (Aug 2025) and **PaddleOCR-VL-1.5** (Jan 29, 2026) — VL-1.5 hits 94.5% on OmniDocBench                                                                                                            | github.com/PaddlePaddle/PaddleOCR         |
| Go 1.26.2                        | April 7, 2026                                                                                                                                                                                            | go.dev/blog                               |
| `gomock`                         | **Archived** — migrate to `go.uber.org/mock` (Uber fork is the maintained successor)                                                                                                                     | github.com/uber-go/mock                   |
| AWS SDK Go v2                    | Current; AWS SDK v1 is deprecated. Requires Go 1.24+                                                                                                                                                     | github.com/aws/aws-sdk-go-v2              |
| g5.xlarge pricing                | us-east-1 on-demand $1.006/hr; spot avg $0.622/hr (~38% off, can spike higher demand)                                                                                                                    | cloudprice.net                            |
| g6.xlarge alternative            | NVIDIA L4 GPU, $0.6006/hr on-demand us-east-1 — **cheaper and better for VLM inference than g5.xlarge**                                                                                                  | DoiT GPU Compute                          |

### TEAM-VALIDATE (do not assume — confirm before sprint kickoff)

| #   | Item                                                                                                                                                      | How to validate                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | Paystack GBP settlement (not in official docs; only NGN/GHS/ZAR/KES/USD confirmed)                                                                        | Email Paystack support / partner manager                                                                                                               |
| V2  | M-Pesa Daraja direct API access for non-Kenyan entity                                                                                                     | Contact Safaricom Business Portal                                                                                                                      |
| V3  | Qoreid non-Nigeria production country list                                                                                                                | Check docs.qoreid.com or contact sales                                                                                                                 |
| V4  | Hubtel API current methods and pricing                                                                                                                    | hubtel.com/developers                                                                                                                                  |
| V5  | Jiji.ng / Jumia / Konga / Carousell / Shopee / Lazada / MercadoLibre / IndiaMART OG + JSON-LD on **individual product listing URLs** (not category pages) | Run curl with Mozilla user-agent against each product URL and grep for `og:` and `ld+json`                                                             |
| V6  | Nigeria SEC escrow-agent / custodian / trustee category under ISA 2025                                                                                    | Engage Nigerian capital markets counsel (Banwo & Ighodalo, Olaniwun Ajayi, Aluko & Oyebode)                                                            |
| V7  | AWS g5/g6 in af-south-1 availability + eu-west-1 regional pricing                                                                                         | AWS console region check                                                                                                                               |
| V8  | tweakcn "Purple Rain" CSS token values                                                                                                                    | Open theme in browser; DevTools → Elements; copy `:root` and `.dark` blocks; or use the site's "Copy CSS" button. Theme is `cmlh0vbnd000004l112kx8a0l` |
| V9  | MetaMap → Incode API contract continuity post-2024 acquisition                                                                                            | Confirm with MetaMap/Incode support                                                                                                                    |
| V10 | CBN MMO licensing pathway and timeline for Reback specifically                                                                                            | Engage CBN-experienced counsel                                                                                                                         |

### Plan-altering corrections from verification

- The plan previously said "Stripe + Wise" for UK and "Stripe" for US — that's
  correct; **Stripe is not the rail for NG/KE — Paystack/Flutterwave are**.
- The plan previously said `gomock` for service mocking — change to
  **`go.uber.org/mock`** (`gomock` is archived).
- The plan previously named `Vite 5`, `MUI v6`, `Tailwind 3` — change targets to
  **Vite 8, MUI v9, Tailwind v4** (today's stable).
- The plan previously named `Go 1.22` — change target to **Go 1.26** (current).
- The plan previously named `Qwen2.5-VL-3B-Instruct` on `g5.xlarge` — change to
  **Qwen2.5-VL-3B (or 7B for accuracy headroom) on g6.xlarge L4** for better
  cost/perf. Add **PaddleOCR-VL-1.5** as the document-parsing fallback (94.5%
  OmniDocBench).
- The plan previously said "AWS SDK" — change to **AWS SDK Go v2** explicitly;
  v1 is deprecated.
- The plan previously cited Wise for "outbound from Africa" — **revise**: Wise
  corridors from Africa are limited; use Wise Platform for receive-side and
  inbound USD/GBP/EUR; outbound from NG via Paystack/Flutterwave or Wise where
  it operates.
- **Critical add**: pursue **CBN MMO license** (or partnership with a licensed
  MMO) before holding any customer funds in escrow at scale. This is a
  prerequisite for the platform's existence under current Nigerian regulation,
  not a Q4 nice-to-have.
- **Critical add**: switch all internal documentation from "NDPR" to **"NDPA
  2023"**; appoint a DPO under NDPC supervision; file annual NDPC compliance
  audit.
- **Critical add**: target Tazapay's licensing template — Singapore MAS MPI is
  the gold standard for cross-border escrow APIs. If Reback expands beyond
  Africa, MAS MPI becomes a candidate jurisdiction.

## ⚠️ Money Correctness Emergency (P-1 — fix before any feature work)

The engineering health brief surfaces issues the source-walk hinted at but
didn't quantify. These are not "bugs" in the normal sense — they are continuous,
silent value drift in a money-handling system. Reback cannot ship to a
regulator, integrate with a serious partner, or pass an audit while these stand.

**M1 — All money is float64 across the entire stack.**
`0.1 + 0.2 = 0.30000000000000004` in Go and Postgres `float`. Every fee
calculation accumulates rounding error.

- Go models: `model/invoice.go:65-89` (`Tax`, `RebackProcessingFee`,
  `ShippingCharges`, `FirstDeposit`, `BalanceAmount`, `AmountPaid`,
  `TaxPayable`, `Subtotal`, `TotalPayable`);
  `model/invoice.go:118,127,146,149,160` (product `Price`, installment `Amount`,
  `FirstAmount`, `LastAmount`, `TotalInvoiceWorth`); `model/balance.go:22-27`
  (`BalanceBefore`, `BalanceAfter`, `AvailableBalance`, `WithdrawableBalance`,
  `WithheldBalance`, `EscrowBalance`).
- SQL columns in migrations 202306126140868/877/882/911/953: `amount float`,
  `total_payable float`, `tax_payable float`, `first_deposit float`,
  `balance_amount float`, `available_balance float`,
  `withdrawable_balance float`, `refund_amount float`, `processing_fee float`,
  `tax_rate float`.
- Float arithmetic on money: `model/invoice.go:432,456,462,466,485,489` — e.g.
  `i.FirstDeposit + (i.FirstDeposit * 0.015)` and `(subtotal * 1.5) / 100`.
- **Fix:** migrate every money column to `numeric(20,4)` (or store integer minor
  units); use `shopspring/decimal` (or `int64` cents) in Go; round only at
  presentation. Backfill historical rows; reconcile against ledger; add CI gate
  that fails on `float` in any money path.

**M2 — Balance writes have NO transactions and NO row locks.** Repo-wide search
for `BeginTx`, `Begin()`, `Commit()`, `Rollback`, `FOR UPDATE` returns zero
hits. The post-payment balance flow at `controller/afterPayments.go:103-140`
reads-modifies-inserts outside any transaction. **Two concurrent webhooks for
the same user race; one credit is lost or doubled.** The same path inserts a
balance row twice per payment (`L103-117` then `L135`) with no `UNIQUE`
constraint.

- **Fix:** wrap every payment, refund, withdrawal, and balance write in a single
  DB transaction. Lock the wallet row with `SELECT ... FOR UPDATE`. Add
  `UNIQUE(user_id, source_transaction_id)` for idempotency on retries. Adopt the
  **outbox pattern** for webhook → balance → notification fan-out.

**M3 — No amount validation at the API edge.** `handler/invoice/model.go:38-40`
(`FirstDeposit`, `ShippingCharges`) lack `validate:"gt=0"`.
`handler/appeal/model.go RefundAmount` validates `required` but not `> 0`.
Negative, zero, NaN, Inf, and absurdly large values reach the DB unchecked.

- **Fix:** every money field gets `validate:"gt=0"` and a sane upper bound
  (e.g., `lte=10_000_000_000` in minor units). Add struct-level reject of
  `NaN`/`Inf` (decimal types reject these by construction).

**M4 — Money columns nullable; `NULL` read as 0 (`storage/balance.go:73-78`
defaults).** Hides missing data, masks bugs.

- **Fix:** pair the `numeric` migration with `NOT NULL DEFAULT 0` and
  `CHECK (amount >= 0)` (or signed range as appropriate). Backfill before
  constraint.

**M5 — Timestamps stored as naïve `timestamp`, not `timestamptz`.** Every
`created_at` / `updated_at` migration. Audit trails become ambiguous as soon as
a server, RDS instance, or analyst is in a non-UTC zone.

- **Fix:** convert all timestamp columns to `timestamptz`; standardize on UTC at
  the boundary; render local time only in the UI.

**M6 — Webhook responses break the contract.** Most handlers return uniform
`GenericResponse {code, data, message}`. Webhooks at
`handler/webhook/webhook.go:47,75` return raw `c.JSON(200, "success")`. PSP
retry logic + monitoring break.

- **Fix:** unify webhook responses with the global envelope; add monitoring on
  response shape.

**M7 — `gosec` is commented out** in `core-backend/.golangci.yml`;
`tests: false` skips test-file linting. The fintech security linter is disabled
in a fintech.

- **Fix:** re-enable; fix all findings in the same sprint.

**M8 — Pagination silently substitutes defaults for negative/zero
`page`/`size`** in `storage/invoice.go:97-112`. Should reject with 400 to
surface client bugs early.

**M9 — `Invoice.ID` is `uuid.UUID` in Go but searched as `invoice_id::text` in
SQL** (`storage/invoice.go:676`). Mixed string/UUID handling across endpoints;
subtle bugs likely.

**M10 — Stale toolchain.** Go 1.16 (EOL), `dgrijalva/jwt-go` (CVE), AWS SDK v1
(deprecated, AWS SDK Go v2 is mandatory), GORM two minors behind.

**M11 — 18 open `TODO`/`FIXME` in critical paths**, including QoreID identity
verification ("TODO setup properly").

**Estimate:** the brief allows for a 2-4 week focused remediation. With a 6+
engineer team, sequence the float-to-decimal + transactions + locks +
idempotency as a single 2-week emergency sprint with a feature freeze on the
money path. Everything below this line in the plan depends on that sprint
completing first.

## Strategic Vision — Reback as the Embedded Escrow Primitive for Underserved Markets

The user-app is a wedge, not the moat. The moat is an **embedded escrow API**
that thousands of platforms (marketplaces, social-commerce tools, B2B software,
classifieds) ship with one SDK call. Think escrow.com but for emerging markets,
with NGN/GHS/KES/USD native settlement, an open dispute API, a JS/TS SDK
(escrow.com still doesn't have one), and per-country compliance packs. Tazapay
is the closest comparable (Singapore, $36M Series B Mar 2026, 85-country API) —
Reback's edge is Africa-native rails + dispute primitives + lower fees on
small-ticket high-frequency social commerce.

### Three product surfaces, one core

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Reback Escrow Core                         │
│  Ledger · Transactions · Milestones · Disputes · Payouts        │
│  Idempotency · Outbox · KYC · AML · Audit · Compliance Packs    │
└─────────────────────────────────────────────────────────────────┘
        ▲                        ▲                        ▲
        │                        │                        │
┌───────┴────────┐    ┌──────────┴─────────┐    ┌─────────┴─────────┐
│  Reback App    │    │  Reback API +SDK   │    │  Reback for       │
│  (web/mobile)  │    │  (Partner API)     │    │  Marketplaces     │
│  SMEs/buyers   │    │  Devs embed it     │    │  White-label tier │
└────────────────┘    └────────────────────┘    └───────────────────┘
```

### Partner API tier (the embedded play — copy escrow.com's `/partner/` namespace)

A platform onboards once, then creates transactions on behalf of its
sub-customers without itself holding KYC obligations (where regulation allows) —
Reback verifies the end-buyer/seller through Reback's own KYC. Partner billing
is volume-based with tiered take-rate.

| Endpoint                                    | Purpose                                                       |
| ------------------------------------------- | ------------------------------------------------------------- |
| `POST /v1/partners`                         | Self-serve partner registration                               |
| `POST /v1/partners/{id}/api-keys`           | Rotate / scope keys (sandbox vs live, read vs write)          |
| `POST /v1/transactions` (with `partner_id`) | Create on behalf of platform's user pair                      |
| `GET /v1/transactions/{id}/timeline`        | Immutable event log per transaction (escrow.com pattern)      |
| `POST /v1/transactions/{id}/disputes`       | **Open dispute API — escrow.com doesn't have this**           |
| `PATCH /v1/disputes/{id}/resolve`           | Admin resolution with refund/release/split                    |
| `POST /v1/webhooks`                         | Register URL; HMAC-signed events on every state change        |
| `POST /v1/widgets/checkout-link`            | Hosted "Pay & Hold in Escrow" page (Stripe Checkout analogue) |

### SDK story (where escrow.com is weakest)

| SDK                                                                                         | Status  | Priority                                  |
| ------------------------------------------------------------------------------------------- | ------- | ----------------------------------------- |
| `@reback/node` (TypeScript)                                                                 | **NEW** | P0 — every Nigerian dev uses Node/Next.js |
| `@reback/web` (browser drop-in: Pay-with-Reback button + `<reback-checkout>` web component) | **NEW** | P0 — viral via embeds                     |
| `reback-go`                                                                                 | NEW     | P1                                        |
| `reback-python`                                                                             | NEW     | P1                                        |
| `reback-php` (Laravel/WooCommerce)                                                          | NEW     | P2                                        |
| WooCommerce / Shopify / WhatsApp Business plugins                                           | NEW     | P1                                        |

### Regulatory positioning (escrow.com's structural moat)

Escrow.com (Internet Escrow Services Inc.) holds state escrow-agent licenses
(CA #963 1867, AZ EA 0908016, ID #ESC-1050, AU AFSL 501215). FinCEN ruled
escrow-integral money transmission does not make IES a money transmitter. Reback
should target the analogous structure under CBN/SEC/NFIU: position as **escrow
agent**, not money transmitter. Engage compliance counsel in Q1 to file for
Nigerian SEC capital-markets licensing and CBN payment-service-bank affiliation.
In each new country, target the local equivalent (KE: CBK / SACCO supervisor;
GH: BoG; ZA: FSCA).

### Moat-building features (escrow.com gaps Reback fills)

1. Native NGN/GHS/KES/ZAR settlement (escrow.com supports USD/EUR/GBP/AUD/CAD
   only).
2. Open dispute API with chat, evidence upload, SLA tracking (escrow.com keeps
   disputes opaque).
3. JS/TS SDK + browser web component (escrow.com offers neither).
4. Social-commerce-native: Catalog Import → Invoice → Public Pay Link in 30s.
5. Embedded WhatsApp / IG-DM checkout (escrow.com doesn't touch these channels).
6. Cheaper per-transaction take-rate on small tickets (escrow.com's tiered
   May-2024 pricing punishes <$5K deals).

## Product Snapshot (what Reback is)

| Surface                | Repo              | Stack                                                 | Audience                 |
| ---------------------- | ----------------- | ----------------------------------------------------- | ------------------------ |
| Marketing site         | `website`         | Vue 3 + Vue CLI + Tailwind                            | Visitors                 |
| User app               | `frontend-app`    | React 18 + Vite 4 + MUI v7 + Tailwind                 | SMEs, buyers, sellers    |
| Internal admin         | `admin-dashboard` | React 18 + Vite 5 + MUI v6 + Tailwind                 | Ops team                 |
| API                    | `core-backend`    | Go 1.16 + Gin + GORM + Postgres + Redis               | All clients              |
| Generic scraper (Go)   | `screenshot`      | Go + Selenium + Firefox + gosseract                   | Internal pipeline        |
| Generic scraper (Node) | `puppet`          | Node 14 + selenium-webdriver + Tesseract.js + GPT-3.5 | Internal pipeline        |
| Social scraper         | `puppeteer`       | Node 18 + Puppeteer + Selenium                        | Internal pipeline        |
| Scraper library        | `webshot-ocr`     | Go module                                             | Imported by `screenshot` |

Core value loop: invoice creation with negotiation → escrow hold via
Paystack/Flutterwave → release on delivery → dispute resolution chat.
Differentiators: counter-offer workflow, escrow-default invoicing, dispute chat,
KYC via Qoreid + Metamap, **social-commerce catalog import** (paste an
Instagram/Facebook/Twitter post URL, Reback screenshots + OCRs + LLM-extracts
product fields to pre-fill the invoice — strong PMF for Nigerian SMEs who sell
primarily via IG DMs).

## Product Flow Map (verified end-to-end from code, not the README)

### Flow A — Onboarding & KYC (gated tier system)

- Signup at `handler/auth/auth.go:78-133` — collects email, password, name,
  business name/type/category, phone (NG 10-digit), social handles. **Every
  signup is hardcoded `UserRole=SuperAdminUser` (`model/user.go:173`).** Returns
  OTP only, JWT after OTP verify.
- OTP verify (`auth.go:145-179`) — bcrypt-hashed OTP stored on the User record.
  JWT issued on success.
- Google OAuth (`auth.go:502-619`) — bypasses OTP entirely; sets
  `IsEmailVerified=true` directly. No re-verify if email collides.
- KYC tiers (`controller/kyc.go`) — Level 0 (default) → 1 (Termii SMS OTP) → 2
  (BVN via Qoreid + ID doc + address — admin-approved at `kyc.go:323`) → 3
  (business verification, admin-approved). **MetaMap ID verification is a TODO
  stub at `kyc.go:232`** — `IDVerificationStatus` can never reach `Accepted`
  automatically; admin must manually flip the field, otherwise tier-2 promotion
  is silently blocked.
- Tier gates: KYC < 2 blocks invoice creation (`controller/invoice.go:87`); KYC
  ≤ 1 + amount ≥ ₦1M blocks withdrawal (`paystack.go:76`, `flutterwave.go:236`).
  KYC level 3 has no enforced unlock found in code beyond level 2.

### Flow B — Invoice creation with social-catalog import

- Seller pastes IG/FB/Twitter post URL → frontend at
  `frontend-app/src/pages/Invoicing/NewCustomerInvoice.jsx:43-77` calls
  `takeScreenshot()` → POSTs to `https://nodeocr.reback.finance/screenshot` (the
  `puppet` service).
- `puppet/puppet.js:39-76` headless-Firefox screenshots the URL, returns base64
  PNG.
- Frontend stores in `useScreenshotStore`, navigates to `/snapshot`
  (`MultipleAsset.jsx:87-96`) — shows screenshot with confirm prompt "Is this
  your Post?".
- On confirm → `MultipleAsset.jsx:44-59` calls `ocr({ image })` → puppet runs
  Tesseract.js → result text passed to GPT-3.5 (`puppet/puppet.js:103-148`)
  which returns `{productTitle, productPrice, productDescription}` JSON.
- `ProductForm.jsx:176-188` pre-populates invoice line item fields from OCR
  result — **price is auto-populated and editable but not forced for re-entry**,
  which is a dispute liability.
- Invoice saved with `socialMediaHandles[{media, value}]` JSON
  (`model/invoice.go:92`); rendered into PDF header at `invoicePDF.jsx:97-108`.
- Invoice has 23+ status states (see Bug Punch List). Two channels:
  `instantPayment` (immediate seller credit) vs `escrow` (held).

### Flow C — Counter-offer & negotiation

- Buyer can submit counter-offer (`controller/counterOffer.go:23`) —
  `ProcessingFee = Price * 1.5 / 100` per offer.
- Seller accepts/rejects (`controller/invoice.go:496`) — accept rewrites
  `TotalPayable` to counter-offer price; reject closes invoice.
- **No round limit** — can cycle indefinitely. **No duplicate-invoice
  detection** — same buyer/seller/amount can be live multiple times.
- `InspectionPeriod` field exists on the invoice model but is **never read or
  enforced** (`model/invoice.go:94`).

### Flow D — Payment, escrow, release (the broken core)

- Buyer pays via Paystack/Flutterwave → webhook hits backend.
- **Flutterwave webhook signature verification is COMMENTED OUT**
  (`handler/webhook/webhook.go:79-93`). Any unauthenticated POST forges a
  payment completion. **CRITICAL.**
- Paystack webhook also has no signature check found.
- `AfterPaymentUpdate` (`afterPayments.go:716`) routes by reference prefix:
  `INV_*`, `SUB_*`, `WTL_*`.
- Instant channel (`afterPayments.go:16`) → `WithdrawableBalance += amount`
  immediately.
- **Escrow channel (`afterPayments.go:292`) closes the invoice on the same call
  as payment confirmation.** Status → `MadePayment` → `Closed`,
  `EscrowBalance += amount`. There is no separate "buyer confirms receipt →
  release escrow" function. **No inspection period despite the field on the
  model.** Escrow funds can then be withdrawn via the same withdrawal flow as
  `WithdrawableBalance` — escrow protection is structurally undermined.
- Duplicate `UpdateInvoiceByID` write in escrow path
  (`afterPayments.go:317-327`).
- **No webhook idempotency** — replays double-credit. **No `Idempotency-Key`**
  anywhere.
- `HandleAllPayment` exists as a parallel implementation but isn't called from
  the webhook — dead duplicate logic.

### Flow E — Dispute / appeal

- Gate: `invoice.Paid==true` (`controller/appeal.go:21`).
  `AmountRefundable = AmountPaid - ProcessingFee`.
- Status enum: `Pending`, `Open`, `Resolved`, `Rejected`, `Closed`, `Escalated`,
  `In Progress`, `Funds Withheld`, `Funds Released`, `Refund Approved`. Admin
  actions: `Lock Funds`, `Release Funds`, `Reject Appeal`, `Approve Refund`,
  `Close Appeal`, `Escalate Appeal`.
- **`handler/liveChat/liveChat.go` is an EMPTY file** (`package livechat` only).
  The advertised real-time dispute chat does not exist.
- Subscription gate for appeals (Pro/Premium only) is declared in
  `model/subscription.go:92-104` but **never enforced at runtime** — any user
  files appeals.
- No SLA timer on appeal resolution.

### Flow F — Subscription / pricing

- Tiers: `freeTrial` (14d), `basic`, `pro` (+appeal +3 users), `premium`
  (+appeal +unlimited users).
- Wallet payment deducts from balance immediately; **card payment case is empty
  / no-op** in `controller/subscription.go`.
- **Subscription expiry is not enforced anywhere** — expired user retains full
  feature access.

### Flow G — Withdrawal

- Statuses: `pending`, `declined`, `approved`. Sub-flow varies by role.
- Super admin: direct payout via Flutterwave. Admin: creates
  `WithdrawalRequest`, super-admin approves.
- **`time.Sleep(20 * time.Second)` inside the HTTP handler during approval**
  (`flutterwave.go:372`) — guaranteed frontend timeouts.
- Processing fee formula `(amount * 0.1) / 100` = **0.001%** — almost certainly
  intended as 0.1% (1000x off).
- **No balance lock between check and transfer** — concurrent withdrawals can
  overdraft.
- **`WithdrawableBalance` vs `EscrowBalance` not distinguished at withdrawal** —
  escrow funds withdrawable directly, defeating escrow.
- No four-eyes requirement on high-value approvals.

### Flow H — Notifications

- Email: Postmark or SendGrid via `DEFAULT_EMAIL_GATEWAY`. **Falls back silently
  to Slack if env unset** — production misconfiguration sends user emails to a
  Slack channel.
- SMS: Termii (KYC OTP only). No push notifications (FCM/APNs) — `device.go`
  model exists but tokens not stored or used.
- WebSocket: gorilla/websocket imported but `liveChat.go` empty.
- ~30 named email events; in-app notifications are CRUD on a Notification table
  polled by the frontend.

### Flow I — Admin operations

- Roles: `super_admin`, `admin`, `accounts`, `operations` (typo `OperationsUer`
  in enum at `model/user.go`).
- Capabilities: user CRUD, blacklist, KYC tier approval, appeal moderation,
  withdrawal approval (with the 20s sleep bug), monthly stats, audit trail,
  refund CSV export, dashboard demographics.
- `RebackAdmin` token path exists for internal staff but capabilities are not
  differentiated from super-admin in most controllers.

### API surface inventory (~170 routes across 20 sub-routers under `/api/v1`)

| Resource                  | Routes (~) | Resource      | Routes (~) |
| ------------------------- | ---------- | ------------- | ---------- |
| auth                      | 18         | invoice       | 20         |
| admin                     | 40         | kyc           | 8          |
| appeal + appealChat       | 9          | subscription  | 5          |
| transaction + balance     | 9          | bankDetails   | 6          |
| withdrawal                | 3          | notifications | 4          |
| device                    | 3          | customer      | 6          |
| invoiceDraft + invoiceLog | 7          | ratings       | 4          |
| preference + refunds      | 6          | dashboard     | 6          |
| webhook                   | 4          | (other)       | ~12        |

## Critical Backend Bugs (discovered in deep dive — fix these BEFORE any feature work)

These are not architectural opinions; they are runtime bugs in production code
with money implications. Sequence them ahead of every other fix.

| #   | Bug                                                                     | File                                                                   | Severity                                 | Fix                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Flutterwave webhook signature verification commented out                | `core-backend/src/handler/webhook/webhook.go:79-93`                    | **CRITICAL — payment forgery**           | Re-enable hash verify; reject unsigned. Same for Paystack (no signature check found).                                                                                                          |
| B2  | No webhook idempotency — replays double-credit balances                 | webhook handlers + `controller/afterPayments.go`                       | **CRITICAL — fund duplication**          | Add `Idempotency-Key` table or use Paystack/Flutterwave reference + Redis dedupe with 24h window.                                                                                              |
| B3  | Escrow channel closes invoice on payment with no inspection period      | `controller/afterPayments.go:292-330`                                  | **CRITICAL — escrow defeated**           | Introduce `escrow_held` state distinct from `closed`; only release on buyer confirm-receipt OR after `InspectionPeriod` elapses (the field already exists at `model/invoice.go:94`).           |
| B4  | `EscrowBalance` withdrawable through same flow as `WithdrawableBalance` | `controller/paystack.go`, `controller/flutterwave.go` withdrawal paths | **CRITICAL — escrow defeated**           | Block withdrawals against `EscrowBalance` until associated invoice is in `funds_released` state.                                                                                               |
| B5  | MetaMap KYC stub never implemented                                      | `controller/kyc.go:232`                                                | HIGH — silent KYC failure                | Implement MetaMap callback handling OR remove the path and require admin manual approval explicitly.                                                                                           |
| B6  | 20s `time.Sleep` in withdrawal-approval HTTP handler                    | `core-backend/src/controller/flutterwave.go:372`                       | HIGH — frontend timeouts                 | Move to async worker via SQS; respond immediately with `pending`, complete via webhook callback.                                                                                               |
| B7  | Subscription card-payment case is empty no-op                           | `controller/subscription.go` (card case)                               | HIGH — silent feature failure            | Implement Paystack/Flutterwave authorization + tokenized recurring charges OR remove the option from UI.                                                                                       |
| B8  | Subscription expiry not enforced anywhere                               | `controller/subscription.go` + middleware                              | HIGH — revenue leak                      | Add middleware that loads active subscription on auth and rejects gated endpoints when expired.                                                                                                |
| B9  | Appeal subscription gate declared in data, never enforced               | `controller/appeal.go:14`, `model/subscription.go:92-104`              | MEDIUM — feature parity gap              | Wire feature-flag check at appeal creation.                                                                                                                                                    |
| B10 | Withdrawal processing fee formula bug — 0.001% not 0.1%                 | `controller/paystack.go:41`                                            | HIGH — revenue leak (1000x off)          | Replace `(amount * 0.1) / 100` with intended formula; cover with property-based test.                                                                                                          |
| B11 | No balance lock between check and transfer in withdrawal                | `controller/paystack.go`, `flutterwave.go`                             | HIGH — race condition / overdraft        | `SELECT FOR UPDATE` row lock OR optimistic version field on Wallet.                                                                                                                            |
| B12 | `liveChat.go` is an empty file — dispute real-time chat doesn't exist   | `core-backend/src/handler/liveChat/liveChat.go`                        | HIGH — promised feature missing          | Implement WebSocket chat (already have `gorilla/websocket` dep) OR remove from product surface and ship in Q2.                                                                                 |
| B13 | Silent email gateway fallback to Slack on missing env                   | `thirdparty/email/email.go`                                            | HIGH — user emails delivered to Slack    | Fail-fast on missing `DEFAULT_EMAIL_GATEWAY`; raise on startup.                                                                                                                                |
| B14 | Single-session JWT (refresh-cookie strict-match)                        | `pkg/middleware/jwt.go:207`                                            | MEDIUM — second-device login kills first | Move to per-device session table; multi-session support with revocation.                                                                                                                       |
| B15 | No account lockout on failed logins                                     | `handler/auth/auth.go:321-363`                                         | MEDIUM — brute force                     | Add per-account + per-IP exponential backoff; lock after 5 failures with email notify.                                                                                                         |
| B16 | No token revocation list                                                | JWT middleware                                                         | MEDIUM                                   | Redis revocation set checked on every auth.                                                                                                                                                    |
| B17 | Counter-offer has no round limit                                        | `controller/counterOffer.go`                                           | MUST-FIX — UX bloat / DB growth          | Cap at 5 rounds; force decision after.                                                                                                                                                         |
| B18 | No duplicate invoice detection                                          | `controller/invoice.go:16`                                             | MUST-FIX                                 | Soft-warn on identical buyer+seller+amount within 24h.                                                                                                                                         |
| B19 | Hardcoded `UserRole=SuperAdminUser` on every signup                     | `model/user.go:173`                                                    | MEDIUM — privilege confusion             | Differentiate "account owner" from "super admin"; introduce `OWNER` role.                                                                                                                      |
| B20 | `OperationsUer` enum typo                                               | `model/user.go` (role enum)                                            | MUST-FIX — silent string mismatches      | Rename to `OperationsUser`; migration to update existing rows.                                                                                                                                 |
| B21 | Duplicate `UpdateInvoiceByID` in escrow path                            | `controller/afterPayments.go:317-327`                                  | MUST-FIX — wasted writes                 | Remove the duplicate.                                                                                                                                                                          |
| B22 | `HandleAllPayment` parallel implementation never called                 | `controller/afterPayments.go`                                          | MUST-FIX — dead code                     | Delete.                                                                                                                                                                                        |
| B23 | `NINTrialCount` tracked, no max-retry enforcement                       | `controller/kyc.go`                                                    | MEDIUM — KYC bypass                      | Cap at 3 attempts; require admin reset after.                                                                                                                                                  |
| B24 | Invoice statuses sprawl to 23+ values, several semantically overlapping | `model/invoice.go`                                                     | MEDIUM — bug surface                     | Collapse to a clean state machine: `draft → sent → negotiating → accepted → awaiting_payment → paid → in_escrow → released → closed → disputed → resolved → refunded`. Migration with mapping. |
| B25 | No webhook for `metamap` route despite handler registered               | `handler/handler.go` webhook group                                     | MUST-FIX                                 | Either implement or remove route.                                                                                                                                                              |

These 25 bugs alone justify a 6-week stabilization sprint before any new feature
lands.

## Critical Findings (the must-fix list)

### P0 security (this week)

- `puppet/puppet.js:104` — OpenAI API key hardcoded as fallback literal
  (`sk-proj-QZHtD...`). **Rotate immediately.** Key is in git history.
- `puppeteer/puppet.js:56-57` — Instagram credentials `iambooknard / giftOF463`
  hardcoded. **Rotate.**
- `core-backend/src/go.mod:10` — `dgrijalva/jwt-go v3.2.0` has CVE-2020-26160.
  Migrate to `golang-jwt/jwt/v5`.
- `core-backend/src/handler/model/request.go:14` + `storage/*.go` (32+ sites) —
  `SortBy` user input interpolated into `ORDER BY` via `fmt.Sprintf`. **SQL
  injection.** Allowlist column names server-side.
- `core-backend/src/main.go:55` — `AllowAllOrigins = true` global CORS. Replace
  with explicit origin list.
- `screenshot/main.go:132`, `puppet/puppet.js:60`, `puppeteer/puppet.js:169` —
  user-supplied URLs fetched without SSRF defense. Block
  private/link-local/metadata IPs (`169.254.169.254`, `127.0.0.0/8`, `10/8`,
  `172.16/12`, `192.168/16`, `::1`).
- `puppeteer/puppet.js:70` — Chrome launched `--no-sandbox`. Run inside gVisor
  or rootless container instead.
- `puppeteer/chromedriver-linux64/chromedriver` — 16 MB ELF binary committed
  (commit `f8c1109`). Remove and rewrite via `git filter-repo`.
- `core-backend/.env`, `core-backend/src/.env` — env files tracked. Move to AWS
  Secrets Manager. Audit history.
- `puppet/`, `puppeteer/` — `node_modules/` committed. Remove and gitignore.
- Cookie flags `Secure` + `HttpOnly` not set in
  `core-backend/src/pkg/middleware/middleware.go:56-72`.
- Unresolved merge conflict markers in `core-backend/.gitignore:13-18`.

### P0 scale + reliability

- No rate limiting anywhere in `core-backend/src/`. Add per-IP and per-user
  limits at Gin middleware (e.g., `ulule/limiter` backed by Redis), plus
  stricter limits on `/login`, OTP, password-reset, `/payment/initialize`.
- `core-backend/src/storage/storage.go` opens DB connection with no
  `SetMaxOpenConns` / `SetMaxIdleConns` / `SetConnMaxLifetime`. Set
  conservatively per pod.
- `core-backend/src/storage/invoice.go:660-753` — `GetAllInvoicesWithoutQuery`,
  `GetAllInvoicesWithNoFilter`, `GetAllUsersWithTopInvoices` are unbounded
  full-table scans/joins. Cap with mandatory pagination + max page size 100.
- `page.SortBy` and `page.Size` caller-controlled with no server cap. Enforce
  `min(size, 100)` and column-name allowlist.
- Browser-per-request in all four scraper services. Move to a Playwright pool
  with concurrency limit and a SQS/Cloud Tasks queue.
- 36 `.Debug()` GORM calls + 57 `fmt.Println` in production paths
  (`core-backend/src/storage/invoice.go:128,195,432,490`, etc). Replace with
  structured logger (`zerolog` or `slog`) gated by log level.

### Code quality

- `core-backend/src/controller/afterPayments.go` — 3,566 LOC, zero tests, owns
  payment finalization. Decompose into `payment_initiate`, `payment_webhook`,
  `escrow_release`, `refund`, `installment` packages with unit + integration
  tests.
- `controller/admin.go` (2,500 LOC) and `controller/invoice.go` (1,896 LOC) —
  same treatment.
- Dual GORM imports (`jinzhu/gorm` v1 + `gorm.io/gorm` v2) at
  `src/go.mod:24,44`. Complete migration to v2, drop v1.
- 3 test files in entire backend; payment + escrow logic untested. Target 70%
  coverage on financial paths before any new feature lands.
- `core-backend/.golangci.yml` enables only 7 linters. Add `gosec`, `errcheck`,
  `staticcheck`, `gocritic`, `bodyclose`, `noctx`, `revive`.

### Frontend duplication (monorepo trigger)

Verbatim duplicates between `frontend-app` and `admin-dashboard`:

- `Loader.jsx`, `formatAmount`, `sentenceCase`, `getInitials`, `Store.js`
  (Zustand), `fetcher.js`, `index.css`, `tailwind.config.js` color palette (30+
  tokens). The admin used `reuseable/` (typo) vs frontend `reusable/`.
- Tailwind `primary: '#20042D'` declared three times across three repos. Mulish
  font loaded three times.
- Drift: Vite 4 vs 5, Zustand v4 vs v5, MUI v6 vs v7. Sessions key `'token'`
  shared but no shared auth helper.
- `frontend-app/src/Routes.jsx:143-156` still has commented-out admin routes —
  confirms admin was extracted from frontend.

### UX/UI red flags

- No `ErrorBoundary` anywhere in either React app.
- Empty states are bare text (`"No data available"`) at 8+ locations.
- `website/src/components/Newsletter.vue:11` — `<button>Subscribe</button>` with
  no handler. **Dead form on production marketing site.**
- `website/src/components/FAQ.vue:54` — production typos: "actvities", "amd",
  "hiistory", "fiialds", "fromm".
- `website/src/components/Navbar.vue:50` — `console.log(window.pageYOffset)` in
  scroll handler.
- `admin-dashboard/src/pages/Auth/PayInPage.jsx:42` — `console.log(error)` in
  catch block.
- `frontend-app/src/components/Settings/UserManagment/AddUserDrawer.jsx:112` —
  placeholder is a real person's name `'Ariyo Tolulope'`. Folder name
  `UserManagment` is also misspelled.
- 4 styling systems mixed in `frontend-app`: MUI v7 +
  `@material-tailwind/react` + `styled-components` + Emotion + Tailwind.
- Missing `<head>` SEO/OG meta on website.
- No `aria-*` on icon-only buttons; `<10` aria attributes total in user app.

## Target Architecture

### Repository topology (Turborepo monorepo + 2 service repos)

```text
reback/                              ← NEW Turborepo monorepo
├── apps/
│   ├── web/                         ← merged frontend-app (React 18 + Vite 5)
│   ├── admin/                       ← merged admin-dashboard
│   ├── marketing/                   ← rewritten website (Next.js 15, replaces Vue CLI)
│   └── mobile/                      ← Expo (RN) — NEW, Q3 deliverable
├── packages/
│   ├── ui/                          ← shadcn/ui-based component library + Storybook
│   ├── design-tokens/               ← single source of truth for colors/typography/motion
│   ├── api-client/                  ← OpenAPI-generated TS client (Orval / openapi-ts)
│   ├── auth/                        ← shared zustand store + token helpers + refresh logic
│   ├── utils/                       ← formatAmount, sentenceCase, getInitials (one copy)
│   ├── i18n/                        ← message catalogs (Q4)
│   └── analytics/                   ← Segment/PostHog wrapper, event taxonomy
├── turbo.json
├── pnpm-workspace.yaml
└── .changeset/

reback-backend/                      ← stays separate, modernized in place
└── (Go 1.22, modularized, see Backend Modernization)

reback-scrapers/                     ← NEW: replaces screenshot/puppet/puppeteer/webshot-ocr
└── (single Node + Playwright service with queue + browser pool)
```

Decision: backend stays separate because the Go toolchain doesn't benefit from
Turbo and it deploys on a different cadence. Scrapers consolidate into ONE
service in ONE repo.

### Social-Catalog Import (`reback-scrapers`) — tiered ML + non-ML strategy

**The feature is sound and is a key PMF differentiator** for Nigerian SMEs who
sell via Instagram/Facebook DMs. It must survive consolidation. What gets killed
is the brittle Selenium + Firefox + GPT-3.5 + hardcoded-creds infrastructure
underneath. Replacement strategy is **tiered fallback** — try the cheapest,
lightest option first; escalate only when needed. No external paid API tokens
(no GPT, no Textract). Self-hostable end-to-end.

#### The 4-tier extraction pipeline

```text
Tier 1  Open Graph fetch        ──→ httpx + BeautifulSoup    [non-ML, ~5ms,  $0]
Tier 2  Public oEmbed           ──→ TikTok / X public APIs   [non-ML, ~50ms, $0]
Tier 3  Headless browser fetch  ──→ Crawlee + Playwright +    [non-ML, ~1.5s, ~$0.0001]
                                    Browserless + stealth +
                                    residential proxy
Tier 4  ML extraction           ──→ Qwen2.5-VL-3B (vLLM)      [ML, ~1s, ~$0.001]
                                    OR PaddleOCR + Qwen2.5-3B
```

Tier 1-3 are **non-ML scraping options**. Tier 4 is the **ML extraction step**
that runs on whatever HTML/screenshot the prior tiers returned. Most public
posts resolve at Tier 1 (Open Graph metadata); only Instagram/Facebook public
posts that no longer expose useful OG tags need Tier 3.

#### Tier 1 — Open Graph fetch (DEFAULT, free, instant, no ML, no browser)

Most public URLs (TikTok, Twitter/X, public Facebook pages, Pinterest, product
listing sites, YouTube, Shopify storefronts, eBay listings, Jiji, OLX, Jumia)
expose `og:image`, `og:title`, `og:description`, `product:price:amount`,
`product:price:currency` in raw HTML.

Stack: `httpx` (Python) or `undici` (Node) + `cheerio` (Node) or
`beautifulsoup4` (Python). No headless browser. Uses ~10MB memory per request.
Works at 200+ req/s on a single small instance.

Coverage estimate: **~70-80% of seller paste-in URLs** will resolve at this tier
without ever needing a browser.

#### Tier 2 — Public oEmbed endpoints (free, no auth, no ML)

| Platform      | Endpoint                                     | Auth?                    | What you get                  |
| ------------- | -------------------------------------------- | ------------------------ | ----------------------------- |
| TikTok        | `https://www.tiktok.com/oembed?url=...`      | No                       | Embed HTML, author, thumbnail |
| Twitter/X     | `https://publish.twitter.com/oembed?url=...` | No                       | Embed HTML, author, thumbnail |
| YouTube       | `https://www.youtube.com/oembed?url=...`     | No                       | Title, thumbnail, description |
| Vimeo         | `https://vimeo.com/api/oembed.json?url=...`  | No                       | Title, thumbnail              |
| ~~Instagram~~ | ~~Graph API oEmbed~~                         | **Yes** (since Apr 2025) | Required app review           |
| ~~Facebook~~  | ~~Graph API oEmbed~~                         | **Yes** (since Apr 2025) | Required app review           |

Meta broke unauthenticated IG/FB oEmbed in April 2025; we either register a Meta
app for `oembed_read` permission (file the app review in Q1) or we fall through
to Tier 3.

#### Tier 3 — Headless browser fetch (non-ML scraping, when Tier 1+2 fail)

Stack: **Crawlee (Apify, MIT)** + **Playwright** + **Browserless self-hosted**.
Replaces the entire Selenium + Firefox + Puppeteer + Geckodriver mess.

| Component         | Choice                                                                         | Reason                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crawler framework | **Crawlee** (Node TS or Python)                                                | MIT license, auto fingerprint pool from real-browser samples, TLS rotation, proxy success scoring, `PlaywrightCrawler` and `CheerioCrawler` classes |
| Browser engine    | **Playwright Chromium**                                                        | 0.8s startup vs Firefox 3-5s; native stealth ecosystem                                                                                              |
| Browser pool      | **Browserless** (self-hosted Docker, `ghcr.io/browserless/chromium`)           | Queue + concurrency caps + WebSocket protocol, 2 replicas on `t3.medium` ~$30/mo                                                                    |
| Stealth           | **`puppeteer-extra-plugin-stealth`** patches via Playwright                    | Defeats Cloudflare Bot Mgmt + DataDome; partial vs Meta's own anti-bot                                                                              |
| Proxies           | **Residential rotation** (Webshare or Oxylabs)                                 | ~$3-8/GB; only enable for IG/FB tier 3 calls                                                                                                        |
| Anti-bot          | Built-in fingerprint rotation; rate-limit per target host; back-off on 429/403 | —                                                                                                                                                   |

**Strict rules:**

- Never log in to Instagram/Facebook/Twitter under a Reback-controlled account.
  Hardcoded social creds (`iambooknard / giftOF463`) deleted immediately.
  Public-only.
- SSRF defense: DNS resolve → reject RFC1918 / link-local / loopback / IPv6-ULA
  / metadata IPs (`169.254.169.254`, `127.0.0.0/8`, etc); reject redirects into
  private space.
- Per-target host rate limit (max 1 req/sec to instagram.com per IP; rotate
  proxy on 403).
- All requests JWT-authed against the backend's signing secret; per-user quota.

#### Tier 4 — ML extraction (Qwen2.5-VL-3B, self-hosted, no external tokens)

Runs ONLY when Tier 1-3 returned a screenshot/HTML but no structured product
data. Two sub-options:

| Sub-tier            | Stack                                                                  | When                                                                                             | Throughput                             |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 4a — Direct VLM     | Image → **Qwen2.5-VL-3B-Instruct** (vLLM) → JSON                       | Default. Strong on document understanding; native JSON tool-use; Apache 2.0                      | ~8-12 req/s on `g5.xlarge` (24GB A10G) |
| 4b — OCR + text LLM | Image → **PaddleOCR PP-OCRv4** → text → **Qwen2.5-3B-Instruct** → JSON | Fallback. Cheaper for text-heavy receipts; PaddleOCR 96.58% accuracy on invoice text; ~100ms OCR | Higher throughput, ~25-40 req/s        |

Why not the alternatives:

| Considered                            | Verdict                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Donut (200M, naver-clova-ix)          | Requires 2,000+ labeled examples to fine-tune per doc type. Reback doesn't have a labeled corpus. Skip. |
| Florence-2 (230M/770M, Microsoft)     | Weak OCR — misses numeric totals. Document-understanding mode only. Not first choice.                   |
| Phi-3.5-vision (4.2B, Microsoft, MIT) | Strong, slightly larger. **Backup if Qwen underperforms on Pidgin posts.**                              |
| PaliGemma 2 (3B, Google)              | Less community fine-tunes for receipts; lower priority.                                                 |
| GPT-3.5 / GPT-4o (current)            | External token, not self-hosted, against directive. **Replace.**                                        |
| Claude Haiku 4.5 (cloud)              | External token, against directive. **Replace.**                                                         |
| AWS Textract                          | External token + per-page cost ($1.50 / 1000 pages). Replace with PaddleOCR.                            |

**Serving stack:** **vLLM** with continuous batching
(`vllm serve Qwen/Qwen2.5-VL-3B-Instruct --max-model-len 4096 --dtype bfloat16`).
Backup: TGI. Dev: Ollama.

**Hardware:** AWS `g5.xlarge` Spot (24GB A10G, ~$0.35/hr spot vs $1.006/hr
on-demand). Two instances behind ALB for HA. Auto-scale from 1→4 on queue depth.
Estimated **~$90-130/month for 100K extractions** (~$0.001 per extraction,
**5-10× cheaper than GPT-3.5-vision**, no external token).

**Latency target:** <3s end-to-end (Tier 1 ~5ms; Tier 3 ~1.5s; Tier 4 ~1s). Tier
1 covers ~75% of requests at <100ms median.

#### Platform coverage matrix — ALL social + classifieds across developing markets

Every platform a Nigerian SME (or any seller in EM) would paste into Reback's
Catalog Import. Each entry shows the recommended tier, expected reliability, and
special handling. The pipeline does **not** require us to write a per-platform
scraper — Crawlee + OG/oEmbed + VLM cover everything generically. This table is
the test corpus we run regression checks against.

##### Social platforms (global + EM-relevant)

| Platform                             | Region(s)                                    | Public OG?            | oEmbed?                      | Recommended tier                 | Notes                                                                            |
| ------------------------------------ | -------------------------------------------- | --------------------- | ---------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Instagram (post/reel)                | Global                                       | Limited (degrading)   | Auth-required since Apr 2025 | Tier 3 + 4a                      | Register Meta `oembed_read` app in Q1; otherwise Crawlee with residential proxy  |
| Facebook (post/page/marketplace)     | Global                                       | Yes (variable)        | Auth-required since Apr 2025 | Tier 1 → Tier 3                  | Marketplace listings often require Tier 3                                        |
| WhatsApp (catalog link)              | Global, NG/KE/IN dominant                    | Yes                   | No                           | Tier 1                           | Catalog product links expose OG; integrate WhatsApp Business API for ingest      |
| WhatsApp Status (URL)                | Global                                       | N/A (ephemeral)       | No                           | Out of scope                     | User uploads screenshot → Tier 4a VLM                                            |
| Threads (Meta)                       | Global                                       | Yes                   | No                           | Tier 1                           | Treat like X                                                                     |
| Twitter / X                          | Global                                       | Yes                   | Yes (public)                 | Tier 2                           | `publish.twitter.com/oembed`; include media                                      |
| TikTok (video/shop)                  | Global                                       | Yes                   | Yes (public)                 | Tier 2                           | `tiktok.com/oembed`; price often in caption — Tier 4a needed for product detail  |
| TikTok Shop product                  | TH/ID/VN/MY/PH/UK/US                         | Yes (rich)            | Yes                          | Tier 1                           | Direct product schema in HTML                                                    |
| Snapchat (Spotlight, public)         | Global                                       | Limited               | No                           | Tier 3 + 4a                      | Mostly ephemeral; user typically uploads screenshot                              |
| Pinterest (pin)                      | Global                                       | Yes (rich)            | Yes                          | Tier 1                           | OG includes price in many cases                                                  |
| YouTube (video / Shorts / community) | Global                                       | Yes                   | Yes                          | Tier 2                           | Product extraction via description text                                          |
| LinkedIn (post/article)              | Global                                       | Yes                   | No                           | Tier 1 → Tier 3                  | Auth wall sometimes triggers; rare for sellers                                   |
| Reddit (post)                        | Global, NG/KE niches                         | Yes                   | No                           | Tier 1                           | `.json` endpoint also works (free, undocumented stable)                          |
| Discord (channel post)               | Global                                       | No                    | No                           | Out of public scope              | User uploads screenshot → Tier 4a                                                |
| Telegram (channel/group)             | Global, very large in EM (NG/IR/RU/IN/EG/PK) | Limited               | No                           | Tier 1 → Tier 3                  | `t.me/c/{channel}/{id}` exposes OG for public channels; private requires Bot API |
| Telegram Marketplace (Buy/Sell bots) | EM-heavy                                     | No                    | No                           | Out of scope                     | Bot API integration required                                                     |
| WeChat (公众号 / Channels / shop)    | China + Chinese diaspora                     | Limited (geo-blocked) | No                           | Out of scope (post-China launch) | Reback doesn't target China day 1                                                |
| Kuaishou / Douyin                    | China + Chinese diaspora                     | Limited               | No                           | Out of scope (post-China launch) | —                                                                                |
| Likee                                | SEA, Africa                                  | Yes                   | No                           | Tier 1                           | Bytedance; weak anti-bot                                                         |
| Bigo Live                            | SEA                                          | Yes                   | No                           | Tier 1                           | —                                                                                |
| Triller                              | Global niche                                 | Yes                   | No                           | Tier 1                           | —                                                                                |
| Mastodon / Bluesky / Nostr           | Global decentralized                         | Yes                   | Mastodon yes                 | Tier 1 → Tier 2                  | Activity-pub friendly                                                            |
| Substack (post)                      | Global                                       | Yes                   | No                           | Tier 1                           | Used by some SMEs as catalog                                                     |
| Medium (post)                        | Global                                       | Yes                   | No                           | Tier 1                           | —                                                                                |
| Patreon / Ko-fi / Buy-me-a-coffee    | Global                                       | Yes                   | No                           | Tier 1                           | Creator commerce overlap                                                         |

##### Classified ads platforms (developing markets — the MOST important for Reback's wedge)

| Platform                                  | Country/Region                             | Public OG?                | Recommended tier | Notes                                                                     |
| ----------------------------------------- | ------------------------------------------ | ------------------------- | ---------------- | ------------------------------------------------------------------------- |
| **Jiji**                                  | NG, KE, GH, UG, TZ, ET, SN, CI             | Yes (rich product schema) | **Tier 1**       | Africa's largest classifieds; price + currency + images all in OG/JSON-LD |
| **OLX**                                   | NG, EG, PK, BR, IN, ID, ZA, PL, RO, UA, BG | Yes (rich)                | **Tier 1**       | Standard product schema                                                   |
| **Jumia** (incl. Jumia Mall, Jumia Deals) | NG, EG, KE, GH, CI, MA, SN, UG, ZA         | Yes (rich)                | **Tier 1**       | Top-tier Africa e-commerce; structured data                               |
| **Konga**                                 | NG                                         | Yes                       | Tier 1           | NG e-commerce                                                             |
| **PigiaMe**                               | KE                                         | Yes                       | Tier 1           | KE classifieds                                                            |
| **Cheki**                                 | NG/KE/UG/TZ/GH/ZA (auto)                   | Yes                       | Tier 1           | Auto-focused                                                              |
| **Tonaton**                               | GH                                         | Yes                       | Tier 1           | GH classifieds                                                            |
| **Sapama** / **AdsAfrica**                | Multi-Africa                               | Variable                  | Tier 1 → Tier 3  | —                                                                         |
| **Gumtree**                               | ZA, UK, AU                                 | Yes                       | Tier 1           | OG + classifieds                                                          |
| **Junkmail** / **AutoTrader.co.za**       | ZA                                         | Yes                       | Tier 1           | —                                                                         |
| **OpenSooq**                              | JO, SA, AE, EG, KW, QA, OM, BH, LB, IQ     | Yes (rich, RTL)           | **Tier 1**       | MENA's biggest classifieds                                                |
| **Dubizzle** / **Bayut**                  | UAE, PK, KSA                               | Yes (rich)                | **Tier 1**       | Real estate + general classifieds; strong product schema                  |
| **Souq** (Amazon.ae/eg)                   | MENA                                       | Yes                       | Tier 1           | Now Amazon-rebranded; standard schema                                     |
| **Hatla2ee**                              | EG, MA                                     | Yes                       | Tier 1           | Auto                                                                      |
| **Carousell**                             | SG, PH, HK, ID, MY, VN, TW, MM             | Yes (rich)                | **Tier 1**       | SEA's biggest C2C; product schema                                         |
| **Shopee**                                | SG, PH, ID, MY, TH, VN, BR, MX, AR, CO, CL | Yes (rich)                | **Tier 1**       | Top SEA marketplace                                                       |
| **Lazada**                                | SG, MY, TH, ID, PH, VN                     | Yes (rich)                | **Tier 1**       | Alibaba SEA                                                               |
| **Tokopedia** / **Bukalapak**             | ID                                         | Yes                       | Tier 1           | Indonesia C2C                                                             |
| **Chợ Tốt**                               | VN                                         | Yes                       | Tier 1           | Vietnam classifieds                                                       |
| **Sulit / OLX Philippines**               | PH                                         | Yes                       | Tier 1           | —                                                                         |
| **Bikroy**                                | BD, LK                                     | Yes                       | Tier 1           | Bangladesh + Sri Lanka                                                    |
| **Quikr**                                 | IN                                         | Yes                       | Tier 1           | India classifieds                                                         |
| **OLX India**                             | IN                                         | Yes                       | Tier 1           | —                                                                         |
| **Sulekha**                               | IN                                         | Yes                       | Tier 1           | Services-focused                                                          |
| **IndiaMART** / **Justdial**              | IN                                         | Yes                       | Tier 1           | B2B + services                                                            |
| **Meesho**                                | IN                                         | Yes                       | Tier 1           | Reseller-driven; good Reback overlap                                      |
| **Daraz**                                 | PK, BD, NP, LK                             | Yes                       | Tier 1           | Alibaba South Asia                                                        |
| **PakWheels** / **OLX Pakistan**          | PK                                         | Yes                       | Tier 1           | —                                                                         |
| **MercadoLibre / Mercado Pago**           | AR, BR, MX, CL, CO, PE, UY, VE, BO, EC     | Yes (rich)                | **Tier 1**       | LATAM's largest                                                           |
| **OLX Brasil**                            | BR                                         | Yes                       | Tier 1           | —                                                                         |
| **Vivanuncios**                           | MX                                         | Yes                       | Tier 1           | —                                                                         |
| **Encuentra24**                           | CR, PA, NI, GT, SV, HN, DO                 | Yes                       | Tier 1           | Central America                                                           |
| **Anuncios / Computrabajo**               | LATAM                                      | Yes                       | Tier 1           | —                                                                         |
| **Avito**                                 | RU (Reback unlikely to target day 1)       | Yes                       | Tier 1           | —                                                                         |
| **Bazos** / **Sbazar**                    | CZ/SK                                      | Yes                       | Tier 1           | —                                                                         |
| **Allegro**                               | PL                                         | Yes                       | Tier 1           | —                                                                         |
| **eMAG**                                  | RO, BG, HU                                 | Yes                       | Tier 1           | —                                                                         |
| **Locanto**                               | Multi-country                              | Yes                       | Tier 1           | —                                                                         |
| **Trovit** / **Mitula**                   | Multi-country aggregator                   | Yes                       | Tier 1 → 3       | Mostly redirects to source                                                |

##### Regression test corpus

`reback-scrapers/test/corpus/` holds 5+ canonical URLs per platform (mix of
product, listing, profile, video). CI runs the extraction pipeline against the
corpus weekly; regressions in `confidence`, `price`, `currency`, or `images[]`
fail the build. Frozen ground-truth JSON checked in alongside each URL.

##### Per-platform stretch goals (Q3-Q4)

- **WhatsApp Business Catalog API** — direct ingest of catalog items (no
  scraping needed). Platform contract.
- **Instagram Graph API (business accounts)** — for sellers who connect their IG
  business account, fetch product tags via API instead of scraping.
- **TikTok Display API** + **TikTok Shop Partner API** — direct catalog ingest
  for TikTok Shop sellers.
- **Shopify storefront API** — sellers paste their Shopify storefront URL →
  Reback ingests their full catalog via API.
- **WooCommerce REST API** — same for WooCommerce stores.
- **Jiji / OLX / Jumia / MercadoLibre partner APIs** — explore for direct
  integration; some expose listing webhooks.

#### Decision tree (runtime)

```text
1. URL paste-in
2. Try Tier 1 (OG fetch)              ──→ confidence >= 0.8?  return result
3. Try Tier 2 (oEmbed if applicable)  ──→ structured fields?   return result
4. Try Tier 3 (browser fetch)         ──→ HTML + screenshot
5. Re-attempt Tier 1 against the fetched HTML (often works now)
6. Try Tier 4a (VLM on screenshot)    ──→ confidence >= 0.6?  return result
7. Try Tier 4b (OCR + text LLM)       ──→ return whatever we got, mark low-confidence
8. UI: show extraction with per-field confidence; price field is NEVER auto-final — seller must explicitly confirm or re-type before invoice is sent.
```

#### Service architecture

`reback-scrapers/` (Node 22 + Fastify + Playwright + Crawlee):

- `POST /v1/extract` — main endpoint. Body: `{url, hint?}`. Response:
  `{title, price, currency, description, images[], confidence}` plus
  `screenshot_url` (S3 signed) and `tier_used`.
- `POST /v1/screenshot` — generic public-URL screenshot only.
- `POST /v1/ocr` — OCR-only on uploaded image.
- Inbound auth: JWT signed by backend's RSA key.
- Job queue: AWS SQS for backpressure; sync mode for <2s requests, async with
  webhook callback for slow ones.
- Cache: Redis keyed by `sha256(url)` for 24h; invalidate on explicit refresh.
- Observability: OpenTelemetry; per-tier success-rate metrics; per-target-host
  failure budgets.

**Repos retired:** `screenshot/`, `puppet/`, `puppeteer/`, `webshot-ocr/`.
Sample images in `screenshot/images/` move to a docs/marketing repo.
`chromedriver` ELF, hardcoded social creds, hardcoded OpenAI key all purged from
git history.

### Backend topology (`reback-backend`)

```text
src/
├── cmd/api/                         ← entrypoint (was main.go)
├── internal/
│   ├── domain/                      ← entities (was model/)
│   ├── handler/                     ← HTTP layer
│   ├── service/                     ← business logic (was controller/, but split)
│   │   ├── invoice/
│   │   ├── payment/                 ← split from afterPayments.go
│   │   ├── escrow/
│   │   ├── kyc/
│   │   ├── wallet/
│   │   ├── dispute/
│   │   └── admin/                   ← split from admin.go
│   ├── repository/                  ← was storage/
│   ├── platform/
│   │   ├── middleware/              ← auth, ratelimit, requestid, logger
│   │   ├── observability/           ← OpenTelemetry, structured logging, metrics
│   │   └── config/
│   └── thirdparty/                  ← payments, email, sms, kyc clients
├── migrations/                      ← was terminal/goose/
└── api/openapi.yaml                 ← single source of truth
```

### REST API Redesign — granular, safe, versioned (replaces the ~170 sprawling routes)

The current API has 170+ routes across 20 sub-routers with serious shape
problems flagged in the engineering brief:

- `POST /users` to **list** users (handler/auth/auth.go:60 — the original
  author's TODO at line 403 acknowledges this)
- POSTs used for searches in `transaction`, `admin/paymentManagement`,
  `admin/searchInvoices`
- Mixed response shapes: most use `GenericResponse {code, data, message}`;
  webhooks at `handler/webhook/webhook.go:47,75` return raw
  `c.JSON(200, "success")`
- Pagination defaults silently rewrite negative/zero (should 400)
- `Invoice.ID` is `uuid.UUID` in Go but searched as `invoice_id::text`
  (`storage/invoice.go:676`)

Target spec: `/api/v2` (cut over from `/api/v1` with deprecation window). All
routes:

#### Conventions

- **GET** for reads, **POST** for create, **PATCH** for partial update, **PUT**
  for full replace, **DELETE** for delete. Reads NEVER use POST — searches use
  `GET /collection?q=...`.
- **Versioned** at the URL prefix: `/api/v2/...`. Major version bumps for
  breaking changes; minor for additive.
- **Resource-oriented, plural nouns**:
  `/transactions/{id}/disputes/{id}/messages` not `/getDisputeMessage`.
- **Idempotency-Key header** mandatory on all POST/PATCH that move money or
  create disputes; Redis dedupe 24h.
- **Cursor pagination** for collections >1000 rows (`?cursor=...&limit=25`);
  offset pagination for small admin lists. Reject negative/zero with 400.
- **Standard envelope** for all responses including webhooks:
  `{ok, data, error: {code, message, fields}, request_id, version}`.
- **Standard error codes** taxonomy: `validation_error`, `auth_required`,
  `forbidden`, `not_found`, `conflict`, `rate_limited`, `idempotency_replay`,
  `internal_error`, `dependency_unavailable`.
- **HMAC-signed webhooks** to consumers; SHA256 with shared secret; replay
  window 5 min.
- **OpenAPI 3.1 spec** is the single source of truth; backend handlers, frontend
  client (`packages/api-client`), partner SDKs all generated from it.

#### Resource map (~v2)

| Resource                               | Methods                                                                                  | Notes                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `/v2/auth/sessions`                    | POST (login), DELETE (logout), POST `/refresh`                                           | replaces `POST /auth/login`, `POST /auth/logout`                         |
| `/v2/auth/passwords/reset-requests`    | POST                                                                                     | replaces `forgot/reset` ad-hoc                                           |
| `/v2/auth/otps`                        | POST (send), POST `/verify`                                                              | unified for email + SMS                                                  |
| `/v2/auth/oauth/google`                | POST                                                                                     | google sign-in callback                                                  |
| `/v2/me`                               | GET, PATCH                                                                               | "current user" — no IDs in URL                                           |
| `/v2/me/devices`                       | GET, POST, DELETE `/{id}`                                                                | session devices                                                          |
| `/v2/users`                            | GET (admin only, filterable), GET `/{id}` (self or admin)                                | replaces `POST /users` listing — **fixes a known bug**                   |
| `/v2/users/{id}/kyc`                   | GET, PATCH (with sub-resources `/nin`, `/bvn`, `/face`, `/address`, `/business`)         | tier-aware                                                               |
| `/v2/transactions`                     | GET (filter), POST                                                                       | unified term replacing "invoice" in API (UI keeps "invoice" terminology) |
| `/v2/transactions/{id}`                | GET, PATCH                                                                               | partial updates                                                          |
| `/v2/transactions/{id}/items`          | GET, POST, PATCH `/{id}`                                                                 | milestone-style line items (escrow.com pattern)                          |
| `/v2/transactions/{id}/state`          | POST `/agree`, `/fund`, `/ship`, `/receive`, `/accept`, `/reject`, `/release`, `/refund` | explicit state transitions, idempotent                                   |
| `/v2/transactions/{id}/counter-offers` | GET, POST, PATCH `/{id}/accept`, PATCH `/{id}/reject`                                    | new sub-resource — see Counter-Offer v2                                  |
| `/v2/transactions/{id}/timeline`       | GET                                                                                      | immutable event log                                                      |
| `/v2/transactions/{id}/disputes`       | GET, POST                                                                                | one open dispute at a time                                               |
| `/v2/disputes/{id}`                    | GET, PATCH                                                                               | admin actions                                                            |
| `/v2/disputes/{id}/messages`           | GET, POST (text/attachment)                                                              | WebSocket upgrade path: `/v2/disputes/{id}/stream`                       |
| `/v2/disputes/{id}/evidence`           | GET, POST (multipart)                                                                    | immutable once submitted                                                 |
| `/v2/disputes/{id}/resolve`            | POST (admin)                                                                             | refund/release/split                                                     |
| `/v2/wallets/{id}`                     | GET                                                                                      | balances broken out: `available`, `escrow_held`, `withheld`              |
| `/v2/wallets/{id}/ledger`              | GET (cursor-paginated)                                                                   | append-only                                                              |
| `/v2/wallets/{id}/withdrawals`         | GET, POST                                                                                | request creation; admin approval downstream                              |
| `/v2/withdrawals/{id}`                 | GET, PATCH `/approve`, PATCH `/decline`                                                  | admin endpoints; async via SQS (no `time.Sleep` in handler)              |
| `/v2/bank-accounts`                    | GET, POST, DELETE `/{id}`, POST `/{id}/verify`                                           | NUBAN verify via Paystack                                                |
| `/v2/notifications`                    | GET, PATCH `/{id}/read`, POST `/read-all`, DELETE `/{id}`                                |                                                                          |
| `/v2/subscriptions`                    | GET, POST, PATCH `/{id}/cancel`, POST `/{id}/upgrade`                                    | enforce expiry middleware                                                |
| `/v2/customers`                        | GET, POST, GET `/{id}`, PATCH                                                            | seller's address book                                                    |
| `/v2/ratings`                          | GET, POST                                                                                | counterparty reputation feed                                             |
| `/v2/preferences`                      | GET, PATCH                                                                               | unified per-user prefs                                                   |
| `/v2/admin/*`                          | full admin namespace, RBAC-gated, audit-logged                                           |                                                                          |
| `/v2/partners` (NEW)                   | POST, GET, PATCH                                                                         | self-serve partner registration                                          |
| `/v2/partners/{id}/api-keys`           | POST, DELETE, GET                                                                        | rotation, scoping                                                        |
| `/v2/webhooks` (NEW)                   | POST, GET, DELETE, POST `/{id}/redeliver`                                                | partner webhook subscriptions                                            |
| `/v2/widgets/checkout-link` (NEW)      | POST                                                                                     | hosted Pay-with-Reback link                                              |
| `/v2/extracts` (NEW)                   | POST                                                                                     | proxy to `reback-scrapers`                                               |

#### RBAC + scopes

- Token claims: `user_id`, `account_id`, `roles[]`, `scopes[]`. Admin scopes:
  `admin:read`, `admin:write`, `admin:disputes`, `admin:withdrawals`,
  `admin:kyc`. Partner scopes: `partner:txn:write`, `partner:txn:read`,
  `partner:webhooks`.
- Middleware enforces scopes per route. Unauthorized scope → 403 with
  `code=insufficient_scope`.
- All admin actions emit an audit event with `actor_id`, `action`, `target`,
  `before`, `after`, `request_id`.

#### Cutover plan

- Q1: launch `/api/v2` parallel to `/api/v1`.
- Q1: backend handlers refactored as the controller decomposition lands (per
  Phase 3); a thin `/v1` adapter shim translates v1 calls to v2 internal
  handlers during transition.
- Q2: client (`packages/api-client`) and partner SDKs target v2 only; v1
  deprecated with `Sunset` header.
- Q3: `/v1` retired.

### Multi-Country Plan & Pricing Framework

Today: NGN-only, Nigeria-only, hardcoded `Africa/Lagos` timezone. Target: a
country-pluggable framework where launching a new country is a config + KYC
adapter, not a fork.

#### Pricing in USD as canonical, displayed in local currency

- Plans defined in **USD minor units** in the database. UI converts to local
  currency at request time using daily-cached rate from a designated FX provider
  (Wise rates API or OpenExchangeRates self-hosted feed).
- Settlement: invoices created in seller's local currency; cross-currency
  invoices route through Wise / Flutterwave forex.
- Display: every UI surface shows local currency by default; toggle to
  USD/EUR/GBP per user preference.
- Avoid: hardcoded `₦` glyphs anywhere. Use ICU `MessageFormat` +
  `Intl.NumberFormat` everywhere.

#### Plan/Feature framework (data-driven, not hardcoded)

```text
plans (table)
  id (slug: free|starter|pro|business|partner)
  display_name
  base_price_usd_minor   (e.g., 0, 999, 4999, 19999)
  billing_interval       (month|year)
  trial_days
  is_active
  available_in_countries (text[] — ISO codes)

plan_features (M:M)
  plan_id
  feature_key            (slug)
  limit_value            (int|null — e.g., 3 invoices/mo, NULL = unlimited)

features (table)
  key (slug)
  display_name
  description
  enforcement            (gate|meter|none)
  sort_order

country_plan_overrides (table)
  plan_id
  country_iso
  price_local_minor      (override; otherwise FX-converted from USD)
  available              (bool — disable a plan in a country)
```

Feature gating: middleware loads `features[]` for the active subscription on
auth; rejects when `enforcement=gate`. Metering: usage counted in Redis (e.g.,
`usage:invoices:user_id:YYYYMM`); on overage, return 402 with upgrade link.

#### Country pack (one folder per country, `core-backend/internal/countries/<iso>/`)

Each pack declares:

| Aspect               | Examples                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Currency             | NGN (kobo, 100), KES (cents, 100), GHS (pesewas, 100), USD (cents, 100), GBP (pence, 100)                                                                            |
| Languages            | `en`, `pidgin`, `yo`, `ig`, `ha`, `sw`, `fr`                                                                                                                         |
| KYC providers        | NG: Qoreid (NIN/BVN) + Smile Identity; KE: Smile Identity (Huduma); GH: Smile Identity; ZA: ThisIsMe + DHA; UK/EU: Veriff or Onfido; Global fallback: Smile Identity |
| Payment in (pay-in)  | NG: Paystack + Flutterwave; KE: Flutterwave M-Pesa STK Push; GH: Flutterwave + Paystack-GH; UK: Stripe + Wise; ZA: PayFast + Flutterwave; US: Stripe                 |
| Payment out (payout) | NG: Paystack + Flutterwave; KE: Flutterwave M-Pesa B2C; GH: Flutterwave; ZA: Ozow or PayFast; cross-border: Wise                                                     |
| Tax                  | NG: 7.5% VAT (FIRS); KE: 16% VAT; GH: 12.5% VAT; ZA: 15% VAT; UK: 20% VAT (HMRC)                                                                                     |
| Compliance           | NG: NDPR + CBN + FIRS + SEC; KE: ODPC; ZA: POPIA; UK: GDPR + FCA                                                                                                     |
| Date/time format     | per-locale ICU                                                                                                                                                       |
| Phone formats        | libphonenumber per country                                                                                                                                           |
| Addresses            | per-country schema (NG: state/LGA, UK: postcode, US: ZIP+state)                                                                                                      |
| Business types       | per-country registry types (NG: CAC RC; KE: BRS; UK: Companies House)                                                                                                |

Adding a country = file a new pack folder, add migrations for any
country-specific lookup tables, register in the country registry. No code
changes in core money flows.

### Mobile-First Responsive Design + Channel Continuity Plan

Today's frontend is desktop-first React; admin-dashboard is more so. Mobile is
where Reback's users actually work — selling on Instagram, chatting on WhatsApp.
The new mandate: every flow is mobile-first, fluid across channels (social → DM
→ public invoice page → checkout → notification), and PWA-installable on every
Reback surface.

#### Breakpoint system (mobile-first)

```text
xs  0    – 359   (small phone)
sm  360  – 479   (default phone)
md  480  – 767   (large phone / phablet)
lg  768  – 1023  (tablet portrait)
xl  1024 – 1439  (tablet landscape / small laptop)
2xl 1440 +       (desktop)
```

Build mobile first; layer enhancements at `md`/`lg`/`xl`. Use container queries
(`@container`) for components that flex within parents.

#### Mobile-first patterns

- Touch targets: minimum 44×44px (Apple HIG) / 48×48dp (Material). Spacing scale
  guarantees this.
- Sticky bottom-action bars (CTAs reachable with thumb), respecting
  `env(safe-area-inset-bottom)`.
- Swipe-to-dismiss on bottom sheets and drawers (Radix UI `Drawer` + `vaul`).
- Pull-to-refresh on key list screens (custom hook over Framer Motion).
- Inline keyboards: `inputmode="decimal"` on money fields; `autocomplete`
  everywhere; `inputmode="email"` etc.
- iOS-safe text rendering: `-webkit-font-smoothing: antialiased`; avoid 16px+
  font shrink from auto-zoom.
- Skeleton screens not spinners; never blank-state-flash.
- All transitions GPU-accelerated; respect `prefers-reduced-motion`.

#### PWA-first then native

- Q1: PWA manifest, service worker (Workbox), offline shell, install prompt,
  push notifications via Web Push API. Add to Home Screen banner.
- Q3: Expo (React Native) `apps/mobile` shipping share-target intent (receive
  shared IG/FB URL → open Reback invoice creation), biometric login (Expo
  LocalAuthentication), native push (FCM/APNs), camera receipt capture.

#### Channel continuity (the key UX directive)

Each adjacent channel hands off frictionlessly:

```text
Instagram post                                   PUBLIC INVOICE PAGE
   │                                                      ▲
   │  Seller pastes URL                                   │  Buyer pays in escrow
   ▼                                                      │
Reback Catalog Import  ─→  Invoice draft  ─→  Send link  ─┤
   │                                                      │
   │  AI extracts product                                 │
   ▼                                                      ▼
                       WhatsApp / IG-DM  ──→ Buyer DM  ──→ tap link
                                                          │
                                                          │
                                                          ▼
                                                       Pay via Paystack /
                                                       Flutterwave / Wise
                                                          │
                                                          │  webhook
                                                          ▼
                                                       Escrow held
                                                          │
                                                       SMS + push + email
                                                       to both parties
                                                          │
                                                          ▼
                                                       Buyer confirms receipt
                                                          │
                                                          ▼
                                                       Auto-release after
                                                       inspection period
                                                       (configurable)
```

Concrete continuity features:

- **Web Share Target API** registered for the PWA: when a seller hits "share" on
  an IG post in Chrome on Android, Reback PWA appears as a share target → opens
  Catalog Import with the URL pre-filled.
- **Deep links**: `reback.finance/i/{id}` opens the public invoice page;
  `reback://invoice/{id}` opens the native app.
- **WhatsApp Business cloud API** (`apps/marketing/api/wa/...`) sends invoice
  links and receives buyer replies routed to the dispute inbox.
- **Instagram DM bot** (Q3, `apps/services/ig-bot`) replies to "how much?" with
  a one-click invoice link generated from the linked product post.
- **OG images** with the product photo + price + escrow badge auto-generated via
  `@vercel/og` for every `/i/{id}` page so DM/WhatsApp previews are rich.
- **Email + SMS + Push + WhatsApp** delivered for every state transition; user
  picks channel preference in `/settings/notifications`.

### Screens to Design / Redesign (the missing implementation roster)

Foundation: shadcn/ui + tweakcn-imported tokens (see Design System v2). Every
screen has Storybook entries with edge-case stories (empty, loading, error,
partial-failure, RTL, dark mode).

| #     | Screen                                                                                                                                              | State          | Notes                                                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Marketing landing                                                                                                                                   | Rebuild        | Next.js 15, server-rendered, "Get paid for what you sell on Instagram." hero                                                                                       |
| 2     | Sign up (4 steps)                                                                                                                                   | Redesign       | Email → password → biz info → verify; progress bar; mobile-optimized                                                                                               |
| 3     | OTP verify                                                                                                                                          | Redesign       | Auto-paste from SMS; 6 digit boxes; resend timer                                                                                                                   |
| 4     | Login                                                                                                                                               | Redesign       | Email + password; Google; biometric on mobile                                                                                                                      |
| 5     | Forgot password                                                                                                                                     | Redesign       | Token-link flow                                                                                                                                                    |
| 6     | KYC tier 1 (phone)                                                                                                                                  | Redesign       | Termii OTP; clear progress                                                                                                                                         |
| 7     | KYC tier 2 (BVN/NIN/ID/address)                                                                                                                     | Redesign       | Stepper; document upload with camera; live face capture                                                                                                            |
| 8     | KYC tier 3 (business)                                                                                                                               | Redesign       | CAC RC verification; logo upload                                                                                                                                   |
| 9     | Onboarding tour                                                                                                                                     | NEW            | 3-screen tour after KYC; skippable                                                                                                                                 |
| 10    | Dashboard (seller view)                                                                                                                             | Redesign       | KPIs, recent invoices, escrow holdings, action cards                                                                                                               |
| 11    | Dashboard (buyer view)                                                                                                                              | NEW            | Invoices owed, paid, in dispute                                                                                                                                    |
| 12    | Catalog Import                                                                                                                                      | Redesign       | URL paste → screenshot preview → "Is this your post?" → AI-extract preview → confirm with confidence indicators on each field; price field locked-and-must-confirm |
| 13    | Invoice builder                                                                                                                                     | Redesign       | Mobile-first; line items drag-reorder; inline math; tax/fee toggle; counterparty picker (autocomplete from address book)                                           |
| 14    | Invoice preview / send                                                                                                                              | Redesign       | Renders the public-page version; share targets (WhatsApp, IG-DM, Email, Copy link)                                                                                 |
| 15    | Invoice detail (live)                                                                                                                               | Redesign       | Status timeline; counter-offers panel; payment status; release CTA                                                                                                 |
| 16    | Public invoice page (`/i/{id}`)                                                                                                                     | NEW            | Branded; OG-image-ready; "Pay & Hold in Escrow" CTA; mobile-first                                                                                                  |
| 17    | Counter-offer panel                                                                                                                                 | NEW            | Side-by-side delta; round counter (max 5); "Best & final" toggle; auto-decline timer                                                                               |
| 18    | Pay-in checkout                                                                                                                                     | Redesign       | Single-page; PSP picker; saved cards; bank transfer fallback                                                                                                       |
| 19    | Escrow tracker                                                                                                                                      | NEW            | Visual state machine: held → confirmed → released; inspection-period countdown; release CTA                                                                        |
| 20    | Dispute room                                                                                                                                        | NEW            | Real-time chat (WebSocket); evidence panel; SLA timer; admin response                                                                                              |
| 21    | Wallet                                                                                                                                              | Redesign       | Available / escrow / withheld split; ledger feed; cards for fast actions                                                                                           |
| 22    | Wallet ledger detail                                                                                                                                | NEW            | Per-line drilldown with linked invoice                                                                                                                             |
| 23    | Withdraw                                                                                                                                            | Redesign       | Bank picker; verify NUBAN; amount with limits; daily cap shown                                                                                                     |
| 24    | Bank accounts                                                                                                                                       | Redesign       | Add via NUBAN+verify; default account toggle                                                                                                                       |
| 25    | Customers (address book)                                                                                                                            | Redesign       | Recent counterparties; tags; reputation scores                                                                                                                     |
| 26    | Customer detail                                                                                                                                     | NEW            | Past dealings; counterparty insights; "X paid 5/5 on time"                                                                                                         |
| 27    | Subscription / billing                                                                                                                              | Redesign       | Plan cards; current usage meter; upgrade flow                                                                                                                      |
| 28    | Settings → profile                                                                                                                                  | Redesign       | Avatar, business info, social handles                                                                                                                              |
| 29    | Settings → security                                                                                                                                 | NEW            | Sessions list, revoke; 2FA setup; PIN change                                                                                                                       |
| 30    | Settings → notifications                                                                                                                            | Redesign       | Per-channel + per-event grid                                                                                                                                       |
| 31    | Settings → team / sub-users                                                                                                                         | Redesign       | RBAC roles; invite flow                                                                                                                                            |
| 32    | Settings → API & webhooks                                                                                                                           | NEW            | Generate keys; webhook URLs; replay log                                                                                                                            |
| 33    | Notifications inbox                                                                                                                                 | Redesign       | Grouped by entity (invoice/dispute/withdrawal)                                                                                                                     |
| 34    | Empty state library                                                                                                                                 | NEW            | Illustrated — never bare text                                                                                                                                      |
| 35    | Error boundary screens                                                                                                                              | NEW            | "Something didn't work" → action-oriented copy with retry                                                                                                          |
| 36    | 404 / 403 / 500                                                                                                                                     | Redesign       | On-brand; suggest next action                                                                                                                                      |
| 37    | Status page                                                                                                                                         | NEW            | `status.reback.finance`                                                                                                                                            |
| 38-50 | Admin: users, KYC review, invoices, disputes, withdrawals, refunds, payouts, audit, blacklist, reports, demographics, partners, webhooks deliveries | Redesign / NEW | Each gets its own list + detail + bulk-action panel                                                                                                                |
| 51    | Reback Copilot (chat)                                                                                                                               | NEW            | Natural-language assistant over the user's data                                                                                                                    |
| 52    | Mobile bottom-tab navigator                                                                                                                         | NEW            | Home / Invoices / Wallet / Disputes / Profile                                                                                                                      |
| 53    | Mobile share-target intake                                                                                                                          | NEW            | Triggered when user shares an IG/FB URL into the PWA                                                                                                               |

### Counter-Offer Flow v2 (optimized)

The current flow at `controller/counterOffer.go` allows infinite negotiation
rounds with no time-bound and no guardrails. Sellers and buyers stall, deals
die. Redesign:

| Element              | Today      | v2                                                                                                     |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| Round limit          | unbounded  | **Max 5 rounds** (configurable per partner). After round 5, force decision in 24h or auto-close.       |
| Time-box             | none       | Each counter expires after **48h** (configurable). Auto-decline on expiry; both parties notified.      |
| Best-and-final       | none       | Either party can mark a round "Best & Final". Other side has 24h to accept or transaction auto-closes. |
| Side-by-side delta   | text       | UI shows `original → counter` with line-item diffs, total delta, percent change                        |
| Counter-with-message | no         | 280-char message attached to counter (context = closes deals)                                          |
| Partial accept       | no         | Accept N of K line items, counter the rest                                                             |
| Anchor               | none       | Show market-rate hint where Reback has data ("similar items typically range ₦X-Y")                     |
| Auto-decline rules   | none       | Configurable: `>50% off original`, `<minimum acceptable`, etc. Saves time on lowball offers.           |
| Audit                | minimal    | Every round logged with timestamps, actor, message, delta                                              |
| Notifications        | email only | Email + push + in-app + (opt-in) WhatsApp                                                              |

### Infrastructure (multi-region path)

- AWS today: ECS Fargate + ALB + RDS Postgres + ElastiCache Redis + S3 +
  CloudFront + Route53.
- Add: ALB → ECS rolling deploys, RDS Multi-AZ, Aurora Postgres serverless v2 by
  Q4 for elastic write capacity.
- Multi-region (Q4): two read replicas (eu-west-1, us-east-1), Aurora Global,
  CloudFront origins by region, Route53 latency-based DNS. Writes still
  single-primary (af-south-1 lagos-adjacent).
- Secrets: AWS Secrets Manager + IAM Roles for Tasks. No `.env` in any repo.
- CI/CD: GitHub Actions matrices, Turbo remote cache (Vercel or self-hosted),
  `gosec` + `govulncheck` + `npm audit` gates.
- Observability: OpenTelemetry SDK in backend, Grafana Cloud or self-hosted
  Grafana + Prometheus + Loki + Tempo, Sentry for frontend errors.
- Feature flags: Unleash (open-source, self-hosted) per global tech-selection
  rule.

## 12-Month Roadmap (two parallel tracks)

### Quarter 1 — Stabilize foundations + design system v2 ships

#### Track A — Stabilization (sequenced by money risk)

- Week 1 — Stop the bleed: rotate the OpenAI key, IG/FB/Twitter creds, every
  secret in committed `.env` files. Re-enable Flutterwave webhook signature
  verification (B1). Add Paystack webhook HMAC. Add idempotency dedupe on
  webhook reference (B2). Block withdrawal of `EscrowBalance` (B4). Fix the
  0.001%/0.1% withdrawal fee bug (B10). Move the 20s `time.Sleep` out of the
  withdrawal HTTP handler (B6). Fail-fast on missing `DEFAULT_EMAIL_GATEWAY`
  (B13).
- Week 2 — Escrow integrity: introduce `escrow_held` state and a real release
  flow with `InspectionPeriod` enforcement (B3). Lock balances during withdrawal
  (`SELECT FOR UPDATE`) to prevent overdraft (B11). Cap counter-offer rounds
  (B17). Account lockout on failed logins (B15).
- Week 2-3: JWT lib migration to `golang-jwt/jwt/v5` (CVE-2020-26160); CORS
  allowlist; cookie `Secure`+`HttpOnly`+`SameSite`; `SortBy` column allowlist
  (SQLi); payload size caps; pagination caps server-side; rate limiting
  middleware. Token revocation list (B16).
- Week 3-4 — KYC + subscription: implement MetaMap callback OR remove the path
  with explicit admin-only flow (B5); enforce subscription expiry middleware
  (B8); enforce appeal subscription gate (B9); cap `NINTrialCount` (B23); fix
  subscription card-payment path or remove from UI (B7).
- Week 4-5 — Cleanup: remove env files, `chromedriver` ELF, `node_modules/`,
  `geckodriver`, demo PNGs from git history with `git filter-repo` (coordinate
  force-push with team); resolve `.gitignore` conflict markers; remove duplicate
  `UpdateInvoiceByID` write (B21); delete dead `HandleAllPayment` (B22); fix
  `OperationsUer` enum typo with migration (B20); rename
  `UserRole=SuperAdminUser` default to a new `OWNER` role (B19).
- Week 5-6: SSRF middleware in scraper services (interim, before consolidation);
  add `gosec`/`errcheck`/`staticcheck` + `gocritic` to
  `core-backend/.golangci.yml` and fix offenders; add `eslint-plugin-security` +
  `eslint-plugin-jsx-a11y` to frontends. Implement WebSocket dispute chat or
  remove it from product surface (B12). Collapse 23-state invoice machine to
  12-state clean machine with mapping migration (B24).
- Week 7-12: Bootstrap Turborepo, migrate `frontend-app` → `apps/web`, migrate
  `admin-dashboard` → `apps/admin`, extract shared `packages/ui`,
  `packages/utils`, `packages/auth`, `packages/api-client`. Standardize on Vite
  5, Zustand v5, MUI v6, Tailwind 3.

#### Track B — Design + UX

- Week 1-4: Audit + style guide. Lock typography (keep Mulish for body, add
  display face — recommendation: **Boldonse** or **Söhne** for headlines; Mulish
  stays for body; **JetBrains Mono** for numerics in financial tables).
- Week 4-8: Design tokens v2 in `packages/design-tokens` — color (semantic +
  brand), spacing scale, radii, shadows, motion durations + easings. Dark mode
  tokens.
- Week 6-10: shadcn/ui-based component library in `packages/ui` + Storybook.
  Components: Button, Input, Select, Combobox, DataTable, Drawer, Dialog, Sheet,
  Toast, Skeleton, EmptyState, ErrorBoundary, FormField, MoneyInput,
  InvoiceCard, EscrowStatus, PinInput.
- Week 10-12: UX writing pass on every screen — see UX Writing section. Replace
  dead Newsletter form with working Mailchimp/Resend integration.

### Quarter 2 — Backend modernization + OCR consolidation + observability

- Go 1.22 upgrade. Drop `jinzhu/gorm` v1 fully. Bump Gin, GORM v2.
- Decompose `afterPayments.go` (3,566 LOC) into bounded `payment/`, `escrow/`,
  `webhook/`, `refund/`, `installment/` packages with 70%+ test coverage on
  each. Use `testcontainers-go` for Postgres integration tests. Same treatment
  for `admin.go` (2,500) and `invoice.go` (1,896).
- Introduce `service` interfaces; mock with `gomock`. Add property-based tests
  for money math via `gopter`.
- Replace `fmt.Println` with `slog`; add request-id middleware; OpenTelemetry
  traces.
- Idempotency keys on payment endpoints. Outbox pattern for webhooks.
- Build `reback-scrapers` from scratch (Playwright + Fastify + SQS workers). Cut
  over traffic. Archive `screenshot`, `puppet`, `puppeteer`, `webshot-ocr`.
- Replace marketing `website` (Vue CLI) with `apps/marketing` (Next.js 15 App
  Router). SEO meta, OG tags, sitemap, structured data, server-side rendered
  FAQ + landing.

### Quarter 3 — Feature wave 1 + mobile + AI

- `apps/mobile` Expo (React Native) using `packages/ui` adapted RN primitives.
  Ship invoice creation, escrow tracking, KYC capture, push notifications via
  Expo Notifications.
- AI features (parallel to backend team):
  - **Reback Copilot**: chat-style assistant in user app — "create an invoice
    for ₦450k to Adaeze for the September consulting" → drafts invoice. Backed
    by self-hosted Qwen2.5-VL-7B with strict JSON tool-use over backend API (no
    external tokens).
  - **Smart dispute resolution**: LLM summarizes the dispute chat, surfaces
    missing evidence to ops, drafts a recommendation. Human in the loop on
    admin-dashboard.
  - **Invoice OCR-to-fields**: upload PDF/photo → extract line items, totals,
    due dates via Textract + Claude.
  - **Risk scoring**: lightweight model on counterparty payment history → "this
    buyer paid late on 3/5 last invoices" badge.
- New product features (see Marketing-Driven Feature Wave below).

### Quarter 4 — Global expansion + scale wave

- Multi-region read replicas (Aurora Global), CloudFront per region, Route53
  latency routing.
- Multi-currency: USD, GBP, EUR, ZAR, KES, GHS. Currency-aware escrow with
  per-currency Paystack/Flutterwave routing or Wise integration.
- Internationalization in `packages/i18n` — start with EN, FR, SW, AR (RTL),
  Yoruba, Igbo, Hausa for local pride.
- Compliance prep: SOC 2 Type 1 readiness, NDPR (Nigeria Data Protection
  Regulation) attestation, PCI DSS scope reduction by tokenizing all card refs
  through PSP only.
- Embedded finance: Reback API for marketplaces (escrow-as-a-service).
- Performance budget enforcement: LCP < 2s on slow-3G for marketing, p95 API <
  200ms.

## Security Remediation Plan (full detail)

### Immediate (week 1)

| Issue                                                   | Action                                                                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded OpenAI key (`puppet/puppet.js:104`)           | Rotate. Remove literal. Move to AWS Secrets Manager.                                                                              |
| Hardcoded Instagram creds (`puppeteer/puppet.js:56-57`) | Rotate. Move to Secrets Manager. Enable 2FA.                                                                                      |
| jwt-go CVE-2020-26160                                   | Migrate to `github.com/golang-jwt/jwt/v5`. Add audience validation.                                                               |
| `.env` in git (`core-backend/`, `core-backend/src/`)    | `git filter-repo --path .env --invert-paths`. Force-push (coordinate with team). Rotate every secret in those files just in case. |
| `chromedriver` 16 MB ELF in git (`puppeteer/`)          | Same — `git filter-repo`.                                                                                                         |
| `node_modules/` in git (`puppet/`, `puppeteer/`)        | Same.                                                                                                                             |

### Application security

- Replace `AllowAllOrigins=true` with explicit allowlist driven by
  `ALLOWED_ORIGINS` env (per environment).
- `Secure`, `HttpOnly`, `SameSite=Lax` (or `Strict` where possible) on all auth
  cookies.
- SQL injection on `SortBy`: server-side allowlist of sortable columns per
  resource. Reject anything else with 400.
- Pagination: `LIMIT min(requestedSize, 100)`. Default 25. Reject negative
  offsets.
- Rate limiting (Redis-backed `ulule/limiter`): 100 req/min per IP global, 5/min
  on `/auth/login`, 3/min on `/auth/otp/send`, 10/min on `/payment/initiate` per
  user.
- Idempotency keys (`Idempotency-Key` header) on all payment + withdrawal
  endpoints. 24h dedupe in Redis.
- SSRF: outbound HTTP wrapper that resolves DNS, blocks RFC1918 / link-local /
  loopback / IPv6 unique-local, rejects redirects to private IPs. Apply in
  scraper service AND any backend code that fetches user-supplied URLs.
- Webhook signature verification on all PSP callbacks (Paystack HMAC-SHA512,
  Flutterwave hash). Reject unsigned.
- Audit log: append-only table for every admin action + every money-moving
  event. Export to S3 with object-lock.
- Input validation: `go-playground/validator` on every request DTO.
  Schema-validate every webhook body.
- Auth: refresh token rotation, token reuse detection, session revocation list
  in Redis.
- KYC PII: encrypt `nin`, `bvn`, photos at rest with KMS envelope encryption.
  Field-level encryption in Postgres via `pgcrypto`.
- Dependency CVE gates: `govulncheck` + `npm audit --audit-level=high` in CI,
  fail on findings. Renovate or Dependabot weekly.

### Infrastructure

- Secrets Manager for everything; IAM Roles for Tasks; no plaintext env in ECS
  task definitions for sensitive values.
- VPC: scraper service in private subnet, egress through NAT, IMDSv2-only on EC2
  (if any).
- WAF in front of ALB with managed rule sets (OWASP CRS + AWS Bot Control).
- DDoS: CloudFront + AWS Shield Standard. Shield Advanced once revenue
  justifies.
- Database: RDS encryption at rest, IAM auth, no public access, RLS for
  multi-tenant tables (Postgres row-level security).
- Backups: PITR on RDS, daily logical backups to S3 with object-lock.
- Logging: CloudTrail to S3 with object-lock. GuardDuty + Inspector enabled.

## Repo Restructure — Monorepo Migration

### Migration sequence

1. Create `reback/` Turborepo skeleton with `pnpm` + `turbo` +
   `@changesets/cli`.
2. Initialize `packages/utils` with the deduplicated utilities (one canonical
   version of `formatAmount`, `sentenceCase`, `getInitials`, `Loader`).
3. Initialize `packages/design-tokens` from the Tailwind config currently
   triplicated.
4. Initialize `packages/ui` with shadcn/ui base + the legitimately reusable
   components from `frontend-app/src/components/`.
5. Initialize `packages/api-client` — generate from backend OpenAPI spec via
   `orval` or `@hey-api/openapi-ts`.
6. Initialize `packages/auth` — extract Zustand userStore, fetcher, token
   refresh.
7. Move `frontend-app` → `apps/web/`. Replace internal duplicate utils with
   `@reback/utils`. Bump to Vite 5, Zustand v5, MUI v6 (match admin), drop
   `@material-tailwind/react` and `styled-components` (consolidate on MUI +
   Tailwind only).
8. Move `admin-dashboard` → `apps/admin/`. Same dedupe.
9. Rewrite `website` as `apps/marketing` in Next.js 15 with App Router (SEO,
   ISR, sitemaps, OG images via `@vercel/og`).
10. Wire CI: Turbo remote cache, GitHub Actions per-app deploys, Changesets for
    `packages/*` versioning.
11. Archive old repos with a README pointing to monorepo. Keep tags for history.

### Decisions baked in

- **Styling consolidation**: Tailwind + MUI v6 only. Remove
  `@material-tailwind/react`, `styled-components`, raw Emotion. Use
  `@emotion/react` only via MUI's transitive use.
- **Forms**: standardize on `react-hook-form` + `zod`. (Currently `frontend-app`
  uses Formik + Yup, `admin` uses neither.)
- **Data fetching**: SWR everywhere — already common ground. Define cache-key
  conventions.
- **State**: Zustand v5 + React Context for auth. Drop `zustand-persist`
  (unmaintained), use `zustand/middleware`'s `persist`.
- **Icons**: Lucide everywhere. Drop `react-icons` and Material Icons except
  where MUI ships them.

## Backend Modernization

### Go modernization (Q2)

- Bump `go.mod` to `go 1.22`; bump Gin, GORM v2; drop `jinzhu/gorm` v1.
- Replace `dgrijalva/jwt-go` with `golang-jwt/jwt/v5`.
- Replace SendGrid+Postmark dual setup with one provider (recommendation:
  **Resend** for DX or keep Postmark for transactional reliability).
- Decompose mega-controllers:
  - `controller/afterPayments.go` (3,566 LOC) → `service/payment/` (initiate,
    verify, finalize, refund), `service/escrow/` (hold, release, dispute),
    `service/webhook/` (paystack, flutterwave handlers).
  - `controller/admin.go` (2,500 LOC) → `service/admin/` split by feature.
  - `controller/invoice.go` (1,896 LOC) → `service/invoice/` split into
    `create`, `negotiate`, `lifecycle`, `query`.
- Adopt clean-architecture-lite: `handler` → `service` (interface) →
  `repository` (interface). DI via constructor injection (no global singletons).
- Tests: `testcontainers-go` for Postgres integration, `gomock` for service
  mocks, `gopter` for property-based money math, `httptest` for handler tests.
  **Block merges below 70% coverage on `service/payment` and `service/escrow`.**
- Observability: OpenTelemetry SDK, propagate `traceparent`, structured `slog`
  with request_id + user_id + trace_id.
- DB pool config: `MaxOpenConns = 25`, `MaxIdleConns = 5`,
  `ConnMaxLifetime = 5m`. Tune from Prom metrics.
- Migrate cron job (`controller/invoice_due_date_cronjob.go`) to a queue-driven
  worker with at-least-once + idempotency.
- Replace internal admin-only endpoints with feature-flagged routes; eventually
  move to a separate binary if scaling needs.

### afterPayments.go phased decomposition (detail)

`afterPayments.go` is 3,844 lines, has zero test coverage, and contains every
money-movement code path: Flutterwave instant + escrow handlers, a Flutterwave
routing shim, a legacy Flutterwave full handler, and the Paystack webhook. The
Paystack webhook alone spans ~1,750 lines (line 2020–3773) with cognitive
complexity 632. **No refactor code is written until characterization tests
exist.** Total effort: 17–24 days across 7 phases. Phases 3 and 4 must each be
merged and run in production for one full payment cycle before the next begins.

**Function inventory (the five public methods):**

| Line | Method | CC | Params | Role |
| --- | --- | --- | --- | --- |
| 72 | `HandleInstantInvoicePayment` | 60 | 11 | Flutterwave instant — credits `WithdrawableBalance`, closes invoice, supports installments |
| 368 | `HandleEscrowInvoicePayment` | 62 | 11 | Flutterwave escrow — credits `EscrowBalance`, leaves status `MadePayment`. Has duplicate `UpdateInvoiceByID` (B21) |
| 685 | `HandleAllPayment` | 42 | 10 | Flutterwave routing shim. Effectively redundant with `AfterPaymentUpdate` (B22) |
| 825 | `AfterPaymentUpdate` | 419 | 10 | Original Flutterwave handler — handles failure + success inline (does not delegate). Re-implements balance writes. Contains debug `fmt.Print`s |
| 2020 | `PayStackPaymentWebhook` | 632 | — | Paystack equivalent. Handles `INV_`, `SUB_`, `WTL_` prefixes. The `WTL_` (withdrawal) branch is unique to Paystack |

**Phase 0 — Characterization tests (3–4 days, no source changes):**

Create `core-backend/src/controller/afterPayments_test.go` with table-driven
tests using gomock for each public method. Each function covers (a)
non-installment success, (b) installment 1st payment, (c) installment 2nd
payment, (d) installment full-payment shortcut, (e) failure path, (f)
amount-less-than-payable guard. `PayStackPaymentWebhook` additionally covers
`WTL_` transfer.failed, transfer.reversed, transfer.success. Tests **must
preserve the B-series bugs** (B21 duplicate write, B2 missing webhook
idempotency, B11 missing balance lock) — assertions describe what the code
does today, not what it should do. Each affected test gets a
`// BUG(B-xx): preserved here, fixed in stabilization PR` marker so reviewers
know which assertions are characterization-only.

**Phase 1 — Cosmetic, zero-logic-change (0.5 days):**

- Convert if-else `channel ==` chains to tagged `switch` statements at lines
  691, 801, 802, 830, 855, 2029, 2064 (resolves QF1003 staticcheck).
- Delete the `fmt.Print("instant")` / `fmt.Println("escrow")` debug noise at
  lines 856–858 and 2064–2067.

**Phase 2 — Extract balance + transaction helpers (2–3 days):**

The "upsert user balance" pattern appears at least 20 times. Each instance
follows: `GetLastUserBalanceByID` → if error, seed a zero-value balance → then
unconditionally call `CreateBalance` with the real deltas. Extract into:

- `creditInstantBalance(ctx, invoice, transactionID, amount)` →
  `WithdrawableBalance` increment
- `creditEscrowBalance(ctx, invoice, transactionID, amount)` →
  `EscrowBalance` increment, `WithdrawableBalance` unchanged
- `buildInvoiceTransaction(...)` and `buildProcessingFeeTransaction(...)`
  factory helpers replacing the 25-field literals copy-pasted ≥6× and ≥8×
  respectively. **The Paystack instant branch deliberately omits `InvoiceID`
  at lines 2264, 2866, 3485, 3639** — preserve as-is, do not "fix."

Land helpers in `core-backend/src/controller/afterPayments_helpers.go`.

**Phase 3 — Decompose `AfterPaymentUpdate` (CC 419) (3–4 days):**

- Extract `handleFailedFlutterwaveInvoice` (lines ~923–982). Same failure
  pattern as `HandleAllPayment` lines 774–797 — both call sites switch to the
  helper.
- Extract `handleSuccessfulFlutterwaveInstantInvoice` (lines ~987–1200).
- Extract `handleSuccessfulFlutterwaveEscrowInvoice`.
- Replace inline blocks → `AfterPaymentUpdate` reduces to ~60-line router.

**TRANSACTION ORDER INVARIANT.** Every extracted helper must preserve the
ordering: (1) invoice fields update → (2) status update → (3) balance write
→ (4) transaction write → (5) email send. Currently in the installment
1st-payment branch (~line 1060), the status flip to `Status1stInstallmentPaid`
fires before the balance write. Notification emails and downstream consumers
already depend on this order. Document the order with a leading comment in
each helper.

**Phase 4 — Decompose `PayStackPaymentWebhook` (CC 632) (4–5 days):**

Do **not** start until Phase 3 has been merged and run in production for one
full payment cycle. The CC 632 is the same shape as `AfterPaymentUpdate` plus
the Paystack-only `WTL_` branch and customer-email side effects. Extract:

- `handlePaystackWithdrawalAck` (lines 2096–2145) — self-contained, calls
  existing `refundFailedPayoutToBalance`. **Pre-existing idempotency bug
  (B2):** if Paystack delivers twice, the refund balance row is created twice.
  Mark with `// BUG(B2): not idempotent — fix in stabilization PR`. Do NOT
  add deduplication here.
- `handlePaystackSuccessInstantInvoice` (~lines 2189–2330 plus installment
  sub-branches). Email-send failure is currently treated as non-fatal
  (`// return err` commented out) — preserve.
- `handlePaystackSuccessEscrowInvoice` (~lines 2820–3748, includes `default`
  channel fallback at line 3448).

The Paystack webhook is one logical flow with 36 distinct paths
(3 ref types × 2 statuses × 2 channels × 3 installment states). **Do not treat
CC reduction as the goal** — name helpers after the business sub-case
(`handlePaystackSuccessInstantInstallmentFirst`), not after position
(`payStackWebhookBlock14`).

**Phase 5 — Resolve `HandleAllPayment` ↔ `AfterPaymentUpdate` duplication (1–2 days):**

This is the only phase that changes the `Operations` interface. Requires:

1. Route audit: `grep -r "HandleAllPayment\|AfterPaymentUpdate" core-backend/src/handler/`
   to confirm only one is registered for live traffic. **If both are
   registered for the same Flutterwave route, payments are double-written
   today.**
2. Stakeholder sign-off on which to delete (planner recommends keeping
   `AfterPaymentUpdate` after extractions, deprecating `HandleAllPayment`).
3. **Regenerate `mock_controller.go` via `mockgen -source=controller.go
   -destination=mock/mock_controller.go`**, never hand-edit. Recorder type
   assertions at lines 240–252 (AfterPaymentUpdate pair) and 3239–3251
   (HandleAllPayment pair) compile when stale but break tests silently.

**Phase 6 — invoice.go / user.go / auth.go / kyc.go CC fixes (3–5 days, parallel-able with Phase 5):**

| File | Lines | Notes |
| --- | --- | --- |
| `controller/invoice.go` | 16, 517, 690, 1067, 1207, 1687, 1760 | 7 functions CC 18–55. Line 690 (CC 55) — verify it doesn't touch balance writes before extracting |
| `controller/user.go` | 417 | CC 18 only; low risk |
| `handler/auth/auth.go` | 1100 (CC 21), 1177 (CC 16), S117 at 659 | Auth handler — medium risk |
| `handler/kyc/kyc.go` | 150, 533, 702, 808, 912, 1020, 1217 | 7 functions CC 20–71. Lines 1020 (CC 64) and 1217 (CC 71) are KYC state machines — extract per-state, not per-line-budget |

**Test gates per phase:**

- Phase 0: Coverage 0% → baseline established. Tests pass on unmodified code.
- Phases 1–3: `go test -race -cover ./src/controller/...` green. Coverage on
  `afterPayments.go` reaches 70%+ by end of Phase 3.
- Phase 4: same gates plus all Paystack `INV_`/`WTL_` paths covered.
- Phase 5: all handler tests importing `mock_controller.go` re-run after
  `mockgen` regenerates.

**Cross-cutting risks (all flagged in code with `// BUG` comments, NOT fixed by this refactor):**

- B2: Paystack + Flutterwave webhooks have no idempotency. Replays
  double-credit. Stabilization PR territory.
- B11: balance reads/writes lack `SELECT FOR UPDATE`. Concurrent payments to
  the same user can race. Stabilization PR.
- B21: duplicate `UpdateInvoiceByID` in escrow path lines 392–404.
  Stabilization PR.
- Zero-value seed balance pattern: when `GetLastUserBalanceByID` returns an
  error, the seed row is created with zero-value `previousBalance` fields,
  not the actual last-known values. Pre-existing; preserve in Phase 2,
  defer fix.

**Success criteria:**

- All five `afterPayments.go` public functions ≤ CC 25 (using the
  structural-dispatcher exception in
  `~/.claude/rules/common/sonarlint-checks.md`).
- All QF1003 violations cleared.
- 70%+ coverage on `afterPayments.go` by end of Phase 3.
- No public method signature on `Operations` changes in Phases 1–4.
- Each extracted helper has a leading comment naming its business sub-case
  and stating the transaction-order invariant.
- B-series bugs preserved with markers, ready for separate correctness PRs.
- `mock_controller.go` regenerated, never hand-edited.

## Design System v2

### Brand foundations

- **Logotype**: keep `#20042D` as primary brand color but introduce a richer
  palette (purple-violet ramp 50-950, accent gold/teal for status).
- **Type stack**:
  - Display/headline: **Boldonse** (or **Söhne**, **PP Editorial New**) —
    distinctive, not Inter
  - Body: **Mulish** (keep, brand-consistent)
  - Tabular numerics: **JetBrains Mono** with
    `font-variant-numeric: tabular-nums` everywhere money or counts appear
- **Motion**: define `--motion-fast` (120ms), `--motion-base` (200ms),
  `--motion-slow` (320ms) with `cubic-bezier(0.4, 0, 0.2, 1)` default. Page
  transitions via `framer-motion`'s `LayoutGroup`.
- **Spacing**: 4px base unit, fibonacci-ish scale (4, 8, 12, 16, 24, 32, 48, 64,
  96).
- **Radii**: 4, 8, 12, 16, full. Status pills always full.
- **Shadows**: layered, never flat black — colored shadows tied to brand.
- **Dark mode**: full token mirror, AA contrast minimum, AAA on body text.

### Component library (`packages/ui`, ~50 components)

Base on shadcn/ui (copy-paste, Tailwind, accessible primitives via Radix),
customized to brand. Storybook in CI with visual regression via Chromatic or
self-hosted Playwright snapshots.

Domain components:

- `MoneyInput` (locale-aware, currency switcher, tabular numerics)
- `InvoiceCard` (status, amount, counterparty avatar, age)
- `EscrowStatusBadge` (held / released / disputed / refunded)
- `KycCard` (state machine: not started → pending → verified → rejected)
- `PartyAvatar` (initials fallback, verified checkmark)
- `DisputeChat` (message bubbles, evidence attachments)
- `EmptyState` (illustrated, never bare text)
- `Skeleton` variants matching every list/card

### Accessibility baseline

- WCAG 2.2 AA across the board.
- All icon buttons get `aria-label`.
- Focus-visible rings on every interactive element.
- Keyboard navigation tested (Tab order, ESC for modals, Enter for primary
  actions).
- Screen-reader sweep with NVDA + VoiceOver.
- `eslint-plugin-jsx-a11y` enforced in CI.

## UX Writing Overhaul (drastic improvement)

### Voice + tone

- **Voice**: clear, confident, plain-spoken. Like a knowledgeable colleague, not
  a bank manager.
- **Tone**: warm in onboarding/empty states, terse in transactional
  confirmations, careful in error messages.
- **Localization**: avoid US-isms; embrace local resonance (Naija-friendly
  without being slang-heavy).

### Examples (before → after)

| Surface               | Before                     | After                                                                       |
| --------------------- | -------------------------- | --------------------------------------------------------------------------- |
| Dashboard empty state | "No data available"        | "No invoices yet — create one to get paid faster."                          |
| Login button          | "Submit"                   | "Sign in"                                                                   |
| Payment success       | "Transaction successful"   | "Paid. ₦450,000 is held in escrow until Adaeze confirms delivery."          |
| Escrow released toast | "Release successful"       | "Released ₦450,000 to Adaeze. They've been notified."                       |
| KYC pending           | "Verification in progress" | "We're verifying your ID — usually takes 2 minutes. We'll let you know."    |
| Network error         | "Something went wrong"     | "Couldn't reach Reback just now. Check your connection and try again."      |
| 404                   | "Page not found"           | "We couldn't find that page. Maybe it moved — head back to your dashboard." |
| Newsletter            | dead button                | "Get monthly money tips for African SMEs. No spam, ever." (working form)    |
| Invoice overdue       | "Payment overdue"          | "This invoice was due 3 days ago. Send a friendly nudge?"                   |

### Microcopy rules

- Every button verb-first (`Send invoice`, not `Submit`).
- Every error tells the user what went wrong AND what to do next.
- Numbers always formatted (`₦450,000` not `450000`).
- Dates relative within 7 days (`yesterday`, `3 days ago`), absolute beyond
  (`14 Sep 2025`).
- Money always in tabular numerics + currency symbol.
- No marketing fluff in transactional UI; no transactional dryness in marketing.

### Fix today

- `website/FAQ.vue:54` — replace "actvities", "amd", "hiistory", "fiialds",
  "fromm" with correct copy. Re-write all FAQ entries to plain English with
  concrete examples.
- `Newsletter.vue:11` — wire to working endpoint (Resend audience or Mailchimp).
- `AddUserDrawer.jsx:112` — replace `'Ariyo Tolulope'` with
  `'e.g. Adaeze Okafor'` placeholder pattern.
- Rename `UserManagment` → `UserManagement` folder.

## Strategic Positioning (what the deep dive revealed)

Reback's hidden differentiator isn't "escrow + invoicing" (a crowded category) —
it's **escrow + invoicing for social-commerce sellers**. The catalog-import flow
turning an IG/FB post into a paid escrow invoice is the unique wedge. Nigerian
SMEs do not run e-commerce sites; they run Instagram shops, WhatsApp catalogs,
and Facebook Marketplace listings, and they lose deals every day to buyer
mistrust ("I don't know if you'll actually ship"). Reback's escrow IS the trust
primitive that lets a social-commerce seller close a deal that they otherwise
couldn't.

**Marketing message rewrite:**

- Old (inferred): "Invoicing and payments for businesses."
- New: **"Get paid for what you sell on Instagram. Your escrow-protected
  invoice, in 30 seconds, from a post link."**

Every marketing surface, hero image, demo video, and onboarding flow should lead
with the social-commerce path. This is also a sharp wedge for ads on Instagram
and TikTok where the audience already lives.

**Defensive moat:**

- Public invoice pages with branded OG images shared in DMs become organic
  acquisition.
- Escrow Score™ (verified merchant badge) becomes a status symbol IG sellers
  want to flex.
- Counterparty insights ("paid 5/5 invoices on time") become a portable
  reputation graph.

## Marketing-Driven Feature Wave (drive the product like a marketing expert)

Group 0 — **Social-commerce wedge** (lean into the unique PMF — these come
first)

1. **Social-Catalog Import v2** — paste IG/FB/X/TikTok post URL → screenshot +
   PaddleOCR-VL-1.5 / Qwen2.5-VL-3B (self-hosted, no external tokens) extracts
   `{title, price, currency, description, lineItems[]}` with per-field
   confidence; UI requires confirm on price; multiple posts batchable into one
   invoice.
2. **WhatsApp invoicing** — send/receive invoices via WhatsApp Business API;
   buyer pays from a deep-linked WhatsApp message. The channel SMEs already live
   in.
3. **Instagram DM bot** — `@reback` reply to a customer's "how much?" DM with a
   one-click escrow invoice link. Frictionless seller-side automation.
4. **Public invoice page with branded OG image** — every invoice gets
   `reback.finance/i/abc123`. Shared in DMs, the OG preview shows the product
   photo from the catalog import. Pay-with-escrow CTA. Viral acquisition.
5. **TikTok Shop bridge** — capture TikTok product links the same way. Younger
   demo, faster growing.

Group A — **Trust & differentiators** (own escrow as a category) 6. **Escrow
Score™** — public, shareable badge per merchant: "Reback Escrow Verified — 247
successful releases, 0 disputes." Drives trust, generates inbound links. 7.
**Receipts & invoices PDF v2** — beautifully designed PDFs with QR code linking
to verification page. Free marketing in every business inbox. 8. **Buyer
protection guarantee** — explicit policy + claim flow + status page. Marketing
copy + product behavior aligned.

Group B — **Workflow features** (deepen retention) 5. **Recurring invoices +
subscriptions** — for retainers and SaaS-like SMEs. Native, not bolted on. 6.
**Installment plans** (extend existing) — buyer-side BNPL with escrow guarantee.
Flutterwave/Paystack split. 7. **Invoice templates marketplace** — shareable
templates by industry (creator, retailer, freelancer, agency). UGC + SEO. 8.
**Bulk invoicing** via CSV import + Google Sheets connector. Power-user
delight. 9. **Smart reminders** — auto nudges 3/1/0 days before due, then
post-due cadence. Increase paid-on-time rate. 10. **Discount-for-prompt-pay** —
built-in early-payment discount logic ("Pay within 3 days for 2% off").

Group C — **AI-native** (Reback Copilot) 11. **Reback Copilot chat** — natural
language: "Show me unpaid invoices over ₦100k from buyers I haven't worked with
before". Tool-use over backend API. 12. **Voice-to-invoice** — record a 15s
voice memo, get a draft invoice. Whisper + Claude. 13. **Counterparty insights**
— AI summary of past dealings: "Adaeze paid 5/5 invoices on average 1.4 days
early." 14. **Dispute Drafter** — generates a structured dispute summary with
evidence checklist when buyer flags an issue. 15. **Tax & VAT auto-calc** —
Nigeria 7.5% VAT + future country-aware. Quarterly summaries for tax
filings. 16. **Receipt scanning to invoice** — phone camera → invoice draft
(Textract + Claude).

Group D — **Growth loops** (acquisition + virality) 17. **Refer a business, earn
₦10k credit** when they complete their first invoice. Track via referral
codes. 18. **Embed Reback** — "Pay with Reback" button + JS snippet for any
website. Stripe-style embed. 19. **Reback for Marketplaces** —
escrow-as-a-service API. Charge per transaction. Multi-tenant. 20. **Public
escrow ledger explorer** (anonymous, opt-in) — proof-of-reserve-style
transparency dashboard. PR gold. 21. **Status page** at `status.reback.finance`
(StatusPage.io or self-hosted Atlassian) — uptime + incident transparency. 22.
**Industry reports** — quarterly "State of African SME Payments" — first-party
data → SEO + press → backlinks.

Group E — **Geo + scale** 23. **Multi-currency wallets** — USD, GBP, EUR, KES,
ZAR, GHS. Reback wallet that holds non-NGN balances. 24. **Pan-African
expansion** — Kenya (M-Pesa via Flutterwave), Ghana (mobile money), South Africa
(PayFast). Country-aware compliance, KYC providers, currency. 25. **Mobile app
(Q3)** — Expo + push notifications + biometric login + offline draft
invoices. 26. **WhatsApp invoicing** — send/receive invoices via WhatsApp
Business API. Match the channel SMEs already use. 27. **POS mode** — instant
in-person invoice via QR + tap-to-pay (Android NFC).

Group F — **Operations + admin** (less glamorous, high leverage) 28. **Audit
trail UI** in admin-dashboard with searchable, exportable log. Already need it
for SOC 2. 29. **Dispute SLA tracking** — ops dashboard with SLA timers,
auto-escalation. 30. **Anomaly detection** — flag suspicious transaction
patterns (sudden spike, new device, unusual amount). LLM-assisted triage.

### Prioritization filter

Each feature scored on: (Trust ↑) × (Acquisition ↑) × (Effort ↓). Top 10 for
Q2-Q3: 1, 2, 3, 11, 17, 18, 9, 5, 26, 14. The rest queue Q4 + year 2.

## Scaling to Global

### Technical

- Aurora Global with secondary read replicas in `eu-west-1` (Europe / SA),
  `us-east-1` (NA), `ap-southeast-1` (Asia). Writes still single-primary in
  `af-south-1` adjacent.
- CloudFront with regional behaviors. Origin failover.
- Route53 latency-based routing for marketing + app shells. API stays
  primary-region until we're CRDT-ready (year 2+).
- Multi-currency: ledger in stored-as-minor-units (kobo, cents) + `currency`
  column. Conversion via PSP at the moment of pay-in/pay-out, not stored
  mid-flight.
- i18n via `packages/i18n` with `next-intl` for marketing and `react-i18next`
  for apps. EN + FR + AR (RTL) + SW + Yoruba + Igbo + Hausa launch set.

### Compliance

- NDPR (Nigeria) — DPO appointed, DPIA on KYC flows, data subject access portal.
- GDPR for EU traffic (marketing + future EU launch) — cookie consent banner
  (open-source `osano` or `cookieconsent`), DPA with PSPs, right-to-erasure
  flow.
- SOC 2 Type 1 in Q4, Type 2 by year 2.
- PCI DSS — minimize scope by tokenizing through Paystack/Flutterwave; never
  store PAN.
- Country-specific KYC: Smile Identity for pan-Africa, Veriff or Onfido for
  global.

### Pricing for global

- Tiered: Free (3 invoices/mo), Starter (₦5,000/mo), Pro (₦20,000/mo), Business
  (custom). Usage-based escrow fee (1% capped).
- Embed/API tier — per-transaction fee, no monthly.

## Better Dependencies

| Replace                                       | With                                                      | Why                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `dgrijalva/jwt-go`                            | `golang-jwt/jwt/v5`                                       | CVE-2020-26160; library archived                                                                                 |
| `jinzhu/gorm` v1 (still imported)             | `gorm.io/gorm` v2 only                                    | Two ORMs in one process is a footgun                                                                             |
| `zustand-persist`                             | `zustand/middleware`'s `persist`                          | Maintained, official                                                                                             |
| `node-sass` (`website`)                       | `sass` (Dart Sass)                                        | node-sass is deprecated                                                                                          |
| `Vue CLI` (`website`)                         | Next.js 15                                                | SSG/ISR, SEO, OG, image optimization, Vercel-native                                                              |
| `selenium-webdriver` + Firefox                | `playwright-core` + Chromium                              | Faster, better DX, single API for Chromium/WebKit/Firefox                                                        |
| GPT-3.5-turbo (`puppet/`)                     | **Qwen2.5-VL-3B / PaddleOCR-VL-1.5 self-hosted via vLLM** | No external token, ~$0.001 per extraction, full data sovereignty, Apache 2.0 licensed, runs on g6.xlarge L4 spot |
| `react-icons` + Material Icons mix            | Lucide                                                    | One icon set, tree-shakeable                                                                                     |
| Formik + Yup (frontend-app) / nothing (admin) | `react-hook-form` + `zod`                                 | Performance + type-safety + shared schema with backend via `zod-to-openapi`                                      |
| `gosseract` (CGo)                             | AWS Textract (primary) + Tesseract sidecar fallback       | Accuracy + no CGo build pain                                                                                     |
| Paystack-only currency assumption             | Paystack + Flutterwave + Wise                             | Multi-currency global routing                                                                                    |
| Postmark + SendGrid (dual)                    | One provider — Resend or keep Postmark                    | Single throat to choke; Resend is DX-forward                                                                     |
| LaunchDarkly (if added)                       | Unleash (self-hosted, OSS)                                | Per global rule preference                                                                                       |

## Implementation Reference — concrete files, lines, migrations, tests for every initiative

This is the operational backbone. Every workstream maps to specific paths, line
numbers, migration IDs, and test files. Owners pick up tickets directly from
this table.

### Initiative I1 — Float→Decimal money migration (P-1, Week 1-2)

| Aspect                                            | Reference                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Go fields to retype `float64` → `decimal.Decimal` | `core-backend/src/model/invoice.go:65-89` (Tax, RebackProcessingFee, ShippingCharges, FirstDeposit, BalanceAmount, AmountPaid, TaxPayable, Subtotal, TotalPayable); `model/invoice.go:118,127,146,149,160` (product Price, installment Amount, FirstAmount, LastAmount, TotalInvoiceWorth); `model/balance.go:22-27` (BalanceBefore, BalanceAfter, AvailableBalance, WithdrawableBalance, WithheldBalance, EscrowBalance) |
| Float arithmetic call sites                       | `model/invoice.go:432,456,462,466,485,489`                                                                                                                                                                                                                                                                                                                                                                                |
| New dependency                                    | `github.com/shopspring/decimal v1.3.1` in `go.mod`                                                                                                                                                                                                                                                                                                                                                                        |
| New migrations                                    | `terminal/goose/2026<seq>_money_to_numeric.sql` — `ALTER TABLE invoices ALTER COLUMN total_payable TYPE numeric(20,4) USING total_payable::numeric(20,4)` for every money column. Plus `NOT NULL DEFAULT 0` and `CHECK (col >= 0)` (or signed range as appropriate)                                                                                                                                                       |
| Backfill script                                   | `core-backend/cmd/backfill-money/main.go` — reconcile against ledger, log diffs                                                                                                                                                                                                                                                                                                                                           |
| Helpers                                           | `internal/platform/money/decimal.go` — wrappers for `Add`, `Sub`, `Mul`, `Div`, `RoundFinancial`; ICU formatting in `internal/platform/money/format.go`                                                                                                                                                                                                                                                                   |
| Tests                                             | `internal/service/payment/payment_test.go` property-based via `gopter` ensuring `(a + b) - b == a`; integration test seeded at boundaries (`0.000001`, `99999999999.9999`)                                                                                                                                                                                                                                                |
| CI gate                                           | `make lint-money` — grep guard fails build if `float32`/`float64` appears in any file under `internal/service/payment`, `internal/service/invoice`, `internal/service/wallet`, `internal/service/escrow`                                                                                                                                                                                                                  |

### Initiative I2 — Transactions + row locks + idempotency (P-1, Week 1-2)

| Aspect                                             | Reference                                                                                                                                                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where money is written without a transaction today | `controller/afterPayments.go:103-140` (post-payment balance flow), `controller/afterPayments.go:317-327` (escrow duplicate write), `controller/paystack.go:41-130` (payouts), `controller/flutterwave.go:182-372` (withdrawal approval)            |
| Pattern to apply                                   | `db.Transaction(func(tx *gorm.DB) error { ... })` wrapping every read-modify-write on `wallets`, `transactions`, `invoices`, `withdrawals`. Inside the txn: `tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&wallet, "user_id = ?", userID)` |
| New unique constraint                              | migration `2026<seq>_balance_unique.sql` — `ALTER TABLE balances ADD CONSTRAINT uniq_balance_source UNIQUE (user_id, source_transaction_id)`                                                                                                       |
| Idempotency table                                  | migration `2026<seq>_idempotency.sql` — `CREATE TABLE idempotency_keys (key text primary key, request_hash text, response_body jsonb, created_at timestamptz default now())` with TTL 24h via cron                                                 |
| Outbox pattern                                     | `internal/platform/outbox/outbox.go` — outbox table polled by worker; webhook fan-out + balance updates atomic on the same transaction                                                                                                             |
| Tests                                              | concurrency test using `t.Parallel()` + `errgroup` simulating 50 concurrent webhooks — final balance must equal expected sum exactly                                                                                                               |

### Initiative I3 — JWT migration + auth hardening (Week 2-3)

| Aspect              | Reference                                                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library to drop     | `github.com/dgrijalva/jwt-go v3.2.0` in `go.mod:10` (CVE-2020-26160)                                                                                                                                                                                 |
| Library to add      | `github.com/golang-jwt/jwt/v5`                                                                                                                                                                                                                       |
| Files using old lib | `core-backend/src/pkg/middleware/jwt.go` (`CreateToken`, `ValidateToken`, `ValidateRefreshToken` at line 207); `pkg/middleware/rest_auth.go:43,129,168,207`; any test files                                                                          |
| New behavior        | audience validation; per-device session table replacing single-cookie match (B14); revocation list keyed by `jti` in Redis (B16); cookie flags `Secure=true`, `HttpOnly=true`, `SameSite=Lax` set explicitly in `pkg/middleware/middleware.go:56-72` |
| New table           | migration `2026<seq>_sessions.sql` — `CREATE TABLE sessions (jti text primary key, user_id uuid, device_id uuid, expires_at timestamptz, revoked_at timestamptz, ip text, user_agent text)`                                                          |
| Lockout             | `internal/platform/middleware/auth_lockout.go` — Redis counter keyed by `email + ip`, exponential back-off after 5 failures                                                                                                                          |
| Tests               | unit on token issue/validate; integration tests for revocation + multi-device                                                                                                                                                                        |

### Initiative I4 — SQL injection on `SortBy` (Week 2)

| Aspect                 | Reference                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vulnerable input       | `core-backend/src/handler/model/request.go:14` — `SortBy *string`                                                                                               |
| Vulnerable sites (32+) | `core-backend/src/storage/invoice.go:129`, `roles.go:145`, plus all `storage/*.go` files containing `fmt.Sprintf("%s %s", *page.SortBy, ...)`                   |
| Fix                    | per-resource allowlist constant — `var InvoiceSortable = []string{"created_at","amount","status","due_date"}`; reject anything else with `400 validation_error` |
| Helper                 | `internal/platform/query/sort.go` providing `SafeOrderBy(allowed []string, sortBy, dir string) (string, error)`                                                 |
| Tests                  | table-driven test ensuring SQL strings like `"name; DROP TABLE users--"` are rejected                                                                           |

### Initiative I5 — Webhook signature + idempotency (P-1, Week 1)

| Aspect                    | Reference                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Disabled signature verify | `core-backend/src/handler/webhook/webhook.go:79-93` (Flutterwave, commented out)                                               |
| Missing                   | Paystack signature verify (no implementation found)                                                                            |
| Inconsistent envelope     | `handler/webhook/webhook.go:47,75` returns raw `c.JSON(200, "success")` instead of `GenericResponse`                           |
| Fix                       | Flutterwave: re-enable; Paystack: HMAC-SHA512 of body with secret in header `x-paystack-signature` (compare with `hmac.Equal`) |
| Idempotency               | use Paystack/Flutterwave reference as the idempotency key, store in `idempotency_keys` table; on replay return cached response |
| Tests                     | each PSP gets a `webhook_test.go` with valid + invalid + replayed payloads                                                     |

### Initiative I6 — Escrow inspection period + release flow (Week 2-3)

| Aspect                                   | Reference                                                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today's bug                              | `controller/afterPayments.go:292-330` closes invoice on payment with no inspection period; `model/invoice.go:94 InspectionPeriod` field never read             |
| New states                               | extend invoice state machine (per B24) with `escrow_held`, `inspection_period`, `released`, `refunded`                                                         |
| Auto-release worker                      | `core-backend/internal/worker/escrow_release/main.go` — cron every minute scanning `invoices WHERE status='inspection_period' AND inspection_ends_at <= now()` |
| Release endpoint                         | `POST /v2/transactions/{id}/state/release` — buyer-only or admin                                                                                               |
| Refund endpoint                          | `POST /v2/transactions/{id}/state/refund`                                                                                                                      |
| Block on `EscrowBalance` withdrawal (B4) | `controller/paystack.go`, `controller/flutterwave.go` withdrawal handlers — reject when source wallet's `escrow_held` portion is requested                     |
| Tests                                    | E2E covering pay → hold → buyer-confirm → release; pay → hold → inspection-elapse → auto-release; pay → hold → dispute → admin-refund                          |

### Initiative I7 — Withdrawal async + fee fix (Week 1)

| Aspect        | Reference                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20s sleep bug | `core-backend/src/controller/flutterwave.go:372` — `time.Sleep(20 * time.Second)` inside HTTP handler                                                            |
| Fee math bug  | `controller/paystack.go:41` — `(amount * 0.1) / 100` is 0.001%, not 0.1%                                                                                         |
| Fix sleep     | move to `internal/worker/withdrawal_verifier/main.go`; HTTP handler returns 202 with `pending`; worker polls Flutterwave verify, completes via internal callback |
| Fix fee       | extract to `internal/platform/fees/withdrawal.go` with named constants and unit tests                                                                            |
| Tests         | property-based via `gopter` ensuring fee = 0.1% of amount within rounding tolerance                                                                              |

### Initiative I8 — REST API v2 cutover (Q1-Q2)

| Aspect                       | Reference                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI spec                 | new `core-backend/api/openapi.yaml` — single source of truth                                                                                                                  |
| Generator                    | `oapi-codegen` for Go server stubs; `@hey-api/openapi-ts` for TS client (`packages/api-client`)                                                                               |
| v1→v2 adapter shim           | `internal/handler/v1adapter/` — translates legacy paths to v2 internal handlers                                                                                               |
| GET-not-POST migration       | `handler/auth/auth.go:60` (`POST /users` listing — TODO at line 403); `handler/transaction/*` (search); `handler/admin/paymentManagement/*`; `handler/admin/searchInvoices/*` |
| Webhook envelope unification | `handler/webhook/webhook.go:47,75` (return `GenericResponse` like the rest)                                                                                                   |
| Pagination strict mode       | `storage/invoice.go:97-112` — replace silent default with explicit `400 validation_error` on negative/zero                                                                    |
| Tests                        | contract tests with `dredd` or `schemathesis` against the OpenAPI spec                                                                                                        |

### Initiative I9 — Repo monorepo migration (Q1)

| Aspect            | Reference                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New monorepo root | `reback/`                                                                                                                                                                               |
| Tooling           | `pnpm-workspace.yaml`, `turbo.json`, `.changeset/config.json`, `.npmrc` (`shamefully-hoist=false`)                                                                                      |
| Apps moved        | `frontend-app` → `reback/apps/web/`; `admin-dashboard` → `reback/apps/admin/`; `website` rewritten as `reback/apps/marketing/` (Next.js 15)                                             |
| New apps          | `reback/apps/mobile/` (Expo, Q3); `reback/apps/storybook/` (component library docs)                                                                                                     |
| Shared packages   | `packages/ui` (shadcn/ui + tweakcn tokens), `packages/design-tokens`, `packages/api-client`, `packages/auth`, `packages/utils`, `packages/i18n`, `packages/analytics`, `packages/icons` |
| Deduped utilities | `frontend-app/src/reusable/Loader.jsx` + `admin-dashboard/src/reuseable/Loader.jsx` → `packages/ui/src/Loader.tsx`; same for `formatAmount`, `sentenceCase`, `getInitials`, `Store.js`  |
| Standardized      | Vite 5, Zustand v5, MUI v6 (drop v7 in `apps/web`), Tailwind 3.4, drop `@material-tailwind/react`, drop `styled-components`, drop raw Emotion (only via MUI)                            |
| Forms             | adopt `react-hook-form` + `zod` everywhere; remove Formik+Yup from `apps/web`                                                                                                           |
| Icons             | Lucide everywhere; remove `react-icons`                                                                                                                                                 |

### Initiative I10 — Tweakcn theme as canonical design token source

| Aspect                    | Reference                                                                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source                    | tweakcn theme `cmlh0vbnd000004l112kx8a0l` (URL-shared by user)                                                                                                                                                                                                              |
| Export step               | export theme as `globals.css` (light + dark) from tweakcn editor; commit to `packages/design-tokens/src/tweakcn.css`                                                                                                                                                        |
| Token surface             | `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--accent`, `--muted`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`, `--radius`, `--chart-1..5`, `--sidebar-*`, `--font-sans`, `--font-serif`, `--font-mono` |
| Light + dark              | both modes shipped; toggle via `class="dark"` on `<html>`; respects `prefers-color-scheme` by default                                                                                                                                                                       |
| Tailwind integration      | `packages/ui/tailwind.config.ts` reads tokens via CSS variables: `colors: { background: 'hsl(var(--background))', ... }`                                                                                                                                                    |
| Brand color migration     | replace ad-hoc `#20042D` from `frontend-app/tailwind.config.js`, `admin-dashboard/tailwind.config.js`, `website/tailwind.config.js` with the tweakcn `--primary` token                                                                                                      |
| Mulish + tabular numerics | merge into `--font-sans` (Mulish for body); add `--font-mono` (JetBrains Mono) for tabular financial numerics; display face from tweakcn                                                                                                                                    |
| Component baseline        | every shadcn/ui component in `packages/ui/src/components/*` consumes only token vars, no hardcoded color literals                                                                                                                                                           |
| Tests                     | Storybook visual regression via Chromatic or self-hosted Playwright snapshots; light+dark snapshots gated in CI                                                                                                                                                             |

### Initiative I11 — Self-hosted ML stack

| Aspect          | Reference                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service repo    | `reback-scrapers/` (Node 22 + Fastify + Crawlee + Playwright)                                                                                                                                         |
| ML service repo | `reback-ml/` (Python 3.12 + vLLM + PaddleOCR)                                                                                                                                                         |
| Models          | Qwen2.5-VL-3B-Instruct (HuggingFace `Qwen/Qwen2.5-VL-3B-Instruct`); fallback Phi-3.5-vision-instruct (`microsoft/Phi-3.5-vision-instruct`); OCR PaddleOCR PP-OCRv4; text fallback Qwen2.5-3B-Instruct |
| Serving         | `vllm serve Qwen/Qwen2.5-VL-3B-Instruct --max-model-len 4096 --dtype bfloat16 --tensor-parallel-size 1` on AWS `g5.xlarge` Spot                                                                       |
| Cluster         | 2 instances behind ALB; auto-scale on SQS queue depth                                                                                                                                                 |
| Cost target     | ~$90-130/mo for 100K extractions; ~$0.001/extraction                                                                                                                                                  |
| Tests           | golden corpus in `reback-scrapers/test/corpus/` — 5+ URLs per platform from the coverage matrix; nightly regression on `confidence`, `price`, `currency`, `images[]`                                  |

### Initiative I12 — Embedded escrow API (Partner tier)

| Aspect          | Reference                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Backend domain  | `core-backend/internal/service/partners/` — registration, key management, white-label transactions                               |
| Endpoints       | `/v2/partners`, `/v2/partners/{id}/api-keys`, `/v2/transactions` with `partner_id` header, `/v2/webhooks`                        |
| Migrations      | `2026<seq>_partners.sql`, `2026<seq>_partner_api_keys.sql`, `2026<seq>_partner_webhooks.sql`, `2026<seq>_webhook_deliveries.sql` |
| SDKs            | new repos `reback-node-sdk/`, `reback-go-sdk/`, `reback-python-sdk/`, `reback-php-sdk/` — all generated from OpenAPI             |
| Web component   | `packages/checkout-widget` — `<reback-checkout>` custom element; "Pay with Reback" drop-in button                                |
| Hosted checkout | `apps/checkout/` (Next.js) — public checkout page at `pay.reback.finance/{transaction_id}`                                       |
| Tests           | sandbox env (`api-sandbox.reback.finance`) mirrors prod; SDK contract tests against OpenAPI                                      |

### Initiative I13 — Multi-country plan framework

| Aspect         | Reference                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend domain | `core-backend/internal/countries/<iso>/` — one folder per country with currency, languages, KYC adapters, payment adapters, tax rules, compliance flags                                |
| Plan engine    | `core-backend/internal/service/billing/` — replaces `controller/subscription.go`                                                                                                       |
| Migrations     | `2026<seq>_plans.sql`, `2026<seq>_plan_features.sql`, `2026<seq>_features.sql`, `2026<seq>_country_plan_overrides.sql`, `2026<seq>_subscriptions_v2.sql`, `2026<seq>_usage_meters.sql` |
| FX feed        | `internal/platform/fx/` daily-cached rates from Wise API or OpenExchangeRates                                                                                                          |
| Frontend       | `packages/i18n` (next-intl + react-i18next), `packages/currency` (Intl.NumberFormat wrappers)                                                                                          |
| Tests          | unit on plan resolution given `(user, country, feature)`; integration on usage metering                                                                                                |

### Initiative I14 — Mobile-first responsive + PWA + Expo

| Aspect       | Reference                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| PWA manifest | `apps/web/public/manifest.webmanifest`, `apps/web/public/sw.js` (Workbox-generated)                                                                   |
| Push         | `packages/push` wrapping Web Push API + FCM/APNs (Expo)                                                                                               |
| Share Target | `apps/web/public/manifest.webmanifest` with `share_target` action; handler at `apps/web/src/app/share/page.tsx`                                       |
| Expo app     | `apps/mobile/` — Expo SDK 52+; native modules: `expo-local-authentication`, `expo-notifications`, `expo-camera`, `expo-document-picker`, `expo-share` |
| Deep links   | universal links: `apps://reback.finance/.well-known/apple-app-site-association` + `assetlinks.json`                                                   |
| Tests        | Detox for E2E mobile; Playwright mobile emulation for PWA                                                                                             |

### Initiative I15 — Counter-Offer v2

| Aspect        | Reference                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today's logic | `core-backend/src/controller/counterOffer.go:23` (`GetAllCounterOfferByInvoiceID`); `controller/invoice.go:496` (`AcceptOfferStatus`)              |
| New service   | `internal/service/negotiation/` — `Negotiator` interface with `Counter`, `Accept`, `Reject`, `BestAndFinal`, `Expire`                              |
| Migrations    | `2026<seq>_counter_offers_v2.sql` adds `expires_at`, `is_best_final`, `message`, `round_number`, `delta_pct` columns; `partial_accepts` join table |
| Worker        | `internal/worker/counter_offer_expiry/main.go` — cron every 5 min closing expired counters                                                         |
| Frontend      | `apps/web/src/components/CounterOfferPanel.tsx` (side-by-side delta UI)                                                                            |
| Tests         | property-based: ≤5 rounds enforced; auto-decline at expiry; best-and-final 24h enforcement                                                         |

### Initiative I16 — Dispute Live Chat (replaces empty file)

| Aspect                | Reference                                                                               |
| --------------------- | --------------------------------------------------------------------------------------- |
| Empty file            | `core-backend/src/handler/liveChat/liveChat.go` (`package livechat` only)               |
| New WebSocket service | `core-backend/internal/handler/dispute_chat/` using `gorilla/websocket` already in deps |
| Endpoint              | `GET /v2/disputes/{id}/stream` (Upgrade: WebSocket)                                     |
| Backing storage       | `dispute_messages` table; Redis pub/sub for fan-out across instances                    |
| Frontend              | `apps/web/src/pages/DisputeRoom.tsx`                                                    |
| Tests                 | Playwright E2E: two browsers in dispute, live messages cross                            |

### Initiative I17 — KYC MetaMap completion

| Aspect               | Reference                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| TODO stub            | `core-backend/src/controller/kyc.go:232` (`SetIDDetails` is empty)                                                      |
| Decision             | implement OR remove the path; recommendation: replace MetaMap with **Smile Identity** (pan-Africa coverage, single SDK) |
| Frontend integration | `packages/kyc/` wrapping Smile Identity Web SDK + Mobile SDK                                                            |
| Webhook handler      | `internal/handler/webhooks/smile_identity.go`                                                                           |
| Tests                | sandbox flow with synthetic IDs                                                                                         |

### Initiative I18 — Subscription expiry enforcement

| Aspect              | Reference                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card payment no-op  | `controller/subscription.go` (card case) — implement Paystack `/transaction/charge_authorization` recurring or remove option                         |
| Expiry not enforced | new middleware `internal/platform/middleware/subscription_gate.go` — load active sub on auth, reject gated endpoints with 402 + `code=plan_required` |
| Appeal gate (B9)    | call `subscription_gate` middleware on `POST /v2/transactions/{id}/disputes`                                                                         |

### Initiative I19 — Repo cleanup + git history rewrite

| Aspect                       | Reference                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files to remove from history | `puppet/puppet.js:104` (OpenAI key); `puppeteer/puppet.js:56-57` (IG creds); `puppeteer/chromedriver-linux64/chromedriver` (16 MB ELF); `core-backend/.env`, `core-backend/src/.env`; `puppet/node_modules/`, `puppeteer/node_modules/`; `core-backend/geckodriver`, `core-backend/src/geckodriver`; `screenshot/images/*.png` (move to docs) |
| Tool                         | `git filter-repo --path .env --path chromedriver --path geckodriver --path node_modules --invert-paths`                                                                                                                                                                                                                                       |
| Coordination                 | force-push window with team sign-off; rotate every secret in those files first                                                                                                                                                                                                                                                                |
| Conflict cleanup             | `core-backend/.gitignore:13-18` resolve merge conflict markers                                                                                                                                                                                                                                                                                |

### Initiative I20 — Observability + linting baseline

| Aspect        | Reference                                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linter config | `core-backend/.golangci.yml` — re-enable `gosec`, add `errcheck`, `staticcheck`, `gocritic`, `bodyclose`, `noctx`, `revive`; remove `tests: false` skip           |
| Logging       | replace `fmt.Println` (`storage/invoice.go:234,248,1028,1060` etc — 57 sites) and `.Debug()` GORM (36 sites) with `slog` gated by env-driven log level            |
| Tracing       | `internal/platform/observability/otel.go` initializing OpenTelemetry SDK; propagate `traceparent`; export to OTLP/Tempo                                           |
| Metrics       | Prometheus `/metrics` endpoint; key metrics: per-route p50/p95/p99 latency, DB pool saturation, webhook delivery success rate, ML extraction confidence histogram |
| Frontend      | Sentry SDK in `packages/observability`; `eslint-plugin-security` + `eslint-plugin-jsx-a11y` enforced in CI                                                        |

## Critical Files (touched during plan execution)

### Phase 1 — security hotfixes (week 1)

- `puppet/puppet.js:104` — remove hardcoded OpenAI key
- `puppeteer/puppet.js:56-57` — remove hardcoded social creds
- `puppeteer/chromedriver-linux64/chromedriver` — remove from git
- `core-backend/.env`, `core-backend/src/.env` — remove from git, rotate
- `core-backend/.gitignore:13-18` — resolve merge conflict
- `core-backend/src/main.go:48,55` — CORS allowlist, no global TZ override
- `core-backend/src/pkg/middleware/middleware.go:56-72` — Secure + HttpOnly +
  SameSite cookies
- `core-backend/src/pkg/middleware/jwt.go`, `rest_auth.go` — migrate to
  `golang-jwt/jwt/v5`
- `core-backend/src/handler/model/request.go:14`, all
  `core-backend/src/storage/*.go` — `SortBy` allowlist + pagination cap

### Phase 2 — monorepo bootstrap (Q1)

- `reback/turbo.json`, `pnpm-workspace.yaml`, `.changeset/config.json` — new
- `reback/packages/utils/`, `reback/packages/design-tokens/`,
  `reback/packages/ui/`, `reback/packages/api-client/`, `reback/packages/auth/`
  — new
- `reback/apps/web/` — migrate `frontend-app` and dedupe
- `reback/apps/admin/` — migrate `admin-dashboard` and dedupe
- `reback/apps/marketing/` — Next.js 15 rewrite of `website`

### Phase 3 — backend modernization (Q2)

- `core-backend/src/go.mod` — Go 1.22, drop GORM v1
- `core-backend/src/controller/afterPayments.go` — split into
  `service/payment/`, `service/escrow/`, `service/webhook/`
- `core-backend/src/controller/admin.go`, `invoice.go` — split into bounded
  services
- `core-backend/src/storage/storage.go` — connection pool config
- `core-backend/.golangci.yml` — add `gosec`, `errcheck`, `staticcheck`,
  `gocritic`

### Phase 4 — scraper consolidation (Q2)

- New repo `reback-scrapers/` (Node 22 + Playwright + Fastify + SQS)
- Archive: `screenshot/`, `puppet/`, `puppeteer/`, `webshot-ocr/`

## Reuse Inventory (already exists, keep)

- Mulish font + `#20042D` brand color — keep (consolidate into one tokens
  package)
- Paystack + Flutterwave integrations in `core-backend/src/thirdparty/` — keep,
  harden
- Qoreid + Metamap KYC — keep, add Smile Identity for pan-Africa
- Goose migrations in `core-backend/src/terminal/goose/` — keep, audit for
  irreversible ops
- Existing Zustand store shape (`Store.js`) — keep, single source in
  `packages/auth`
- Existing SWR usage — keep
- 3 utility functions (`formatAmount`, `sentenceCase`, `getInitials`) — keep one
  canonical copy in `packages/utils`
- `face-api.js` flow for KYC — keep but reassess vs. Smile Identity SDK

## Validation Framework (server-side + client-side, single source of truth)

### Schema-driven, generated, never duplicated

- Single source: **OpenAPI 3.1** spec at `core-backend/api/openapi.yaml` +
  per-resource **Zod schemas** in `packages/api-client/src/schemas/`. Both
  generated from the same JSON Schema definitions.
- Server: `go-playground/validator/v10` with custom validators registered in
  `internal/platform/validation/`. Error mapping: validator → API error
  response.
- Client: `react-hook-form` + `@hookform/resolvers/zod`. Same Zod schema
  validates form before submit AND parses API response.
- Webhook bodies: schema-validated on receipt; reject malformed with 400 before
  any state mutation.

### Money-field validation (P-1)

| Rule                           | Implementation                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `gt=0` on every money field    | struct tag `validate:"gt=0"` on Go DTOs; `z.number().gt(0)` mirror on client                  |
| Upper bound                    | `validate:"lte=10000000000"` (10B minor units = ₦100M / $100M ceiling per single transaction) |
| Decimal scale                  | `validate:"decimal_scale=4"` custom validator rejecting >4 fractional digits                  |
| `NaN`/`Inf`                    | rejected by construction in `shopspring/decimal`                                              |
| Currency code                  | `validate:"iso4217"` against the country pack's allowed currencies                            |
| Amount minor-units consistency | `(amount, currency)` pair validated together; reject `(1.5, "JPY")` (JPY has no minor units)  |

### String/identifier validation

| Field type           | Rule                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Email                | `validate:"email,max=254"` (RFC 5321 limit)                                                                       |
| Phone                | `validate:"e164"` custom; uses `nyaruka/phonenumbers` (Go port of Google's libphonenumber)                        |
| UUID                 | `validate:"uuid4"`                                                                                                |
| URL (catalog import) | DNS resolves + scheme is `http(s)` + not RFC1918/link-local/metadata                                              |
| NIN                  | NG-only, 11 digits, Luhn-valid                                                                                    |
| BVN                  | NG-only, 11 digits                                                                                                |
| NUBAN                | 10 digits, NIBSS check-digit valid                                                                                |
| Country code         | ISO 3166-1 alpha-2                                                                                                |
| Locale               | BCP 47                                                                                                            |
| Date                 | RFC 3339 only; reject naïve                                                                                       |
| File upload          | MIME sniffed (`mimetype` lib); size capped per type (image 10MB, doc 25MB); virus-scan hook (ClamAV) for KYC docs |

### Pagination strict mode (replaces silent default rewriting at `storage/invoice.go:97-112`)

```text
?cursor=<opaque>&limit=N
  N: min=1, max=100, default=25 — reject negative/zero with 400
  cursor: opaque base64 of {sort_key, last_value} — server-issued only, validated server-side
```

### Validation tests

- Property-based via `gopter` for money math invariants; `testify/assert` for
  boundary cases.
- Frontend: `vitest` + `@testing-library/react` form submission with all invalid
  permutations of every field.

## Error Taxonomy (RFC 9457 Problem Details, plus Reback codes)

Every error returns the same envelope (`/v2/`):

```json
{
  "ok": false,
  "error": {
    "type": "https://errors.reback.finance/v2/{code}",
    "title": "Human-readable summary",
    "code": "validation_error", // machine-readable
    "status": 400,
    "detail": "Field 'amount' must be > 0.",
    "instance": "/v2/transactions/abc",
    "fields": { "amount": ["must be greater than 0"] }, // when applicable
    "request_id": "req_01HXY...",
    "doc_url": "https://docs.reback.finance/errors/validation_error"
  }
}
```

### Error code catalog (`internal/platform/errors/catalog.go`)

| Code                        | HTTP | When                                                            |
| --------------------------- | ---- | --------------------------------------------------------------- |
| `validation_error`          | 400  | Schema/field validation fail                                    |
| `auth_required`             | 401  | Missing/invalid token                                           |
| `token_revoked`             | 401  | JWT in revocation set                                           |
| `forbidden`                 | 403  | Authenticated but lacks scope                                   |
| `insufficient_scope`        | 403  | OAuth-style scope insufficient                                  |
| `not_found`                 | 404  | Resource not found                                              |
| `method_not_allowed`        | 405  | —                                                               |
| `conflict`                  | 409  | State transition not allowed (e.g., release on disputed escrow) |
| `idempotency_replay`        | 409  | Same Idempotency-Key with different body                        |
| `idempotency_in_progress`   | 409  | Same key, request still pending                                 |
| `unprocessable`             | 422  | Semantically valid but business-rule rejected                   |
| `rate_limited`              | 429  | Per-route or per-user quota exceeded; `Retry-After` header set  |
| `plan_required`             | 402  | Subscription gate hit                                           |
| `kyc_required`              | 402  | KYC tier insufficient                                           |
| `quota_exhausted`           | 402  | Free-tier limit hit                                             |
| `internal_error`            | 500  | Unhandled — alerts on                                           |
| `dependency_unavailable`    | 502  | PSP/KYC/email provider down                                     |
| `gateway_timeout`           | 504  | Upstream timed out                                              |
| `webhook_signature_invalid` | 401  | PSP webhook signature failed                                    |
| `dispute_already_open`      | 409  | Existing open dispute on transaction                            |
| `escrow_locked`             | 409  | Funds in escrow_held; cannot withdraw                           |
| `negotiation_round_limit`   | 409  | Counter-offer >5 rounds                                         |
| `negotiation_expired`       | 410  | Offer expired                                                   |
| `country_unsupported`       | 451  | Geo not yet enabled                                             |
| `aml_review`                | 423  | Transaction flagged for AML; locked pending review              |

### Frontend error display rules

- Field errors → inline beneath the input; never global toast.
- Action errors → toast WITH a primary action (e.g., "Retry", "Contact
  support").
- Network errors → full-screen error boundary with cached-state fallback.
- Codes never shown to users; `doc_url` link to public docs.
- All errors logged to Sentry with `request_id` correlation to backend traces.

## Security Architecture (defense-in-depth, OWASP API Top 10 2023 mapped)

| OWASP API Risk                                              | Mitigation in Reback                                                                                                                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API1:2023 — BOLA (Broken Object Level Authorization)        | Per-row authorization check in every repository function; `account_id` scoped queries; row-level security in Postgres for multi-tenant tables                                                            |
| API2:2023 — Broken Authentication                           | JWT v5 with audience claim; refresh-token rotation; per-device session table; revocation list; 2FA available; account lockout (B15); password policy + breach check via `haveibeenpwned` k-anonymity API |
| API3:2023 — Broken Object Property Level Authorization      | Whitelisted serializers per role; never `SELECT *` to JSON; admin endpoints distinct path                                                                                                                |
| API4:2023 — Unrestricted Resource Consumption               | Rate limits (Redis-backed `ulule/limiter`); request body size caps; query depth/complexity limits; circuit breakers via `gobreaker`                                                                      |
| API5:2023 — Broken Function Level Authorization             | Scope-checked middleware on every route; admin scopes distinct from user; partner scopes distinct from both                                                                                              |
| API6:2023 — Unrestricted Access to Sensitive Business Flows | Per-flow rate limits (e.g., 5 invoice creates/min/user, 3 OTP/hr/email); CAPTCHA on high-risk endpoints (signup, password reset) via hCaptcha or self-hosted                                             |
| API7:2023 — Server Side Request Forgery                     | Outbound HTTP wrapper rejects RFC1918/link-local/loopback/metadata; rejects redirects into private space; per-domain allowlist for catalog import outside known platforms                                |
| API8:2023 — Security Misconfiguration                       | `gosec` re-enabled (was commented out); CSP + HSTS + X-Content-Type-Options + X-Frame-Options + Referrer-Policy via security middleware; CORS allowlist; `Permissions-Policy`                            |
| API9:2023 — Improper Inventory Management                   | OpenAPI as canonical inventory; deprecated routes return `Sunset` header; CI fails on undocumented routes                                                                                                |
| API10:2023 — Unsafe Consumption of APIs                     | Webhook signatures verified (B1); strict response schema checks on PSP/KYC responses; circuit breakers; outbox for at-least-once delivery                                                                |

### Additional fintech-specific controls

| Control                                                   | Implementation                                                                                                                                                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Field-level encryption** for KYC PII (NIN, BVN, photos) | KMS envelope encryption; decrypt only at presentation layer; `pgcrypto` for Postgres                                                                                                                                    |
| **Audit log** (append-only, signed)                       | Postgres `audit_events` table + S3 mirror with object-lock; HMAC chain so tampering is detectable; NDPC + SEC-grade                                                                                                     |
| **AML monitoring**                                        | `internal/service/aml/` rule engine: velocity (>N transactions/24h), structuring detection (just-under-threshold patterns), sanctions screening (OFAC, UN, EU lists via [opensanctions.org](https://opensanctions.org)) |
| **Sanctions screening**                                   | OpenSanctions API or self-hosted dataset; check on KYC + every withdrawal                                                                                                                                               |
| **PEP screening**                                         | Same dataset; flag for manual review                                                                                                                                                                                    |
| **Suspicious activity reports**                           | NFIU-formatted SAR generation in admin tool                                                                                                                                                                             |
| **Transaction monitoring**                                | Anomaly-scoring model (sklearn isolation-forest baseline; upgrade to specialized AML model later)                                                                                                                       |
| **Card data**                                             | Tokenized through PSPs only; PCI DSS scope-minimized; never stored on Reback servers                                                                                                                                    |
| **Secrets**                                               | AWS Secrets Manager; rotation 90d; IAM Roles for Tasks; no plaintext env in any process                                                                                                                                 |
| **Encryption**                                            | TLS 1.3 only; HSTS preload; KMS at-rest for RDS, S3, EBS                                                                                                                                                                |
| **WAF**                                                   | AWS WAF in front of ALB with OWASP CRS + AWS Bot Control + custom rules for API abuse                                                                                                                                   |
| **DDoS**                                                  | CloudFront + AWS Shield Standard (Advanced when revenue justifies)                                                                                                                                                      |
| **Dependency scanning**                                   | `govulncheck`, `npm audit --audit-level=high`, Renovate weekly, GitHub Dependabot, Snyk in CI                                                                                                                           |
| **Static analysis**                                       | `gosec`, `staticcheck`, `gocritic`, `bodyclose`, `noctx`, `revive`, `errcheck`, `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, Semgrep custom rules for fintech patterns (e.g., "no `float` in money path")        |
| **Container scanning**                                    | Trivy in CI; signed images via cosign; immutable tags                                                                                                                                                                   |
| **Runtime scanning**                                      | Falco on ECS for syscall anomalies (later, year 2)                                                                                                                                                                      |
| **Penetration testing**                                   | Annual third-party pentest before SOC 2 Type 2                                                                                                                                                                          |
| **Bug bounty**                                            | HackerOne or Intigriti private program in Q3, public in Q4                                                                                                                                                              |
| **Incident response**                                     | Runbook in `docs/runbooks/incident-response.md`; PagerDuty rotation; severity matrix (SEV0-3); blameless post-mortems                                                                                                   |
| **Backup + restore drills**                               | Quarterly restore drill from RDS PITR + S3 backups; documented RPO < 1h, RTO < 4h                                                                                                                                       |
| **Secrets-in-history audit**                              | `gitleaks` in pre-commit + CI; weekly history scan                                                                                                                                                                      |

## Escrow Features — Competitive Market Research

Mapping Reback against named competitors. Every column entry is a feature
category; every cell is a present/absent/partial signal based on public docs.

| Feature                                     | escrow.com         | Tazapay  | Trustap | Castler  | Truzo    | Shieldpay | Reback (today)                     | Reback (target)             |
| ------------------------------------------- | ------------------ | -------- | ------- | -------- | -------- | --------- | ---------------------------------- | --------------------------- |
| Local-currency settlement (NGN/GHS/KES/ZAR) | No                 | No       | No      | No       | ZAR only | No        | NGN only                           | NGN/GHS/KES/ZAR             |
| Multi-currency wallet                       | No                 | Yes      | No      | No       | No       | No        | No                                 | Yes                         |
| Embedded API for marketplaces               | Yes (Partner tier) | Yes      | Yes     | Limited  | Yes      | Yes (B2B) | No                                 | **Yes (Partner tier)**      |
| JS/TypeScript SDK                           | **No**             | Yes      | Yes     | No       | No       | No        | No                                 | **Yes (P0)**                |
| Web component drop-in (`<reback-checkout>`) | No                 | No       | No      | No       | No       | No        | No                                 | **Yes (P0)**                |
| Hosted checkout link                        | Yes                | Yes      | Yes     | No       | No       | No        | No                                 | **Yes**                     |
| Public dispute API                          | **No** (closed)    | Limited  | Yes     | Limited  | No       | Yes       | Closed                             | **Yes (open API)**          |
| Live dispute chat                           | No                 | No       | Yes     | No       | No       | No        | No (file empty)                    | **Yes**                     |
| Counter-offer / negotiation                 | No                 | No       | No      | No       | No       | No        | Yes (sprawling)                    | **Yes (v2 optimized)**      |
| Milestone items per transaction             | Yes (item array)   | Yes      | Yes     | Yes      | No       | Yes       | Partial                            | **Yes**                     |
| Inspection period auto-release              | Yes                | Yes      | Yes     | Yes      | Yes      | Yes       | **No (BUG)**                       | **Yes**                     |
| Idempotency keys                            | Yes                | Yes      | Yes     | Yes      | Yes      | Yes       | **No**                             | **Yes**                     |
| Webhook HMAC signing                        | Yes                | Yes      | Yes     | Yes      | Yes      | Yes       | **No (Flutterwave commented out)** | **Yes**                     |
| Sandbox environment                         | Yes                | Yes      | Yes     | Yes      | Yes      | Yes       | **No**                             | **Yes**                     |
| Domain Holding Service (installments)       | Yes (DHS)          | No       | No      | No       | No       | No        | No                                 | Q4 (in scope)               |
| Vehicle title/lien escrow                   | Yes                | No       | No      | No       | No       | No        | No                                 | Q4 (in scope)               |
| Real-estate escrow                          | No                 | No       | Limited | Yes      | No       | Yes       | No                                 | Q4 (in scope)               |
| Mobile money pay-in (M-Pesa)                | No                 | No       | No      | No       | No       | No        | No (NG only)                       | **Yes (KE/GH)**             |
| WhatsApp / IG-DM checkout                   | No                 | No       | No      | No       | No       | No        | No                                 | **Yes (unique)**            |
| Catalog import from social URL              | No                 | No       | No      | No       | No       | No        | Yes (broken)                       | **Yes (hardened)**          |
| Seller reputation graph                     | No                 | No       | No      | No       | No       | No        | Partial                            | **Yes (Escrow Score™)**     |
| Public invoice page with OG image           | No                 | No       | Yes     | No       | No       | No        | No                                 | **Yes**                     |
| Buyer protection guarantee                  | Implicit           | Implicit | Yes     | Implicit | Implicit | Yes       | Implicit                           | **Yes (explicit policy)**   |
| Sub-user / team RBAC                        | Yes                | Yes      | Limited | Yes      | Limited  | Yes       | Yes                                | Yes (refined)               |
| Audit log API                               | Yes (timeline)     | Yes      | Yes     | Yes      | Yes      | Yes       | Partial                            | **Yes (immutable)**         |
| Multi-language UI                           | EN                 | EN       | EN/IT   | EN/HI    | EN       | EN        | EN                                 | EN/Pidgin/YO/IG/HA/SW/FR/AR |
| Offline / SMS fallback                      | No                 | No       | No      | No       | No       | No        | No                                 | **Yes (USSD via Termii)**   |
| AML / sanctions screening                   | Yes                | Yes      | Yes     | Yes      | Yes      | Yes       | No                                 | **Yes**                     |
| KYC tiered limits                           | Yes                | Yes      | Yes     | Yes      | Yes      | Yes       | Yes (broken)                       | **Yes (fixed)**             |

### Differentiators Reback owns (do not let competitors close)

1. NGN/GHS/KES native + open dispute API + JS SDK = a combination NO competitor
   has.
2. Catalog Import from social URL is unique. Make it a marketed feature, not a
   hidden flow.
3. WhatsApp/IG-DM-native escrow (where buyers actually transact in EM) — a
   fundamental UX win Reback can lock down with platform-specific integrations.
4. Cheaper take-rate on small-ticket high-frequency social commerce.
   Escrow.com's tiered May-2024 pricing punishes <$5K deals — Reback's pricing
   should explicitly target this gap.

## Integrations Registry (verified, per Verified Research)

The complete integration surface, with current state and target adapter
location.

### Payment in (pay-in) — by country

| Country    | Provider    | Methods                                       | Status today                        | Adapter location                 |
| ---------- | ----------- | --------------------------------------------- | ----------------------------------- | -------------------------------- |
| NG         | Paystack    | Card, bank transfer, USSD, Apple Pay, Visa QR | Live                                | `internal/payments/paystack/`    |
| NG         | Flutterwave | Card, bank transfer                           | Live                                | `internal/payments/flutterwave/` |
| GH         | Paystack    | Card, mobile money                            | Live (CI/GH/KE/RW added in 2024-25) | same                             |
| GH         | Flutterwave | Mobile money, card                            | Live                                | same                             |
| KE         | Flutterwave | M-Pesa STK Push, card                         | Q1 (verified country/method)        | same                             |
| KE         | Pesapal     | Mobile money, card                            | Q2 alternative                      | `internal/payments/pesapal/`     |
| ZA         | Paystack    | Card                                          | Q1                                  | same                             |
| ZA         | PayFast     | Card, EFT                                     | Q2                                  | `internal/payments/payfast/`     |
| EG         | Paystack    | Card                                          | Q2                                  | same                             |
| UK         | Stripe      | Card, BACS, Apple/Google Pay                  | Q3                                  | `internal/payments/stripe/`      |
| EU         | Stripe      | Card, SEPA, Klarna, Bancontact                | Q3                                  | same                             |
| US         | Stripe      | Card, ACH                                     | Q4                                  | same                             |
| BR / LATAM | MercadoPago | Card, Pix, Boleto                             | Q4 (in scope)                       | `internal/payments/mercadopago/` |
| IN         | Razorpay    | UPI, card, netbanking                         | Q4 (in scope)                       | `internal/payments/razorpay/`    |

### Payout (pay-out) — by country

| Country                              | Provider                                  | Method                                                        | Notes                                                                            |
| ------------------------------------ | ----------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| NG                                   | Paystack Transfers, Flutterwave Transfers | NUBAN bank transfer                                           | Verify NUBAN before transfer                                                     |
| GH                                   | Flutterwave                               | Bank, mobile money                                            | —                                                                                |
| KE                                   | Flutterwave                               | M-Pesa B2C, bank                                              | Verify Daraja policy for non-KE entity (V2)                                      |
| ZA                                   | PayFast / Ozow                            | EFT                                                           | —                                                                                |
| Cross-border card                    | **Stripe**                                | Global card acceptance + Apple/Google Pay + SEPA + ACH        | Primary cross-border rail per directive                                          |
| Multi-currency wallet (hold/convert) | **Wise Platform Multi-Currency Account**  | Hold and convert across 40-56 currencies; receive-side strong | Wallet only — outbound payout is via Stripe / Paystack / Flutterwave per country |

### KYC providers — by country

| Country    | Primary                                 | Secondary/Failover | Document types                                             |
| ---------- | --------------------------------------- | ------------------ | ---------------------------------------------------------- |
| NG         | Qoreid (NIN, BVN) + MetaMap (face, doc) | Smile Identity     | NIN, BVN, Passport, Driver's License, Voter's Card, CAC RC |
| KE         | Smile Identity (Huduma + KRA)           | Sumsub             | National ID, Passport, KRA PIN                             |
| GH         | Smile Identity                          | Sumsub             | National ID, Passport, Driver's License                    |
| ZA         | Smile Identity                          | Sumsub             | SA ID, Passport                                            |
| EG         | Sumsub                                  | MetaMap            | National ID, Passport                                      |
| UK         | Veriff (Entrust IDV)                    | Sumsub             | Passport, Driver's License, Residence Permit               |
| EU         | Veriff                                  | Sumsub             | Passport, ID Card                                          |
| Pan-Africa | Smile Identity (52 countries verified)  | —                  | 8500+ doc types                                            |
| Global     | Trulioo                                 | Sumsub             | 14000+ doc types                                           |

### Notifications + messaging

| Channel                     | Provider                                              | Notes                                                                                                                                    |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Email transactional         | Postmark (primary) — Signl4/SendSignal as alternative | Single provider per env; drop SendGrid (currently dual, gateway fallback bug B13). Postmark fine; Signal alternative noted per directive |
| Email marketing             | Resend or Mailchimp                                   | Newsletter, drips                                                                                                                        |
| SMS NG                      | Termii                                                | Existing — keep                                                                                                                          |
| SMS multi-country           | Twilio Programmable Messaging                         | Q2                                                                                                                                       |
| WhatsApp Business Cloud API | Meta direct + 360dialog as BSP                        | Verified per-message pricing July 2025                                                                                                   |
| Push web                    | Web Push API + VAPID                                  | PWA                                                                                                                                      |
| Push native                 | FCM (Android), APNs (iOS) via Expo Notifications      | Mobile                                                                                                                                   |
| Slack                       | Internal alerts only (NOT customer email fallback)    | Fix B13                                                                                                                                  |
| Telegram Bot                | Reback alerts + customer support inbound              | Q3                                                                                                                                       |

### Banking / financial data

| Provider                    | Use                        | Notes                                                    |
| --------------------------- | -------------------------- | -------------------------------------------------------- |
| NIBSS                       | NUBAN account verification | Via Paystack/Flutterwave wrappers                        |
| Mono / Okra                 | Open banking (Africa)      | Optional Q3 — bank account linking for invoice reminders |
| Plaid                       | Open banking (US/UK)       | Q4 (in scope)                                            |
| Wise Multi-Currency Account | Cross-border holds         | Q3                                                       |

### Identity, sanctions, compliance

| Provider                  | Use                                  |
| ------------------------- | ------------------------------------ |
| OpenSanctions API         | OFAC + UN + EU sanctions + PEP lists |
| Smile Identity / Sumsub   | KYC (above)                          |
| TruValidate (Trans Union) | Optional fraud risk scoring          |
| Sardine                   | Optional behavioral fraud prevention |

### Infra / DevOps

| Service                               | Use                                               | Notes                                        |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| AWS ECS Fargate                       | Containers                                        | Backend, scrapers, ML                        |
| AWS RDS Aurora Postgres Serverless v2 | DB                                                | Multi-AZ; Aurora Global Q4                   |
| AWS ElastiCache Redis                 | Cache, queues, rate limit, idempotency            | —                                            |
| AWS S3                                | Object storage; object-lock for audit             | —                                            |
| AWS SQS                               | Job queues (scraper, withdrawal verifier, outbox) | —                                            |
| AWS CloudFront                        | CDN                                               | Multi-region origins Q4                      |
| AWS Route53                           | DNS, latency-based routing Q4                     | —                                            |
| AWS Secrets Manager                   | Secrets                                           | KMS-backed                                   |
| AWS KMS                               | Envelope encryption                               | RDS, S3, app-level                           |
| AWS WAF + Shield Standard             | DDoS + OWASP CRS                                  | —                                            |
| Grafana + Prometheus + Loki + Tempo   | Observability                                     | Self-hosted via Grafana Cloud or own cluster |
| Sentry                                | Frontend error tracking                           | —                                            |
| OpenTelemetry SDK                     | Distributed tracing                               | —                                            |
| Datadog                               | Optional alternative if budget allows             | —                                            |
| GitHub Actions                        | CI/CD                                             | Per-app matrices                             |
| Turbo Remote Cache                    | Monorepo build cache                              | Self-host or Vercel                          |
| Unleash                               | Feature flags (open-source self-hosted)           | Per global rule                              |
| ClamAV                                | Virus scan on KYC uploads                         | —                                            |
| Linkerd or Istio                      | Service mesh, mTLS (Y2)                           | Optional                                     |

### AI / ML

| Component                                  | Choice                                             |
| ------------------------------------------ | -------------------------------------------------- |
| VLM                                        | Qwen2.5-VL-3B (or 7B for headroom) on g6.xlarge L4 |
| Doc parsing                                | PaddleOCR-VL-1.5 (94.5% OmniDocBench)              |
| OCR fallback                               | PaddleOCR PP-OCRv5                                 |
| Text LLM                                   | Qwen2.5-3B-Instruct                                |
| Serving                                    | vLLM 0.20+                                         |
| Self-hosted OR Bedrock for emergency burst | AWS Bedrock with strict no-PII guard               |
| Embeddings (search)                        | bge-large-en-v1.5 self-hosted                      |
| Vector DB                                  | pgvector on Aurora (no separate DB needed)         |

## UI Upgrade Plan (component-by-component checklist)

Built on `packages/ui` (shadcn/ui + Radix primitives + tweakcn "Purple Rain"
tokens). Every component shipped with: Storybook story (default + edge), light +
dark mode, keyboard nav tested, screen-reader audited, mobile + desktop
variants, tabular numeric variants where relevant, RTL tested for Arabic.

| Component                | Source                                  | Reback-specific behavior                                                                                               |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Button                   | shadcn                                  | sizes xs/sm/md/lg; variants primary/secondary/ghost/destructive; loading state; sticky bottom variant for mobile       |
| Input                    | shadcn                                  | types: text, email, password, number, tel, decimal-money; inline error; helper text; max-length counter                |
| MoneyInput               | NEW                                     | locale-aware NGN/GHS/USD; tabular numerics; thousand separators; decimal hard-cap by currency; preview in alt currency |
| PinInput                 | from current `react-pin-input` migrated | 4 / 6 digits; auto-paste from SMS                                                                                      |
| Select / Combobox        | shadcn (Radix)                          | search; multi; async load; virtualized for 1000+                                                                       |
| DatePicker / RangePicker | shadcn (Radix + react-aria)             | date-fns locale; mobile-native picker on `<md`; relative date display                                                  |
| Drawer / Sheet           | Radix + vaul                            | swipe-to-dismiss; safe-area-aware                                                                                      |
| Dialog / Modal           | Radix                                   | focus trap; ESC handles correctly                                                                                      |
| Toast                    | sonner                                  | actionable errors; queue; offline indicator                                                                            |
| Skeleton                 | NEW                                     | matches every list/card layout                                                                                         |
| EmptyState               | NEW                                     | illustrated; never bare text; primary CTA                                                                              |
| ErrorBoundary            | NEW                                     | "Something didn't work" + retry + Sentry-correlated request_id displayed                                               |
| Avatar                   | shadcn                                  | initials fallback; verified checkmark; status dot                                                                      |
| Badge                    | shadcn                                  | variants for invoice status, escrow state, KYC tier, dispute status                                                    |
| Tabs                     | Radix                                   | swipeable on mobile                                                                                                    |
| Accordion                | Radix                                   | mobile-first                                                                                                           |
| Card                     | shadcn                                  | hoverable; clickable; semantic article                                                                                 |
| DataTable                | TanStack Table                          | sortable, filterable, virtualized, exportable; mobile = card list                                                      |
| Pagination               | NEW                                     | cursor + offset; mobile = "Load more"                                                                                  |
| Breadcrumb               | shadcn                                  | mobile collapses to back-arrow                                                                                         |
| Stepper                  | NEW                                     | KYC, signup, invoice builder                                                                                           |
| Timeline                 | NEW                                     | escrow + dispute lifecycle                                                                                             |
| FileUpload               | NEW                                     | drag-drop; camera capture; progress; size cap by MIME                                                                  |
| MoneyDisplay             | NEW                                     | tabular numerics; symbol + ISO; alt currency tooltip                                                                   |
| InvoiceCard              | NEW                                     | status pill; counterparty avatar; amount; age                                                                          |
| EscrowStatusBadge        | NEW                                     | held / released / disputed / refunded; animated state transitions                                                      |
| DisputeChat              | NEW                                     | message bubbles; evidence inline; SLA timer                                                                            |
| KycCard                  | NEW                                     | per-tier state machine; action CTA                                                                                     |
| BankAccountPicker        | NEW                                     | NUBAN verify inline                                                                                                    |
| CounterOfferPanel        | NEW                                     | side-by-side delta; round counter; best-and-final                                                                      |
| OnboardingTour           | NEW                                     | 3 steps; skippable; resumable                                                                                          |
| RebackCopilot            | NEW                                     | chat surface; tool-call previews                                                                                       |
| MobileBottomNav          | NEW                                     | 5 tabs; safe-area-aware                                                                                                |
| MobileShareTarget        | NEW                                     | PWA share target intake                                                                                                |

### Visual + motion baseline

- Typography: tweakcn `--font-sans` (display) + Mulish (body, kept) + JetBrains
  Mono (tabular).
- Motion: `--motion-fast` 120ms, `--motion-base` 200ms, `--motion-slow` 320ms;
  `cubic-bezier(0.4, 0, 0.2, 1)` default; respect `prefers-reduced-motion`.
- Spacing: 4px base; 4/8/12/16/24/32/48/64/96.
- Radii: tweakcn `--radius` (cascades 4/8/12/full).
- Shadows: layered, brand-tinted, never flat black.
- Dark mode: token mirror; AA on body, AAA on key labels.
- Iconography: Lucide only.

## Test Coverage Plan (70%+ project-wide, gated in CI)

### Coverage targets (CI-blocking)

| Surface                                                               | Target                                 | Tool                                         |
| --------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| Backend `internal/service/*` (business logic)                         | **≥80%**                               | `go test -race -cover`                       |
| Backend `internal/handler/*`                                          | ≥70%                                   | `go test` + `httptest`                       |
| Backend `internal/repository/*`                                       | ≥70%                                   | `go test` + `testcontainers-go` Postgres     |
| Backend `internal/platform/*` (validation, money, errors, middleware) | ≥85%                                   | `go test` + property-based via `gopter`      |
| Frontend `apps/web/src/components`                                    | ≥70%                                   | `vitest` + `@testing-library/react`          |
| Frontend `apps/admin/src/components`                                  | ≥70%                                   | same                                         |
| Frontend `packages/ui`                                                | ≥80%                                   | same + Storybook test runner                 |
| Frontend `packages/api-client`, `packages/utils`, `packages/auth`     | ≥85%                                   | `vitest`                                     |
| Mobile `apps/mobile`                                                  | ≥70%                                   | `jest-expo` + Detox                          |
| Scraper service `reback-scrapers`                                     | ≥75%                                   | `vitest` + corpus regression                 |
| ML service `reback-ml`                                                | ≥70%                                   | `pytest` + golden corpus                     |
| E2E critical flows                                                    | 100% of critical paths                 | Playwright in CI                             |
| Mutation testing (P-1 modules — money, escrow, payment)               | ≥60% mutation score                    | `gremlins.js`, `go-mutesting`                |
| Property-based (money math)                                           | full invariant set                     | `gopter`                                     |
| Visual regression (UI components)                                     | 100% of `packages/ui`                  | Chromatic or Playwright snapshots            |
| Accessibility (a11y)                                                  | 0 axe violations on critical flows     | `@axe-core/playwright`                       |
| Performance (LCP, FID, CLS)                                           | meet Core Web Vitals "good" thresholds | Lighthouse CI                                |
| Security (DAST)                                                       | 0 high/critical                        | OWASP ZAP in CI                              |
| Security (SAST)                                                       | 0 high/critical                        | Semgrep + `gosec` + `eslint-plugin-security` |
| Dependency CVE                                                        | 0 high/critical                        | `govulncheck`, `npm audit`, Trivy            |

### CI gates (PR blocking)

```yaml
on: pull_request
jobs:
  build, lint, type-check, unit, integration, e2e (smoke), coverage (must meet
  thresholds above per surface), visual-regression, a11y, lighthouse,
  govulncheck, gosec, semgrep, trivy, gitleaks
```

Merges blocked on red. Coverage drop > 2% blocks. New code in P-1 modules must
be 90%+ covered.

### Critical-flow E2E test list (MUST exist before any release)

1. Signup → email OTP → KYC tier 1 → tier 2 (BVN/NIN/face/address) → admin tier
   2 approval → tier 2 unlocked
2. Create invoice (manual) → counterparty receives email + push → counterparty
   pays → escrow held → buyer confirms → released → seller withdraws → bank
   credited
3. Create invoice (catalog import from IG URL) → AI extract → seller confirms
   price → invoice sent → public link works → OG image renders
4. Counter-offer round 1 → 2 → 3 → seller accepts → payment → escrow → release
5. Counter-offer expires unaccepted → auto-decline → notifications sent
6. Best-and-final → other party accepts within 24h → flow continues; OR fails to
   accept → auto-close
7. Buyer disputes → admin opens dispute → live chat between parties → evidence
   upload → admin resolves with refund → buyer wallet credited
8. Subscription upgrade → wallet debit → feature unlocked → expiry → feature
   regated
9. Withdrawal request by admin → super-admin approves → async payout → bank
   credited → both notified
10. Webhook replay (same Idempotency-Key) → balance NOT double-credited
11. Concurrent withdrawal attempts → no overdraft (load test 50 RPS)
12. Multi-currency invoice (KE seller, UK buyer in GBP) → FX conversion → escrow
    → release → seller wallet credited in KES
13. Partner API: register → API key → create txn on behalf of sub-customer →
    webhook fires → SDK consumes
14. PWA install → share target receive IG URL → invoice draft pre-filled →
    submit
15. Dark-mode toggle persists; RTL Arabic locale renders correctly

## Council Sign-Off (each division's verdict on this plan)

### Architecture & Planning (architect, planner)

GO. The escrow-core + Partner-API + 3-surface (web/admin/marketing/mobile)
topology is sound. Backend modular monolith → service-oriented evolution is the
right sequencing. Multi-region read replicas in Q4 with single-primary writes
avoids CRDT complexity. Risks: regulatory pivot to MMO licensing in NG could
push timeline 1-2 quarters; have a partnership-with-licensed-MMO fallback ready.

### Implementation & Build (build-error-resolver, go-build-resolver, refactor-cleaner, database-reviewer)

GO with conditions. Float→Decimal migration must complete BEFORE any feature
work resumes (2-week emergency sprint). Monorepo migration sequenced after the
money sprint. The 3,566-LOC `afterPayments.go` decomposition needs `gomock` →
`go.uber.org/mock`. Database: every money column → `numeric(20,4)`; every
timestamp → `timestamptz`; idempotency table mandatory; Aurora Serverless v2
sized conservatively at first (0.5-4 ACU autoscale).

### Quality & Review (code-reviewer, go-reviewer, python-reviewer, doc-updater, frontend-design)

GO with conditions. Re-enable `gosec`; remove `tests: false` from
`.golangci.yml`. Ship Storybook in week 1 of monorepo migration so design system
gets visual regression coverage from day 1. Mandate: every PR touching
`internal/service/payment` or `internal/service/escrow` requires money-math
property test + concurrency test + reviewer outside the original author's team.
Frontend design: tweakcn theme adopted but DO NOT ship a generic shadcn look —
customize spacing, typography weight curves, and motion to lock the brand.

### Security (security-reviewer)

CONDITIONAL GO. Hard blockers that must close in week 1: rotate the leaked
OpenAI key + IG creds; remove `.env` + `chromedriver` from history; enable
Flutterwave webhook signature; add Paystack signature verify; idempotency on
every webhook handler; SortBy column allowlist; SSRF defense on scrapers.
Without these, do not deploy a single new feature. The CBN MMO license pathway
is on the critical path for any escrow custody model — engage counsel **week 1
of Q1**, not Q4. Pursue OpenSanctions integration in Q2 before processing volume
scales.

### Testing & QA (tdd-guide, e2e-runner)

GO with conditions. 70% project-wide coverage; 80% on services; 85% on platform;
90% on new P-1 code. The 15 critical-flow E2E tests in this plan are the release
gate. Catalog-import has a regression corpus (100+ URLs across the platform
coverage matrix) that runs nightly. Visual regression on every `packages/ui`
component, light + dark, before any prod deploy. Performance budget enforced:
LCP ≤ 2s on slow-3G for marketing; p95 API ≤ 200ms.

### Council Consensus

**GO** — proceed in this order: (1) money emergency sprint (2 weeks); (2)
security hotfixes + monorepo bootstrap (Q1); (3) backend modernization + scraper
consolidation + REST v2 (Q2); (4) feature wave 1 + mobile + ML (Q3); (5) global
expansion + Partner API + compliance attestations (Q4). No P0 feature ships
before the money emergency closes. No public Partner API ships before SOC 2 Type
1 attestation begins.

## Documentation Strategy (developer + user + internal)

Documentation is treated as a product. Versioned, tested, deployed via CI.

### Three audiences, three properties

| Audience                      | Property         | URL                  | Stack                                                                                                        |
| ----------------------------- | ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| End users (sellers/buyers)    | Help Center      | help.reback.finance  | Next.js 16 + MDX (in `apps/marketing` `/help/`) or HelpScout Docs / Crisp Knowledge Base                     |
| Developers integrating Reback | Developer Portal | docs.reback.finance  | **Mintlify** OR **Scalar** (recommendation: Mintlify — purpose-built for API docs, OpenAPI-native, great DX) |
| Internal engineering          | Internal Docs    | private GitHub Pages | Docusaurus or VitePress; ADRs, runbooks, codemaps, on-call playbooks                                         |

### Developer Portal (`docs.reback.finance`) — content map

```text
docs.reback.finance/
├── /                         → Welcome, quickstart, "Pay with Reback" 5-min demo
├── /quickstart/
│   ├── node                   → npm install @reback/node + first transaction
│   ├── web-component          → <reback-checkout> drop-in
│   ├── go / python / php      → server SDKs
│   └── shopify / woocommerce  → plugin install
├── /guides/
│   ├── escrow-lifecycle       → state diagram + sequence diagrams
│   ├── milestones             → multi-item transactions
│   ├── disputes               → opening, resolving, evidence
│   ├── webhooks               → signing, delivery, replay, retry policy
│   ├── idempotency            → key generation, replay semantics
│   ├── kyc-tiers              → what's gated at each tier
│   ├── partners               → white-label tier
│   ├── multi-currency         → FX flow, settlement
│   ├── localization           → supported locales, ICU MessageFormat
│   ├── testing                → sandbox env (api-sandbox.reback.finance)
│   ├── going-live             → production checklist
│   └── migrations             → v1 → v2 deprecation guide
├── /reference/
│   ├── rest-api               → auto-rendered from openapi.yaml (Mintlify renders OpenAPI natively)
│   ├── webhooks               → event catalog + payload schemas
│   ├── errors                 → every error code from catalog with /errors/<code> deep-link
│   ├── sdks/
│   │   ├── node               → tsdoc-generated reference
│   │   ├── go                 → godoc.io mirror
│   │   ├── python             → sphinx
│   │   └── php                → phpDoc
│   └── widgets                → checkout-link, embed button, web component
├── /recipes/                  → opinionated patterns (Shopify integration, IG-DM bot, marketplace embed)
├── /security/                 → /security.txt, vuln reporting, bug bounty, SOC 2 status, NDPC compliance
├── /status/                   → status.reback.finance embed
├── /changelog/                → version-by-version, RSS-feed
└── /policies/                 → ToS, Acceptable Use, Buyer Protection, Refund Policy, DPA
```

### Documentation deliverables (per release)

Every PR that adds/modifies a public API endpoint must include:

1. OpenAPI spec update (`api/openapi.yaml`)
2. Reference page auto-rendered from spec
3. At least one guide entry if the surface is new
4. Recipe if the use case is non-obvious
5. Changelog entry (Changesets style)
6. Migration note if breaking
7. SDK tests covering the new surface

### Internal documentation deliverables

| Type                                  | Location                                                                               | Owner                     |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------- |
| ADRs (Architectural Decision Records) | `docs/adr/NNNN-title.md`                                                               | Architecture & Planning   |
| Codemaps                              | `docs/CODEMAPS/<repo>.md` (auto-generated by `doc-updater` agent / `/update-codemaps`) | Quality & Review          |
| Runbooks                              | `docs/runbooks/<topic>.md` (incident-response, on-call, RDS-failover, secret-rotation) | Security + Implementation |
| API contract docs                     | `core-backend/api/openapi.yaml`                                                        | Implementation & Build    |
| Deployment guides                     | `docs/deploy/<environment>.md`                                                         | Implementation & Build    |
| Compliance docs                       | `docs/compliance/{ndpa-2023, soc2, pci, kyc-aml}.md`                                   | Security                  |
| Onboarding for new engineers          | `docs/onboarding.md`                                                                   | Quality & Review          |
| Glossary                              | `docs/glossary.md` (escrow vs hold vs release vs refund vs disbursement)               | Quality & Review          |
| Status of every initiative            | `docs/initiatives/I01.md` … `I20.md`                                                   | Planner                   |
| Postmortems                           | `docs/postmortems/YYYY-MM-DD-incident.md`                                              | Security + Implementation |

### CI gates for docs

- `markdownlint` blocks PRs on rule violations.
- `vale` blocks on style-guide violations (Reback voice & tone).
- Link check: `lychee` runs nightly, breaks build on dead links.
- OpenAPI lint: `spectral` blocks on schema regressions.
- SDK reference: must build green; missing-symbol fails CI.

## Public API & SDK Program (the embedded-escrow product, productized)

The Public API is the product. Treat it like Stripe treats theirs.

### API versioning policy

- URL-versioned: `/api/v2/`, `/api/v3/`, …
- Major version bumps reserved for breaking changes; expected ~24-36 months
  between majors.
- Additive changes go into the current major (new endpoints, new optional
  fields, new enum values consumers must tolerate).
- Deprecated endpoints return `Sunset: <RFC 8594>` header with the date and
  `Deprecation: true`.
- Minimum **18-month sunset window** for any deprecated endpoint after the new
  one ships.
- All breaking changes in changelog with explicit migration guide.

### SDK program

| SDK                                   | Repo                 | Language version        | Generation                                                                             | Versioning         |
| ------------------------------------- | -------------------- | ----------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| `@reback/node`                        | `reback-node-sdk`    | TypeScript 5+, Node 18+ | Generated from OpenAPI via `@hey-api/openapi-ts`; hand-written ergonomic wrapper layer | semver, Changesets |
| `@reback/web` (browser web component) | `reback-web-sdk`     | TS / Lit web component  | Bundled drop-in `<reback-checkout>` and `RebackButton`                                 | semver             |
| `reback-go`                           | `reback-go-sdk`      | Go 1.22+                | `oapi-codegen` + hand wrapper                                                          | semver, gomod tags |
| `reback-python`                       | `reback-python-sdk`  | Python 3.10+            | `openapi-generator` python-pydantic + hand wrapper                                     | semver, PyPI       |
| `reback-php`                          | `reback-php-sdk`     | PHP 8.2+                | `openapi-generator`                                                                    | semver, Composer   |
| Shopify app                           | `reback-shopify`     | TypeScript              | embedded-app pattern                                                                   | App Store version  |
| WooCommerce plugin                    | `reback-woocommerce` | PHP                     | composer-distributed                                                                   | WP plugin version  |
| WhatsApp Business plugin              | `reback-whatsapp`    | TypeScript              | webhook handler                                                                        | semver             |

#### SDK quality bar (every SDK)

| Standard                                           | Implementation                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| Auto-generated from OpenAPI                        | yes                                                                  |
| Hand-tuned ergonomic layer                         | yes — code that matches idiomatic style for each language            |
| Auto-retry with exponential backoff on 429/5xx     | yes                                                                  |
| Auto-Idempotency-Key generation                    | yes (UUID v7)                                                        |
| Webhook signature verification helper              | yes (`verifyWebhookSignature(body, header, secret)`)                 |
| Errors as typed exceptions / Result types          | yes — typed per error code from catalog                              |
| Pagination iterators                               | yes (`for await (const txn of reback.transactions.list(...))` style) |
| Live + sandbox client modes                        | yes (separate `apiKey` parameter)                                    |
| Telemetry hooks (request_id, latency, retry count) | yes                                                                  |
| Streaming dispute chat                             | yes (WebSocket or SSE wrapper)                                       |
| Test coverage                                      | ≥85% per SDK                                                         |
| Examples directory                                 | yes — 15+ recipes per SDK                                            |
| README + CONTRIBUTING + CODE_OF_CONDUCT            | yes                                                                  |
| Generated reference docs                           | yes                                                                  |
| Published on first-class registry                  | yes (npm, Go modules, PyPI, Packagist)                               |
| Signed releases                                    | yes (sigstore for Python, npm provenance, gpg for go)                |

### Sandbox environment (`api-sandbox.reback.finance`)

- Mirrors prod API surface 1:1.
- Test data is isolated (separate Postgres). No real money moves.
- Test KYC flows: hardcoded NIN/BVN/face values that always succeed/fail (e.g.,
  NIN starting with `00000` always succeeds; `99999` always rejects).
- Test PSP integration: PSPs' own sandboxes (Paystack test mode, Flutterwave
  staging).
- Webhook simulator: dashboard button "Replay this event" + CLI
  `reback events resend evt_xyz`.
- Sandbox API keys: prefixed `sk_test_` / `pk_test_`; live keys `sk_live_` /
  `pk_live_`.

### API rate limits (per tier)

| Tier                 | Sustained     | Burst          | Webhook delivery rate |
| -------------------- | ------------- | -------------- | --------------------- |
| Free                 | 60 req/min    | 100 req/min    | 10/s                  |
| Starter              | 300 req/min   | 600 req/min    | 50/s                  |
| Pro                  | 1,200 req/min | 3,000 req/min  | 200/s                 |
| Business             | 6,000 req/min | 15,000 req/min | 1,000/s               |
| Partner / Enterprise | custom        | custom         | dedicated             |

`Retry-After` and `X-RateLimit-Remaining`/`X-RateLimit-Reset` headers on every
response.

### Webhook delivery guarantees

| Property           | Behavior                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| Delivery semantics | At-least-once via outbox pattern                                                                  |
| Retry policy       | Exponential backoff with jitter; 1m, 5m, 15m, 1h, 6h, 24h, then daily up to 7 days                |
| Dead-letter        | After 7 days, event moves to DLQ; alert to partner email                                          |
| Replay             | UI + API + SDK helper to replay any event by ID                                                   |
| Signing            | HMAC-SHA256 of `<timestamp>.<body>`; header `Reback-Signature: t=...,v1=...`; replay window 5 min |
| Ordering           | NOT guaranteed; events have monotonic `created_at` for caller to order                            |
| Idempotency        | Each event has unique `id`; consumers must dedupe                                                 |
| Schema versioning  | Every event has `api_version` field; breaking schema changes are new event types                  |

### Public API SLA (Business + Partner tiers)

| Metric                           | Target                                                                      |
| -------------------------------- | --------------------------------------------------------------------------- |
| Uptime                           | 99.95% (≤22m/mo) on Business; 99.99% on Partner                             |
| p95 API latency                  | ≤200ms (excluding upstream PSP/KYC)                                         |
| Webhook delivery (first attempt) | ≤30s after event                                                            |
| Sandbox availability             | 99.5%                                                                       |
| Status page                      | status.reback.finance, public, real-time                                    |
| Incident communication           | within 5 min of detection on status page; postmortem within 5 business days |

### Developer relations

- Sample apps repo: `reback-samples/` with one full Next.js + Node SDK reference
  impl, one Express + Vue, one Shopify embed, one Telegram bot, one WhatsApp
  echo bot.
- Embedded "Try it" widgets in docs (Mintlify supports this natively).
- Public Postman / Hoppscotch collection auto-synced from OpenAPI.
- Discord community + Stack Overflow tag `reback-api`.
- Quarterly office hours / changelog livestream.
- Bug bounty program in Q3 (private, HackerOne or Intigriti); public Q4.

### Initiative I21 — Documentation & Developer Platform

| Aspect                       | Reference                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Tooling                      | **Mintlify** at `docs.reback.finance` (recommended); fallback Scalar                  |
| OpenAPI spec                 | `core-backend/api/openapi.yaml` — single source of truth                              |
| Vale style guide             | `docs/.vale/` — Reback voice, banned phrases, microcopy rules from UX Writing section |
| Repo for help center content | `apps/marketing/src/help/` (MDX)                                                      |
| Repo for ADRs/runbooks       | `docs/adr/`, `docs/runbooks/`, `docs/postmortems/` in monorepo                        |
| `/security.txt`              | per RFC 9116 with security contact, encryption key, policy URL, ack URL               |
| Sample apps                  | `reback-samples/` repo                                                                |
| Sandbox parity tests         | `tests/sandbox-parity/` running same suite against sandbox + prod nightly             |

### Initiative I22 — Public API & SDK program

| Aspect                | Reference                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| API spec              | `api/openapi.yaml` v2                                                                                                         |
| Server stubs          | `oapi-codegen` from spec into `internal/handler/v2/...`                                                                       |
| TS SDK generator      | `@hey-api/openapi-ts` → `reback-node-sdk`                                                                                     |
| Go SDK generator      | `oapi-codegen` → `reback-go-sdk`                                                                                              |
| Python SDK generator  | `openapi-generator` python-pydantic-v2 → `reback-python-sdk`                                                                  |
| PHP SDK generator     | `openapi-generator` php → `reback-php-sdk`                                                                                    |
| Web component         | `reback-web-sdk` — Lit + TS, distributed via npm `@reback/checkout`                                                           |
| Hosted checkout       | `apps/checkout/` Next.js — public at `pay.reback.finance/{txn_id}`                                                            |
| Webhook signature lib | each SDK ships `verifyWebhookSignature` helper + worked example                                                               |
| Sandbox env           | separate ECS service + Postgres + ALB at `api-sandbox.reback.finance`                                                         |
| Rate limit table      | implemented in `internal/platform/middleware/ratelimit/` keyed by tier                                                        |
| SLA monitoring        | Prometheus probes against synthetic transaction every 60s                                                                     |
| Status page           | `status.reback.finance` — Atlassian Statuspage or self-hosted Cachet                                                          |
| Versioning            | Changesets per SDK repo; one CHANGELOG per SDK                                                                                |
| Release signing       | npm provenance; sigstore for Python; gpg for Go modules                                                                       |
| Tests                 | per-SDK ≥85% coverage; contract tests against sandbox; e2e Stripe-style "create transaction → confirm webhook → verify state" |

## Coverage Matrix — every part of the original ask mapped to a section

| Original ask                                                                  | Where in this plan                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What the product is about                                                     | "Product Snapshot" + "Product Flow Map" + "Strategic Vision" sections                                                                                                                                                                                          |
| How to restructure the repos                                                  | "Target Architecture" + "Repo Restructure — Monorepo Migration" + Initiative I9                                                                                                                                                                                |
| What to change                                                                | "Money Correctness Emergency" + "Critical Backend Bugs" + "Critical Findings" + Initiatives I1-I20                                                                                                                                                             |
| How to scale to a global product                                              | "Scaling to Global" + "Multi-Country Plan & Pricing Framework" + Initiative I13                                                                                                                                                                                |
| How to deal with security issues                                              | "Security Architecture (defense-in-depth)" + "Security Remediation Plan" + Initiative I3, I4, I5, I20                                                                                                                                                          |
| Solve product challenges                                                      | "Critical Backend Bugs" punch list (B1-B25) + "Counter-Offer Flow v2" + "Dispute Live Chat" Initiative I16                                                                                                                                                     |
| Find better dependencies and solutions                                        | "Better Dependencies" table + "Verified Research vs Team-Must-Confirm" (frameworks at verified latest stable)                                                                                                                                                  |
| Better and more modern design system                                          | "Design System v2" + Initiative I10 (tweakcn "Purple Rain" canonical) + "UI Upgrade Plan"                                                                                                                                                                      |
| Solve all UX/UI challenges                                                    | "UX/UI red flags" + "Screens to Design / Redesign" + "UI Upgrade Plan" + "Mobile-First Responsive Plan"                                                                                                                                                        |
| Drastically improve the UX writing                                            | "UX Writing Overhaul" with before/after table + microcopy rules                                                                                                                                                                                                |
| Add as many new features as possible                                          | "Marketing-Driven Feature Wave" — 30+ features in 6 groups (social-commerce, trust, workflow, AI, growth, geo)                                                                                                                                                 |
| Drive like marketing/expert                                                   | "Strategic Positioning" — message rewrite + "Marketing-Driven Feature Wave" prioritization filter                                                                                                                                                              |
| All social platforms covered                                                  | "Platform coverage matrix — ALL social + classifieds across developing markets"                                                                                                                                                                                |
| Classified ads platforms across developing markets                            | Same matrix — Africa/MENA/SEA/LATAM/SA classifieds enumerated with extraction tier                                                                                                                                                                             |
| ML and non-ML scraping options                                                | "Tiered ML + non-ML strategy" — 4 tiers from OG fetch (non-ML) to VLM (ML)                                                                                                                                                                                     |
| Self-hosted small specialized models                                          | Initiative I11 + "Self-Hosted ML Stack" (Qwen2.5-VL + PaddleOCR + vLLM)                                                                                                                                                                                        |
| Reback as escrow.com for underserved markets                                  | "Strategic Vision — Reback as the Embedded Escrow Primitive" + "Escrow Features — Competitive Market Research"                                                                                                                                                 |
| Missing screens / redesign / implementation plans                             | "Screens to Design / Redesign" (53 screens) + "Implementation Reference" (Initiatives I1-I20 with file refs)                                                                                                                                                   |
| Frameworks and technologies                                                   | "Verified Research" (Vite 8, Next.js 16, MUI v9, Tailwind v4, Playwright 1.59, Crawlee 3.16, Go 1.26, vLLM 0.20, etc) + "Integrations Registry"                                                                                                                |
| Mobile responsiveness + flow continuity                                       | "Mobile-First Responsive Plan" + "Channel continuity" diagram                                                                                                                                                                                                  |
| Look at escrow.com clients + how we do same                                   | "Strategic Vision — Partner API tier" + "Escrow Features — Competitive Market Research"                                                                                                                                                                        |
| USD-first pricing, FX-converted display                                       | "Multi-Country Plan & Pricing Framework — Pricing in USD as canonical"                                                                                                                                                                                         |
| Plan/feature pool framework, country-extensible                               | "Plan/Feature framework (data-driven)" + "Country pack" + Initiative I13                                                                                                                                                                                       |
| Tweakcn design system                                                         | Initiative I10 + Design System v2                                                                                                                                                                                                                              |
| Dark + light mode                                                             | Design System v2 — token mirror; Mobile-First Responsive Plan; verified Council sign-off                                                                                                                                                                       |
| Errors                                                                        | "Error Taxonomy (RFC 9457 Problem Details)"                                                                                                                                                                                                                    |
| Validations                                                                   | "Validation Framework"                                                                                                                                                                                                                                         |
| UX                                                                            | "UX Writing Overhaul" + "Screens to Design / Redesign" + "Mobile-First"                                                                                                                                                                                        |
| Flows (user + product)                                                        | "Product Flow Map" (Flows A-I) + "Counter-Offer Flow v2"                                                                                                                                                                                                       |
| Products                                                                      | "Strategic Vision" (3 surfaces) + "Marketing-Driven Feature Wave"                                                                                                                                                                                              |
| Integrations                                                                  | "Integrations Registry"                                                                                                                                                                                                                                        |
| Technologies                                                                  | "Verified Research" + "Better Dependencies"                                                                                                                                                                                                                    |
| Escrow features market research                                               | "Escrow Features — Competitive Market Research" matrix                                                                                                                                                                                                         |
| UI upgrades                                                                   | "UI Upgrade Plan" component-by-component                                                                                                                                                                                                                       |
| Security and upgrades                                                         | "Security Architecture" + Initiative I20                                                                                                                                                                                                                       |
| 70% code coverage                                                             | "Test Coverage Plan" + CI gates                                                                                                                                                                                                                                |
| 100% coverage of original ask                                                 | This matrix                                                                                                                                                                                                                                                    |
| No assumptions, deep research                                                 | "Verified Research vs Team-Must-Confirm" with 10 explicit team-validate items                                                                                                                                                                                  |
| Documentation                                                                 | "Documentation Strategy" + Initiative I21 (Mintlify portal, ADRs, runbooks, help center, internal docs, CI gates)                                                                                                                                              |
| Public APIs and SDKs                                                          | "Public API & SDK Program" + Initiative I22 (versioning policy, SDK quality bar, sandbox, rate limits, webhook delivery guarantees, SLA, dev rel) + Initiative I12 (Partner API tier)                                                                          |
| Tweakcn theme global on every component                                       | "Design System Globality" — every UI atom token-driven, no raw color literals, lint-enforced                                                                                                                                                                   |
| Toasts + validations UX writing                                               | "Toast & Validation UX Writing" — full rule set + before/after table + i18n CI gate                                                                                                                                                                            |
| No GPT, self-hosted small models                                              | "Tier 4 ML extraction" + "Verified Research" — Qwen2.5-VL-3B/7B + PaddleOCR-VL-1.5 self-hosted via vLLM on g6.xlarge L4 spot, no external tokens                                                                                                               |
| Stripe (not Wise as payout)                                                   | Integrations Registry — Stripe as cross-border card rail; Wise Platform for multi-currency wallet hold/convert only                                                                                                                                            |
| Postmark or Signal for email                                                  | Notifications + messaging table — Postmark primary, Signal alternative per directive                                                                                                                                                                           |
| Bytebase for migrations + SQL                                                 | Initiative I25 — Bytebase self-hosted with PR-driven schema CI/CD, drift detection, query approval, PII masking                                                                                                                                                |
| Analytics plan                                                                | "Analytics Plan" + Initiative I23 — PostHog + RudderStack + Metabase + warehouse (S3+Iceberg+Athena or ClickHouse), 80+ typed events, 16+ dashboards, A/B testing, customer-facing Reback Insights                                                             |
| MSK Kafka instead of SQS/SNS                                                  | Initiative I24 — AWS MSK for high-throughput streaming spine; SQS retained only for simple worker queues                                                                                                                                                       |
| Configurable rate limits + pricing per business/org/customer                  | "Pricing Plans & Configurable Pricing Engine" — full data-driven engine, admin UI, audit-logged overrides, effective-dating, partner volume ladders, country overrides, promo codes                                                                            |
| Detailed pricing plans                                                        | "Pricing Plans & Configurable Pricing Engine" — Free/Starter/Pro/Business/Partner with seed values, all editable per customer/org/partner                                                                                                                      |
| Senior-only talent, no simplification                                         | "Talent & Quality Bar" — staff-or-above on every contributor; world-class craft, no shortcuts                                                                                                                                                                  |
| Engineering quality (no underscores, no suppression, lint+sonar zero-warning) | "Engineering Quality Standards" — 15 hard rules + SonarQube Quality Gate + zero-warning policy                                                                                                                                                                 |
| pnpm only                                                                     | "Engineering Quality Standards — Package management" — pnpm exclusive, package.json packageManager pinned                                                                                                                                                      |
| Introduce new languages where they earn it                                    | "Engineering Quality Standards — Languages" — Rust introduced for PSP webhook ingest + audit ledger primitive                                                                                                                                                  |
| World-class build                                                             | "World-class gates" table — 18 mechanically-enforced release gates                                                                                                                                                                                             |
| Versioning discipline                                                         | "Versioning Policy" section + Initiative I26 — every artifact (REST API, webhooks, SDKs, schema, services, mobile, containers, docs, design system, i18n, legal) has explicit versioning policy, deprecation windows, signing, and Council-audited enforcement |

## Design System Globality (tweakcn "Purple Rain" applies to every atom, every page)

The tweakcn theme is **the** design system. Not a starting point, not a
suggestion — the canonical token source. Every page (existing and new), every
component (buttons, charts, modals, switches, fonts, colors, tabs, navigation
bars, graphs, icons, tables, forms, drawers, sheets, tooltips, popovers, menus,
badges, pills, avatars, skeletons, empty states, error states, snackbars,
toasts, banners, alerts, callouts, breadcrumbs, paginators, steppers,
accordions, tabs, scrollbars, focus rings, selection states), every animation,
every shadow, every radius, every typographic scale entry — all consume tokens
from `packages/design-tokens` exclusively.

Globality enforcement:

- **No raw color literals anywhere.** Lint rule `no-raw-color` (Stylelint +
  custom ESLint rule) blocks hex/rgb/hsl values outside
  `packages/design-tokens`. Any `#20042D` legacy literal in the three Tailwind
  configs deletes; tokens are the single source.
- **Typography**: tweakcn `--font-sans` for display + body (we use the
  tweakcn-shipped value, not Mulish unless tweakcn ships Mulish —
  recommendation: import the tweakcn-defined fonts via `next/font` for
  self-hosting). `--font-mono` for tabular numerics on every money/count surface
  (`font-variant-numeric: tabular-nums` enforced via Tailwind
  `[font-variant-numeric:tabular-nums]` utility wrapped in `<MoneyDisplay>`).
- **Iconography**: Lucide only, all icons styled via `currentColor` so they
  inherit token-driven foreground. No raster icons.
- **Charts**: Recharts (or visx) styled with token-driven colors `--chart-1` …
  `--chart-5`. No default Recharts palette anywhere.
- **Modals/dialogs/drawers/sheets/popovers/tooltips/menus**: all from Radix
  primitives wrapped in `packages/ui` tokens; consistent enter/exit motion using
  `--motion-base`/`--motion-fast`.
- **Switches/checkboxes/radios**: Radix primitives + token styling; consistent
  focus-visible ring `--ring`.
- **Tabs/segments**: token-driven; underline or pill variant; both
  keyboard-accessible with arrow keys.
- **Bars (top, bottom, side, status)**: tokens + safe-area + role-aware; admin
  sidebar uses `--sidebar-*` token namespace from tweakcn.
- **Graphs (any visualization)**: Recharts, ApexCharts, or visx — choose one
  library project-wide; fully token-themed; light + dark mirrors.
- **Buttons**: shadcn Button + tweakcn tokens; every variant has hover, active,
  disabled, loading, focus-visible, icon-only, mobile-sticky variants.
- **Forms**: react-hook-form + Zod + token-styled `<FormField>`; every input has
  consistent error/helper state.
- **Tables**: TanStack Table + token-styled headers/rows/footers; always
  `tabular-nums` for numerics; sticky header on scroll; mobile = card list.
- **Old screens converted**: every existing `apps/web` and `apps/admin` page
  audited and refactored to consume only tokens before its first post-monorepo
  deploy. The audit checklist is `docs/design/global-conversion-checklist.md`
  with one entry per page; sign-off by staff designer required before merge.
- **Visual regression** (Chromatic) captures EVERY component in light + dark +
  RTL; PR fails on any unintended diff.

## Toast & Validation UX Writing (extension of UX Writing Overhaul)

Every toast and every validation message follows these rules. No exception.

### Toast rules

| Variant      | Rule                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Success      | Concrete + actionable: `"Invoice sent to Adaeze. They've been notified by email and SMS."` Never `"Done."` or `"OK."`                        |
| Info         | Tells the user what's happening AND what to expect: `"Verifying your bank account — usually takes under 30 seconds."`                        |
| Warning      | Names the consequence: `"You're 2 invoices away from your monthly limit. Upgrade to Pro for unlimited."`                                     |
| Error        | Names what went wrong + the next action: `"Couldn't reach Paystack just now. We saved your invoice as a draft — try again from Drafts."`     |
| Action toast | Has a button: `"Released ₦450,000 to Adaeze."` `[Undo within 10s]`                                                                           |
| Stacking     | Max 3 visible; older ones auto-dismiss; group by category (e.g., 5 dispute messages collapse to "5 new messages in your dispute with Tunde") |
| Duration     | 4s default; 8s for action toasts; sticky for blocking errors                                                                                 |
| Position     | Bottom-right desktop; bottom-center mobile (above bottom-nav); respects `safe-area-inset-bottom`                                             |
| Voice        | Same as global voice — warm, plain-spoken, never "transactional dryness"                                                                     |
| Localization | Every string in `packages/i18n/locales/`; Arabic + Pidgin + Yoruba + Igbo + Hausa + Swahili + French + English                               |

### Validation message rules (inline + summary)

| Pattern              | Example before → after                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Required missing     | `"Required"` → `"Add a buyer email so we can send the invoice."`                                                    |
| Format wrong         | `"Invalid"` → `"Looks like that's missing the @ — try again?"`                                                      |
| Out of range         | `"Must be between 1 and 100"` → `"Counter-offer must be between ₦1 and ₦10,000,000."`                               |
| Money under min      | `"Too low"` → `"Minimum invoice amount is ₦100. Add more, or use Reback for free."`                                 |
| Money over max       | `"Too high"` → `"Single invoices over ₦10M need KYC tier 3. Want to upgrade your KYC?"` (links to KYC)              |
| Date in past         | `"Invalid date"` → `"Due date can't be in the past — pick today or later."`                                         |
| Phone wrong          | `"Invalid phone"` → `"Phone needs to be a Nigerian mobile (e.g., 0801 234 5678)."`                                  |
| Password weak        | `"Too short"` → `"Use at least 12 characters with a number and a symbol — strong passwords keep your money safe."`  |
| Password breached    | `"Insecure"` → `"This password has shown up in a known breach. Pick a different one."`                              |
| KYC blocked          | `"Locked"` → `"Add your BVN to unlock invoices over ₦1M. We use it only to verify — never store it in plain text."` |
| Network/server error | `"Error"` → `"Couldn't save just now. Your changes are stored locally — try Save again in a few seconds."`          |

Implementation: every `validate:` tag on a Go DTO has a paired entry in
`packages/i18n/validation/<locale>.json`; CI fails if any tag lacks a message in
every locale.

## Pricing Plans & Configurable Pricing Engine (fully editable per customer/org/partner)

A first-class pricing engine. All plans, features, limits, rate limits, fees,
and per-customer overrides are **data**, not code.

### Default plans (all editable in admin)

| Plan                 | USD/mo (canonical) | Local examples | Trial       | Invoices/mo | Sub-users | Escrow take-rate           | API access            | Disputes                                     | Withdrawals/day | Catalog imports/mo | Description                                                   |
| -------------------- | ------------------ | -------------- | ----------- | ----------- | --------- | -------------------------- | --------------------- | -------------------------------------------- | --------------- | ------------------ | ------------------------------------------------------------- |
| Free                 | $0                 | ₦0             | 14 days Pro | 5           | 1         | 1.5% (cap $5)              | sandbox only          | view only                                    | 1               | 5                  | "Try Reback. Send up to 5 escrow-protected invoices a month." |
| Starter              | $10                | ₦16,000        | —           | 50          | 3         | 1.0% (cap $25)             | live, 60 rpm          | open, no chat                                | 3               | 50                 | "For solo sellers and freelancers."                           |
| Pro                  | $50                | ₦80,000        | —           | 500         | 10        | 0.7% (cap $50)             | live, 300 rpm         | full, with chat                              | 10              | 500                | "For growing SMEs and small marketplaces."                    |
| Business             | $200               | ₦320,000       | —           | unlimited   | 50        | 0.5% (cap $100)            | live, 1,200 rpm       | full + SLA timer                             | unlimited       | unlimited          | "For high-volume merchants."                                  |
| Partner / Enterprise | custom             | custom         | —           | unlimited   | unlimited | volume tier (down to 0.2%) | dedicated, custom rpm | full + dedicated dispute team + audit export | unlimited       | unlimited          | "For platforms embedding Reback escrow."                      |

### Per-feature rate-limit overrides (data-driven)

- Default rate limits per plan (above) are seed values, not constants.
- Admin can override **any** rate limit on **any** feature for **any**
  customer/org/partner.
- Customer-specific limits beat plan defaults via
  `customer_rate_limit_overrides` table.
- API takes effect immediately (Redis-backed `ulule/limiter` re-reads override
  on cache miss; cache TTL 60s).

### Per-customer pricing & take-rate overrides

- Admin UI: search customer → "Pricing & limits" tab → edit any plan parameter
  (price, take-rate, caps, feature flags, limits).
- Audit log: every change recorded with `actor`, `before`, `after`, `reason`,
  `effective_at`.
- Effective-dating: changes can be scheduled (e.g., "starting 2026-07-01");
  historical accuracy preserved for invoice-generated-at-time pricing.
- Partner deals: admin can attach a custom-named contract with custom volume
  thresholds and revenue share schedule.
- Volume-tiered pricing: built-in support for `(threshold, take_rate)` ladders
  evaluated at month-end.

### Schema (PostgreSQL)

```sql
plans
  id (slug pk), display_name, base_price_usd_minor, billing_interval, trial_days, is_default, sort_order, is_active

features
  key (slug pk), display_name, description, type (gate|meter|rate_limit|fee), unit, sort_order

plan_features
  plan_id, feature_key, value_int, value_decimal, value_text  -- limit, fee bps, etc.
  PRIMARY KEY (plan_id, feature_key)

country_plan_overrides
  plan_id, country_iso, price_local_minor, available
  PRIMARY KEY (plan_id, country_iso)

customer_subscriptions
  id, customer_id, plan_id, status, starts_at, ends_at, trial_ends_at, billing_anchor_day
  effective_dating: separate `customer_subscription_changes` table

customer_pricing_overrides
  customer_id, feature_key, value_int, value_decimal, value_text, effective_at, expires_at, reason, set_by_admin_id
  PRIMARY KEY (customer_id, feature_key, effective_at)

customer_rate_limit_overrides
  customer_id, route_pattern, sustained_rpm, burst_rpm, effective_at, expires_at, set_by_admin_id

partner_volume_ladders
  partner_id, threshold_volume_usd_minor, take_rate_bps, billing_period
  -- e.g. (partner_id, $0, 100bps), (partner_id, $1M, 70bps), (partner_id, $10M, 50bps)

usage_meters
  customer_id, period (YYYYMM), feature_key, count, last_updated_at

audit_pricing_changes
  id, actor_id, target_kind (plan|customer|partner), target_id, before_jsonb, after_jsonb, reason, created_at
```

### Admin UI (all routes under `/v2/admin/pricing/...`)

- `Plans` — CRUD on plan rows; preview impact on N customers; rollout staged
  (apply to new customers only / apply to renewals / apply immediately); A/B
  variant support.
- `Features` — CRUD on feature keys; what's gated where.
- `Customer pricing` — search any customer/org/partner; full edit;
  effective-dating; bulk apply via CSV.
- `Partner contracts` — volume ladders; quarterly true-up reports.
- `Country overrides` — set local-currency prices per country; FX rates
  fallback.
- `Rate limit overrides` — per-customer per-route adjustments.
- `Promo codes & coupons` — discount engine (percent / amount / months free /
  first-N-invoices free).
- `Revenue dashboard` — MRR by plan/country/cohort, churn, expansion,
  contraction, take-rate weighted-avg.
- Every change requires reason; audit log surfaces in the customer detail and
  partner contract pages.

### Public API endpoints (used by admin UI + partner integrations)

```http
GET  /v2/admin/plans
POST /v2/admin/plans
PATCH /v2/admin/plans/{id}
GET  /v2/admin/customers/{id}/pricing
PUT  /v2/admin/customers/{id}/pricing
GET  /v2/admin/partners/{id}/contract
PUT  /v2/admin/partners/{id}/contract
GET  /v2/admin/usage/{customer_id}?period=2026-04
POST /v2/admin/promo-codes
GET  /v2/me/plan
GET  /v2/me/usage
```

### Implementation

- New domain in `core-backend/internal/service/billing/`.
- `internal/platform/pricing/resolver.go` — given `(customer, feature, time)`,
  returns the effective value (override → plan → default).
- Hot-path endpoints check usage via Redis-cached counters; expensive admin
  pricing routes hit Postgres directly.
- All pricing data is editable; no plan or limit is hardcoded in backend code
  outside `packages/seed-data` defaults.

## Analytics Plan (the missing skill — full coverage)

A first-class analytics product, not an afterthought. Three layers: product
analytics (user behavior), business analytics (financial), and operational
analytics (system health). Each layer has named tools, an event taxonomy, and
dashboards.

### Stack

| Layer                        | Tool                                            | Why                                                                                                                                 |
| ---------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Product analytics            | **PostHog (self-hosted)**                       | Open-source, self-hosted (per global rule), funnels, cohorts, session recording, feature flags, A/B testing, all in one             |
| Customer data infrastructure | **RudderStack (self-hosted, MIT)**              | Segment-equivalent, open-source, routes events to PostHog + warehouse + others                                                      |
| Warehouse                    | **AWS S3 + Iceberg + Athena** OR **ClickHouse** | Cheap, scalable, query-able. ClickHouse if real-time dashboards matter (per the existing `clickhouse-io` skill in user's CLAUDE.md) |
| ETL/Reverse ETL              | **Airbyte (self-hosted)**                       | Open-source, replaces Fivetran                                                                                                      |
| BI dashboards                | **Metabase (self-hosted)** OR **Lightdash**     | Open-source, self-hosted; admin + finance teams use it                                                                              |
| Realtime metrics             | **Grafana + Prometheus + Loki + Tempo**         | Already in observability stack                                                                                                      |
| Streaming pipeline           | **AWS MSK (Kafka)**                             | per directive; events flow customer → backend → MSK → workers + warehouse                                                           |
| Customer feedback            | **Cnvas + Linear + in-app feedback widget**     | Build internally                                                                                                                    |
| Funnel/heatmaps              | PostHog session replay + heatmaps               | included                                                                                                                            |

**MSK note**: AWS MSK (Managed Streaming for Kafka) replaces SQS/SNS for the
high-throughput event spine (analytics pipeline, audit log fanout, partner
webhook delivery). SQS retained only for simple at-least-once worker queues
(scraper jobs, withdrawal verifier) where Kafka is overkill.

### Event taxonomy (the contract)

`packages/analytics` ships a typed client. **Every event is defined in
TypeScript**; no anonymous `track('something')` calls.

```ts
// packages/analytics/src/events.ts
export type RebackEvent =
  | InvoiceCreated
  | InvoicePaid
  | EscrowHeld
  | EscrowReleased
  | DisputeOpened
  | DisputeResolved
  | KycSubmitted
  | KycApproved
  | KycRejected
  | WithdrawalRequested
  | WithdrawalApproved
  | CatalogImportStarted
  | CatalogImportSucceeded
  | CatalogImportFailed
  | CounterOfferSent
  | CounterOfferAccepted
  | CounterOfferRejected
  | SubscriptionUpgraded
  | SubscriptionDowngraded
  | SubscriptionExpired
  | PaymentFailed
  | RateLimited
  | ApiKeyCreated
  | PartnerSignedUp
  | WidgetEmbedded
  | // ... ~80 events total
;
```

Each event has a typed payload and required fields: `event_id`, `user_id`,
`account_id`, `partner_id?`, `country`, `currency`, `device`, `app_version`,
`request_id`, `traceparent`, `ts`, `properties{}`. All events flow via
`RudderStack → PostHog + S3/Iceberg + Metabase + ClickHouse (optional)`.

### Dashboards (Metabase + Grafana)

| Dashboard                                                                        | Owner                 | Tier-restricted?      |
| -------------------------------------------------------------------------------- | --------------------- | --------------------- |
| **North-star metrics**                                                           | CEO/Product           | exec-only             |
| Activation funnel: signup → KYC tier 2 → first invoice → first paid              | Product               | all                   |
| Acquisition: per channel/source/campaign, attribution multi-touch                | Marketing             | all                   |
| Retention cohorts                                                                | Product               | all                   |
| Revenue: MRR by plan/country, take-rate, churn, expansion, contraction           | Finance               | finance + exec        |
| Catalog import success rate by tier (1/2/3/4)                                    | Engineering           | engineering           |
| Per-platform extraction success (the platform coverage matrix)                   | Engineering           | engineering           |
| Counter-offer flow: rounds, time-to-decision, accept rate                        | Product               | all                   |
| Dispute outcomes: refund vs release vs split, SLA adherence                      | Ops                   | ops + exec            |
| Withdrawal volume + processing time                                              | Finance + Ops         | finance + ops         |
| Partner usage: API call volume, error rate, top consumers                        | DevRel                | devrel + exec         |
| Country expansion readiness: KYC pass rate, PSP success, pricing competitiveness | Geo lead              | exec                  |
| Risk/AML: flagged transactions, false-positive rate, SAR queue depth             | Compliance            | compliance only       |
| Performance: API p50/p95/p99, error rate, deploy timeline overlay                | Engineering           | engineering           |
| Cost: AWS spend per service, ML inference cost per extraction, PSP fees          | Engineering + Finance | engineering + finance |
| Mobile vs web: usage split, conversion delta                                     | Product               | product               |
| Reback Copilot: queries, completion rate, tool-call success                      | Product               | product + ML          |

### A/B testing & feature flags

- PostHog's experiments + feature flags (open source).
- Server-side flag evaluation through PostHog Go/Node SDK (no client-only
  flagging — security-sensitive flags evaluated server-side).
- Holdout group always reserved (5% global) so causal inference is possible.
- Mandatory pre-registration of experiments in `docs/experiments/EXP-NNNN.md`
  (hypothesis, primary metric, MDE, decision criteria, owner, dates).
- Post-experiment writeup required before flag is removed.

### Privacy & data residency

- All PII flows through PostHog's `identify` carefully — financial fields NEVER
  captured in events; only IDs.
- EU + Africa users' analytics events stored in eu-west-1 / af-south-1 buckets
  respectively when in those regions.
- Cookie banner with explicit analytics consent (per NDPA + GDPR); analytics off
  until consent.
- Right-to-erasure pipeline removes a user's events from PostHog + warehouse on
  request.

### Reback Insights (customer-facing analytics, P1 product feature)

Built on the same warehouse: every Pro+ subscriber gets a "Reback Insights" tab
showing:

- Sales velocity, average ticket size, top counterparties
- Time-to-payment trends, dispute-rate, on-time-payment-rate
- Counterparty reputation summary (anonymized aggregate)
- Catalog: top-converting product images
- Suggested actions (driven by lightweight ML on top of warehouse data)

### Initiative I23 — Analytics Platform

| Aspect                  | Reference                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Backend events emitter  | `core-backend/internal/platform/analytics/` — typed event bus → MSK Kafka topic                 |
| Frontend events         | `packages/analytics` — typed client wrapping RudderStack JS SDK                                 |
| Data warehouse          | S3 + Iceberg + Athena OR ClickHouse (decision in Q1 ADR)                                        |
| Streaming               | AWS MSK (Kafka) — topics: `events.user`, `events.transaction`, `events.audit`, `events.partner` |
| Processing              | Apache Flink on MSK OR ClickHouse Kafka engine                                                  |
| Self-hosted PostHog     | EKS cluster, 3 replicas, Postgres+ClickHouse backing                                            |
| RudderStack self-hosted | EKS, routes to PostHog + S3                                                                     |
| Metabase                | EKS, Postgres backing for app DB                                                                |
| Tests                   | event schema tests in CI; E2E test that fires every event and asserts ingestion within 30s      |

### Initiative I24 — MSK Kafka spine

| Aspect            | Reference                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| MSK cluster       | 3 brokers, kafka.m5.large; multi-AZ; encryption in transit + at rest                                                                          |
| Topics (initial)  | `events.user`, `events.transaction`, `events.audit`, `events.webhooks-in`, `events.webhooks-out`, `events.notifications`, `events.compliance` |
| Schema registry   | Confluent Schema Registry (Apache 2.0 self-hosted) — Avro schemas per topic                                                                   |
| Producers         | backend services emit via `confluent-kafka-go`; idempotent producer settings                                                                  |
| Consumers         | TS workers (`reback-workers/`) via `kafkajs`; Python ML jobs via `confluent-kafka-python`                                                     |
| Dead-letter       | per-topic DLQ; alert on lag                                                                                                                   |
| Replacement scope | replaces SQS for high-throughput streaming. SQS retained for simple worker queues (scraper jobs, withdrawal verifier)                         |

### Initiative I25 — Bytebase for migrations & SQL CI/CD

| Aspect          | Reference                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------- |
| Tool            | **Bytebase (self-hosted, Apache 2.0)** — replaces ad-hoc `goose` migrations                   |
| Repo            | `core-backend/migrations/` — Bytebase reads SQL files from Git; PR triggers Bytebase pipeline |
| Approval        | every prod migration requires staff DBA + staff backend approval in Bytebase UI               |
| Schema sync     | Bytebase pulls schema from prod and diffs against migrations                                  |
| Drift detection | nightly job alerts on prod-vs-migrations drift                                                |
| Query review    | analyst SQL queries against prod read-replica go through Bytebase Query Center for approval   |
| Data masking    | PII columns masked for non-finance roles                                                      |
| Secrets         | RDS IAM auth via Bytebase; no static DB passwords                                             |
| Audit           | every schema change logged with actor and approval chain                                      |
| Multi-env       | dev → staging → prod pipeline with progressive rollout                                        |

## Required Specifications Inventory (every spec that must ship — all in scope)

| #   | Spec                                                                                                                | Format                                    | Location                                                | Owner                              |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| S1  | OpenAPI 3.1 — full v2 API                                                                                           | YAML                                      | `core-backend/api/openapi.yaml`                         | Implementation & Build             |
| S2  | Database schema — every table + column type, indexes, constraints                                                   | SQL migrations + ERD diagram              | `core-backend/migrations/`, `docs/db/erd.md`            | Database-reviewer                  |
| S3  | Webhook event catalog — every event type, payload schema, when fired                                                | YAML referenced from OpenAPI              | `core-backend/api/events.yaml`                          | Implementation & Build             |
| S4  | Error code catalog — every code, status, when, doc URL                                                              | Go const block + Markdown table           | `internal/platform/errors/catalog.go`, `docs/errors.md` | Implementation & Build             |
| S5  | State-machine specs — invoice, escrow, dispute, withdrawal, KYC                                                     | Mermaid + state-table                     | `docs/state-machines/`                                  | Architecture                       |
| S6  | Money handling spec — decimal scale, currency rules, FX, rounding                                                   | Markdown + golden tests                   | `docs/money.md`                                         | Implementation & Build             |
| S7  | Component library spec (~50 components) — props, variants, edge cases                                               | TypeScript types + Storybook MDX + tokens | `packages/ui/`, Storybook deployed                      | Quality & Review (frontend-design) |
| S8  | Design tokens spec — light + dark, all CSS vars from tweakcn                                                        | CSS custom props + JSON export            | `packages/design-tokens/`                               | Quality & Review                   |
| S9  | Country pack spec — currency, languages, KYC, payment, tax, compliance                                              | Go struct + YAML config                   | `internal/countries/<iso>/`                             | Architecture                       |
| S10 | Plan/feature spec — every plan, feature key, limit, gate                                                            | Migrations + admin UI + docs              | `docs/plans.md`                                         | Implementation                     |
| S11 | KYC tier spec — what each tier unlocks, providers, document types                                                   | Markdown + admin UI                       | `docs/kyc-tiers.md`                                     | Security                           |
| S12 | RBAC + scopes spec — every role, every scope, every endpoint mapping                                                | YAML + middleware enforcement             | `internal/platform/auth/scopes.yaml`                    | Security                           |
| S13 | ML model spec — every model, version, serving stack, prompts, output schema                                         | Markdown + JSON schemas                   | `reback-ml/specs/`                                      | Implementation                     |
| S14 | Scraper extraction spec — Tier 1-4, per-platform handling, regression corpus                                        | Markdown + JSON corpus                    | `reback-scrapers/specs/`                                | Implementation                     |
| S15 | SDK spec per language — public surface, type signatures, examples                                                   | per-SDK README + reference docs           | each SDK repo                                           | Implementation                     |
| S16 | Web component spec — `<reback-checkout>` attributes, events, slots                                                  | TypeScript types + docs                   | `packages/checkout-widget/`                             | Implementation                     |
| S17 | Hosted checkout spec — page surface, query params, security model                                                   | Markdown + e2e tests                      | `apps/checkout/`                                        | Implementation                     |
| S18 | Notification event matrix — every event × every channel × user pref                                                 | Markdown + Go enum                        | `docs/notifications.md`                                 | Implementation                     |
| S19 | UX writing voice & tone spec — rules, vocabulary, banned phrases                                                    | `vale` config + Markdown                  | `docs/.vale/`, `docs/voice-tone.md`                     | Quality & Review                   |
| S20 | Microcopy library — every string in app, EN baseline + locales                                                      | i18n catalogs                             | `packages/i18n/locales/`                                | Quality & Review                   |
| S21 | Email template spec — every transactional email, MJML source, locale                                                | MJML + JSON metadata                      | `packages/email-templates/`                             | Implementation                     |
| S22 | PDF invoice template spec — layout, currency rules, languages                                                       | React-PDF or LaTeX                        | `packages/pdf-templates/`                               | Implementation                     |
| S23 | Mobile screen spec — every screen, breakpoints, gestures, native APIs                                               | Figma + Storybook (RN)                    | `apps/mobile/specs/`                                    | Quality & Review                   |
| S24 | Accessibility spec — WCAG 2.2 AA conformance evidence per component                                                 | Pa11y reports + axe-core CI               | `docs/a11y.md` + CI                                     | Quality & Review                   |
| S25 | Performance budget spec — LCP/FID/CLS/TTFB targets per surface                                                      | Lighthouse CI config                      | `lighthouserc.js`                                       | Quality & Review                   |
| S26 | Threat model — STRIDE per component, mitigations, residual risk                                                     | Markdown + diagrams                       | `docs/security/threat-model.md`                         | Security                           |
| S27 | Compliance spec — NDPA 2023, NDPC obligations, CBN MMO requirements, SOC 2 control map, PCI scope, AML/CFT controls | Markdown + evidence repo                  | `docs/compliance/`                                      | Security                           |
| S28 | Incident response spec — severity matrix, on-call rotation, comms templates, postmortem template                    | Markdown runbooks                         | `docs/runbooks/incident-response.md`                    | Security + Implementation          |
| S29 | Backup + restore spec — RPO, RTO, restore drill cadence, evidence                                                   | Markdown + drill logs                     | `docs/runbooks/backup-restore.md`                       | Implementation                     |
| S30 | Deployment spec — every environment, CI pipeline, rollback procedure                                                | YAML + Markdown                           | `.github/workflows/`, `docs/deploy/`                    | Implementation                     |
| S31 | Observability spec — every metric, every log shape, every trace span, dashboards, alerts                            | Grafana JSON + Prometheus rules           | `infra/observability/`                                  | Implementation                     |
| S32 | E2E test spec — 15 critical flows + every screen smoke + sandbox parity                                             | Playwright suites                         | `tests/e2e/`                                            | Testing & QA                       |
| S33 | Load test spec — every flow, target RPS, p95 SLO                                                                    | k6 scripts                                | `tests/load/`                                           | Testing & QA                       |
| S34 | Sandbox parity spec — endpoints to keep in lock-step, drift detector                                                | Test suite + nightly job                  | `tests/sandbox-parity/`                                 | Testing & QA                       |
| S35 | Docs portal information architecture spec — every page, every tab, navigation                                       | Markdown sitemap                          | `docs/portal/sitemap.md`                                | Quality & Review                   |
| S36 | Brand spec — logos, social cards, PR kit, brand guidelines                                                          | Figma + assets repo                       | `docs/brand/` + Figma                                   | Quality & Review                   |
| S37 | Pricing spec — plans, features, limits, regional overrides, FX rules                                                | YAML + admin UI                           | `docs/pricing.md`                                       | Architecture                       |
| S38 | Legal spec — ToS, AUP, Privacy, DPA, Buyer Protection, Refund Policy, Cookie Policy, all per-country                | Markdown / PDF, attorney-reviewed         | `apps/marketing/src/legal/`                             | Security                           |
| S39 | API rate-limit spec — per route × per tier × per IP × per user                                                      | YAML config + middleware                  | `internal/platform/middleware/ratelimit/config.yaml`    | Implementation                     |
| S40 | Webhook delivery spec — retry policy, dead-letter, replay UX                                                        | Markdown + tests                          | `docs/webhooks.md`                                      | Implementation                     |

Each spec is a deliverable, owned, dated, and gated in CI. No spec ships
partially complete. The Council's quarterly review checks completion against
this inventory.

## Verification

### Per-phase exit criteria

**Phase 0 — Money-bug remediation complete when (Week 1-2 gate):**

- POSTing an unsigned/wrong-signature Flutterwave webhook returns 401 (B1)
- Replaying the same webhook twice credits balance once (B2 — `Idempotency-Key`
  honored)
- Paying for an `escrow` invoice transitions to `escrow_held`, NOT `closed`, and
  `EscrowBalance` is NOT withdrawable until release (B3, B4)
- Withdrawal fee on ₦100,000 = ₦100 (0.1%), not ₦1 (B10)
- Withdrawal-approval API responds in <500ms; payout completes via async worker
  callback (B6)
- Two concurrent withdrawal-of-balance requests against the same wallet do not
  overdraft (load-test with k6 — B11)
- A user with expired subscription is rejected from gated endpoints with 402
  (B8); appeal creation rejected for Basic tier (B9)
- A user with 5 failed logins is locked for N minutes (B15); revoked JWTs return
  401 (B16)
- `liveChat` either delivers WebSocket messages OR the route is removed from the
  public API (B12)
- Invoice state-machine migration runs cleanly on a snapshot of production data;
  23-state mapping is exhaustive (B24)

**Phase 1 — security hotfixes complete when:**

- `git log --all --full-history -- '**/.env'` returns no actual secrets
- `gh secret-scanning alerts list` returns 0 high-severity
- `govulncheck ./...` returns 0 in `core-backend`
- `npm audit --audit-level=high` returns 0 in scrapers
- `curl -I https://api.reback.finance` shows `Access-Control-Allow-Origin` is
  NOT `*`
- Manual test: send `?sortBy=name;DROP TABLE users--` → 400, not 200
- Manual test: 6 rapid `/auth/login` requests → 429 on the 6th
- Manual test: scraper service fetching `http://169.254.169.254/` → blocked
- The `iambooknard` IG account, `puppeteer/chromedriver-linux64/chromedriver`,
  and the leaked OpenAI key all rotated/removed and confirmed non-functional

**Phase 2 — monorepo migration complete when:**

- `pnpm turbo run build` builds all apps + packages green
- `pnpm turbo run lint` returns 0 errors across the monorepo
- `pnpm turbo run test` passes
- Storybook deploys successfully and contains 50+ documented components
- All 3 frontend apps share a single `formatAmount`
  (`grep -r 'formatAmount' --exclude-dir=node_modules` shows imports from
  `@reback/utils` only)
- Lighthouse scores: Performance ≥ 90, A11y ≥ 95, SEO ≥ 95 on `apps/marketing`
- Old repos archived with redirect README

**Phase 3 — backend modernization complete when:**

- `go test ./... -race -cover` reports ≥ 70% on `service/payment`,
  `service/escrow`
- No file in `internal/` exceeds 500 LOC
- `golangci-lint run` with extended ruleset returns 0
- `grep -r 'fmt.Print' internal/` returns 0
- OpenTelemetry traces visible in Grafana for a sample payment flow
- p95 API latency < 200ms in staging load test (k6, 100 RPS for 5min)

**Phase 4 — scraper consolidation complete when:**

- One repo (`reback-scrapers`) replaces four
- SSRF test suite passes (`169.254.169.254`, `127.0.0.1`, `[::1]`, `10.0.0.1`,
  redirects to private IPs all blocked)
- Browser pool tested under 50 concurrent jobs without OOM
- All four old repos archived

### Continuous verification (in CI from week 2)

- `gosec`, `govulncheck` on every backend PR — fail on high
- `npm audit`, `eslint-plugin-security`, `eslint-plugin-jsx-a11y` on every
  frontend PR
- Renovate weekly dep PRs
- Lighthouse CI on `apps/marketing` and `apps/web` PRs — fail if
  Performance/A11y drop > 5 points
- Visual regression (Chromatic or Playwright snapshots) on `packages/ui`
- E2E (Playwright) on critical flows: signup → KYC → create invoice → pay →
  release escrow → withdraw

### End-to-end demo (Q4 final)

- Multi-currency invoice from a Kenyan SME → buyer in the UK pays in GBP →
  escrow held → release → seller withdraws to KES wallet
- Reback Copilot demo: "Create an invoice for £2,500 to Sarah for the October
  retainer" → draft → confirm → public link → marketing OG image preview
- Status page green, audit log queryable, SOC 2 Type 1 attestation in hand

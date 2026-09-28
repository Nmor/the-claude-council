# Behavioral testing

> Size budget: 2 KB.

Test changed behavior and meaningful failure paths with the appropriate unit, integration or end-to-end checks. Preserve required repository gates. Report actual coverage and skips; generated/wiring coverage is not behavioral proof. Reuse valid results for unchanged code and environment; rerun when changes, failures or uncertainty invalidate them. Avoid tests that merely repeat implementation or certify that a command was invoked.

Include operator-visible outcomes for failure and fallback branches; a correct internal return value does not prove the product flow works.

For relevant detailed procedures and examples, read
[the reference](../../rules-library/council-detail/functional-test-coverage.md).
Do not preload it for unrelated work.

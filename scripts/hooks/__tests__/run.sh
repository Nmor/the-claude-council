#!/usr/bin/env bash
# Run the Council hook regression suite.
#
# No package.json, no test framework, no dependency: node's built-in runner is enough, and a
# dependency here would have to be installed before the enforcement layer could be trusted.
#
#   ./__tests__/run.sh            # all hook tests
#   ./__tests__/run.sh --watch    # re-run on change
# Size budget: 4 KB. Check: wc -c; gate: token-budget.mjs --check.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Every *.test.mjs, not a hand-listed subset. This line used to name one file while the
# usage above said "all hook tests", so three of four suites never ran and the count
# looked healthy — the same defect the gates here exist to catch, in the runner itself.
exec node --test "$@" __tests__/*.test.mjs

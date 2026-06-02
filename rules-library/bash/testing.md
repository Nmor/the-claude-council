# Bash / Shell Testing

> Auto-fires on every `tests/*.bats`, `test_*.sh`, `*_test.sh`,
> `test-*.sh` file. Standards: **bats-core** (Bash Automated
> Testing System), **shunit2**, **POSIX shell** test conventions.

## Core Principle

**Even shell scripts deserve tests. bats-core is the canonical
framework; shunit2 if POSIX-only required. Tests cover the
script's CLI contract (exit codes, stdout, stderr) + the
internal functions' edge cases. Coverage measured via
`kcov` / `bashcov`.**

## bats-core idioms

```bash
#!/usr/bin/env bats
# tests/process_file.bats

setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
    load 'test_helper/bats-file/load'

    TMPDIR="$(mktemp -d)"
    export PATH="$BATS_TEST_DIRNAME/..:$PATH"
}

teardown() {
    rm -rf "$TMPDIR"
}

@test "process_file with valid input succeeds" {
    run process-file.sh "fixtures/valid.txt"
    assert_success
    assert_output --partial "processed 3 lines"
}

@test "process_file with missing file errors with exit 2" {
    run process-file.sh "/nonexistent"
    assert_failure 2
    assert_output --partial "input not found"
}

@test "process_file outputs to stdout when -o not given" {
    run process-file.sh "fixtures/valid.txt"
    assert_success
    assert_line "line one"
    assert_line "line two"
    assert_line "line three"
}

@test "process_file writes to -o file" {
    out="$TMPDIR/out.txt"
    run process-file.sh -o "$out" "fixtures/valid.txt"
    assert_success
    assert_file_exists "$out"
    assert_file_contains "$out" "line one"
}
```

Run with:

```bash
bats tests/*.bats
```

## What to test

| Aspect | Approach |
| --- | --- |
| Exit codes | `assert_success` (0), `assert_failure N` |
| Stdout | `assert_output --partial "string"` |
| Stderr | Capture via `run 2>&1`; assert on combined output |
| File creation | `assert_file_exists` (bats-file) |
| File content | `assert_file_contains` |
| Environment side effects | Check post-run env |
| Argument parsing | Test `-h`, `-v`, unknown options |
| Error paths | Missing args, malformed input, permission denied |
| Cleanup | Assert temp files removed after `EXIT` trap fires |

## Mocking external commands

```bash
# Override commands in PATH for the test
setup() {
    PATH="$BATS_TEST_DIRNAME/mocks:$PATH"
}

# tests/mocks/curl
#!/usr/bin/env bash
echo "mocked curl response"
exit 0
```

Or use bats-mock:

```bash
load 'test_helper/bats-mock/load'

@test "calls curl with expected args" {
    mock="$(mock_create)"
    mock_set_output "$mock" 'fake response'

    PATH="$(dirname "$mock"):$PATH" run myscript.sh

    assert_equal "$(mock_get_call_args "$mock" 1)" "https://api.example.com"
}
```

## shunit2 (POSIX alternative)

```sh
#!/bin/sh
# tests/process_file_test.sh

testProcessFileSucceeds() {
    output="$(../process-file.sh fixtures/valid.txt)"
    assertEquals 0 $?
    assertContains "$output" "processed"
}

testProcessFileMissingErrors() {
    ../process-file.sh /nonexistent
    assertEquals 2 $?
}

# Load shunit2
. ./shunit2
```

## Coverage with kcov

```bash
# Install: brew install kcov  (or apt-get install kcov)

kcov --bash-dont-parse-binary-dir --include-pattern=.sh \
     "$PWD/coverage" \
     bats tests/

# Open HTML report:
open coverage/index.html
```

For bash specifically, `bashcov` (Ruby-based) also works:

```bash
bashcov bats tests/*.bats
```

## Hard rules

### 1. Tests run in CI on every change

```yaml
- name: Bats tests
  run: |
    git submodule update --init --recursive  # bats-* submodules
    bats tests/
```

### 2. No real network in tests

Mock curl / wget; use local fixtures.

### 3. No real `rm -rf` / `dd if=/dev/zero of=/dev/sda` (obvious)

Tests run in disposable environments (containers / `mktemp -d`).

### 4. Test the CLI shape, not the implementation

```bash
# WRONG — coupled to internal function name
@test "internal helper works" {
    run process-file.sh --debug-internal
}

# RIGHT — test public CLI
@test "process-file produces expected output" {
    run process-file.sh fixtures/valid.txt
    assert_output "expected text"
}
```

### 5. Cover the failure paths

Every error branch in the script has a corresponding test.

### 6. Use fixtures, not inline data

```bash
# WRONG
@test "..." {
    echo "test data line 1" > /tmp/file
    echo "test data line 2" >> /tmp/file
    run myscript /tmp/file
}

# RIGHT
@test "..." {
    run myscript "$BATS_TEST_DIRNAME/fixtures/valid.txt"
}
```

Fixtures live in `tests/fixtures/`.

### 7. Each test is independent

`setup` / `teardown` for state isolation. Run tests in random
order:

```bash
bats --shuffle tests/
```

## Cross-references

- `~/.claude/rules/common/testing.md`
- `~/.claude/rules/common/extreme-lint-policy.md`
- `~/.claude/rules/bash/coding-style.md`
- `~/.claude/rules/bash/no-discards.md`
- bats-core docs (bats-core.readthedocs.io)
- shunit2 docs (github.com/kward/shunit2)
- kcov docs (github.com/SimonKagstrom/kcov)

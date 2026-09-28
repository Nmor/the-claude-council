"""Native hook contracts and conservative evidence handling."""

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / "codex" / "hooks.py"
SPEC = importlib.util.spec_from_file_location("council_native_hooks", SCRIPT)
hooks = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hooks)


class HookTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.home = Path(self.temporary.name).resolve()
        self.root = self.home / "project"
        self.root.mkdir()
        self.plan = self.home / "existing-plan.md"
        self.plan.write_text("Existing requirements\n")
        (self.home / "council").mkdir()
        self.register([{"root": str(self.root), "plan": str(self.plan)}])

    def register(self, entries):
        (self.home / "council" / "projects.json").write_text(json.dumps({"projects": entries}))

    def event(self, event="PreToolUse", tool="apply_patch", value="", **extra):
        return {"hook_event_name": event, "cwd": str(self.root), "tool_name": tool,
                "tool_input": value, **extra}

    def run_hook(self, value):
        result = subprocess.run([sys.executable, str(SCRIPT), "--home", str(self.home)],
                                input=value, text=True, capture_output=True, check=True)
        self.assertEqual(result.stderr, "")
        return json.loads(result.stdout)

    def denied(self, response):
        return response.get("hookSpecificOutput", {}).get("permissionDecision") == "deny"

    def test_longest_project_and_boundary(self):
        nested = self.root / "nested"
        second = self.home / "nested-plan.md"
        second.write_text("nested")
        self.register([{"root": str(self.root), "plan": str(self.plan)},
                       {"root": str(nested), "plan": str(second)}])
        self.assertEqual(hooks.project_plan(self.home, nested / "src"), second)
        self.assertEqual(hooks.project_plan(self.home, self.root / "src"), self.plan)
        self.assertIsNone(hooks.project_plan(self.home, str(self.root) + "-other"))

    def test_session_points_to_exact_existing_plan(self):
        response = hooks.dispatch(self.event("SessionStart"), self.home)
        self.assertIn(str(self.plan), response["hookSpecificOutput"]["additionalContext"])
        self.assertEqual(self.plan.read_text(), "Existing requirements\n")

    def test_patch_parser_preserves_multiple_operations_and_content(self):
        patch = "*** Begin Patch\n*** Add File: src/a.py\n+print(1)\n*** Update File: src/b.py\n*** Move to: src/c.py\n-old\n+new\n*** Delete File: src/d.py\n*** End Patch"
        operations = hooks.patch_operations(patch)
        self.assertEqual([item["operation"] for item in operations], ["add", "update", "delete"])
        self.assertEqual(operations[0]["content"], ["+print(1)"])
        self.assertEqual(operations[1]["move_to"], "src/c.py")
        self.assertEqual(operations[1]["content"], ["-old", "+new"])

    def test_each_native_patch_input_shape_denies_alternate_plan(self):
        patch = "*** Begin Patch\n*** Add File: src/file.py\n+pass\n*** Add File: docs/plan.md\n+duplicate\n*** End Patch"
        for value in [patch, {"command": patch}, {"patch": patch}, {"input": patch}]:
            with self.subTest(value=value):
                self.assertTrue(self.denied(hooks.dispatch(self.event(value=value), self.home)))

    def test_canonical_plan_and_normal_markdown_allowed(self):
        for path in [self.plan, "docs/installation.md", "docs/planning-guide.md"]:
            patch = f"*** Begin Patch\n*** Add File: {path}\n+content\n*** End Patch"
            self.assertEqual(hooks.dispatch(self.event(value=patch), self.home), {})
        patch = f"*** Update File: {self.plan}\n-old\n+new"
        self.assertEqual(hooks.dispatch(self.event(value=patch), self.home), {})

    def test_move_to_alternate_plan_denied(self):
        for path in ["implementation-plan.md", ".claude/plans/new-name.md", ".codex/plans/new-name.md"]:
            patch = f"*** Update File: README.md\n*** Move to: {path}\n+x"
            self.assertTrue(self.denied(hooks.dispatch(self.event(value=patch), self.home)))

    def test_canonical_plan_cannot_be_deleted_or_moved(self):
        for patch in [f"*** Delete File: {self.plan}",
                      f"*** Update File: {self.plan}\n*** Move to: notes.md\n+x"]:
            self.assertTrue(self.denied(hooks.dispatch(self.event(value=patch), self.home)))

    def test_existing_other_plan_update_is_not_creation(self):
        self.assertEqual(hooks.dispatch(self.event(value="*** Update File: docs/plan.md\n+x"), self.home), {})

    def test_missing_plan_does_not_select_parent_or_create_new_file(self):
        self.plan.unlink()
        output = self.run_hook(json.dumps(self.event("SessionStart")))
        self.assertIn("registered implementation plan is missing", output["systemMessage"])
        self.assertFalse(self.plan.exists())

    def test_malformed_payload_returns_valid_advisory_json(self):
        for value in ["not json", "[]", "null", '{"hook_event_name":"Stop","cwd":5}']:
            with self.subTest(value=value):
                output = self.run_hook(value)
                self.assertIn("No verification or permission decision", output["systemMessage"])
                self.assertNotIn("decision", output)

    def test_malformed_registry_is_advisory(self):
        self.register([{"root": "relative", "plan": str(self.plan)}])
        output = self.run_hook(json.dumps(self.event("SessionStart")))
        self.assertIn("absolute paths", output["systemMessage"])

    def test_failure_running_and_unknown_are_never_success_evidence(self):
        cases = [({"exit_code": 1}, "exited with code 1"),
                 ({"session_id": 12}, "no explicit terminal"),
                 ({"exit_code": 0, "session_id": 12}, "no explicit terminal"),
                 ({"exit_code": 0, "status": "running"}, "no explicit terminal"),
                 ({"exit_code": 0, "isError": True}, "no explicit terminal"),
                 ({"exit_code": False}, "no explicit terminal"),
                 ("all passed", "no explicit terminal"), ({}, "no explicit terminal")]
        for response, expected in cases:
            with self.subTest(response=response):
                output = hooks.dispatch(self.event("PostToolUse", "Bash", {"cmd": "go test ./..."},
                                                  tool_response=response), self.home)
                message = output["hookSpecificOutput"]["additionalContext"]
                self.assertIn(expected, message)
                self.assertNotIn("exited with code 0", message)
        self.assertEqual(list((self.home / "council").iterdir()), [self.home / "council" / "projects.json"])

    def test_terminal_success_only_reports_scope_limited_evidence(self):
        output = hooks.dispatch(self.event("PostToolUse", "Bash", {"command": "python -m unittest"},
                                          tool_response={"exit_code": 0, "session_id": None}), self.home)
        self.assertIn("does not certify tests", output["hookSpecificOutput"]["additionalContext"])

    def test_risk_reminder_does_not_grant_permission(self):
        for command in ["git push origin main", "rm -rf build"]:
            output = hooks.dispatch(self.event(tool="exec_command", value={"cmd": command}), self.home)
            self.assertIn("does not grant permission", output["hookSpecificOutput"]["additionalContext"])
            self.assertNotIn("permissionDecision", output["hookSpecificOutput"])

    def test_stop_and_precompact_are_nonblocking_and_do_not_read_transcripts(self):
        for event in ["Stop", "PreCompact"]:
            output = hooks.dispatch(self.event(event, transcript_path="/unreadable/transcript",
                                              stop_hook_active=True), self.home)
            self.assertEqual(set(output), {"systemMessage"})
            self.assertIn(str(self.plan), output["systemMessage"])

    def test_unknown_event_has_no_effect(self):
        self.assertEqual(hooks.dispatch({"hook_event_name": "ClaudeOnlyEvent"}, self.home), {})


if __name__ == "__main__":
    unittest.main()

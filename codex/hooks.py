#!/usr/bin/env python3
"""Small native Codex Council hooks; no Claude runtime or transcript access.

These hooks are reminders and a narrow patch guardrail, not a security boundary.
They do not certify tests, run commands, write memory, or grant permissions.
"""

import argparse
import json
from pathlib import Path
import re
import sys


EVENTS = {"SessionStart", "PreToolUse", "PostToolUse", "PreCompact", "Stop"}
PLAN_NAMES = {"plan.md", "implementation-plan.md", "implementation_plan.md"}


def project_plan(home, cwd):
    """Return the most specific registered existing plan, without prefix matches."""
    registry = Path(home) / "council" / "projects.json"
    if not registry.exists():
        return None
    data = json.loads(registry.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
        raise ValueError("projects.json must contain a projects array")
    current = Path(cwd).resolve()
    matches = []
    for entry in data["projects"]:
        if not isinstance(entry, dict):
            raise ValueError("project entries must be objects")
        root, plan = entry.get("root"), entry.get("plan")
        if not isinstance(root, str) or not isinstance(plan, str):
            raise ValueError("project root and plan must be absolute paths")
        if not Path(root).is_absolute() or not Path(plan).is_absolute():
            raise ValueError("project root and plan must be absolute paths")
        root = Path(root).resolve()
        if current == root or root in current.parents:
            matches.append((len(root.parts), Path(plan).resolve()))
    if not matches:
        return None
    selected = max(matches, key=lambda item: item[0])[1]
    if not selected.is_file():
        raise ValueError("the registered implementation plan is missing")
    return selected


def tool_text(payload):
    value = payload.get("tool_input")
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("command", "cmd", "patch", "input"):
            if isinstance(value.get(key), str):
                return value[key]
    return ""


def patch_operations(patch):
    """Parse apply_patch file headers, retaining each file's patch content."""
    operations = []
    current = None
    for line in patch.splitlines():
        match = re.fullmatch(r"\*\*\* (Add|Update|Delete) File: (.+)", line)
        if match:
            current = {"operation": match[1].lower(), "path": match[2], "content": []}
            operations.append(current)
        elif line.startswith("*** Move to: ") and current is not None:
            current["move_to"] = line[len("*** Move to: "):]
        elif current is not None and not line.startswith("*** "):
            current["content"].append(line)
    return operations


def alternate_plan(path, cwd, canonical):
    candidate = Path(path)
    if not candidate.is_absolute():
        candidate = Path(cwd) / candidate
    candidate = candidate.resolve()
    if candidate == canonical:
        return False
    parts = candidate.parts
    agent_plans = any(parts[i] in {".claude", ".codex"} and parts[i + 1] == "plans"
                      for i in range(len(parts) - 1))
    return agent_plans or candidate.name.lower() in PLAN_NAMES


def context(event, message):
    return {"hookSpecificOutput": {"hookEventName": event, "additionalContext": message}}


def command_status(response):
    """Only explicit terminal structured exit codes count as known results."""
    if isinstance(response, str):
        try:
            response = json.loads(response)
        except (ValueError, TypeError):
            return None
    if not isinstance(response, dict):
        return None
    if response.get("session_id") is not None or response.get("status") in {"running", "pending"}:
        return None
    if response.get("isError") is True:
        return None
    code = response.get("exit_code")
    return code if type(code) is int else None


def dispatch(payload, home):
    if not isinstance(payload, dict):
        raise ValueError("hook input must be a JSON object")
    event = payload.get("hook_event_name")
    if event not in EVENTS:
        return {}
    cwd = payload.get("cwd")
    if not isinstance(cwd, str) or not Path(cwd).is_absolute():
        raise ValueError("hook cwd must be an absolute path")
    plan = project_plan(home, cwd)
    handoff = (f"Use the existing implementation plan at {plan}. Update it in place with evidence, "
               "remaining work, and the next agent's handoff; do not create another plan.") if plan else (
               "Use the project's existing implementation plan and keep handoff evidence there. "
               "No plan is registered for this directory; locate the existing plan before creating one.")
    if event == "SessionStart":
        return context(event, "Council: read the installed Council instructions and relevant skills. " + handoff)
    if event in {"PreCompact", "Stop"}:
        return {"systemMessage": "Council handoff reminder: " + handoff}
    tool = payload.get("tool_name")
    text = tool_text(payload)
    if event == "PreToolUse" and tool in {"apply_patch", "Edit", "Write"} and plan:
        for operation in patch_operations(text):
            original = Path(operation["path"])
            if not original.is_absolute():
                original = Path(cwd) / original
            removes_canonical = original.resolve() == plan and (
                operation["operation"] == "delete" or bool(operation.get("move_to")))
            targets = []
            if operation["operation"] == "add":
                targets.append(operation["path"])
            if operation.get("move_to"):
                targets.append(operation["move_to"])
            if removes_canonical or any(alternate_plan(target, cwd, plan) for target in targets):
                return {"hookSpecificOutput": {
                    "hookEventName": event,
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Council single-plan guardrail: update {plan} in place. "
                                                "This patch removes the canonical plan or creates/moves to another plan path. "
                                                "If the user changed the authoritative plan, update its registration first.",
                }}
    if tool in {"Bash", "exec_command", "shell_command"}:
        if event == "PreToolUse" and re.search(
                r"\b(?:git\s+(?:push|reset|clean)|rm|terraform\s+(?:apply|destroy)|kubectl\s+delete)\b", text):
            return context(event, "Council: verify the user's authorization and target before this potentially "
                           "destructive or external operation. This reminder does not grant permission.")
        if event == "PostToolUse" and re.search(r"\b(?:test|pytest|unittest|lint|build|vet)\b", text):
            status = command_status(payload.get("tool_response"))
            if status is None:
                return context(event, "Council: no explicit terminal command result is available. Do not record "
                               "verification as successful from a running, failed-wrapper, or unknown response.")
            if status != 0:
                return context(event, f"Council: this command exited with code {status}. Record the failure and "
                               "resolve it or document the blocker before claiming verification.")
            return context(event, "Council: the command exited with code 0. Inspect its actual checks, skips, and "
                           "scope before recording evidence; this hook does not certify tests or coverage.")
    return {}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--home", required=True, type=Path)
    args = parser.parse_args()
    try:
        output = dispatch(json.load(sys.stdin), args.home)
    except (ValueError, OSError, TypeError) as error:
        # Do not use unsupported blocking shapes or silently imply enforcement.
        output = {"systemMessage": f"Council hook could not evaluate its input/configuration: {error}. "
                                  "No verification or permission decision was made."}
    print(json.dumps(output))


if __name__ == "__main__":
    main()

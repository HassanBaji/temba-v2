#!/usr/bin/env python3
"""Publish remaining Community tickets to GitHub. Idempotent on title."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = os.environ.get("REPO", "HassanBaji/temba-v2")
ROOT = Path(__file__).resolve().parent / "issues"

TICKETS = [
    ("01", "01-unique-membership-and-game-restrict.md", "Unique Group membership and Game-on-Group restrict", []),
    ("02", "02-create-community-and-directory.md", "Create Community and Directory", []),
    ("03", "03-request-to-join-community-public.md", "Request to join Community Public", ["02"]),
    ("04", "04-admit-community-private.md", "Admit to Community Private (Email invite + Invite link)", ["02"]),
    ("05", "05-club-group-public.md", "Club Group Public: create, join, leave Group", ["01", "02", "03"]),
    ("06", "06-loose-group-public.md", "Loose Group Public: create and join via URL", ["01"]),
    ("07", "07-club-group-private-and-leave-community.md", "Club Group Private invites and leave Community", ["05"]),
    ("08", "08-loose-group-private-invites.md", "Loose Group Private Email invite and Invite link", ["04", "06"]),
    ("09", "09-owner-roles.md", "Owner roles", ["03"]),
    ("10", "10-community-sports.md", "Change Community sports", ["05"]),
    ("11", "11-soft-archive-community.md", "Soft-archive Community", ["04", "05", "06"]),
    ("12", "12-delete-empty-groups.md", "Delete empty Groups", ["01", "05", "06"]),
]


def gh(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["gh", *args],
        check=check,
        capture_output=True,
        text=True,
    )


def parse_local(path: Path) -> tuple[str, list[str]]:
    text = path.read_text()
    what = re.search(r"\*\*What to build:\*\* (.+?)\n\n", text, re.S)
    checks = re.findall(r"^- \[ \] .+$", text, re.M)
    if not what:
        raise SystemExit(f"no what-to-build in {path}")
    return what.group(1).strip(), checks


def list_open_issues() -> dict[str, dict]:
    raw = gh(
        "issue",
        "list",
        "--repo",
        REPO,
        "--state",
        "open",
        "--limit",
        "50",
        "--json",
        "number,title,url",
    ).stdout
    by_prefix: dict[str, dict] = {}
    for item in json.loads(raw):
        m = re.match(r"^(\d{2}): ", item["title"])
        if m:
            by_prefix[m.group(1)] = item
    return by_prefix


def issue_db_id(number: int) -> int:
    return int(
        gh("api", f"repos/{REPO}/issues/{number}", "--jq", ".id").stdout.strip()
    )


def build_body(what: str, checks: list[str], blocked_md: str) -> str:
    criteria = "\n".join(checks)
    return f"""Part of #1

## Parent

https://github.com/{REPO}/issues/1

## What to build

{what}

## Acceptance criteria

{criteria}

## Blocked by

{blocked_md}
"""


def create_issue(key: str, title: str, body: str) -> dict:
    full_title = f"{key}: {title}"
    labeled = gh(
        "issue",
        "create",
        "--repo",
        REPO,
        "--title",
        full_title,
        "--body",
        body,
        "--label",
        "ready-for-agent",
        check=False,
    )
    if labeled.returncode != 0:
        created = gh(
            "issue",
            "create",
            "--repo",
            REPO,
            "--title",
            full_title,
            "--body",
            body,
        )
        url = created.stdout.strip()
    else:
        url = labeled.stdout.strip()
    number = int(url.rsplit("/", 1)[-1])
    return {"number": number, "title": full_title, "url": url}


def add_blocked_by(child_number: int, blocker_db_id: int) -> str:
    result = gh(
        "api",
        "--method",
        "POST",
        f"repos/{REPO}/issues/{child_number}/dependencies/blocked_by",
        "-f",
        f"issue_id={blocker_db_id}",
        check=False,
    )
    if result.returncode != 0:
        return result.stderr.strip() or result.stdout.strip()
    return "ok"


def add_sub_issue(parent: int, child_db_id: int) -> str:
    result = gh(
        "api",
        "--method",
        "POST",
        f"repos/{REPO}/issues/{parent}/sub_issues",
        "-F",
        f"sub_issue_id={child_db_id}",
        check=False,
    )
    if result.returncode != 0:
        return result.stderr.strip() or result.stdout.strip()
    return "ok"


def main() -> int:
    existing = list_open_issues()
    created: dict[str, dict] = {}

    for key, filename, title, blockers in TICKETS:
        if key in existing:
            created[key] = {
                "number": existing[key]["number"],
                "title": existing[key]["title"],
                "url": existing[key]["url"],
            }
            print(f"exists {key} -> #{created[key]['number']}")
            continue

        if blockers:
            lines = []
            for b in blockers:
                if b not in created:
                    raise SystemExit(f"{key} blocked by {b} which is not created yet")
                info = created[b]
                lines.append(f"- #{info['number']} {info['title']}")
            blocked_md = "\n".join(lines)
        else:
            blocked_md = "None (can start immediately)."

        what, checks = parse_local(ROOT / filename)
        body = build_body(what, checks, blocked_md)
        created[key] = create_issue(key, title, body)
        print(f"created {key} -> #{created[key]['number']} {created[key]['url']}")

    print("--- blocked_by ---")
    for key, filename, title, blockers in TICKETS:
        child = created[key]["number"]
        if not blockers:
            continue
        for b in blockers:
            blocker_id = issue_db_id(created[b]["number"])
            status = add_blocked_by(child, blocker_id)
            print(f"#{child} blocked_by #{created[b]['number']}: {status}")

    print("--- sub_issues of #1 ---")
    for key, *_ in TICKETS:
        child_id = issue_db_id(created[key]["number"])
        status = add_sub_issue(1, child_id)
        print(f"#{created[key]['number']} sub of #1: {status}")

    mapping_path = Path(__file__).resolve().parent / "github-ticket-map.json"
    mapping_path.write_text(json.dumps(created, indent=2) + "\n")
    print(f"wrote {mapping_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

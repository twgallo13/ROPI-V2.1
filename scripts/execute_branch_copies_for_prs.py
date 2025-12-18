#!/usr/bin/env python3
"""
scripts/execute_branch_copies_for_prs.py

This script executes a safe pilot:
- Reads docs/lisa/branch-rename-proposals.md
- Finds Proposed mappings where Has PR == yes
- For each mapping:
  - checks origin/<old> exists
  - if origin/<proposed> does not exist: create local branch from origin/<old> and push origin/<proposed>
  - logs results to docs/lisa/branch-rename-execution.md

WARNING: This performs remote pushes to create branches but does NOT modify PRs or delete branches.
"""

import subprocess, os, sys, re
from datetime import datetime, timezone

PROPOSALS_MD = "docs/lisa/branch-rename-proposals.md"
EXEC_MD = "docs/lisa/branch-rename-execution.md"

def sh(cmd, check=True):
    try:
        res = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True)
        return res.strip()
    except subprocess.CalledProcessError as e:
        if check:
            raise
        return e.output.strip()

def remote_branch_exists(branch):
    out = sh(f"git ls-remote --heads origin {branch}", check=False)
    return bool(out.strip())

def remote_branch_exists_quiet(branch):
    try:
        out = sh(f"git ls-remote --heads origin {branch}", check=False)
        return bool(out.strip())
    except Exception:
        return False

def parse_proposals():
    if not os.path.exists(PROPOSALS_MD):
        print(f"ERROR: {PROPOSALS_MD} not found.", file=sys.stderr)
        sys.exit(1)
    mappings = []
    with open(PROPOSALS_MD, "r", encoding="utf-8") as f:
        lines = f.readlines()
    # Find the start of Proposed Mapping table
    start = None
    for idx, line in enumerate(lines):
        if line.strip().startswith("| Old Branch") and "Proposed New Branch" in line:
            start = idx + 2  # skip header and separator
            break
    if start is None:
        print("ERROR: Could not find Proposed Mapping table.", file=sys.stderr)
        sys.exit(1)
    for line in lines[start:]:
        if not line.strip() or not line.startswith("|"):
            # end of table
            break
        # Split into columns
        parts = [p.strip() for p in line.split("|")]
        # parts: ['', 'Old Branch', 'Last Commit', 'SHA', 'Has PR', 'PR#', 'PR Title', 'Proposed New Branch', 'Recommended Action', '']
        # ensure at least 9 elements
        if len(parts) < 9:
            continue
        old = parts[1]
        has_pr = parts[4].lower()
        proposed = parts[7]
        if has_pr == "yes":
            mappings.append((old, proposed))
    return mappings

def safe_create_branch(old, proposed, log_lines):
    try:
        # Check origin/<old> exists
        if not remote_branch_exists_quiet(old):
            log_lines.append((old, proposed, "MISSING_REMOTE_SOURCE", f"origin/{old} not found"))
            return
        # Check origin/<proposed> does not exist
        if remote_branch_exists_quiet(proposed):
            log_lines.append((old, proposed, "SKIP_EXISTS", f"origin/{proposed} already exists"))
            return
        # Fetch the remote old branch into local refs
        print(f"Fetching origin/{old}...")
        sh(f"git fetch origin {old}:{old}")
        # Create local proposed branch from local old
        print(f"Creating local branch {proposed} from {old}...")
        sh(f"git branch -f {proposed} {old}")
        # Push proposed to origin
        print(f"Pushing {proposed} to origin...")
        sh(f"git push origin refs/heads/{proposed}:refs/heads/{proposed}")
        log_lines.append((old, proposed, "CREATED", "pushed"))
    except Exception as e:
        log_lines.append((old, proposed, "ERROR", str(e)))

def main():
    mappings = parse_proposals()
    if not mappings:
        print("No mappings with Has PR == yes found. Exiting.")
        return
    log_lines = []
    start_ts = datetime.now(timezone.utc).isoformat()
    for old, proposed in mappings:
        print(f"Processing: {old} -> {proposed}")
        safe_create_branch(old, proposed, log_lines)
    # Write execution log
    with open(EXEC_MD, "w", encoding="utf-8") as f:
        f.write(f"# Branch Rename Execution — PVS-0.1.3\n")
        f.write(f"**Started:** {start_ts}\n\n")
        f.write("| Old Branch | Proposed Branch | Status | Details |\n")
        f.write("|---|---|---|---|\n")
        for old, proposed, status, details in log_lines:
            f.write(f"| {old} | {proposed} | {status} | {details} |\n")
    print(f"Wrote execution log to {EXEC_MD}")
    # Print summary
    created = [l for l in log_lines if l[2] == "CREATED"]
    skipped = [l for l in log_lines if l[2].startswith("SKIP")]
    missing = [l for l in log_lines if l[2] == "MISSING_REMOTE_SOURCE"]
    errors = [l for l in log_lines if l[2] == "ERROR"]
    print("Summary:")
    print(f"  Created: {len(created)}")
    print(f"  Skipped (existing): {len(skipped)}")
    print(f"  Missing source: {len(missing)}")
    print(f"  Errors: {len(errors)}")

if __name__ == "__main__":
    main()

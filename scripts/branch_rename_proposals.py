#!/usr/bin/env python3
"""
scripts/branch_rename_proposals.py
Generates docs/lisa/branch-rename-proposals.md and scripts/execute_branch_copies.sh

- Does NOT execute any destructive actions.
- Produces commands that, when run, will create new lisa/PVS-0.1.2 branches copied from existing branches.
"""

import subprocess, json, os, re, sys
from datetime import datetime, timezone

REPO_OWNER = "twgallo13"
REPO_NAME = "ROPI-V2.1"
OUT_MD = "docs/lisa/branch-rename-proposals.md"
OUT_SH = "scripts/execute_branch_copies.sh"

def sh(cmd):
    return subprocess.check_output(cmd, shell=True, text=True).strip()

def get_remote_branches():
    cmd = "git for-each-ref --format='%(refname:short)|%(committerdate:iso8601)|%(objectname)|%(authorname)' refs/remotes/origin/"
    out = sh(cmd)
    rows = []
    for line in out.splitlines():
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) < 4: continue
        ref, date_s, sha, author = parts[0], parts[1], parts[2], parts[3]
        branch = ref[len("origin/"):] if ref.startswith("origin/") else ref
        rows.append({
            "branch": branch,
            "last_commit_date": date_s,
            "sha": sha,
            "author": author
        })
    return rows

def get_open_prs():
    try:
        cmd = f"gh pr list --repo {REPO_OWNER}/{REPO_NAME} --state open --json number,headRefName,title"
        out = sh(cmd)
        prs = json.loads(out)
        return prs
    except subprocess.CalledProcessError:
        print("Warning: gh CLI not available or failed. PR info will be minimal.", file=sys.stderr)
        return []

def slugify(s, maxlen=40):
    s = s.lower()
    s = re.sub(r'[^a-z0-9-]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s[:maxlen]

def propose_name(old_branch, pr=None):
    base = old_branch.replace('/', '-')
    base = re.sub(r'[^a-zA-Z0-9-_]', '-', base)
    if pr:
        pname = f"lisa/PVS-0.1.2/pr{pr['number']}-{slugify(pr.get('title',''))}"
    else:
        pname = f"lisa/PVS-0.1.2/from-{slugify(base)}"
    # Ensure no double slashes
    return pname

def main():
    branches = get_remote_branches()
    prs = get_open_prs()
    pr_map = {p['headRefName']: p for p in prs} if prs else {}

    nonconforming = [b for b in branches if not b['branch'].startswith('lisa/')]
    proposals = []

    for b in nonconforming:
        branch = b['branch']
        pr = pr_map.get(branch)
        proposed = propose_name(branch, pr)
        proposals.append({
            "old": branch,
            "last_commit": b['last_commit_date'],
            "sha": b['sha'][:7],
            "has_pr": "yes" if pr else "no",
            "pr_number": pr['number'] if pr else None,
            "pr_title": pr['title'] if pr else None,
            "proposed": proposed
        })

    # Write markdown proposal
    lines = []
    lines.append("# Branch Rename Proposals — PVS-0.1.2")
    lines.append(f"**Generated:** {datetime.now(timezone.utc).isoformat()}")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- Nonconforming branches found: {len(proposals)}")
    lines.append("")
    lines.append("## Proposed Mapping")
    lines.append("| Old Branch | Last Commit | SHA | Has PR | PR# | PR Title | Proposed New Branch | Recommended Action |")
    lines.append("|---|---|---|---:|---|---|---|---|")
    for p in proposals:
        prnum = p['pr_number'] or ""
        prtitle = (p['pr_title'] or "").replace("|","\\|")
        rec = "Create new lisa branch and push; ask author to update PR head to new branch OR close original PR and open new PR against same base referencing PVS tag"
        lines.append(f"| {p['old']} | {p['last_commit']} | {p['sha']} | {p['has_pr']} | {prnum} | {prtitle} | {p['proposed']} | {rec} |")

    lines.append("")
    lines.append("## Commands to create new branches (non-destructive)")
    lines.append("**WARNING**: these are suggestions. Do not run until Lisa approves and assigns PVS patches for execution.")
    lines.append("")
    lines.append("Run the following commands to create new branches and push them to origin:")
    lines.append("```bash")
    for p in proposals:
        lines.append(f"# From: {p['old']} -> To: {p['proposed']}")
        lines.append(f"git fetch origin {p['old']}:{p['old']}")
        lines.append(f"git checkout -b {p['proposed']} origin/{p['old']}")
        lines.append(f"git push origin {p['proposed']}")
        lines.append("")
    lines.append("```")
    lines.append("")
    lines.append("## Next steps (recommended)")
    lines.append("1. Lisa to review proposals and mark branches to act on.")
    lines.append("2. For approved items, create dedicated PVS patch PRs that perform the copy + PR head updates or deletion as needed.")
    lines.append("3. Use `scripts/execute_branch_copies.sh` if Lisa approves to run these commands in a single step.")
    lines.append("")
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # Also generate the executable shell script
    sh_lines = ["#!/usr/bin/env bash", "set -euo pipefail", "", "# scripts/execute_branch_copies.sh", "# This script will create new lisa/PVS-0.1.2 branches from existing branches and push them to origin.",
                "# DO NOT RUN until Lisa approves and the appropriate PVS is assigned for each rename.", ""]
    for p in proposals:
        sh_lines.append(f"echo 'Creating branch {p['proposed']} from origin/{p['old']}'")
        sh_lines.append(f"git fetch origin {p['old']}:{p['old']}")
        sh_lines.append(f"git checkout -b {p['proposed']} origin/{p['old']}")
        sh_lines.append(f"git push origin {p['proposed']}")
        sh_lines.append("")

    with open(OUT_SH, "w", encoding="utf-8") as f:
        f.write("\n".join(sh_lines))
    os.chmod(OUT_SH, 0o755)

    print(f"Wrote {OUT_MD} and {OUT_SH}")

if __name__ == "__main__":
    main()

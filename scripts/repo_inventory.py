#!/usr/bin/env python3
"""
scripts/repo_inventory.py
Produces docs/lisa/cleanup-report.md with:
- Remote branches and last commit
- Open PRs
- Candidate stale branches (> 90 days)
- Nonconforming branch names
- Proposed actions (recommendations)
"""

import subprocess, json, sys, os
from datetime import datetime, timezone, timedelta
import shlex

REPO_OWNER = "twgallo13"
REPO_NAME = "ROPI-V2.1"
OUT_PATH = "docs/lisa/cleanup-report.md"
STALE_DAYS = 90  # branches not touched in this many days are considered stale

def sh(cmd):
    return subprocess.check_output(cmd, shell=True, text=True).strip()

def get_remote_branches():
    # Use git for-each-ref to get remote branches and last commit ISO date
    cmd = "git for-each-ref --format='%(refname:short)|%(committerdate:iso8601)|%(objectname)|%(authorname)' refs/remotes/origin/"
    out = sh(cmd)
    rows = []
    for line in out.splitlines():
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) < 4:
            continue
        ref, date_s, sha, author = parts[0], parts[1], parts[2], parts[3]
        # normalize branch name (refs/remotes/origin/branch -> branch)
        branch = ref
        if branch.startswith("origin/"):
            branch = branch[len("origin/"):]
        rows.append({
            "branch": branch,
            "last_commit_date": date_s,
            "sha": sha,
            "author": author
        })
    return rows

def days_since(date_s):
    try:
        dt = datetime.fromisoformat(date_s.replace("Z", "+00:00"))
    except Exception:
        # fallback parse
        dt = datetime.strptime(date_s.split(" ")[0], "%Y-%m-%dT%H:%M:%S%z")
    return (datetime.now(timezone.utc) - dt).days

def get_open_prs():
    # Use gh CLI to get open PRs with useful fields
    try:
        cmd = f"gh pr list --repo {REPO_OWNER}/{REPO_NAME} --state open --json number,title,headRefName,baseRefName,createdAt,updatedAt,author,labels"
        out = sh(cmd)
        pr_list = json.loads(out)
        # normalize into dicts
        prs = []
        for pr in pr_list:
            prs.append({
                "number": pr.get("number"),
                "title": pr.get("title"),
                "head": pr.get("headRefName"),
                "base": pr.get("baseRefName"),
                "createdAt": pr.get("createdAt"),
                "updatedAt": pr.get("updatedAt"),
                "author": pr.get("author", {}).get("login"),
                "labels": [l.get("name") for l in pr.get("labels", [])] if pr.get("labels") else []
            })
        return prs
    except subprocess.CalledProcessError as e:
        print("Warning: gh CLI not available or failed. Skipping PR list.", file=sys.stderr)
        return []

def branch_has_pr(branch, prs):
    for pr in prs:
        if pr["head"] == branch:
            return True
    return False

def matches_lisa(branch):
    return branch.startswith("lisa/") or branch in ("aoss-main","main","develop","master")

def generate_report():
    branches = get_remote_branches()
    prs = get_open_prs()
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(days=STALE_DAYS)

    # Enrich branches with days and PR presence and conformance
    for b in branches:
        try:
            b["days_since_last_commit"] = days_since(b["last_commit_date"])
        except Exception:
            b["days_since_last_commit"] = None
        b["has_open_pr"] = branch_has_pr(b["branch"], prs)
        b["conforms_to_lisa"] = matches_lisa(b["branch"])

    # Candidate stale branches
    stale_branches = [b for b in branches if (b["days_since_last_commit"] is not None and b["days_since_last_commit"] >= STALE_DAYS)]

    # Branches with no PRs
    branches_without_pr = [b for b in branches if not b["has_open_pr"]]

    # Nonconforming branches
    nonconforming = [b for b in branches if not b["conforms_to_lisa"]]

    # PRs lacking PVS tag
    prs_missing_pvs = []
    for pr in prs:
        if "PVS-" not in (pr["title"] or ""):
            prs_missing_pvs.append(pr)

    # Build markdown report
    lines = []
    lines.append("# Repo Inventory & Proposed Cleanup Plan")
    lines.append(f"**Generated:** {now.isoformat()}")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- Remote branch count: {len(branches)}")
    lines.append(f"- Open PR count: {len(prs)}")
    lines.append(f"- Candidate stale branches (>{STALE_DAYS} days): {len(stale_branches)}")
    lines.append(f"- Nonconforming branch names: {len(nonconforming)}")
    lines.append("")
    lines.append("## Open PRs")
    if prs:
        lines.append("| # | Title | Head | Base | Created | Updated | Author | Labels |")
        lines.append("|---:|---|---|---|---|---|---|---|")
        for pr in prs:
            labels = ", ".join(pr["labels"]) if pr["labels"] else ""
            lines.append(f"| {pr['number']} | {pr['title'].replace('|','\\|')} | {pr['head']} | {pr['base']} | {pr['createdAt']} | {pr['updatedAt']} | {pr['author']} | {labels} |")
    else:
        lines.append("_No open PRs found or gh CLI unavailable_")
    lines.append("")

    lines.append("## Remote branches (sample)")
    lines.append("| Branch | Last commit | Days since | SHA | Author | Has PR | Conforms |")
    lines.append("|---|---|---:|---|---|---|---|")
    for b in sorted(branches, key=lambda x: (x.get("days_since_last_commit") or 0), reverse=True)[:200]:
        lines.append(f"| {b['branch']} | {b['last_commit_date']} | {b.get('days_since_last_commit','-')} | {b['sha'][:7]} | {b['author']} | { 'yes' if b['has_open_pr'] else 'no' } | { 'yes' if b['conforms_to_lisa'] else 'no' } |")
    lines.append("")

    lines.append("## Candidate stale branches (> {0} days)".format(STALE_DAYS))
    if stale_branches:
        lines.append("| Branch | Last commit | Days since | Has PR | Conforms |")
        lines.append("|---|---|---:|---|---|")
        for b in sorted(stale_branches, key=lambda x: x["days_since_last_commit"], reverse=True):
            lines.append(f"| {b['branch']} | {b['last_commit_date']} | {b['days_since_last_commit']} | { 'yes' if b['has_open_pr'] else 'no' } | { 'yes' if b['conforms_to_lisa'] else 'no' } |")
    else:
        lines.append("_No candidate stale branches found._")
    lines.append("")

    lines.append("## Branches with no PR")
    lines.append("| Branch | Last commit | Days since | Conforms |")
    lines.append("|---|---|---:|---|")
    for b in sorted(branches_without_pr, key=lambda x: x.get("days_since_last_commit") or 0, reverse=True)[:200]:
        lines.append(f"| {b['branch']} | {b['last_commit_date']} | {b.get('days_since_last_commit','-')} | { 'yes' if b['conforms_to_lisa'] else 'no' } |")
    lines.append("")

    lines.append("## PRs missing PVS tag in title")
    if prs_missing_pvs:
        lines.append("| # | Title | Head | Base | Author |")
        lines.append("|---:|---|---|---|---|")
        for pr in prs_missing_pvs:
            lines.append(f"| {pr['number']} | {pr['title'].replace('|','\\|')} | {pr['head']} | {pr['base']} | {pr['author']} |")
    else:
        lines.append("_All open PRs include a PVS tag in the title or gh unavailable._")
    lines.append("")

    lines.append("## Nonconforming branch names (candidates for rename)")
    if nonconforming:
        lines.append("| Branch | Last commit | Days since | Has PR |")
        lines.append("|---|---|---:|---|")
        for b in nonconforming:
            lines.append(f"| {b['branch']} | {b['last_commit_date']} | {b.get('days_since_last_commit','-')} | { 'yes' if b['has_open_pr'] else 'no' } |")
    else:
        lines.append("_No nonconforming branch names detected._")
    lines.append("")

    lines.append("## Proposed actions (high level)")
    lines.append("The following are proposed actions. **Do not execute without Lisa approval**. This PR is for inventory & recommendation only.")
    lines.append("")
    lines.append("1. For each **candidate stale branch** (> {0} days) without an open PR: propose to archive/delete after confirmation with the branch owner. (Recommend: soft-delete after 14-day notice).".format(STALE_DAYS))
    lines.append("2. For branches with open PRs but missing PVS tag: ask PR author to either rename the PR title to include PVS tag, or reopen under a `lisa/` branch if appropriate.")
    lines.append("3. For **nonconforming branch names** that are active and have PRs: propose to create a `lisa/PVS-.../` branch and push a copy from the current HEAD, update the PR to target the new branch, or request author to rename per agreed process.")
    lines.append("4. For long-lived feature branches with ongoing work, propose to rebase onto `aoss-main` and create a new `lisa/PVS-.../` feature branch to continue development.")
    lines.append("")
    lines.append("## Next steps (recommended workflow)")
    lines.append("1. Lisa to review this inventory and approve/adjust proposed actions.")
    lines.append("2. For approved renames/deletes: create individual PVS patches (PATCH-level) that perform the operations (rename via new branch push + remote delete, delete via `git push origin --delete <branch>`).")
    lines.append("3. Document decisions in `docs/lisa/cleanup-report.md` and update `docs/lisa/pvs-history.md` with the PVS tag for the cleanup actions.")
    lines.append("")
    lines.append("---")
    lines.append("*This report was automatically generated by scripts/repo_inventory.py*")
    # write out
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Report written to {OUT_PATH}")

if __name__ == "__main__":
    generate_report()

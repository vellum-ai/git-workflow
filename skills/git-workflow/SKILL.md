---
name: git-workflow
description: >-
  Git and GitHub workflow automation: branch management, commits, PRs, code
  review, diffs, logs, and changelog generation. Use when the user asks to
  commit, branch, open/review/merge a PR, see git status, diff, log, or
  generate release notes from commit history.
metadata:
  emoji: "🔀"
  vellum:
    display-name: "Git Workflow"
    activation-hints:
      - "User asks to commit changes or stage files"
      - "User asks to create, open, or submit a pull request"
      - "User asks to review or merge a PR"
      - "User asks to create, switch, list, or delete a git branch"
      - "User asks for git status, diff, or log"
      - "User asks for a changelog or release notes from commits"
    avoid-when:
      - "User wants to resolve merge conflicts manually (guide them, do not auto-resolve)"
      - "User wants to rebase or do force-push (not supported by this skill's tools)"
---

# Git Workflow

This skill provides structured tools for common git and GitHub operations. The tools wrap `git` and `gh` (GitHub CLI) commands.

## Prerequisites

- `git` must be installed and available on PATH.
- `gh` (GitHub CLI) must be installed and authenticated for PR operations (`gh auth login`).
- The repository must be a git repo (or provide `repo_path` to point at one).

## Tool Inventory

| Tool | Purpose | Risk |
|------|---------|------|
| `git_status` | Show working tree status | low |
| `git_diff` | Show changes between refs/working tree | low |
| `git_log` | Show commit history | low |
| `git_branch` | List, create, switch, delete branches | medium |
| `git_commit` | Stage files and commit | medium |
| `pr_create` | Open a GitHub pull request | high |
| `pr_list` | List pull requests | low |
| `pr_review` | Fetch PR metadata, CI status, and diff | low |
| `pr_merge` | Merge a pull request | high |
| `changelog` | Generate changelog from commit history | low |

## Workflow Patterns

### Standard commit flow
1. `git_status` to see what changed.
2. `git_diff` to review the actual changes.
3. Confirm the commit message with the user.
4. `git_commit` with the message and optional file list.

### PR creation flow
1. `git_branch` (create) to make a feature branch.
2. `git_commit` to save changes.
3. `git_log` to verify the commit history looks right.
4. Confirm PR title and body with the user.
5. `pr_create` with title, body, and optional reviewers/labels.

### PR review flow
1. `pr_list` to see open PRs.
2. `pr_review` on a specific PR number to get metadata + CI + diff.
3. Summarize the changes for the user and flag any CI failures or concerns.

### Release/changelog flow
1. `changelog` with `from` and `to` refs (or let it auto-detect the previous tag).
2. Use the output as-is for release notes, or ask the assistant to polish it.

## Rules

- **Always confirm before destructive actions.** `git_commit`, `pr_create`, and `pr_merge` modify state. Show the user what will happen and get explicit approval before calling.
- **Never force-push or hard-reset.** These tools do not support force operations. If the user needs them, guide them to run the command manually.
- **Truncate large diffs.** The `pr_review` tool truncates diffs over 8000 chars. If the user needs the full diff, suggest `git_diff` between the PR branches.
- **repo_path is optional.** If the user does not specify a repository path, the tools default to the assistant's working directory. Most users want this default.

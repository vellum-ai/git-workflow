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
      - "User asks for a code review of a PR (loads the code-review skill)"
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
| `git_branch` | List, create, switch, delete branches (safe/force) | medium |
| `git_commit` | Stage files and commit | medium |
| `git_push` | Push current/named branch with upstream tracking | high |
| `git_stash` | Save, list, apply, pop, or drop stashed changes | medium |
| `pr_create` | Open a GitHub pull request | high |
| `pr_list` | List pull requests | low |
| `pr_review` | Fetch PR metadata, CI status, and diff | low |
| `pr_checkout` | Check out a PR branch locally | medium |
| `pr_merge` | Merge a pull request | high |
| `pr_review_gather` | Deep context gather for code review (diff, blame, CI, conventions) | low |
| `pr_comment` | Post a comment on a PR | high |
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
4. `git_push` to publish the branch to the remote (required before `pr_create` can open a PR from an unpushed branch).
5. Confirm PR title and body with the user.
6. `pr_create` with title, body, and optional reviewers/labels.

### PR review flow
1. `pr_list` to see open PRs.
2. `pr_review` on a specific PR number to get metadata + CI + diff.
3. Summarize the changes for the user and flag any CI failures or concerns.

### Code review flow
1. `pr_review_gather` on a PR number to get the full context bundle.
2. The `code-review` skill (loaded automatically) orchestrates parallel subagents for multi-perspective review.
3. Findings are scored for confidence, filtered to >= 80, and presented to the user.
4. If approved, `pr_comment` posts the review as a PR comment.

### Release/changelog flow
1. `changelog` with `from` and `to` refs (or let it auto-detect the previous tag).
2. Use the output as-is for release notes, or ask the assistant to polish it.

## Code Review Skill

This plugin also ships a `code-review` skill that orchestrates deep multi-perspective PR reviews using parallel subagents. When the user asks for a code review, the assistant loads the `code-review` skill which:

1. Calls `pr_review_gather` to collect diff, CI, blame, conventions, and comments
2. Spawns 3 parallel subagents (convention compliance, bug detection, history context)
3. Scores findings 0-100 and filters to confidence >= 80
4. Presents results for approval, then posts via `pr_comment`

This mirrors the approach of Claude's code-review plugin: parallel agents, confidence scoring, low false-positive rate.

## Rules

- **Always confirm before destructive actions.** `git_commit`, `pr_create`, and `pr_merge` modify state. Show the user what will happen and get explicit approval before calling.
- **Never force-push or hard-reset.** These tools do not support force operations. If the user needs them, guide them to run the command manually.
- **Truncate large diffs.** The `pr_review` tool truncates diffs over 8000 chars. If the user needs the full diff, suggest `git_diff` between the PR branches.
- **repo_path is optional.** If the user does not specify a repository path, the tools default to the assistant's working directory. Most users want this default.

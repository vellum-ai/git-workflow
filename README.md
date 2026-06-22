# Git Workflow Plugin for Vellum

A Vellum plugin that wraps `git` and `gh` (GitHub CLI) into structured tools the assistant can call. Built for the Developer/Builder persona: branch management, commits, PRs, code review, diffs, logs, and changelog generation.

## Tools

| Tool | Purpose | Risk Level |
|------|---------|------------|
| `git_status` | Show working tree status (staged, unstaged, untracked) | low |
| `git_diff` | Show changes between commits, branches, or working tree | low |
| `git_log` | Show commit history with filtering | low |
| `git_branch` | List, create, switch, or delete branches | medium |
| `git_commit` | Stage files and create a commit | medium |
| `pr_create` | Open a GitHub pull request with title, body, labels, reviewers | high |
| `pr_list` | List open/closed/merged PRs with filtering | low |
| `pr_review` | Fetch PR metadata, CI checks, and diff for review | low |
| `pr_merge` | Merge a PR (merge/squash/rebase) with branch cleanup | high |
| `changelog` | Generate a changelog from commit history between two refs | low |

## Prerequisites

- `git` installed and on PATH
- `gh` (GitHub CLI) installed and authenticated (`gh auth login`) for PR tools
- A git repository at the assistant's working directory (or pass `repo_path`)

## Installation

```bash
assistant plugins install git-workflow
```

Then restart your assistant.

## Why a plugin instead of raw bash?

Developers are already running git commands through bash. This plugin gives the assistant structured tools with:
- **Clear input schemas** so the model knows exactly what arguments are valid
- **Risk levels** that gate destructive actions (commits, PRs, merges) behind user approval
- **Formatted output** that is clean and parseable rather than raw CLI noise
- **A skill** that teaches the assistant the right workflow patterns (commit flow, PR flow, review flow)

## License

MIT

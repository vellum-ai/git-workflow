# Git Workflow Plugin for Vellum

A Vellum plugin that wraps `git` and `gh` (GitHub CLI) into structured tools the assistant can call, plus a multi-perspective code review skill that spawns parallel subagents. Built for Developer/Builders: branch management, commits, PRs, code review, diffs, logs, and changelog generation.

## Tools

| Tool | Purpose | Risk Level |
|------|---------|------------|
| `git_status` | Show working tree status (staged, unstaged, untracked) | low |
| `git_diff` | Show changes between commits, branches, or working tree | low |
| `git_log` | Show commit history with filtering | low |
| `git_branch` | List, create, switch, or delete branches (with safe/force delete) | medium |
| `git_commit` | Stage files and create a commit | medium |
| `git_push` | Push the current/named branch with upstream tracking (safe force-with-lease) | high |
| `git_stash` | Save, list, apply, pop, or drop stashed changes | medium |
| `pr_create` | Open a GitHub pull request with title, body, labels, reviewers | high |
| `pr_list` | List open/closed/merged PRs with filtering | low |
| `pr_review` | Fetch PR metadata, CI checks, and diff for quick review | low |
| `pr_review_gather` | Deep context gather for code review (diff, blame, CI, conventions, comments) | low |
| `pr_checkout` | Check out a PR branch locally to run/test it | medium |
| `pr_comment` | Post a comment on a PR | high |
| `pr_merge` | Merge a PR (merge/squash/rebase) with branch cleanup | high |
| `changelog` | Generate a changelog from commit history between two refs | low |

## Skills

### git-workflow
Workflow patterns: commit flow, PR creation flow, PR review flow, code review flow, and changelog flow. Activates when the user asks for any git or PR operation.

### code-review
Deep multi-perspective code review using parallel subagents. Mirrors the approach of Claude's code-review plugin:

1. **Gather context** via `pr_review_gather`: full diff, CI status, git blame, repo conventions (AGENTS.md, CLAUDE.md, .cursorrules), existing comments
2. **Spawn 3 parallel subagents**: convention compliance, bug detection, history context
3. **Score findings** 0-100, filter to confidence >= 80 for low false-positive rate
4. **Present to user** for approval, then post via `pr_comment`

Skips closed, draft, and already-reviewed PRs automatically.

## Hooks

### post-tool-use
A lifecycle hook that fires after each tool runs. After a successful `git_commit` or `git_push`, it checks whether the work landed on the repo's default branch (`main`/`master`) and, if so, appends a non-blocking nudge suggesting a feature branch + PR instead. (The plugin lifecycle has no pre-tool boundary, so this guides rather than blocks.)

## Prerequisites

- `git` installed and on PATH
- `gh` (GitHub CLI) installed and authenticated (`gh auth login`) for PR tools
- A git repository at the assistant's working directory (or pass `repo_path`)
- Vellum subagents enabled (for the code-review skill)

## Installation

```bash
assistant plugins install git-workflow
```

Then restart your assistant.

## Why a plugin instead of raw bash?

Developers are already running git commands through bash. This plugin gives the assistant structured tools with:
- **Clear input schemas** so the model knows exactly what arguments are valid
- **Risk levels** that gate destructive actions (commits, PRs, merges, comments) behind user approval
- **Formatted output** that is clean and parseable rather than raw CLI noise
- **Multi-perspective code review** with parallel subagents and confidence scoring, not just a single-pass diff read
- **Two skills** that teach the assistant the right workflow patterns (git operations + code review)

## Development

Requires Node 22+ (uses built-in TypeScript type stripping — no build step).

```bash
npm test         # run the unit tests
npm run typecheck # type-check with tsc (needs dev deps installed)
```

CI runs both on every push and PR (see `.github/workflows/ci.yml`).

## License

MIT

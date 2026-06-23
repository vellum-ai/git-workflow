---
name: code-review
description: >-
  Deep multi-perspective code review of a GitHub pull request. Spawns parallel
  subagents to review from different angles (convention compliance, bug detection,
  git history context), scores each finding for confidence, and posts high-confidence
  issues as a PR comment. Use when the user asks to review a PR, do a code review,
  or check a pull request for issues.
metadata:
  emoji: "🔍"
  vellum:
    display-name: "Code Review"
    activation-hints:
      - "User asks to review a PR or do a code review"
      - "User asks to check a pull request for bugs or issues"
      - "User asks for a deep review of changes"
      - "User says 'review this PR' or 'review PR #N'"
    avoid-when:
      - "User just wants a quick diff summary (use pr_review tool instead)"
      - "User wants to merge a PR (use pr_merge tool)"
---

# Code Review

This skill orchestrates a deep, multi-perspective code review of a GitHub pull request. It spawns parallel subagents, each reviewing from a different angle, then collects findings, scores them for confidence, and posts high-confidence issues as a PR comment.

## Architecture

```
pr-review-gather (tool)
       |
       v
  [context bundle: diff, CI, blame, conventions, comments]
       |
       v
  ┌─────────────────────────────────────┐
  │  Parallel Subagents (via workflows) │
  ├──────────┬──────────┬───────────────┤
  │ Agent 1  │ Agent 2  │ Agent 3       │
  │ Conv     │ Bug      │ History       │
  │ Check    │ Detect   │ Context       │
  └──────────┴──────────┴───────────────┘
       |
       v
  [findings with confidence scores]
       |
       v
  Filter >= 80 confidence
       |
       v
  pr-comment (tool) -- post to GitHub
```

## Workflow

### Step 1: Gather Context

Call `pr_review_gather` with the PR number. This returns:
- PR metadata (title, author, state, branch, file count)
- CI check status
- Full diff (truncated at 30K chars)
- Changed files list
- Git blame for top 5 changed files
- Repo convention files (AGENTS.md, CLAUDE.md, .cursorrules, CONTRIBUTING.md)
- Existing PR comments

If the tool returns a SKIP NOTICE (PR is closed, draft, or already reviewed), inform the user and stop.

### Step 2: Spawn Parallel Review Subagents

Use the `workflows` skill to spawn 3 parallel subagents. Each gets the full context bundle and a specific review angle:

**Subagent 1: Convention Compliance**
- Check the diff against repo conventions (AGENTS.md, CLAUDE.md, .cursorrules, CONTRIBUTING.md)
- Flag violations of naming, structure, patterns, or style rules explicitly stated in those files
- Only flag issues that violate an EXPLICIT rule. Do not invent conventions.
- For each finding: cite the specific rule being violated

**Subagent 2: Bug Detection**
- Focus on logic errors, race conditions, null/undefined handling, edge cases
- Do NOT flag style preferences or subjective choices
- Only flag issues where you are confident there is an actual bug
- For each finding: explain what will break and under what conditions

**Subagent 3: History & Context**
- Use the git blame data to understand who wrote the code being changed and why
- Flag changes that might break existing behavior without considering the original intent
- Identify changes that conflict with patterns in the surrounding codebase
- For each finding: reference the blame context that justifies the concern

### Step 3: Score and Filter

Each subagent returns findings in this format:

```
ISSUE: <one-line summary>
CONFIDENCE: <0-100>
SEVERITY: <low|medium|high>
FILE: <path>
LINES: <start-end>
DETAIL: <2-3 sentence explanation>
SUGGESTION: <concrete fix or next step>
```

Collect all findings from all subagents. Filter to confidence >= 80. Deduplicate overlapping findings (same file + lines + issue type). Sort by severity (high first).

### Step 4: Present to User

Show the filtered findings to the user in a formatted summary. Ask whether to:
1. Post as a PR comment (calls `pr_comment` tool)
2. Post as a draft for the user to edit first
3. Skip posting (just show results in chat)

### Step 5: Post (if approved)

If the user approves posting, format the findings as a markdown comment:

```markdown
## Code Review Results

Reviewed from 3 perspectives: convention compliance, bug detection, history context.

### High Severity
- **[file:lines]** Issue summary
  Detail and suggestion...

### Medium Severity
- ...

---
*Review by Vellum Git Workflow Plugin. Issues filtered to confidence >= 80.*
```

Call `pr_comment` with the PR number and formatted body.

## Confidence Scoring Guide

| Score | Meaning |
|-------|---------|
| 90-100 | Clear bug or explicit convention violation. Will cause issues. |
| 80-89  | Likely bug or convention violation. High confidence but edge case possible. |
| 70-79  | Possible issue. Worth mentioning but may be false positive. (Filtered out) |
| 50-69  | Style preference or subjective concern. (Filtered out) |
| 0-49   | Unlikely to be a real issue. (Filtered out) |

The 80 threshold is deliberately high. The goal is low false-positive rate. A review that flags too many non-issues trains developers to ignore it.

## Rules

- **Never auto-post.** Always show findings to the user and get approval before calling `pr_comment`.
- **Skip drafts and closed PRs.** The `pr_review_gather` tool detects these and returns a skip notice.
- **Skip already-reviewed PRs.** If the PR has existing reviews (APPROVED, CHANGES_REQUESTED, or COMMENTED), the gather tool flags it.
- **Respect CI.** If CI is failing, note it in the review but do not block on it. The review is about code quality, not CI.
- **Cite specific rules.** Convention findings must reference the exact rule from AGENTS.md/CLAUDE.md/etc. Do not invent conventions.
- **No style nitpicks.** Bug detection focuses on logic errors, not formatting. If the repo has a formatter, style issues are not review findings.
- **Truncate gracefully.** Large diffs are truncated at 30K chars. If the diff is truncated, note it in the review and focus on what is available.

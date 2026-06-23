import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGh, runGit, formatResult, resolveCwd, ok } from "../src/runner.ts";

const prReviewGather: ToolDefinition = {
  description:
    "Gather all context needed for a deep code review of a PR: full diff, " +
    "CI check status, existing review comments, git blame for changed files, " +
    "and repo convention/guideline files (AGENTS.md, CLAUDE.md, .cursorrules, CONTRIBUTING.md). " +
    "Use when the user asks for a code review, wants to review a PR deeply, " +
    "or when running the code-review workflow.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      number: {
        type: "number",
        description: "PR number to review. Required.",
      },
      max_diff_chars: {
        type: "number",
        description: "Maximum diff size to return (characters). Default 30000. Larger diffs are truncated.",
      },
      include_blame: {
        type: "boolean",
        description: "Include git blame for changed files. Default true.",
      },
    },
    required: ["number"],
  },
  defaultRiskLevel: "low",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const num = input.number as number;
    const maxDiff = (input.max_diff_chars as number) ?? 30000;

    // 1. PR metadata
    const metaResult = await runGh(
      ["pr", "view", String(num), "--json",
        "title,body,state,isDraft,author,baseRefName,headRefName,additions,deletions,changedFiles,commits,labels,reviews"],
      { cwd, signal: ctx.signal },
    );
    if (!ok(metaResult)) {
      return { content: `Failed to fetch PR #${num}:\n${formatResult(metaResult)}`, isError: true };
    }

    const meta = JSON.parse(metaResult.stdout);

    // Check if review should be skipped
    const skipReasons: string[] = [];
    if (meta.state === "CLOSED") skipReasons.push("PR is closed");
    if (meta.isDraft) skipReasons.push("PR is a draft");
    if (meta.reviews && Array.isArray(meta.reviews) && meta.reviews.length > 0) {
      const hasReview = meta.reviews.some((r: Record<string, unknown>) =>
        r.state === "APPROVED" || r.state === "CHANGES_REQUESTED" || r.state === "COMMENTED"
      );
      if (hasReview) skipReasons.push("PR already has reviews");
    }

    // 2. CI checks
    const checksResult = await runGh(
      ["pr", "checks", String(num)],
      { cwd, signal: ctx.signal },
    );
    const checks = ok(checksResult) ? checksResult.stdout.trim() : "(CI checks not available)";

    // 3. Full diff
    const diffResult = await runGh(
      ["pr", "diff", String(num)],
      { cwd, signal: ctx.signal },
    );
    let diff = "";
    let diffTruncated = false;
    if (ok(diffResult)) {
      diff = diffResult.stdout.trim();
      if (diff.length > maxDiff) {
        diff = diff.slice(0, maxDiff);
        diffTruncated = true;
      }
    }

    // 4. Changed files list
    const filesResult = await runGh(
      ["pr", "view", String(num), "--json", "files", "--jq", ".files[].path"],
      { cwd, signal: ctx.signal },
    );
    const changedFiles = ok(filesResult)
      ? filesResult.stdout.trim().split("\n").filter((f) => f.length > 0)
      : [];

    // 5. Git blame for changed files (top 5 files, first 100 lines each)
    let blameSection = "";
    if (input.include_blame !== false && changedFiles.length > 0) {
      const blameFiles = changedFiles.slice(0, 5);
      const blameParts: string[] = [];
      for (const file of blameFiles) {
        const blameResult = await runGit(
          ["blame", "--line-porcelain", "--", file],
          { cwd, signal: ctx.signal },
        );
        if (ok(blameResult)) {
          // Extract just author + first line of each blame hunk
          const lines = blameResult.stdout.split("\n");
          const summary: string[] = [];
          let currentAuthor = "";
          let lineStart = 0;
          let lineEnd = 0;
          for (let i = 0; i < Math.min(lines.length, 200); i++) {
            if (lines[i].startsWith("author ")) {
              currentAuthor = lines[i].replace("author ", "");
            }
            if (lines[i].startsWith("summary ")) {
              summary.push(`  L${lineStart}-${lineEnd}: ${currentAuthor} - ${lines[i].replace("summary ", "")}`);
            }
          }
          if (summary.length > 0) {
            blameParts.push(`### ${file}\n${summary.slice(0, 10).join("\n")}`);
          }
        }
      }
      blameSection = blameParts.length > 0
        ? `\n\n## Git Blame (top ${blameFiles.length} changed files)\n\n${blameParts.join("\n\n")}`
        : "";
    }

    // 6. Repo convention/guideline files
    const conventionFiles = [
      "AGENTS.md",
      "CLAUDE.md",
      ".cursorrules",
      "CONTRIBUTING.md",
      ".github/PULL_REQUEST_TEMPLATE.md",
      "docs/CONVENTIONS.md",
      "docs/CODING_STANDARDS.md",
    ];
    const fs = await import("node:fs/promises");
    const pathMod = await import("node:path");
    const conventions: string[] = [];
    for (const convFile of conventionFiles) {
      try {
        const fullPath = pathMod.join(cwd, convFile);
        const content = await fs.readFile(fullPath, "utf8");
        if (content.trim().length > 0) {
          conventions.push(`### ${convFile}\n\n\`\`\`markdown\n${content.trim().slice(0, 3000)}\n\`\`\``);
        }
      } catch {
        // File doesn't exist, skip
      }
    }
    const conventionSection = conventions.length > 0
      ? `\n\n## Repo Guidelines & Conventions\n\n${conventions.join("\n\n")}`
      : "\n\n## Repo Guidelines & Conventions\n\n(No AGENTS.md, CLAUDE.md, or convention files found)";

    // 7. Existing PR comments
    const commentsResult = await runGh(
      ["pr", "view", String(num), "--json", "comments", "--jq", ".comments[].body"],
      { cwd, signal: ctx.signal },
    );
    const existingComments = ok(commentsResult) && commentsResult.stdout.trim()
      ? commentsResult.stdout.trim()
      : "(no existing comments)";

    // Assemble the full context
    const skipNotice = skipReasons.length > 0
      ? `\n\n> **SKIP NOTICE:** This PR may not need review: ${skipReasons.join(", ")}\n`
      : "";

    const sections = [
      `# PR #${num} Review Context${skipNotice}`,
      ``,
      `## Metadata`,
      ``,
      `- **Title:** ${meta.title}`,
      `- **Author:** ${meta.author?.login ?? "unknown"}`,
      `- **State:** ${meta.state}${meta.isDraft ? " (DRAFT)" : ""}`,
      `- **Branch:** ${meta.headRefName} -> ${meta.baseRefName}`,
      `- **Changes:** +${meta.additions} -${meta.deletions} across ${meta.changedFiles} files`,
      `- **Commits:** ${meta.commits?.length ?? 0}`,
      ``,
      `## CI Checks`,
      ``,
      checks,
      ``,
      `## Existing PR Comments`,
      ``,
      existingComments,
      ``,
      `## Changed Files`,
      ``,
      changedFiles.map((f: string) => `- \`${f}\``).join("\n") || "(none)",
      ``,
      `## Diff${diffTruncated ? " (truncated)" : ""}`,
      ``,
      "```diff",
      diff || "(no diff available)",
      "```",
      blameSection,
      conventionSection,
    ];

    return { content: sections.join("\n"), isError: false };
  },
};

export default prReviewGather;

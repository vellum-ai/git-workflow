import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGh, runGit, formatResult, resolveCwd, ok } from "../../../src/runner.ts";
import { summarizeBlame } from "../../../src/blame.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const num = input.number as number;
    const maxDiff = (input.max_diff_chars as number) ?? 30000;
    const signal = ctx.signal;

    // Fire all independent gh calls concurrently; they don't depend on each other.
    const [metaResult, checksResult, diffResult, filesResult, commentsResult] =
      await Promise.all([
        runGh(
          ["pr", "view", String(num), "--json",
            "title,body,state,isDraft,author,baseRefName,headRefName,additions,deletions,changedFiles,commits,labels,reviews"],
          { cwd, signal },
        ),
        runGh(["pr", "checks", String(num)], { cwd, signal }),
        runGh(["pr", "diff", String(num)], { cwd, signal }),
        runGh(["pr", "view", String(num), "--json", "files", "--jq", ".files[].path"], { cwd, signal }),
        runGh(["pr", "view", String(num), "--json", "comments", "--jq", ".comments[].body"], { cwd, signal }),
      ]);

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

    const checks = ok(checksResult) ? checksResult.stdout.trim() : "(CI checks not available)";

    let diff = "";
    let diffTruncated = false;
    if (ok(diffResult)) {
      diff = diffResult.stdout.trim();
      if (diff.length > maxDiff) {
        diff = diff.slice(0, maxDiff);
        diffTruncated = true;
      }
    }

    const changedFiles = ok(filesResult)
      ? filesResult.stdout.trim().split("\n").filter((f) => f.length > 0)
      : [];

    // Git blame for the top changed files (depends on changedFiles above).
    let blameSection = "";
    if (input.include_blame !== false && changedFiles.length > 0) {
      const blameFiles = changedFiles.slice(0, 5);
      const blameResults = await Promise.all(
        blameFiles.map((file) =>
          runGit(["blame", "--line-porcelain", "--", file], { cwd, signal }),
        ),
      );
      const blameParts: string[] = [];
      blameFiles.forEach((file, idx) => {
        const blameResult = blameResults[idx];
        if (ok(blameResult)) {
          const summary = summarizeBlame(blameResult.stdout);
          if (summary.length > 0) {
            blameParts.push(`### ${file}\n${summary.join("\n")}`);
          }
        }
      });
      blameSection = blameParts.length > 0
        ? `\n\n## Git Blame (top ${blameFiles.length} changed files)\n\n${blameParts.join("\n\n")}`
        : "";
    }

    // Repo convention/guideline files
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

    // Existing PR comments (fetched up front in the Promise.all above)
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
}

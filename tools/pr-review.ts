import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd, ok } from "../src/runner.ts";

const prReview: ToolDefinition = {
  description:
    "Review a GitHub pull request: fetch the diff, CI status, and review comments. " +
    "Use when the user asks to review a PR, check CI status, or see what a PR changes.",
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
      include_diff: {
        type: "boolean",
        description: "Include the full diff in the output. Default true.",
      },
    },
    required: ["number"],
  },
  defaultRiskLevel: "low",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const num = input.number as number;

    // Fetch PR metadata
    const metaResult = await runGh(
      ["pr", "view", String(num), "--json", "title,body,state,author,baseRefName,headRefName,additions,deletions,changedFiles,commits"],
      { cwd, signal: ctx.signal },
    );
    if (!ok(metaResult)) {
      return { content: `Failed to fetch PR #${num}:\n${formatResult(metaResult)}`, isError: true };
    }

    // Fetch CI status
    const checksResult = await runGh(
      ["pr", "checks", String(num)],
      { cwd, signal: ctx.signal },
    );

    // Fetch diff if requested
    let diffSection = "";
    if (input.include_diff !== false) {
      const diffResult = await runGh(
        ["pr", "diff", String(num)],
        { cwd, signal: ctx.signal },
      );
      if (ok(diffResult)) {
        const diff = diffResult.stdout.trim();
        // Truncate very long diffs to avoid blowing the context window
        const MAX_DIFF = 8000;
        diffSection = diff.length > MAX_DIFF
          ? `\n\n## Diff (truncated, ${diff.length} chars total)\n\n\`\`\`diff\n${diff.slice(0, MAX_DIFF)}\n... (truncated)\n\`\`\``
          : `\n\n## Diff\n\n\`\`\`diff\n${diff}\n\`\`\``;
      }
    }

    const meta = metaResult.stdout.trim();
    const checks = ok(checksResult) ? checksResult.stdout.trim() : "(CI checks not available)";

    const content = `## PR #${num}\n\n\`\`\`json\n${meta}\n\`\`\`\n\n## CI Checks\n\n${checks}${diffSection}`;
    return { content, isError: false };
  },
};

export default prReview;

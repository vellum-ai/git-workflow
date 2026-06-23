import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../src/runner.ts";

const gitStatus: ToolDefinition = {
  description:
    "Show git working tree status: staged, unstaged, and untracked files. " +
    "Use when the user asks 'what changed', 'git status', or wants to see the current state of the repo.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description:
          "Path to the git repository. Defaults to the assistant working directory.",
      },
      short: {
        type: "boolean",
        description: "Use --short format (porcelain output).",
      },
    },
  },
  defaultRiskLevel: "low",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const args = ["status"];
    if (input.short) args.push("--short");
    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default gitStatus;

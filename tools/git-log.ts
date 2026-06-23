import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../src/runner.ts";

const gitLog: ToolDefinition = {
  description:
    "Show git commit log with configurable format and count. " +
    "Use when the user asks for recent commits, git log, or commit history.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      count: {
        type: "number",
        description: "Maximum number of commits to show. Default 20.",
      },
      oneline: {
        type: "boolean",
        description: "Use --oneline format (hash + subject only).",
      },
      branch: {
        type: "string",
        description: "Branch or ref to show log for. Defaults to HEAD.",
      },
      author: {
        type: "string",
        description: "Filter commits by author name/email.",
      },
      since: {
        type: "string",
        description: "Show commits more recent than this date (e.g. '2 weeks ago', '2024-01-01').",
      },
    },
  },
  defaultRiskLevel: "low",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const args = ["log"];
    if (input.oneline) args.push("--oneline");
    args.push(`-${input.count ?? 20}`);
    if (input.branch) args.push(input.branch as string);
    if (input.author) args.push(`--author=${input.author}`);
    if (input.since) args.push(`--since=${input.since}`);
    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default gitLog;

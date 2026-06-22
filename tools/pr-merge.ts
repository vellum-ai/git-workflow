import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../src/runner.ts";

const prMerge: ToolDefinition = {
  description:
    "Merge a GitHub pull request using gh CLI. " +
    "Use when the user asks to merge a PR. " +
    "WARNING: This is a destructive action that modifies the target branch. " +
    "The assistant MUST confirm with the user before merging.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      number: {
        type: "number",
        description: "PR number to merge. Required.",
      },
      method: {
        type: "string",
        enum: ["merge", "squash", "rebase"],
        description: "Merge method. Default 'squash'.",
      },
      delete_branch: {
        type: "boolean",
        description: "Delete the head branch after merging. Default true.",
      },
      admin: {
        type: "boolean",
        description: "Use admin privileges to merge even if CI checks fail or reviews are pending.",
      },
    },
    required: ["number"],
  },
  defaultRiskLevel: "high",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const num = input.number as number;

    const args = [
      "pr", "merge", String(num),
      "--" + ((input.method as string) ?? "squash"),
    ];
    if (input.delete_branch !== false) {
      args.push("--delete-branch");
    }
    if (input.admin) {
      args.push("--admin");
    }

    const result = await runGh(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default prMerge;

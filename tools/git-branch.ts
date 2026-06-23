import type { ToolDefinition } from "@vellumai/plugin-api";
import { RiskLevel } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../src/runner.ts";

const gitBranch: ToolDefinition = {
  description:
    "Git branch management: list, create, switch, or delete branches. " +
    "Use when the user asks to list branches, create a new branch, checkout/switch, or delete a branch.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      action: {
        type: "string",
        enum: ["list", "create", "switch", "delete"],
        description: "What to do: list branches, create a new one, switch to one, or delete one.",
      },
      name: {
        type: "string",
        description: "Branch name (required for create, switch, delete).",
      },
      base: {
        type: "string",
        description: "Base branch to create from (for 'create' action). Defaults to current branch.",
      },
      force: {
        type: "boolean",
        description:
          "For 'delete': force-delete an unmerged branch (git branch -D). " +
          "Without this, deleting an unmerged branch fails safely. Default false.",
      },
    },
    required: ["action"],
  },
  defaultRiskLevel: RiskLevel.Medium,
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const action = input.action as string;

    if (action === "list") {
      const result = await runGit(["branch", "-vv"], { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    if (action === "create") {
      if (!input.name) {
        return { content: "Error: 'name' is required for create action.", isError: true };
      }
      const args = ["checkout", "-b", input.name as string];
      if (input.base) args.push(input.base as string);
      const result = await runGit(args, { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    if (action === "switch") {
      if (!input.name) {
        return { content: "Error: 'name' is required for switch action.", isError: true };
      }
      const result = await runGit(["checkout", input.name as string], { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    if (action === "delete") {
      if (!input.name) {
        return { content: "Error: 'name' is required for delete action.", isError: true };
      }
      const deleteFlag = input.force ? "-D" : "-d";
      const result = await runGit(["branch", deleteFlag, input.name as string], { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    return { content: `Error: unknown action '${action}'`, isError: true };
  },
};

export default gitBranch;

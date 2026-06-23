import type { ToolDefinition } from "@vellumai/plugin-api";
import { RiskLevel } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../src/runner.ts";

const gitStash: ToolDefinition = {
  description:
    "Manage the git stash: save, list, apply, pop, or drop stashed changes. " +
    "Use when the user wants to set aside uncommitted work, restore stashed work, " +
    "or inspect the stash list.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      action: {
        type: "string",
        enum: ["save", "list", "apply", "pop", "drop"],
        description:
          "What to do: save (push) current changes, list stashes, apply/pop a stash " +
          "(pop also drops it), or drop a stash entry.",
      },
      message: {
        type: "string",
        description: "Optional message for the stash entry (used with 'save').",
      },
      include_untracked: {
        type: "boolean",
        description: "Include untracked files when saving (-u). Default false.",
      },
      ref: {
        type: "string",
        description: "Stash ref for apply/pop/drop (e.g. 'stash@{1}'). Defaults to the latest stash.",
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
    const ref = input.ref as string | undefined;

    let args: string[];
    switch (action) {
      case "save":
        args = ["stash", "push"];
        if (input.include_untracked) args.push("-u");
        if (input.message) args.push("-m", input.message as string);
        break;
      case "list":
        args = ["stash", "list"];
        break;
      case "apply":
        args = ref ? ["stash", "apply", ref] : ["stash", "apply"];
        break;
      case "pop":
        args = ref ? ["stash", "pop", ref] : ["stash", "pop"];
        break;
      case "drop":
        args = ref ? ["stash", "drop", ref] : ["stash", "drop"];
        break;
      default:
        return { content: `Error: unknown action '${action}'`, isError: true };
    }

    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default gitStash;

import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, ok } from "../src/runner.ts";

const gitCommit: ToolDefinition = {
  description:
    "Stage files and create a git commit. " +
    "Use when the user asks to commit changes, stage files, or save work. " +
    "WARNING: This modifies the repository. The assistant should confirm the commit message with the user before calling.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      message: {
        type: "string",
        description: "Commit message. Required.",
      },
      files: {
        type: "array",
        items: { type: "string" },
        description: "Specific files to stage. If omitted, stages all changes (git add -A).",
      },
      amend: {
        type: "boolean",
        description: "Amend the previous commit instead of creating a new one.",
      },
    },
    required: ["message"],
  },
  defaultRiskLevel: "medium",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const msg = input.message as string;
    if (!msg || msg.trim().length === 0) {
      return { content: "Error: commit message is required.", isError: true };
    }

    // Stage files
    const files = input.files as string[] | undefined;
    if (files && files.length > 0) {
      const addResult = await runGit(["add", "--", ...files], { cwd, signal: ctx.signal });
      if (!ok(addResult)) {
        return { content: `Failed to stage files:\n${formatResult(addResult)}`, isError: true };
      }
    } else {
      const addResult = await runGit(["add", "-A"], { cwd, signal: ctx.signal });
      if (!ok(addResult)) {
        return { content: `Failed to stage changes:\n${formatResult(addResult)}`, isError: true };
      }
    }

    // Commit
    const args = ["commit", "-m", msg];
    if (input.amend) {
      args.push("--amend", "--no-edit");
    }
    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default gitCommit;

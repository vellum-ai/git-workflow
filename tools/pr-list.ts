import type { ToolDefinition } from "@vellumai/plugin-api";
import { RiskLevel } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../src/runner.ts";

const prList: ToolDefinition = {
  description:
    "List open pull requests in a GitHub repo using gh CLI. " +
    "Use when the user asks to see PRs, check what is open, or review pending pull requests.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      state: {
        type: "string",
        enum: ["open", "closed", "merged", "all"],
        description: "PR state to filter by. Default 'open'.",
      },
      limit: {
        type: "number",
        description: "Maximum number of PRs to return. Default 20.",
      },
      author: {
        type: "string",
        description: "Filter by author (GitHub username or @me for the authenticated user).",
      },
      label: {
        type: "string",
        description: "Filter by label.",
      },
    },
  },
  defaultRiskLevel: RiskLevel.Low,
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const args = [
      "pr", "list",
      "--state", (input.state as string) ?? "open",
      "--limit", String(input.limit ?? 20),
    ];
    if (input.author) {
      args.push("--author", input.author as string);
    }
    if (input.label) {
      args.push("--label", input.label as string);
    }
    const result = await runGh(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default prList;

import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../src/runner.ts";

const prCheckout: ToolDefinition = {
  description:
    "Check out a GitHub pull request branch locally using gh CLI. " +
    "Use when the user wants to test, run, or review a PR's code locally rather " +
    "than just reading the diff. Requires gh CLI to be authenticated.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      number: {
        type: "number",
        description: "PR number to check out. Required.",
      },
      detach: {
        type: "boolean",
        description: "Check out in detached HEAD state instead of creating a local branch. Default false.",
      },
    },
    required: ["number"],
  },
  defaultRiskLevel: "medium",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const num = input.number as number;

    const args = ["pr", "checkout", String(num)];
    if (input.detach) args.push("--detach");

    const result = await runGh(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default prCheckout;

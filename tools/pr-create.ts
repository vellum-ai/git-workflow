import type { ToolDefinition } from "@vellumai/plugin-api";
import { RiskLevel } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../src/runner.ts";

const prCreate: ToolDefinition = {
  description:
    "Create a GitHub pull request using gh CLI. " +
    "Use when the user asks to open a PR, create a pull request, or submit changes for review. " +
    "Requires gh CLI to be authenticated. The assistant should confirm title and body with the user before calling.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      title: {
        type: "string",
        description: "PR title. Required.",
      },
      body: {
        type: "string",
        description: "PR description body (markdown). Can be multi-line.",
      },
      base: {
        type: "string",
        description: "Base branch to merge into. Defaults to the repo default branch.",
      },
      head: {
        type: "string",
        description: "Head branch to merge from. Defaults to current branch.",
      },
      draft: {
        type: "boolean",
        description: "Create as a draft PR.",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Labels to apply to the PR.",
      },
      reviewers: {
        type: "array",
        items: { type: "string" },
        description: "GitHub usernames to request as reviewers.",
      },
    },
    required: ["title"],
  },
  defaultRiskLevel: RiskLevel.High,
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const title = input.title as string;
    if (!title || title.trim().length === 0) {
      return { content: "Error: PR title is required.", isError: true };
    }

    // Build args
    const args = ["pr", "create", "--title", title];
    if (input.body) {
      args.push("--body", input.body as string);
    }
    if (input.base) {
      args.push("--base", input.base as string);
    }
    if (input.head) {
      args.push("--head", input.head as string);
    }
    if (input.draft) {
      args.push("--draft");
    }
    if (input.labels && Array.isArray(input.labels) && input.labels.length > 0) {
      args.push("--label", (input.labels as string[]).join(","));
    }
    if (input.reviewers && Array.isArray(input.reviewers) && input.reviewers.length > 0) {
      args.push("--reviewer", (input.reviewers as string[]).join(","));
    }

    const result = await runGh(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
  },
};

export default prCreate;

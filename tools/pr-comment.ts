import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../src/runner.ts";

const prComment: ToolDefinition = {
  description:
    "Post a comment on a GitHub pull request using gh CLI. " +
    "Use when the user asks to post a review comment, add feedback to a PR, " +
    "or share review results on GitHub. " +
    "WARNING: This is a public action visible to all repo collaborators. " +
    "The assistant should confirm the comment content with the user before posting.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      number: {
        type: "number",
        description: "PR number to comment on. Required.",
      },
      body: {
        type: "string",
        description: "Comment body (markdown). Required. Can be multi-line.",
      },
    },
    required: ["number", "body"],
  },
  defaultRiskLevel: "high",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);
    const num = input.number as number;
    const body = input.body as string;

    if (!body || body.trim().length === 0) {
      return { content: "Error: comment body is required.", isError: true };
    }

    const result = await runGh(
      ["pr", "comment", String(num), "--body", body],
      { cwd, signal: ctx.signal },
    );

    if (result.exitCode === 0) {
      const url = result.stdout.trim();
      return { content: `Comment posted successfully.\n${url}`, isError: false };
    }
    return { content: formatResult(result), isError: true };
  },
};

export default prComment;

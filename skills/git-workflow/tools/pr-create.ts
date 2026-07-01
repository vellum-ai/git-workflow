import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
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
}

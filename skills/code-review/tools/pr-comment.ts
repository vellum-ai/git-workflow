import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
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
}

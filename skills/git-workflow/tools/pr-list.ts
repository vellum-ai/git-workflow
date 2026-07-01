import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
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
}

import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGh, formatResult, resolveCwd } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const num = input.number as number;

    const args = ["pr", "checkout", String(num)];
    if (input.detach) args.push("--detach");

    const result = await runGh(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
}

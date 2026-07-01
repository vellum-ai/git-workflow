import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const args = ["log"];
    if (input.oneline) args.push("--oneline");
    args.push(`-${input.count ?? 20}`);
    if (input.branch) args.push(input.branch as string);
    if (input.author) args.push(`--author=${input.author}`);
    if (input.since) args.push(`--since=${input.since}`);
    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
}

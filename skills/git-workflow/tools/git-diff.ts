import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const args = ["diff"];
    if (input.staged) args.push("--cached");
    if (input.stat) args.push("--stat");
    if (input.ref_a) {
      if (input.ref_b) {
        args.push(`${input.ref_a}..${input.ref_b}`);
      } else {
        args.push(input.ref_a as string);
      }
    }
    if (input.paths && Array.isArray(input.paths)) {
      args.push("--", ...(input.paths as string[]));
    }
    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
}

import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, ok, assertGitRepo } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const msg = input.message as string;
    if (!msg || msg.trim().length === 0) {
      return { content: "Error: commit message is required.", isError: true };
    }

    // Stage files
    const files = input.files as string[] | undefined;
    if (files && files.length > 0) {
      const addResult = await runGit(["add", "--", ...files], { cwd, signal: ctx.signal });
      if (!ok(addResult)) {
        return { content: `Failed to stage files:\n${formatResult(addResult)}`, isError: true };
      }
    } else {
      const addResult = await runGit(["add", "-A"], { cwd, signal: ctx.signal });
      if (!ok(addResult)) {
        return { content: `Failed to stage changes:\n${formatResult(addResult)}`, isError: true };
      }
    }

    // Commit
    const args = ["commit", "-m", msg];
    if (input.amend) {
      args.push("--amend", "--no-edit");
    }
    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
}

import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, ok, assertGitRepo } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };

    const remote = (input.remote as string) ?? "origin";

    // Resolve the branch to push (default: current branch).
    let branch = input.branch as string | undefined;
    if (!branch) {
      const cur = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd, signal: ctx.signal });
      if (!ok(cur) || cur.stdout.trim() === "HEAD") {
        return {
          content: "Could not determine the current branch (detached HEAD?). Pass 'branch' explicitly.",
          isError: true,
        };
      }
      branch = cur.stdout.trim();
    }

    const args = ["push"];
    if (input.force_with_lease) args.push("--force-with-lease");
    if (input.set_upstream !== false) args.push("-u");
    args.push(remote, branch);

    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
}

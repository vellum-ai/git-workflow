import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const action = input.action as string;

    if (action === "list") {
      const result = await runGit(["branch", "-vv"], { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    if (action === "create") {
      if (!input.name) {
        return { content: "Error: 'name' is required for create action.", isError: true };
      }
      const args = ["checkout", "-b", input.name as string];
      if (input.base) args.push(input.base as string);
      const result = await runGit(args, { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    if (action === "switch") {
      if (!input.name) {
        return { content: "Error: 'name' is required for switch action.", isError: true };
      }
      const result = await runGit(["checkout", input.name as string], { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    if (action === "delete") {
      if (!input.name) {
        return { content: "Error: 'name' is required for delete action.", isError: true };
      }
      const deleteFlag = input.force ? "-D" : "-d";
      const result = await runGit(["branch", deleteFlag, input.name as string], { cwd, signal: ctx.signal });
      return { content: formatResult(result), isError: result.exitCode !== 0 };
    }

    return { content: `Error: unknown action '${action}'`, isError: true };
}

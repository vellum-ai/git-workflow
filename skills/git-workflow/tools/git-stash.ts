import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../../../src/runner.ts";

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const cwd = resolveCwd(input, ctx.workingDir);
    const repoErr = await assertGitRepo(cwd, ctx.signal);
    if (repoErr) return { content: repoErr, isError: true };
    const action = input.action as string;
    const ref = input.ref as string | undefined;

    let args: string[];
    switch (action) {
      case "save":
        args = ["stash", "push"];
        if (input.include_untracked) args.push("-u");
        if (input.message) args.push("-m", input.message as string);
        break;
      case "list":
        args = ["stash", "list"];
        break;
      case "apply":
        args = ref ? ["stash", "apply", ref] : ["stash", "apply"];
        break;
      case "pop":
        args = ref ? ["stash", "pop", ref] : ["stash", "pop"];
        break;
      case "drop":
        args = ref ? ["stash", "drop", ref] : ["stash", "drop"];
        break;
      default:
        return { content: `Error: unknown action '${action}'`, isError: true };
    }

    const result = await runGit(args, { cwd, signal: ctx.signal });
    return { content: formatResult(result), isError: result.exitCode !== 0 };
}

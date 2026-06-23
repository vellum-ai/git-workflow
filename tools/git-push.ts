import type { ToolDefinition } from "@vellumai/plugin-api";
import { RiskLevel } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, ok, assertGitRepo } from "../src/runner.ts";

const gitPush: ToolDefinition = {
  description:
    "Push the current (or a named) branch to a remote, setting upstream tracking " +
    "on first push. Use when the user asks to push commits, publish a branch, or " +
    "before opening a PR on a branch that has not been pushed yet. " +
    "WARNING: This updates a remote. The assistant should confirm before pushing, " +
    "especially when force-pushing.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      remote: {
        type: "string",
        description: "Remote to push to. Default 'origin'.",
      },
      branch: {
        type: "string",
        description: "Branch to push. Defaults to the current branch.",
      },
      set_upstream: {
        type: "boolean",
        description: "Set the upstream tracking branch (-u). Default true so first push works.",
      },
      force_with_lease: {
        type: "boolean",
        description:
          "Force-push using --force-with-lease (safer than --force; refuses if the " +
          "remote moved unexpectedly). Default false. Never uses a bare --force.",
      },
    },
  },
  defaultRiskLevel: RiskLevel.High,
  execute: async (input, ctx) => {
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
  },
};

export default gitPush;

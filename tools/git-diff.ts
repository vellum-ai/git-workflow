import type { ToolDefinition } from "@vellumai/plugin-api";
import { RiskLevel } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, assertGitRepo } from "../src/runner.ts";

const gitDiff: ToolDefinition = {
  description:
    "Show git diff: changes between commits, working tree, and staged area. " +
    "Use when the user asks to see a diff, review changes, or compare branches.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      staged: {
        type: "boolean",
        description: "Show only staged (cached) changes. Equivalent to --cached.",
      },
      ref_a: {
        type: "string",
        description: "First ref (branch, commit, tag) to compare. If omitted, shows working tree changes.",
      },
      ref_b: {
        type: "string",
        description: "Second ref to compare against ref_a. Omit for working-tree diff.",
      },
      paths: {
        type: "array",
        items: { type: "string" },
        description: "Limit diff to specific file paths.",
      },
      stat: {
        type: "boolean",
        description: "Show only diffstat (insertions/deletions summary) instead of full diff.",
      },
    },
  },
  defaultRiskLevel: RiskLevel.Low,
  execute: async (input, ctx) => {
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
  },
};

export default gitDiff;

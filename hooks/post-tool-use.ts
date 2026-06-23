/**
 * post-tool-use hook
 * -------------------
 * Fires after each tool execution. We use it to add a safety nudge when a
 * state-changing git/PR action just landed on the repository's default branch
 * (main/master) — a common foot-gun. The hook does not block anything (there is
 * no pre-tool boundary in the plugin lifecycle); it appends guidance the model
 * can relay to the user.
 *
 * NOTE: The plugin API is beta (< 1.0). The context field names below follow the
 * documented PostToolUseContext shape (`toolName`, `toolInput`, `toolResponse`,
 * `additionalContext`). Adjust against the installed @vellumai/plugin-api types
 * if the surface changes before 1.0.
 */
import type { PluginHookFn, PostToolUseContext } from "@vellumai/plugin-api";
import { runGit, ok } from "../src/runner.ts";

// Tools that modify branch state and are worth guarding on the default branch.
const GUARDED_TOOLS = new Set(["git_commit", "git_push"]);
const DEFAULT_BRANCHES = new Set(["main", "master"]);

const postToolUse: PluginHookFn<PostToolUseContext> = async (ctx) => {
  const toolName = (ctx as Record<string, unknown>).toolName as string | undefined;
  if (!toolName || !GUARDED_TOOLS.has(toolName)) return;

  // Only nudge on success — a failed commit/push didn't change anything.
  const response = ctx.toolResponse as { isError?: boolean } | undefined;
  if (response?.isError) return;

  const input = (ctx as Record<string, unknown>).toolInput as
    | Record<string, unknown>
    | undefined;
  const cwd = (input?.repo_path as string) || process.cwd();

  const branchResult = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  if (!ok(branchResult)) return;
  const branch = branchResult.stdout.trim();

  if (DEFAULT_BRANCHES.has(branch)) {
    return {
      additionalContext:
        `⚠️ Heads up: \`${toolName}\` just ran on the default branch \`${branch}\`. ` +
        `If this work was meant for a feature branch, consider creating one ` +
        `(git_branch create) before further commits, and opening a PR instead of ` +
        `pushing directly to \`${branch}\`.`,
    } as Partial<PostToolUseContext>;
  }
};

export default postToolUse;

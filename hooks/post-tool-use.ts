/**
 * post-tool-use hook
 * -------------------
 * Fires after each tool result. We use it to add a safety nudge when a
 * successful, state-changing git action lands on the repository's default
 * branch (main/master) — a common foot-gun. The hook never blocks (the plugin
 * lifecycle has no pre-tool boundary); it sets `additionalContext`, which the
 * daemon surfaces to the model without polluting the tool output.
 *
 * The context does not carry the tool name/input directly, so we recover them
 * from the most recent `tool_use` block in `messages`.
 */
import type {
  PluginHookFn,
  PostToolUseContext,
  ToolUseContent,
} from "@vellumai/plugin-api";
import { runGit, ok } from "../src/runner.ts";

// State-changing tools worth guarding on the default branch.
const GUARDED_TOOLS = new Set(["git_commit", "git_push"]);
const DEFAULT_BRANCHES = new Set(["main", "master"]);

const postToolUse: PluginHookFn<PostToolUseContext> = async (ctx) => {
  // Only nudge on success — a failed commit/push didn't change anything.
  if (ctx.toolResponse.is_error) return;

  // Recover the tool_use that produced this result: the last tool_use block in
  // the most recent assistant message.
  const lastAssistant = [...ctx.messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const toolUse = lastAssistant?.content
    .filter((b): b is ToolUseContent => b.type === "tool_use")
    .at(-1);
  if (!toolUse || !GUARDED_TOOLS.has(toolUse.name)) return;

  const cwd = (toolUse.input.repo_path as string) || process.cwd();
  const branchResult = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  if (!ok(branchResult)) return;
  const branch = branchResult.stdout.trim();

  if (DEFAULT_BRANCHES.has(branch)) {
    return {
      additionalContext:
        `⚠️ Heads up: \`${toolUse.name}\` just ran on the default branch \`${branch}\`. ` +
        `If this work was meant for a feature branch, consider creating one ` +
        `(git_branch create) before further commits, and opening a PR instead of ` +
        `pushing directly to \`${branch}\`.`,
    };
  }

  return;
};

export default postToolUse;

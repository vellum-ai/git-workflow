import type { ToolDefinition } from "@vellumai/plugin-api";
import { runGit, formatResult, resolveCwd, ok } from "../src/runner.ts";

const changelog: ToolDefinition = {
  description:
    "Generate a changelog from git commit history between two refs. " +
    "Use when the user asks for release notes, a changelog, or a summary of changes between tags/branches.",
  input_schema: {
    type: "object",
    properties: {
      repo_path: {
        type: "string",
        description: "Path to the git repository. Defaults to the assistant working directory.",
      },
      from: {
        type: "string",
        description: "Starting ref (tag, branch, commit). Default: previous tag.",
      },
      to: {
        type: "string",
        description: "Ending ref (tag, branch, commit). Default: HEAD.",
      },
      format: {
        type: "string",
        enum: ["markdown", "plain", "json"],
        description: "Output format. Default 'markdown'.",
      },
    },
  },
  defaultRiskLevel: "low",
  execute: async (input, ctx) => {
    const cwd = resolveCwd(input, ctx.workingDir);

    // Determine from-ref: explicit, or auto-detect previous tag
    let fromRef = input.from as string | undefined;
    if (!fromRef) {
      const tagResult = await runGit(["describe", "--tags", "--abbrev=0", "HEAD~1"], { cwd, signal: ctx.signal });
      if (ok(tagResult)) {
        fromRef = tagResult.stdout.trim();
      } else {
        // Fallback: use first commit or HEAD~10
        const fallbackResult = await runGit(["rev-list", "--max-parents=0", "HEAD"], { cwd, signal: ctx.signal });
        fromRef = ok(fallbackResult) ? fallbackResult.stdout.trim().split("\n")[0] : "HEAD~10";
      }
    }

    const toRef = (input.to as string) ?? "HEAD";

    // Get commit log between refs
    const formatStr = (input.format as string) ?? "markdown";
    const logArgs = ["log", `${fromRef}..${toRef}`, "--pretty=format:%H|%s|%an|%ad", "--date=short"];
    const logResult = await runGit(logArgs, { cwd, signal: ctx.signal });
    if (!ok(logResult)) {
      return { content: `Failed to get commit log:\n${formatResult(logResult)}`, isError: true };
    }

    const commits = logResult.stdout.trim();
    if (!commits) {
      return { content: `No commits found between ${fromRef} and ${toRef}.`, isError: false };
    }

    // Parse and format
    const lines = commits.split("\n").filter((l) => l.trim().length > 0);
    const parsed = lines.map((line) => {
      const [hash, subject, author, date] = line.split("|");
      return { hash: hash?.slice(0, 7), subject, author, date };
    });

    if (formatStr === "json") {
      return { content: JSON.stringify({ from: fromRef, to: toRef, commits: parsed }, null, 2), isError: false };
    }

    if (formatStr === "plain") {
      const text = parsed.map((c) => `${c.hash} ${c.subject} (${c.author}, ${c.date})`).join("\n");
      return { content: `Changelog: ${fromRef} -> ${toRef}\n\n${text}`, isError: false };
    }

    // markdown
    const md = [
      `## Changelog`,
      ``,
      `**${fromRef} -> ${toRef}** (${parsed.length} commits)`,
      ``,
      ...parsed.map((c) => `- \`${c.hash}\` ${c.subject} _(${c.author}, ${c.date})_`),
    ].join("\n");

    return { content: md, isError: false };
  },
};

export default changelog;

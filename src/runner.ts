/**
 * Shared command runner for git and gh CLI operations.
 *
 * Uses node:child_process for portability across Bun and Node runtimes.
 * All commands run in the specified cwd (defaults to the tool context's
 * workingDir), with cooperative cancellation via AbortSignal.
 */

import { spawn } from "node:child_process";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface RunOptions {
  cwd?: string;
  signal?: AbortSignal;
  env?: Record<string, string>;
}

/**
 * Run an arbitrary command and capture stdout/stderr.
 * Never throws, returns exitCode so callers can branch.
 */
export function runCommand(
  command: string,
  args: string[],
  options?: RunOptions,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options?.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      signal: options?.signal,
      env: options?.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    proc.on("error", (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

/** Shorthand for git commands. */
export function runGit(
  args: string[],
  options?: RunOptions,
): Promise<CommandResult> {
  return runCommand("git", args, options);
}

/** Shorthand for gh (GitHub CLI) commands. */
export function runGh(
  args: string[],
  options?: RunOptions,
): Promise<CommandResult> {
  return runCommand("gh", args, options);
}

/** True if the command exited 0. */
export function ok(r: CommandResult): boolean {
  return r.exitCode === 0;
}

/**
 * Format a CommandResult as a string for the tool result content.
 * On success: trimmed stdout (or "(no output)" if empty).
 * On failure: exit code + trimmed stderr (falling back to stdout).
 */
export function formatResult(r: CommandResult): string {
  if (r.exitCode === 0) {
    const out = r.stdout.trim();
    return out || "(no output)";
  }
  const err = r.stderr.trim() || r.stdout.trim();
  return `Error (exit ${r.exitCode}):\n${err}`;
}

/** Resolve the repo path from tool input or fall back to the daemon working dir. */
export function resolveCwd(
  input: Record<string, unknown>,
  fallback: string,
): string {
  const p = input.repo_path as string | undefined;
  return p && p.length > 0 ? p : fallback;
}

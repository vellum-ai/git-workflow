import { test } from "node:test";
import assert from "node:assert/strict";
import { formatResult, resolveCwd, ok } from "../src/runner.ts";

test("formatResult returns trimmed stdout on success", () => {
  assert.equal(
    formatResult({ stdout: "  hello\n", stderr: "", exitCode: 0 }),
    "hello",
  );
});

test("formatResult returns (no output) for empty success", () => {
  assert.equal(
    formatResult({ stdout: "   ", stderr: "", exitCode: 0 }),
    "(no output)",
  );
});

test("formatResult surfaces stderr and exit code on failure", () => {
  const out = formatResult({ stdout: "", stderr: "boom", exitCode: 2 });
  assert.match(out, /exit 2/);
  assert.match(out, /boom/);
});

test("formatResult falls back to stdout when stderr is empty on failure", () => {
  const out = formatResult({ stdout: "partial", stderr: "", exitCode: 1 });
  assert.match(out, /partial/);
});

test("resolveCwd prefers repo_path when present", () => {
  assert.equal(resolveCwd({ repo_path: "/tmp/repo" }, "/fallback"), "/tmp/repo");
});

test("resolveCwd falls back when repo_path is missing or empty", () => {
  assert.equal(resolveCwd({}, "/fallback"), "/fallback");
  assert.equal(resolveCwd({ repo_path: "" }, "/fallback"), "/fallback");
});

test("ok reflects exit code", () => {
  assert.equal(ok({ stdout: "", stderr: "", exitCode: 0 }), true);
  assert.equal(ok({ stdout: "", stderr: "", exitCode: 1 }), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeBlame } from "../src/blame.ts";

// A minimal `git blame --line-porcelain` fixture: two commits, the first
// owning lines 1-2 and the second owning line 3.
const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

function entry(sha: string, finalLine: number, author: string, summary: string, code: string) {
  return [
    `${sha} ${finalLine} ${finalLine} 1`,
    `author ${author}`,
    `author-mail <x@example.com>`,
    `summary ${summary}`,
    `filename foo.ts`,
    `\t${code}`,
  ].join("\n");
}

const PORCELAIN = [
  entry(SHA_A, 1, "Ada Lovelace", "initial", "const a = 1;"),
  entry(SHA_A, 2, "Ada Lovelace", "initial", "const b = 2;"),
  entry(SHA_B, 3, "Alan Turing", "add c", "const c = 3;"),
].join("\n");

test("summarizeBlame collapses consecutive same-commit lines into a range", () => {
  const out = summarizeBlame(PORCELAIN);
  assert.equal(out.length, 2);
  assert.match(out[0], /L1-2: Ada Lovelace - initial/);
  assert.match(out[1], /L3: Alan Turing - add c/);
});

test("summarizeBlame never emits L0-0 (regression for the porcelain parse bug)", () => {
  const out = summarizeBlame(PORCELAIN);
  for (const line of out) {
    assert.doesNotMatch(line, /L0-0/);
  }
});

test("summarizeBlame respects maxGroups", () => {
  const out = summarizeBlame(PORCELAIN, 1);
  assert.equal(out.length, 1);
});

test("summarizeBlame handles empty input", () => {
  assert.deepEqual(summarizeBlame(""), []);
});

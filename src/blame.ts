/**
 * Helpers for parsing `git blame` output.
 *
 * Kept dependency-free (no @vellumai/plugin-api import) so it can be unit-tested
 * under plain Node without the daemon-injected plugin-api global.
 */

/**
 * Summarize `git blame --line-porcelain` output into contiguous authorship
 * groups with real line ranges. Returns at most `maxGroups` lines like
 * "  L10-24: Ada Lovelace - Initial commit".
 */
export function summarizeBlame(porcelain: string, maxGroups = 10): string[] {
  const lines = porcelain.split("\n");
  const shaInfo: Record<string, { author: string; summary: string }> = {};
  const groups: { start: number; end: number; sha: string }[] = [];
  let curSha = "";
  for (let i = 0; i < lines.length; i++) {
    // Header line: "<40-hex-sha> <orig-line> <final-line> [group-size]"
    const header = lines[i].match(/^([0-9a-f]{40}) \d+ (\d+)/);
    if (header) {
      curSha = header[1];
      const finalLine = parseInt(header[2], 10);
      if (!shaInfo[curSha]) shaInfo[curSha] = { author: "", summary: "" };
      const last = groups[groups.length - 1];
      if (last && last.sha === curSha && finalLine === last.end + 1) {
        last.end = finalLine;
      } else {
        groups.push({ start: finalLine, end: finalLine, sha: curSha });
      }
    } else if (lines[i].startsWith("author ") && curSha) {
      shaInfo[curSha].author = lines[i].slice("author ".length);
    } else if (lines[i].startsWith("summary ") && curSha) {
      shaInfo[curSha].summary = lines[i].slice("summary ".length);
    }
  }
  return groups.slice(0, maxGroups).map((g) => {
    const info = shaInfo[g.sha] ?? { author: "?", summary: "" };
    const range = g.start === g.end ? `L${g.start}` : `L${g.start}-${g.end}`;
    return `  ${range}: ${info.author || "?"} - ${info.summary}`;
  });
}

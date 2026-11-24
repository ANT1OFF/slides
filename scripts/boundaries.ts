// Keeps the layers apart, so the engine can be pulled, packaged or copied on its own:
//   src/core     imports nothing from blocks, the library, decks or virtual modules
//   src/blocks   imports only @core and other blocks (no library, decks or virtual modules)
//   examples/ and the showcase don't import the team library
// Also checks the two copies of the project skill match, and, in upstream's own repo, that a change
// leaves the team-owned paths alone. Part of `npm run check`.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { teamPaths } from "./team-paths.ts";

const root = resolve(import.meta.dirname, "..");
// `from "x"`, `import "x"` and `import("x")`.
const IMPORT = `(?:from|import)\\s*\\(?\\s*["'\`]`;
const rules: [string, RegExp][] = [
  ["src/core", new RegExp(`${IMPORT}(@blocks|@library|virtual:|\\.\\.\\/(blocks|library|decks|themes))`)],
  ["src/blocks", new RegExp(`${IMPORT}(@library|virtual:|\\.\\.\\/(library|decks|themes))`)],
  // Upstream's decks can't depend on the team's library, which a team may change or delete.
  ["examples", new RegExp(`${IMPORT}(@library|[./]*src\\/library)`)],
  ["src/decks/showcase", new RegExp(`${IMPORT}(@library|\\.\\.\\/\\.\\.\\/library)`)],
];
const problems: string[] = [];
for (const [dir, banned] of rules)
  for (const e of readdirSync(resolve(root, dir), { recursive: true, withFileTypes: true })) {
    if (!e.isFile() || !/\.(ts|tsx)$/.test(e.name)) continue;
    const file = resolve(e.parentPath, e.name);
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (banned.test(line)) problems.push(`${relative(root, file)}:${i + 1}: ${line.trim()}`);
      });
  }
// The Codex copy of the project skill must match the Claude Code one.
const skill = (dir: string) => resolve(root, dir, "skills/slides/SKILL.md");
if (readFileSync(skill(".claude"), "utf8") !== readFileSync(skill(".agents"), "utf8"))
  problems.push(".agents/skills/slides/SKILL.md differs from .claude/skills/slides/SKILL.md: copy it over.");
// Normal worktrees identify the upstream repo by its remotes. An isolated local merge gate has no
// remotes and checks a synthetic merge whose first parent is the PR base.
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
let remotes: string | undefined;
try {
  remotes = git("remote", "-v");
} catch {
  // A downloaded copy has no history to compare.
}
const isUpstream = !!remotes && /^origin\s+\S*github\.com[:/]ANT1OFF\/slides(\.git)?\s/m.test(remotes) && !/^upstream\s/m.test(remotes);
const gramMerge =
  remotes === "" &&
  process.env.SLIDES_TEAM_COPY !== "1" &&
  /^Gram local check of [0-9a-f]{40} on [0-9a-f]{40}$/.test(git("log", "-1", "--format=%s", "--ignore-missing", "HEAD"));
if (isUpstream || gramMerge) {
  let base: string;
  try {
    base = gramMerge ? git("rev-parse", "HEAD^1") : git("merge-base", "origin/main", "HEAD");
  } catch {
    console.error("Team-owned paths: can't find the comparison base. In an upstream clone, run git fetch origin main.");
    process.exit(1);
  }
  const touched = git("diff", "--name-only", base, "--", ...teamPaths);
  if (touched)
    problems.push(
      `Upstream never changes team-owned paths (src/library, src/decks except showcase). See CONTRIBUTING.md. Changed paths:\n  ${touched.split("\n").join("\n  ")}`,
    );
  else console.log("Team-owned paths are unchanged.");
}

if (problems.length) {
  console.error(`Repository boundary checks failed:\n${problems.join("\n")}`);
  process.exit(1);
}

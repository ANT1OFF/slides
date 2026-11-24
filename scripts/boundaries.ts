// Keeps the layers apart, so the engine can be pulled, packaged or copied on its own:
//   src/core     imports nothing from blocks, the library, decks or virtual modules
//   src/blocks   imports only @core and other blocks (no library, decks or virtual modules)
//   examples/ and the showcase don't import the team library
// Also checks the two copies of the project skill match, and, in upstream's own repo, that a change
// leaves the team-owned paths alone. Part of `npm run check`.
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

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
// Team-owned paths are frozen upstream: after the first clone, upstream never changes, adds or removes
// a file in src/library/ or src/decks/ (except the showcase), so an upgrade can't conflict there
// (CONTRIBUTING.md). Only in upstream's repo: `origin` is ANT1OFF/slides and there is no `upstream`
// remote. A team's copy (origin is the team's repo, upstream is this one) changes these paths freely.
// Compares the committed and uncommitted changes to tracked files with where the work left origin/main.
const git = (args: string) => execSync(`git ${args}`, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
let remotes = "";
try {
  remotes = git("remote -v");
} catch {
  // Not a git checkout (a downloaded copy): nothing to compare.
}
const isUpstream = /^origin\s+\S*github\.com[:/]ANT1OFF\/slides(\.git)?\s/m.test(remotes) && !/^upstream\s/m.test(remotes);
if (isUpstream) {
  let base = "";
  try {
    base = git("merge-base origin/main HEAD");
  } catch {
    console.warn("Team-owned paths: no origin/main to compare with (git fetch origin main), so not checked.");
  }
  if (base) {
    const touched = git(`diff --name-only ${base} -- src/library src/decks ":!src/decks/showcase"`);
    if (touched) {
      console.error(
        `Upstream never changes team-owned paths (src/library, src/decks except showcase); teams edit and delete\n` +
          `them, so any change there is an upgrade conflict in every copy. See CONTRIBUTING.md. Changed since origin/main:\n  ${touched.split("\n").join("\n  ")}`,
      );
      process.exit(1);
    }
  }
}

if (problems.length) {
  console.error(
    `Layer boundaries broken (core must not import blocks/library; blocks must not import the library):\n${problems.join("\n")}`,
  );
  process.exit(1);
}

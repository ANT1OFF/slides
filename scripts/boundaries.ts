// Keeps the layers apart, so the engine can be pulled, packaged or copied on its own:
//   src/core     imports nothing from blocks, the library, decks or virtual modules
//   src/blocks   imports only @core and other blocks (no library, decks or virtual modules)
//   examples/ and the showcase don't import the team library
// Also checks the two copies of the project skill match. Part of `npm run check`.
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
if (problems.length) {
  console.error(
    `Layer boundaries broken (core must not import blocks/library; blocks must not import the library):\n${problems.join("\n")}`,
  );
  process.exit(1);
}

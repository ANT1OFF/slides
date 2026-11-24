// npm run upgrade [ref]  →  brings upstream's changes into your copy, safely:
//   1. checks your working tree is clean and an `upstream` remote exists
//   2. fetches upstream and merges `ref` (default upstream/main) into a new branch upgrade/<date>
//   3. installs, then runs npm run check and npm run verify
// You review the branch and merge it yourself. Nothing is pushed. Already up to date: it says so and
// stops; no shared history (a "Use this template" copy): it explains why it can't merge.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const ref = process.argv[2] ?? "upstream/main";
const run = (cmd: string, quiet = false) => execSync(cmd, { stdio: quiet ? "pipe" : "inherit", encoding: "utf8" });
const fail = (msg: string) => {
  console.error(`\n${msg}`);
  process.exit(1);
};

if (run("git status --porcelain", true).trim())
  fail("Commit or stash your changes first: the upgrade happens on a new branch from a clean tree.");
if (!run("git remote", true).split("\n").includes("upstream"))
  fail("No `upstream` remote. Add it once: git remote add upstream <URL of the slides repo>");

const from = run("git rev-parse --abbrev-ref HEAD", true).trim();
run("git fetch upstream --tags");
try {
  run(`git merge-base HEAD ${ref}`, true);
} catch {
  fail(
    `Your copy shares no history with ${ref}, so it can't be merged. That happens with GitHub's\n` +
      `"Use this template". Make the private copy by cloning instead (README: "Your own copy").`,
  );
}
if (run(`git rev-list --count HEAD..${ref}`, true).trim() === "0") {
  console.log(`\nAlready up to date with ${ref}.`);
  process.exit(0);
}
const branch = `upgrade/${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}`;
run(`git switch -c ${branch}`);
try {
  run(`git merge --no-edit ${ref}`);
} catch {
  if (existsSync(".git/MERGE_HEAD"))
    fail(
      `The merge has conflicts on ${branch}. Resolve them (your folders win: src/decks, src/library, your themes;\n` +
        `upstream wins elsewhere), then: git commit && npm install && npm run check && npm run verify.\n` +
        `To give up: git merge --abort && git switch ${from} && git branch -D ${branch}`,
    );
  run(`git switch ${from}`);
  run(`git branch -D ${branch}`);
  fail(`The merge of ${ref} failed (see above); nothing was changed.`);
}
run("npm install");
try {
  run("npm run check");
  run("npm run verify");
} catch {
  fail(`${ref} is merged on ${branch}, but check or verify failed. Fix it there, or go back: git switch ${from}`);
}
console.log(
  `\nUpgraded on ${branch}; check and verify pass. Look at your decks (npm run dev), then merge:\n  git switch ${from} && git merge ${branch}`,
);

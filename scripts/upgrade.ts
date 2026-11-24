// npm run upgrade [ref]  →  brings upstream's changes into your copy, safely:
//   1. checks your working tree is clean and an `upstream` remote exists (and warns if it can be pushed to)
//   2. fetches upstream and merges `ref` (default upstream/main) into a new branch upgrade/<date>
//   3. installs, then runs npm run check and npm run verify
// You review the branch and merge it yourself. Nothing is pushed. Already up to date: it says so and
// stops; no shared history (a "Use this template" copy): it explains why it can't merge.
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { teamPaths } from "./team-paths.ts";

const ref = process.argv[2] ?? "upstream/main";
const run = (cmd: string, quiet = false) => execSync(cmd, { stdio: quiet ? "pipe" : "inherit", encoding: "utf8" });
const git = (args: Array<string>, quiet = false) =>
  execFileSync("git", args, { stdio: quiet ? ["ignore", "pipe", "ignore"] : "inherit", encoding: "utf8" });
function fail(msg: string): never {
  console.error(`\n${msg}`);
  process.exit(1);
}

if (run("git status --porcelain", true).trim()) {
  fail("Commit or stash your changes first: the upgrade happens on a new branch from a clean tree.");
}
if (!run("git remote", true).split("\n").includes("upstream")) {
  fail("No `upstream` remote. Add it once: git remote add upstream https://github.com/ANT1OFF/slides.git");
}

// upstream is the public kit: a push there could publish a team's private decks. Fetch-only is safest.
const pushUrl = run("git remote get-url --push upstream", true).trim();
if (pushUrl === run("git remote get-url upstream", true).trim() || /:\/\/|^[\w.-]+@[\w.-]+:|^[/.~]/u.test(pushUrl) || existsSync(pushUrl)) {
  console.warn(
    `\nWarning: \`upstream\` can be pushed to (${pushUrl}), so a push there could publish your private decks.\n` +
      "Make it fetch-only: git remote set-url --push upstream DISABLED\n",
  );
}

const from = run("git rev-parse --abbrev-ref HEAD", true).trim();
run("git fetch upstream --tags");
let commit: string;
try {
  commit = git(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], true).trim();
} catch {
  fail(`No such upstream commit or ref: ${ref}.`);
}
try {
  git(["merge-base", "HEAD", commit], true);
} catch {
  fail(
    `Your copy shares no history with ${ref}, so it can't be merged. That happens with GitHub's\n` +
      `"Use this template". Make the private copy by cloning instead (docs/working-with-decks.md).`,
  );
}
if (git(["rev-list", "--count", `HEAD..${commit}`], true).trim() === "0") {
  console.log(`\nAlready up to date with ${ref}.`);
  process.exit(0);
}
const branch = `upgrade/${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}`;
git(["switch", "-c", branch]);
try {
  git(["merge", "--no-ff", "--no-commit", commit]);
} catch {
  if (!existsSync(git(["rev-parse", "--git-path", "MERGE_HEAD"], true).trim())) {
    git(["switch", from]);
    git(["branch", "-D", branch]);
    fail(`The merge of ${ref} failed (see above).`);
  }
}

// Preserve the team's entire tree, including deletions, before committing the incoming history.
const teamChanges = (...options: Array<string>) =>
  git(["diff", "--cached", "--name-only", "--no-renames", "-z", ...options, "HEAD", "--", ...teamPaths], true)
    .split("\0")
    .filter(Boolean);
const touched = teamChanges();
if (touched.length) {
  // Git restore needs an explicit removal for an unmerged path that doesn't exist in HEAD.
  for (const file of teamChanges("--diff-filter=U")) {
    if (!git(["--literal-pathspecs", "ls-tree", "HEAD", "--", file], true)) {
      git(["--literal-pathspecs", "rm", "--force", "--", file]);
    }
  }
  const remaining = teamChanges();
  if (remaining.length) {
    git(["--literal-pathspecs", "restore", "--source=HEAD", "--staged", "--worktree", "--", ...remaining]);
  }
  console.log(`\nKept your team-owned paths as they were before the upgrade:\n${touched.join("\n")}`);
}
if (git(["ls-files", "--unmerged"], true).trim()) {
  fail(
    `The merge has conflicts on ${branch}. See CHANGELOG.md for upgrade notes. After resolving them, run:\n` +
      `  git commit && npm install && npm run check && npm run verify\n` +
      `To give up: git merge --abort && git switch ${from} && git branch -D ${branch}`,
  );
}
git(["commit", "--no-edit"]);
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

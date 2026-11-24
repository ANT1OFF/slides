# Contributing

Thanks for helping. The bar is simple: keep it easy to understand, and keep every deck building.

1. `npm install`, then `npm run dev` and open the **showcase** deck.
2. Make your change. New blocks follow [docs/making-a-block.md](docs/making-a-block.md) and get a
   slide in the showcase.
3. `npm run check` checks formatting, lint (`npm run lint`), layer boundaries and types and builds every deck; `npm run verify`
   opens every built deck offline in Chrome (CI runs both) (`npm run format` fixes formatting). Lint is type-aware oxlint
   ([oxlint.config.ts](oxlint.config.ts)) and checks style as well as bugs: `npx oxlint --type-aware --fix` fixes blank lines,
   braces and the like. Fix a finding rather than disable it; a cast needs a `// SAFETY:` comment saying why it holds. `check` also fails if the built examples in `examples/html/` are
   stale: run `npm run build:examples` and commit them. (The examples and the showcase are built without the
   team library, so only upstream's files and the dependencies decide their bytes.)
4. In the pull request, say what changed and include a screenshot of any slide that looks different.

Keep pull requests small, and keep the README's key table in sync with the code.

**Never change team-owned paths:** `src/library/` and `src/decks/` (except `showcase/`). Teams edit
and delete the starters there, so any upstream change to them is an upgrade conflict in every team
copy. They are frozen as they were first shipped. A new example of a library block, layout or slide
goes in the docs (to copy in by hand) or in `examples/`; a fix to a starter goes in the CHANGELOG
as an upgrade note that teams can apply themselves.

`npm run check` compares these paths with the branch's merge base with `origin/main`. A local
merge gate that checks a synthetic merge in a worktree with no remotes (commit subject
`Gram local check of <head> on <base>`) is compared with its first parent, the pull request's base.
A team copy that uses such a gate sets `SLIDES_TEAM_COPY=1` for `npm run check`. Teams' regular
clones can edit these paths freely.

## Releases

Upstream releases are git tags `v0.x.y` on `main`, each with a CHANGELOG.md entry; teams can
`npm run upgrade v0.x.y` to move to a release rather than `main`. To cut one: move "Unreleased" to
the version and date in CHANGELOG.md, set `version` in package.json, commit, `git tag v0.x.y`, push
the tag. Anything that needs teams to change their decks, library or themes goes under
"Upgrade notes".

## Package name

The project is `slides`, and package.json stays `private: true`: it's a template repo, not a package.
The unscoped npm name `slides` is taken, so a future engine package would be scoped
(`@<scope>/slides`).

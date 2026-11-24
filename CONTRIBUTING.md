# Contributing

Thanks for helping. The bar is simple: keep it easy to understand, and keep every deck building.

1. `npm install`, then `npm run dev` and open the **showcase** deck.
2. Make your change. New blocks follow [docs/making-a-block.md](docs/making-a-block.md) and get a
   slide in the showcase.
3. `npm run check` checks formatting, layer boundaries and types and builds every deck; `npm run verify`
   opens every built deck offline in Chrome (CI runs both) (`npm run format` fixes formatting). `check` also fails if the built examples in `examples/html/` are
   stale: run `npm run build:examples` and commit them. (The examples and the showcase are built without the
   team library, so only upstream's files and the dependencies decide their bytes.)
4. In the pull request, say what changed and include a screenshot of any slide that looks different.

Keep pull requests small, and keep the README's key table and block table in sync with the code.

**Never change team-owned paths:** `src/library/` and `src/decks/` (except `showcase/`). Teams edit
and delete the starters there, so any upstream change to them is an upgrade conflict in every team
copy. They are frozen as they were first shipped. A new example of a library block, layout or slide
goes in the docs (to copy in by hand) or in `examples/`; a fix to a starter goes in the CHANGELOG
as an upgrade note that teams can apply themselves. CI fails a pull request that touches these paths.

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

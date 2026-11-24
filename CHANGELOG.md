# Changelog

What changed upstream, newest first. Teams with their own copy read this before `npm run upgrade`.
Versions follow `v0.x` tags until the layout and APIs settle; anything that needs a change in your
decks, library or themes is listed under **Upgrade notes**.

## Unreleased (v0.1.0)

First public version.

- Decks as React code (`src/decks/<name>/index.tsx`), built into one self-contained HTML file each.
- Presenting: build steps, presenter window, overview, print to PDF, fullscreen, blank screen,
  jump to slide, growth mode, key list (`?`).
- 41 built-in blocks, shown in the showcase deck; four themes (default "Plain", editorial, signal,
  and the example custom theme acme), each light and dark.
- Team library in `src/library/` (`@library/…`): reusable slides and slide sets, blocks, data,
  assets, `settings.json` (team default theme) and `AGENTS.md` (house rules).
- Refreshable data: `*.data.json` with provenance, `asOf()`, `npm run refresh`.
- `npm run check` (format, layer boundaries, types, every deck builds), `npm run verify` (every deck
  offline in Chrome, plus every key on a fixture deck), `npm run upgrade` (merge upstream on a branch).
- Project skill for Claude Code (`.claude/skills/slides`) and Codex (`.agents/skills/slides`).

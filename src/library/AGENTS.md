# Team house rules

Your team's rules for agents (and people) making decks here. Agents read this after the root
`AGENTS.md`, which is upstream's and shouldn't be edited. Replace the examples below with your own.

## Look and voice

- Theme: decks use the team default in `settings.json` unless a talk needs another.
- Titles state the point in sentence case, eight words or fewer.
- Write "we", not the team's name; no exclamation marks.

## Standard slides

- Open with `...openingSlides({ title, date })` and close with `<Questions />` from
  `@library/slides/team.tsx`.

## Data

- Numbers come from `*.data.json` files. Name the system in `how` (dashboard, query, script).
- Ask before putting customer names or unreleased figures on a slide.

## Naming

- Decks: `<topic>-<yyyy-mm>`, e.g. `q3-review-2026-10`.

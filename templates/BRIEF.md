# Deck brief

Fill in the brackets, then give this brief to the agent working in the slides repo.

## Audience and outcome

Build a deck about [topic] called [lowercase-dashed deck name] for [audience and what they
already know]. It will run for [minutes, including questions] in [room, call or other setting].
By the end, the audience should [understand one claim, make a decision or take an action].

## Slide plan

Fill in one row per slide. Use the spoken lines as the basis for speaker notes.
For the visual, describe what the audience sees first, what changes and what that change means.
A static comparison can show the whole change at once.

| Slide | Said aloud  | Headline (up to ten words) | What changes on screen           |
| ----- | ----------- | -------------------------- | -------------------------------- |
| 1     | [opening]   | [takeaway]                 | [starting image, change, payoff] |
| …     | [next line] | [takeaway]                 | [starting image, change, payoff] |

- Recurring element [a mark, image or layout detail and where it returns].
- Slide hand-offs [which question, phrase or visual leads into each new section].
- Closing frame [the action or conclusion that stays on screen].

## Evidence

| Claim or figure, with units | Source and date           | How to update it                      | Qualification to show  |
| --------------------------- | ------------------------- | ------------------------------------- | ---------------------- |
| [value and what it counts]  | [link or export and date] | [command, lookup steps or who to ask] | [scope or uncertainty] |

Put real-world figures in `*.data.json` alongside the deck, or in `src/library/data/` for
shared data. Record `source` as `script`, `agent` or `manual`, put the update instructions in
`how`, and record `updated` as a date in `YYYY-MM-DD` format. Use the imported `values` for
the chart and its numeric wording, and use `asOf(data, "source label")` for the visible source
footer. For a refresh, `npm run refresh <deck>` runs scripts and lists agent lookups and manual
requests. Follow those instructions and ask for any missing figures.
See [data provenance](../docs/working-with-decks.md#data-that-can-be-refreshed).

## Look and delivery

- Theme [team default or a folder from `src/themes/`] and scheme [light or dark].
- Pacing [static throughout, or which slides use builds and when to reveal the headline].
- Media [local files to use, with captions or descriptions].
- Deliverables [single-file HTML and, if needed, PDF].

## Build and check

1. Read [AGENTS.md](../AGENTS.md) and the [team house rules](../src/library/AGENTS.md).
   Start with `npm run new <deck>` and reuse the library and built-in blocks.
2. Run `npm run check` and `npm run verify`. Open the built deck offline, check the slides
   in the overview (**G**) and rehearse any build steps using the
   [presentation checklist](../docs/checklist.md).
3. Deliver `dist/<deck>.html`. If requested, run `npm run pdf <deck>` and inspect the
   output before delivering `dist/<deck>.pdf`. Report what you verified and flag any
   unresolved source questions or checks you couldn't run.

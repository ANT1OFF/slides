# Working with decks as a team

The idea: you or your group keep **your own copy of this repo as your slide library**. Every deck you
make leaves something behind (a theme, a block, a reusable slide, a data script) for the next one.
New decks borrow what fits, add what's missing, and give the reusable parts back to the group.

## Yours and upstream

The folders split into what you own and what comes from this repo upstream:

- **Yours:** `src/decks/` (not `showcase/`), `src/library/` and your theme folders in `src/themes/`.
  Upstream never changes, adds or removes a file there, so pulling its updates doesn't conflict.
- **Upstream's:** everything else. Don't edit it; fix things for everyone with a pull request.
- **Shared:** `package.json`, its lock file and the root config files; edit only when you must.

The ownership table in [AGENTS.md](../AGENTS.md#who-owns-what) has the details.

## The lifecycle

### 1. Make your private copy

```bash
git clone https://github.com/ANT1OFF/slides.git our-slides && cd our-slides
git remote rename origin upstream
git remote set-url --push upstream DISABLED   # fetch-only: your decks can't be pushed to the public kit
git remote add origin <your team's empty private repo URL>
git push -u origin main
npm install
```

Not "Use this template" (no shared history, so `npm run upgrade` can't merge) and not a public fork
(it can't be private). Team members then clone your team's repo as usual; whoever runs upgrades adds
the upstream remote once in their clone, fetch-only:

```bash
git remote add upstream https://github.com/ANT1OFF/slides.git
git remote set-url --push upstream DISABLED
```

`upstream` is the public kit, so a push to it by mistake could publish private decks;
`npm run upgrade` warns when it can be pushed to.

Then make the starters yours: replace or delete the examples in `src/library/` (`Funnel`, `team.tsx`
and the rest) and `src/decks/_starter/`, and update `src/library/README.md` and `src/library/AGENTS.md`
to describe what is there now. They are your files, and nothing updates them for you.

### 2. Add your theme

Copy `src/themes/acme/` to `src/themes/<team>/`, rename `acme` inside `theme.css`, and set your
colours, fonts and logo. [themes.md](themes.md) has the steps. Every deck that says
`theme: "<team>"` gets it, and only those decks embed its fonts.

To make it the default for every deck that doesn't name a theme, set it in
`src/library/settings.json`: `{ "defaultTheme": "<team>" }`. Don't edit `src/themes/default/`; it's
upstream's.

Write your house rules for agents (tone, naming, which theme, where data comes from) in
`src/library/AGENTS.md`; agents read it after the root `AGENTS.md`.

Then make new decks start your way: edit `src/decks/_starter/`, the deck `npm run new` copies. Give
it your theme, your opening and closing slides (`...openingSlides()`), and a `transition` if your
decks use one.

### 3. Build decks from the library

```bash
npm run new q3-review
npm run dev           # the front page lists every deck, theme, block and library slide
```

Before writing anything new, look at what exists: the **showcase** for blocks, **Open the library**
for your team's slides. Then borrow:

```tsx
import { Questions, openingSlides } from "@library/slides/team.tsx";
import { Funnel } from "@library/blocks/Funnel.tsx";

slides: [
  ...openingSlides({ title: "Q3 review", date: "October 2026" }), // a slide set: spread it
  <Frame title="Trials convert better since the new onboarding">
    <Funnel stages={…} />
  </Frame>,
  slide(<Questions contact="team@example.com" />, { notes: "Leave five minutes." }), // a slide: override props
],
```

### 4. Make what's missing, in the deck first

A new block or slide starts in the deck's folder (`src/decks/q3-review/Churn.tsx`), as specific as the
talk needs. One-off things stay there.

### 5. Promote what's reusable into the library

When a second deck wants it, or it's clearly a team pattern (an about-us, a standard closing, the
weekly metrics slide), move it into the library and make its content props:

| What          | Where                               | Convention                                                                                                           |
| ------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A whole slide | `src/library/slides/<topic>.tsx`    | Export a component (`export function TeamIntro(props)`) that returns one slide, with defaults for every prop.        |
| A slide set   | same file                           | Export a function whose name ends in `Slides` (`openingSlides(opts)`) returning an array of slides; decks spread it. |
| A block       | `src/library/blocks/<Name>.tsx`     | Follow [making-a-block.md](making-a-block.md): tokens only, `type-*` roles, `start` and `build` props.               |
| Data          | `src/library/data/<name>.data.json` | With its provenance; see "Data that can be refreshed" below.                                                         |
| An animation  | `src/library/motion/<name>.css`     | One file per entrance effect or slide transition, used by name. See [extending.md](extending.md).                    |
| A CSS utility | `src/library/styles.css`            | Team-wide tokens (`@theme`) and utility classes (`@utility`).                                                        |
| Images, logos | `src/library/assets/`               | Imported where they're used, so the build inlines them.                                                              |

A whole-slide layout is a block too (`src/library/blocks/SplitFrame.tsx` is an example).
[extending.md](extending.md) lists every kind of thing you can add and where it goes.

The dev front page finds them from these folders: every component in `src/library/slides/` appears in
the library view with its default props, so give every prop a sensible default.

Promote into `src/library/`, never into `src/blocks/`: that folder is upstream's and an upgrade would
fight your changes. A block that's useful to everyone can go to `src/blocks/` as a pull request to
this repo upstream.

### 6. Give it back to the group

Commit the deck and the promoted pieces on a branch and open a pull request to your group's repo.
Before you do:

```bash
npm run check    # formatting, types, every deck builds
npm run verify   # every deck offline in Chrome: fonts, media, notices, every key
```

A reviewer can open the library view and the showcase in `npm run dev` to see what changed.

### 7. Pull upstream updates

```bash
npm run upgrade
```

It fetches `upstream`, merges `upstream/main` into a new `upgrade/<date>` branch, installs, and runs
`npm run check` and `npm run verify`. The merge keeps your existing `src/library/` and
`src/decks/` trees (except `src/decks/showcase/`), including any starters you deleted. For
conflicts elsewhere, it stops and prints the commands to finish or abort. When it passes, flip through your decks
(`npm run dev`, press G) and merge the branch. Upstream's CHANGELOG.md says what changed; merge a
release tag (`npm run upgrade v0.1.0`) rather than `main` if you prefer to move in steps.

## Data that can be refreshed

Numbers on a slide often come from somewhere: a script, a dashboard, a person. Record where, so that
a year later "refresh the data" is one command or one request to an agent.

Put the values in a `*.data.json` file next to the deck (or in `src/library/data/` if several decks
use it):

```json
{
  "source": "script",
  "how": "node examples/example-update/count-tickets.ts",
  "updated": "2026-10-01",
  "values": { "total": 18400 }
}
```

| `source` | `how` says                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `script` | A command that rewrites this file (its values and `updated`). It should fail with a clear message when its input is missing, so the old values stay. |
| `agent`  | How to look the values up, in plain words: "count merged PRs in org/repo since 2026-01-01 with gh".                                                  |
| `manual` | Who or what to ask: "the support lead, from the quarterly survey".                                                                                   |

Optional: `staleAfter` (days, default 180). Import the file in the deck and use its values;
`asOf(data, "source note")` from `@core` makes a footer like "As of 1 Oct 2026 · helpdesk export":

```tsx
import tickets from "./tickets.data.json";
<Frame title="…" footer={asOf(tickets, "helpdesk export")}>
  <Stat to={tickets.values.total} label="tickets answered" />
</Frame>;
```

`npm run refresh [deck]` runs every `script` source and lists the `agent` and `manual` ones with their
instructions and age. `how` for a script is run as a shell command, so review it in pull requests like
any code. With a deck named, it covers the deck's own data and follows local imports and re-exports
to find the library data it uses. Use `npm run refresh -- <deck> --shared` to include every library
data file, including those reached via computed imports. With no deck it covers your decks and
`src/library/` (upstream's examples only when named). Then rebuild and verify. The values are baked into the HTML at build time; a
deck never fetches data when it opens. `examples/example-update` has one of each kind of source,
and `examples/example-pitch` an agent one.

## Building and sharing

- `npm run build my-talk` writes `dist/my-talk.html`. That one file is the presentation.
- `dist/` is not committed (only upstream's example decks are, in `examples/html/`). Share the file directly, attach it to the invite, or publish it as a
  release asset.
- To present: open the file, press F. Press N for the presenter window on your laptop and drag the
  deck to the projector. For a PDF: press P, "Save as PDF".
- See [Before you send a deck](../README.md#before-you-send-a-deck).

## Versioning

- Commit decks like code, and review them in pull requests; the diff is readable.
- Tag the commit a talk was given from (`git tag talk/kickoff-2026-11`); you can always rebuild that
  exact file. To give a talk again with changes, copy the deck folder rather than editing the old one.

## Keeping decks working as the library changes

Every deck imports shared blocks and library slides, so a change to them changes every deck that
uses them.

- **`npm run check` builds every deck**, so renaming a prop or removing a slide breaks the build, not
  the talk. `npm run verify` then checks every deck offline. Run both before merging.
- **Change shared pieces additively:** add an optional prop rather than changing what an existing one
  means.
- **Look at the library view and the showcase** after changing a shared piece.
- **Freeze a deck if it must never change:** copy the pieces it uses into its folder and import them
  from there.

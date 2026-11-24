# Themes

A theme is a folder in `src/themes/`: a `theme.css` with the tokens it changes, and optionally a
`fonts/` folder and a logo. A deck picks one with `theme: "<name>"`. Four come with the repo:

| Theme       | Look                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `default`   | Plain: Inter, off-white and near-black, one vermilion accent. Used when a deck names no theme.     |
| `editorial` | A printed page: Newsreader serif, paper colours, italic emphasis.                                  |
| `signal`    | A poster: condensed capitals (Archivo), black, white and signal yellow.                            |
| `acme`      | An example custom theme for a made-up company, with its own font and logo. Copy it to start yours. |

## Change the look of one deck

In the deck definition:

```tsx
theme: "editorial",                       // a folder in src/themes
scheme: "dark",                           // the theme's dark colours
logo: <img src={partnerLogo} alt="" />,   // replace the theme's logo (null hides it)
footer: "Acme · Board meeting",           // bottom left of every slide (false hides it)
vars: { "--color-accent": "#0a7d5a" },    // any token, for this deck only
```

In `npm run dev`, add `&theme=signal&scheme=dark` to a deck's URL to preview it in another theme.

## Make your own theme

1. **Copy the example:** `cp -r src/themes/acme src/themes/mine`.
2. **Rename it:** in `src/themes/mine/theme.css`, replace every `acme` in the selectors with `mine`.
3. **Set your colours:** the light block and the dark block each have eight colours (canvas,
   surface, ink, accent, accent-text, on-accent, accent-2, accent-3) and five chart colours. Keep
   `accent-text` at 4.5:1 or more against the canvas; it is the accent used as text.
4. **Your font, or none:** delete the copied `fonts/` folder and its `@font-face` rule if you don't
   want Archivo: the default theme's Inter and JetBrains Mono are in every deck already, so a theme
   without fonts of its own uses them, and can name them in `--font-*` with no `@font-face`. To
   embed your own, put the font files and their licence file in `fonts/`, add one `@font-face` per
   file with a relative URL, and set `--font-display`, `--font-body` and `--font-label`. For an
   ordinary (not variable) font, one rule per weight:
   ```css
   @font-face {
     font-family: "Brand Sans";
     font-weight: 400;
     src: url("./fonts/BrandSans-Regular.woff2") format("woff2");
   }
   @font-face {
     font-family: "Brand Sans";
     font-weight: 700;
     src: url("./fonts/BrandSans-Bold.woff2") format("woff2");
   }
   ```
   Set `--title-weight`, `--display-weight`, `--strong-weight` and `--stat-weight` to weights your
   font has (or the browser fakes bold), and `--display-tracking`, `--title-tracking` and
   `--stat-tracking` to 0 if letters look tight. Only embed fonts whose licence allows it. The
   build lists every font file with its licence in the deck, and `npm run verify` fails if a font
   file has no licence file next to it.
5. **Your logo, or none:** replace `logo.svg` with yours (one file: `logo.svg`, `.png`, `.jpg` or
   `.webp`), or delete it for no logo. An SVG drawn in `currentColor` follows dark and inverted
   slides. The example's wordmark uses the Archivo font, so replace it rather than keep it.
6. **Use it:** `theme: "mine"` in a deck, written as a string literal (the build reads it from the
   file to bundle only that theme). Then `npm run dev` and check the showcase with
   `?deck=showcase&theme=mine`, light and `&scheme=dark`.

Every token and what it does is in `src/themes/default/tokens.css`; a theme only lists what it
changes. The design behind the default theme and the token set is in [design.md](design.md).

## A team default

To make your theme the default for every deck that doesn't name one, set it in
`src/library/settings.json` (`{ "defaultTheme": "mine" }`); a deck's own `theme` still wins. Don't
edit `src/themes/default/`: it's upstream's.

import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { slideNames, sourceTags } from "./vite/page-review.ts";
import { selfContained } from "./vite/self-contained.ts";
import { notices } from "./vite/notices.ts";
import { deckTheme, themes } from "./vite/themes.ts";
import { library } from "./vite/library.ts";
import { onlySources } from "./vite/sources.ts";

const src = resolve(import.meta.dirname, "src");
// Decks live in src/decks (yours) and examples/ (upstream's examples). A name in src/decks wins.
const deckDirs = [resolve(src, "decks"), resolve(import.meta.dirname, "examples")];

/** Deck folders: <dir>/<name>/index.tsx. Folders starting with _ (shared code) are not decks. */
export function listDecks(): string[] {
  const names = deckDirs.flatMap((dir) =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isDirectory() && !/^[_.]/.test(e.name) && existsSync(resolve(dir, e.name, "index.tsx")))
          .map((e) => e.name)
      : [],
  );
  return [...new Set(names)].sort();
}

/** The folder a deck lives in. */
export function deckDir(name: string): string {
  return deckDirs.map((dir) => resolve(dir, name)).find((d) => existsSync(resolve(d, "index.tsx"))) ?? resolve(deckDirs[0], name);
}

// DECK picks which deck `virtual:deck` resolves to; defaults to the first one.
const deck = process.env.DECK ?? listDecks()[0] ?? "";
// DECK_FILE builds a deck from outside src/decks (npm run verify uses it for its fixture).
// With no decks at all, the app still starts (on the library view) so `npm run new` is the next step.
const deckFile = process.env.DECK_FILE ?? (deck ? resolve(deckDir(deck), "index.tsx") : resolve(src, "library-view.tsx"));

// Upstream's own decks, examples/ and the showcase, are built from upstream's files only: with an
// empty library (examples/_library) and with Tailwind reading class names from the engine, the blocks
// and the deck alone. They can't import the team's library anyway (npm run check), and this way
// nothing a team adds (classes, motion, styles.css, its default theme) changes their built HTML, which
// `npm run check` compares with examples/html. The dev server shows them with the team's library.
const examples = resolve(import.meta.dirname, "examples");
const upstreamDeck = deckFile.startsWith(`${examples}${sep}`) || deckFile === resolve(src, "decks/showcase/index.tsx");

export default defineConfig(({ command }) => {
  const alone = command === "build" && upstreamDeck;
  // The team's library. LIBRARY_DIR points it elsewhere (npm run verify uses it for its own fixture
  // library), but never for upstream's decks, which always build with the empty one.
  const libraryDir = alone ? resolve(examples, "_library") : (process.env.LIBRARY_DIR ?? resolve(src, "library"));
  return {
    plugins: [
      alone &&
        onlySources({
          stylesheet: resolve(src, "styles.css"),
          sources: [resolve(src, "core"), resolve(src, "blocks"), resolve(src, "*.tsx"), dirname(deckFile)],
        }),
      sourceTags(),
      slideNames(),
      themes({ themesDir: resolve(src, "themes"), deckFile, libraryDir }),
      library({ libraryDir }),
      react(),
      tailwindcss(),
      viteSingleFile(),
      notices({
        root: import.meta.dirname,
        folders: () => [
          ...new Set([resolve(src, "themes/default"), resolve(src, "themes", deckTheme(deckFile, libraryDir)), resolve(deckFile, "..")]),
        ],
      }),
      selfContained(),
    ],
    define: { __DECK__: JSON.stringify(deck) },
    resolve: {
      alias: {
        "virtual:deck": deckFile,
        "@core": resolve(src, "core/index.ts"),
        "@blocks": resolve(src, "blocks/index.ts"),
        // Your team's library: import "@library/slides/team.tsx", "@library/blocks/Funnel.tsx" …
        // Also how src/styles.css finds the team's styles.css.
        "@library": libraryDir,
      },
    },
    build: {
      outDir: `dist/.${deck}`,
      emptyOutDir: true,
    },
  };
});

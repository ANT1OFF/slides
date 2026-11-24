import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { slideNames, sourceTags } from "./vite/page-review.ts";
import { selfContained } from "./vite/self-contained.ts";
import { notices } from "./vite/notices.ts";
import { deckTheme, themes } from "./vite/themes.ts";
import { library } from "./vite/library.ts";

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

// The team's library. LIBRARY_DIR points it elsewhere (npm run verify uses it for its own fixture library).
const libraryDir = process.env.LIBRARY_DIR ?? resolve(src, "library");

// DECK picks which deck `virtual:deck` resolves to; defaults to the first one.
const deck = process.env.DECK ?? listDecks()[0] ?? "";
// DECK_FILE builds a deck from outside src/decks (npm run verify uses it for its fixture).
// With no decks at all, the app still starts (on the library view) so `npm run new` is the next step.
const deckFile = process.env.DECK_FILE ?? (deck ? resolve(deckDir(deck), "index.tsx") : resolve(src, "library-view.tsx"));

export default defineConfig({
  plugins: [
    sourceTags(),
    slideNames(),
    themes({ themesDir: resolve(src, "themes"), deckFile }),
    library({ libraryDir }),
    react(),
    tailwindcss(),
    viteSingleFile(),
    notices({
      root: import.meta.dirname,
      folders: () => [...new Set([resolve(src, "themes/default"), resolve(src, "themes", deckTheme(deckFile)), resolve(deckFile, "..")])],
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
});

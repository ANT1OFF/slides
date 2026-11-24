// Limits where Tailwind looks for class names to a list of folders, for one build.
// By default Tailwind scans the whole repo, so a class used anywhere is in every deck's CSS. That is
// what a team wants for its own decks, but upstream's decks (examples/ and the showcase) must build
// to the same bytes in every copy of the repo: `npm run check` compares them with examples/html.
// So those are built with only upstream's folders as sources (see vite.config.ts).
import { dirname, relative } from "node:path";
import type { Plugin } from "vite";

const SCAN_ALL = '@import "tailwindcss";';

export function onlySources({ stylesheet, sources }: { stylesheet: string; sources: Array<string> }): Plugin {
  const from = dirname(stylesheet);
  const only = sources.map((s) => `@source ${JSON.stringify(relative(from, s).replaceAll("\\", "/"))};`).join("\n");
  return {
    name: "slides:sources",
    enforce: "pre",
    transform(code, id) {
      if (id.split("?")[0].replaceAll("\\", "/") !== stylesheet.replaceAll("\\", "/")) {
        return;
      }
      if (!code.includes(SCAN_ALL)) {
        this.error(`${stylesheet} must start with ${SCAN_ALL} for an upstream deck to be built on its own.`);
      }
      return { code: code.replace(SCAN_ALL, `@import "tailwindcss" source(none);\n${only}`), map: null };
    },
  };
}

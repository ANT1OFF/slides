// `virtual:library`: the team's motion, found from its folder and inlined into every deck.
//   src/library/motion/*.css   one file per entrance effect or slide transition, used by name
// A class `.name` with an @keyframes of the same name is an entrance effect (<Reveal effect="name">,
// <Build effect="name">). A pair of @keyframes `name-in` / `name-out` is a slide transition
// (`transition: "name"` on the deck, or slide(x, { transition: "name" })).
// The module also exports the names it found, for the library view (a slide per effect and transition). Like a new theme folder, a new
// file needs `npm run dev` restarted; edits to an existing one reload on their own.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const ID = "\0virtual:library";

/** Entrance effects and slide transitions, by name. */
export interface MotionNames {
  effects: Array<string>;
  transitions: Array<string>;
}

/** The entrance effects and slide transitions a CSS file defines. */
export function motionNames(css: string): MotionNames {
  const frames = new Set([...css.matchAll(/(?<=@keyframes\s+)[\w-]+/gu)].map((m) => m[0]));
  const classes = new Set([...css.matchAll(/(?<=^\s*\.)[\w-]+(?=\s*[,{])/gmu)].map((m) => m[0]));

  return {
    effects: [...classes].filter((c) => frames.has(c)),
    transitions: [...frames].flatMap((k) => (k.endsWith("-in") && frames.has(`${k.slice(0, -3)}-out`) ? [k.slice(0, -3)] : [])),
  };
}

export function library({ libraryDir }: { libraryDir: string }): Plugin {
  const dir = resolve(libraryDir, "motion");

  const files = () =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".css"))
          .toSorted()
          .map((f) => resolve(dir, f).replaceAll("\\", "/"))
      : [];

  return {
    name: "slides:library",
    resolveId(id) {
      if (id === "virtual:library") {
        return ID;
      }
    },
    load(id) {
      if (id !== ID) {
        return;
      }

      const found = files().map((file) => motionNames(readFileSync(file, "utf8")));
      const motion = { effects: found.flatMap((f) => f.effects), transitions: found.flatMap((f) => f.transitions) };

      return `${files()
        .map((file) => `import ${JSON.stringify(file)};`)
        .join("\n")}\nexport const motion = ${JSON.stringify(motion)};\n`;
    },
  };
}

// `virtual:themes`: the theme folders in src/themes, as CSS and logos.
// A build includes only the theme its deck names (plus the default), so one theme's fonts never
// end up in another theme's deck. The dev server includes them all; their rules are scoped by
// [data-theme], so only the chosen one applies.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import type { Plugin } from "vite";

const LOGOS = ["logo.svg", "logo.png", "logo.jpg", "logo.webp"];

export function listThemes(themesDir: string): string[] {
  return readdirSync(themesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(resolve(themesDir, e.name, "theme.css")))
    .map((e) => e.name)
    .sort();
}

/** The team's default theme from src/library/settings.json, or "default". */
export function teamDefaultTheme(themesDir: string): string {
  const file = resolve(themesDir, "../library/settings.json");
  if (!existsSync(file)) return "default";
  let theme: unknown;
  try {
    theme = JSON.parse(readFileSync(file, "utf8")).defaultTheme ?? "default";
  } catch (e) {
    throw new Error(`src/library/settings.json is not valid JSON: ${(e as Error).message}`);
  }
  if (typeof theme !== "string" || !existsSync(resolve(themesDir, theme, "theme.css")))
    throw new Error(
      `src/library/settings.json: defaultTheme "${theme}" is not a folder in src/themes. Themes: ${listThemes(themesDir).join(", ")}`,
    );
  return theme;
}

/** The theme a deck names with `theme: "name"`, or the team default. Code in template literals and comments is ignored. */
export function deckTheme(deckFile: string): string {
  const source = readFileSync(deckFile, "utf8")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const m = /\btheme\s*:\s*(\S)/.exec(source);
  if (!m) return teamDefaultTheme(resolve(import.meta.dirname, "../src/themes"));
  const literal = /^\s*:\s*["']([\w-]+)["']/.exec(source.slice(m.index + "theme".length));
  if (!literal)
    throw new Error(
      `${relative(process.cwd(), deckFile)}: write the theme as a string literal, e.g. theme: "editorial". ` +
        "The build reads it from the file to include only that theme's fonts and logo, so a variable or expression can't be followed.",
    );
  return literal[1];
}

export function themes({ themesDir, deckFile }: { themesDir: string; deckFile: string }): Plugin {
  let serve = false;
  return {
    name: "slides:themes",
    configResolved(config) {
      serve = config.command === "serve";
    },
    resolveId(id) {
      if (id === "virtual:themes") return "\0virtual:themes";
    },
    load(id) {
      if (id !== "\0virtual:themes") return;
      const all = listThemes(themesDir);
      let names = all;
      if (!serve) {
        const wanted = deckTheme(deckFile);
        if (!all.includes(wanted)) {
          this.error(
            `${relative(process.cwd(), deckFile)} uses theme "${wanted}", but there is no src/themes/${wanted}/theme.css. Themes: ${all.join(", ")}`,
          );
        }
        names = [...new Set(["default", wanted])];
      }
      const lines: string[] = [];
      const entries: string[] = [];
      names.forEach((name, i) => {
        const dir = resolve(themesDir, name).replaceAll("\\", "/");
        if (name !== "default") lines.push(`import ${JSON.stringify(`${dir}/theme.css`)};`);
        const logos = LOGOS.filter((f) => existsSync(resolve(themesDir, name, f)));
        if (logos.length > 1) this.error(`src/themes/${name} has more than one logo (${logos.join(", ")}). Keep one.`);
        const logo = logos[0];
        if (logo?.endsWith(".svg")) {
          lines.push(`import logo${i} from ${JSON.stringify(`${dir}/${logo}?raw`)};`);
          entries.push(`${JSON.stringify(name)}: { svg: logo${i} }`);
        } else if (logo) {
          lines.push(`import logo${i} from ${JSON.stringify(`${dir}/${logo}`)};`);
          entries.push(`${JSON.stringify(name)}: { url: logo${i} }`);
        } else entries.push(`${JSON.stringify(name)}: {}`);
      });
      return `${lines.join("\n")}\nexport const themes = { ${entries.join(", ")} };\n`;
    },
  };
}

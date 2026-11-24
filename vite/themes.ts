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

/** The team's default theme from the library's settings.json (src/library), or "default". */
export function teamDefaultTheme(themesDir: string, libraryDir: string): string {
  const file = resolve(libraryDir, "settings.json");
  if (!existsSync(file)) {
    return "default";
  }
  let theme: unknown;
  try {
    theme = JSON.parse(readFileSync(file, "utf8")).defaultTheme ?? "default";
  } catch (e) {
    throw new Error(`src/library/settings.json is not valid JSON: ${(e as Error).message}`);
  }
  if (typeof theme !== "string" || !existsSync(resolve(themesDir, theme, "theme.css"))) {
    throw new Error(
      `src/library/settings.json: defaultTheme "${theme}" is not a folder in src/themes. Themes: ${listThemes(themesDir).join(", ")}`,
    );
  }
  return theme;
}

/**
 * Where the `theme:` key of the deck object (the default export) is in `source`, or -1. Only keys
 * of that object count: a `theme` field in the deck's data, in a slide's props or in slide() options
 * is something else. `source` has its comments and template literals blanked out.
 */
export function deckThemeKey(source: string): number {
  // Double-quoted strings are blanked too (same length, so offsets still match), so a brace in one doesn't count.
  const code = source.replace(/"(?:\\.|[^"\\\n])*"/g, (s) => `"${" ".repeat(s.length - 2)}"`);
  const name = /\bexport\s+default\s+([A-Za-z_$][\w$]*)\s*(?:;|$)/m.exec(code)?.[1];
  const open = name
    ? new RegExp(`\\b(?:const|let|var)\\s+${name.replace(/\$/g, "\\$")}\\b[^=]*=\\s*\\{`).exec(code)
    : /\bexport\s+default\s+\{/.exec(code);
  if (!open) {
    return /\btheme\s*:/.exec(code)?.index ?? -1;
  } // not a deck object we can find: the first `theme:` anywhere
  let depth = 0;
  for (let i = open.index + open[0].length - 1; i < code.length; i++) {
    const c = code[i];
    if (c === "{") {
      depth++;
    } else if (c === "}" && --depth === 0) {
      return -1;
    } else if (depth === 1 && c === "t" && /^theme\s*:/.test(code.slice(i, i + 40)) && !/[\w$.]/.test(code[i - 1])) {
      return i;
    }
  }
  return -1;
}

/** The theme a deck names with `theme: "name"` on its deck object, or the team default. Code in template literals and comments is ignored. */
export function deckTheme(deckFile: string, libraryDir: string): string {
  // One pass, so a // inside a string is not a comment. Blanked, not removed, so offsets still match.
  const source = readFileSync(deckFile, "utf8").replace(/"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/.*$/gm, (s) =>
    s[0] === '"' ? s : s[0] === "`" ? `\`${" ".repeat(s.length - 2)}\`` : " ".repeat(s.length),
  );
  const at = deckThemeKey(source);
  if (at < 0) {
    return teamDefaultTheme(resolve(import.meta.dirname, "../src/themes"), libraryDir);
  }
  const literal = /^\s*:\s*["']([\w-]+)["']/.exec(source.slice(at + "theme".length));
  if (!literal) {
    throw new Error(
      `${relative(process.cwd(), deckFile)}: write the theme as a string literal, e.g. theme: "editorial". ` +
        "The build reads it from the file to include only that theme's fonts and logo, so a variable or expression can't be followed.",
    );
  }
  return literal[1];
}

export function themes({ themesDir, deckFile, libraryDir }: { themesDir: string; deckFile: string; libraryDir: string }): Plugin {
  let serve = false;
  return {
    name: "slides:themes",
    configResolved(config) {
      serve = config.command === "serve";
    },
    resolveId(id) {
      if (id === "virtual:themes") {
        return "\0virtual:themes";
      }
    },
    load(id) {
      if (id !== "\0virtual:themes") {
        return;
      }
      const all = listThemes(themesDir);
      let names = all;
      if (!serve) {
        const wanted = deckTheme(deckFile, libraryDir);
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
        if (name !== "default") {
          lines.push(`import ${JSON.stringify(`${dir}/theme.css`)};`);
        }
        const logos = LOGOS.filter((f) => existsSync(resolve(themesDir, name, f)));
        if (logos.length > 1) {
          this.error(`src/themes/${name} has more than one logo (${logos.join(", ")}). Keep one.`);
        }
        const logo = logos[0];
        if (logo?.endsWith(".svg")) {
          lines.push(`import logo${i} from ${JSON.stringify(`${dir}/${logo}?raw`)};`);
          entries.push(`${JSON.stringify(name)}: { svg: logo${i} }`);
        } else if (logo) {
          lines.push(`import logo${i} from ${JSON.stringify(`${dir}/${logo}`)};`);
          entries.push(`${JSON.stringify(name)}: { url: logo${i} }`);
        } else {
          entries.push(`${JSON.stringify(name)}: {}`);
        }
      });
      return `${lines.join("\n")}\nexport const themes = { ${entries.join(", ")} };\n`;
    },
  };
}

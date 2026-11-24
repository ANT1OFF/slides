// Licence notices for what a built deck redistributes: React (MIT) and the fonts it embeds
// (their licence files sit next to them: src/themes/<name>/fonts/*LICENSE*, or in the deck folder).
// They go into the HTML as a text block at the top of <head> (<script type="text/plain" id="third-party-notices">),
// so the single file carries them and no minifier strips them.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

function licenceFiles(dir: string): Array<string> {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /licen[cs]e|^ofl/i.test(e.name) && /\.(txt|md)$|^LICENSE$/i.test(e.name))
    .map((e) => resolve(e.parentPath, e.name))
    .sort();
}

const FONT = /\.(woff2?|ttf|otf)$/i;

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
/** "JetBrainsMono-LICENSE.txt" → "jetbrainsmono"; a plain "LICENSE.txt" or "OFL.txt" → "". */
const stem = (licence: string) =>
  key(
    licence
      .split(/[\\/]/)
      .pop()!
      .replace(/[-_ ]?(licen[cs]e|ofl)(\.(txt|md))?$/i, ""),
  );

/**
 * Font files under `dir`, each with its licence: in its own folder or a parent up to `dir`, the
 * licence file named after the font ("JetBrainsMono-LICENSE.txt" for "jetbrains-mono-….woff2"), or a
 * folder's only, or unnamed (LICENSE.txt, OFL.txt), licence. Otherwise every licence in the folder.
 */
function fontFiles(dir: string, root: string): Array<{ font: string; licence?: string }> {
  if (!existsSync(dir)) {
    return [];
  }
  const licences = licenceFiles(dir);
  const rel = (f: string) => f.slice(root.length + 1);
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && FONT.test(e.name))
    .map((e) => {
      const font = resolve(e.parentPath, e.name);
      for (let folder = e.parentPath; folder.startsWith(dir); folder = resolve(folder, "..")) {
        const here = licences.filter((l) => resolve(l, "..") === folder);
        if (!here.length) {
          continue;
        }
        const named = here.find((l) => stem(l) && key(e.name).startsWith(stem(l)));
        const generic = here.length === 1 ? here[0] : here.find((l) => !stem(l));
        return { font: rel(font), licence: named ? rel(named) : generic ? rel(generic) : `one of ${here.map(rel).join(", ")}` };
      }
      return { font: rel(font) };
    });
}

export function notices({ root, folders }: { root: string; folders: () => Array<string> }): Plugin {
  return {
    name: "slides:notices",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler() {
        const parts: Array<{ heading: string; text: string }> = [];
        for (const pkg of ["react", "react-dom", "scheduler"]) {
          const file = resolve(root, "node_modules", pkg, "LICENSE");
          if (existsSync(file)) {
            parts.push({ heading: pkg, text: readFileSync(file, "utf8").trim() });
          }
        }
        for (const folder of folders()) {
          for (const file of licenceFiles(folder)) {
            parts.push({ heading: file.slice(root.length + 1), text: readFileSync(file, "utf8").trim() });
          }
        }
        // Same text once, with every heading it applies to.
        const byText = new Map<string, Array<string>>();
        for (const p of parts) {
          byText.set(p.text, [...(byText.get(p.text) ?? []), p.heading]);
        }
        const body = [...byText].map(([text, heads]) => `== ${heads.join(", ")} ==\n\n${text}`).join("\n\n");
        // Which font files the deck can embed, and the licence that covers each.
        const fonts = folders().flatMap((f) => fontFiles(f, root));
        for (const f of fonts.filter((f) => !f.licence)) {
          console.warn(
            `\n  Warning: ${f.font} has no licence file next to it. Add the font's licence (e.g. MyFont-LICENSE.txt) to its folder.`,
          );
        }
        const manifest = fonts.map((f) => `${f.font}: ${f.licence ?? "NO LICENCE FILE"}`).join("\n");
        const text =
          `Third-party notices for this presentation file.\n\nEmbedded font files and their licences:\n${manifest || "(none)"}\n\n${body}`.replaceAll(
            "</",
            "<\\/",
          );
        return [{ tag: "script", attrs: { type: "text/plain", id: "third-party-notices" }, children: text, injectTo: "head-prepend" }];
      },
    },
  };
}

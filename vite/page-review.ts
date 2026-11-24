// Vite plugins that tag the DOM for page-review tools (click a slide, send a comment to an agent)
// and keep slide ids stable in minified builds.
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import MagicString from "magic-string";
import { Visitor, parseSync } from "vite";
import type { Plugin } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/");
const own = (id: string) =>
  (id.startsWith(`${root}src/`) || id.startsWith(`${root}examples/`)) && id.endsWith(".tsx") && !id.includes("/node_modules/");

/** Dev only: `data-source="src/x.tsx:line:col"` on every host element (`<div>`, `<path>`) in `src`. */
export function sourceTags(): Plugin {
  return {
    name: "slides:source-tags",
    apply: "serve",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (!own(file)) {
        return;
      }
      const { program } = parseSync(file, code, { lang: "tsx" });
      const lines = [0];
      for (let i = code.indexOf("\n"); i !== -1; i = code.indexOf("\n", i + 1)) {
        lines.push(i + 1);
      }
      const at = (offset: number) => {
        const line = lines.findLastIndex((start) => start <= offset);
        return `${line + 1}:${offset - lines[line] + 1}`;
      };
      const path = relative(root, file).replaceAll("\\", "/");
      const s = new MagicString(code);
      new Visitor({
        JSXOpeningElement(node) {
          if (node.name.type !== "JSXIdentifier" || !/^[a-z]/.test(node.name.name)) {
            return;
          }
          if (node.attributes.some((a) => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && a.name.name === "data-source")) {
            return;
          }
          s.appendLeft(node.name.end, ` data-source="${path}:${at(node.start)}"`);
        },
      }).visit(program);
      if (!s.hasChanged()) {
        return;
      }
      return { code: s.toString(), map: s.generateMap({ hires: "boundary", source: file }) };
    },
  };
}

/**
 * Names every component a deck file uses as a tag, so a slide keeps its id (`displayName`) once a
 * release build has minified the function names. Only the decks' own files, so nothing unused is kept.
 */
export function slideNames(): Plugin {
  return {
    name: "slides:slide-names",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (!/\/(src\/decks|examples)\/[^/]+\/index\.tsx$/.test(file) || !own(file)) {
        return;
      }
      const { program } = parseSync(file, code, { lang: "tsx" });
      // Only names the module itself binds: a tag can also be a local, such as `const Icon = icons[i]`.
      const bound = new Set<string>();
      for (const statement of program.body) {
        const declared = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
        if (declared?.type === "ImportDeclaration") {
          for (const spec of declared.specifiers) {
            bound.add(spec.local.name);
          }
        } else if ((declared?.type === "FunctionDeclaration" || declared?.type === "ClassDeclaration") && declared.id) {
          bound.add(declared.id.name);
        } else if (declared?.type === "VariableDeclaration") {
          for (const each of declared.declarations) {
            if (each.id.type === "Identifier") {
              bound.add(each.id.name);
            }
          }
        }
      }
      const names = new Set<string>();
      new Visitor({
        JSXOpeningElement(node) {
          if (node.name.type === "JSXIdentifier" && /^[A-Z]/.test(node.name.name) && bound.has(node.name.name)) {
            names.add(node.name.name);
          }
        },
      }).visit(program);
      if (names.size === 0) {
        return;
      }
      const s = new MagicString(code);
      s.append(`\n${[...names].map((n) => `${n}.displayName ??= ${JSON.stringify(n)};`).join("\n")}\n`);
      return { code: s.toString(), map: s.generateMap({ hires: "boundary", source: file }) };
    },
  };
}

import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { Visitor, parseSync, resolveConfig } from "vite";

function inside(dir: string, file: string): boolean {
  const path = relative(dir, file);
  return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** Find library data referred to by the deck's local module graph, without loading its code. */
export async function libraryData(entry: string, root: string, library: string): Promise<Array<string>> {
  const config = await resolveConfig({ configFile: false, root, resolve: { alias: { "@library": library } } }, "serve");
  // oxlint-disable-next-line typescript/no-deprecated -- its replacement, createIdResolver, needs a dev server environment
  const resolveImport = config.createResolver();
  const visited = new Set<string>();
  const found: Array<string> = [];

  async function visit(file: string) {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);
    if (file.endsWith(".data.json") && inside(library, file)) {
      found.push(file);
    }
    if (!/\.(?:[cm]?[jt]s|[jt]sx)$/u.test(file)) {
      return;
    }

    const { module, program, errors } = parseSync(file, readFileSync(file, "utf8"));
    if (errors.length > 0) {
      throw new Error(`Can't trace imports in ${relative(root, file)}: ${errors[0].message}`);
    }
    const imports = new Set<string>();
    for (const item of module.staticImports) {
      if (item.entries.length === 0 || item.entries.some((spec) => !spec.isType)) {
        imports.add(item.moduleRequest.value);
      }
    }
    for (const item of module.staticExports) {
      for (const spec of item.entries) {
        if (!spec.isType && spec.moduleRequest) {
          imports.add(spec.moduleRequest.value);
        }
      }
    }
    new Visitor({
      ImportExpression(node) {
        if (node.source.type === "Literal" && typeof node.source.value === "string") {
          imports.add(node.source.value);
        }
      },
    }).visit(program);
    for (const id of imports) {
      if (!/^(?:\.{1,2}\/|\/|@library(?:\/|$))/u.test(id)) {
        continue;
      }
      const resolved = await resolveImport(id, file);
      const path = resolved?.split(/[?#]/u, 1)[0];
      if (path && inside(root, path)) {
        await visit(path);
      }
    }
  }
  await visit(resolve(entry));
  return found;
}

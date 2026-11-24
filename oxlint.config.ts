// `npm run lint` (part of `npm run check`): oxlint with type-aware rules (`--type-aware`, run by the
// beta `tsrs` backend). Base: @cloudflare/oxlint-config, which extends @nkzw/oxlint-config. On top of
// it, every rule in oxlint's correctness, suspicious, pedantic and style categories, and two local
// rules (tools/oxlint). Prettier owns formatting. Each rule turned off below says why.
import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [cloudflare],
  env: cloudflare.env,
  // Team-owned paths are skipped so an upgrade never fails on a team's own code (the showcase is upstream's).
  ignorePatterns: ["dist/**", "examples/html/**", "src/library/**", "src/decks/**", "!src/decks/showcase/**"],
  categories: { correctness: "error", suspicious: "error", pedantic: "error", style: "error" },
  jsPlugins: [{ name: "local", specifier: "./tools/oxlint/index.ts" }],
  rules: {
    "local/require-readable-spacing": "error",
    "local/require-assertion-reason": "error",

    // Options.
    "jsx-a11y/aria-role": ["error", { ignoreNonDOM: true }],
    "typescript/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "sort-imports": ["error", { ignoreDeclarationSort: true }],
    "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],

    // Off: at odds with this codebase.
    // A deck's `slides: [<A />, <B />]` is data the engine keys itself, not rendered children.
    "react/jsx-key": "off",
    // React 17+ JSX transform: no React import needed.
    "react/react-in-jsx-scope": "off",
    // Slides are fixed-size canvases: pixel sizes, delays and chart data are the content, not magic.
    "no-magic-numbers": "off",
    // `i`, `x`, `e` in a one-line callback read better than longer names.
    "id-length": "off",
    // One declaration per statement; Prettier then formats each on its own line.
    "one-var": "off",
    // Object keys are in reading order (a deck's title before its slides), not alphabetical.
    "sort-keys": "off",
    // A single `a ? b : c` is the idiom in JSX; nested ternaries stay banned (no-nested-ternary).
    "no-ternary": "off",
    // Prettier strips the parentheses this rule asks for around a nested ternary.
    "unicorn/no-nested-ternary": "off",
    // Blocks are named exports and decks are default exports: the engine's contract needs both.
    "import/no-named-export": "off",
    "import/no-default-export": "off",
    "import/prefer-default-export": "off",
    // An export sits next to what it exports.
    "import/group-exports": "off",
    "import/exports-last": "off",
    // Slides nest layouts; depth is the content.
    "react/jsx-max-depth": "off",
    // React props, DOM nodes and Node APIs are not deeply readonly types.
    "typescript/prefer-readonly-parameter-types": "off",
    // `{caption && <p>…</p>}` on an optional prop is the JSX idiom; an explicit check would render "".
    "typescript/strict-boolean-expressions": "off",
    // It flags every continuation line of a wrapped comment.
    "capitalized-comments": "off",
    // Components live in PascalCase files, named after the component (React convention).
    "unicorn/filename-case": "off",
    // React and the DOM use null.
    "unicorn/no-null": "off",
    // Browser code: `window` says where it runs.
    "unicorn/prefer-global-this": "off",
    // Length and count limits are arbitrary; a long slide list or a five-number geometry helper is fine.
    "max-statements": "off",
    "max-lines-per-function": "off",
    "max-lines": "off",
    "max-params": "off",
    "max-depth": "off",
    "import/max-dependencies": "off",
    // A `let` assigned in each branch of an if or try is clearer than a dummy initial value.
    "init-declarations": "off",
    // An early `continue` keeps a loop flat, like an early return.
    "no-continue": "off",
    // Blocks forward their remaining props to the element they wrap.
    "react/jsx-props-no-spreading": "off",
    // Clicks on a slide or backdrop are mouse shortcuts; the deck handles every key globally.
    "jsx-a11y/no-static-element-interactions": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    // There are no tests; it flags top-level statements in scripts.
    "vitest/require-hook": "off",
  },
  overrides: [
    {
      // Command-line tools and build plugins: they run on Node and print to the terminal.
      files: ["scripts/**", "vite/**", "vite.config.ts", "oxlint.config.ts", "tools/**"],
      rules: { "no-console": "off", "import/no-nodejs-modules": "off" },
    },
  ],
});

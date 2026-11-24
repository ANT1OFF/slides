import { defineRule } from "@oxlint/plugins";

import type { Context, ESTree } from "@oxlint/plugins";

type Statement = ESTree.Statement | ESTree.Directive | ESTree.ModuleDeclaration;

const CONTROL_FLOW = new Set([
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "IfStatement",
  "ReturnStatement",
  "SwitchStatement",
  "TryStatement",
  "WhileStatement",
]);
const DECLARATIONS = new Set(["ClassDeclaration", "FunctionDeclaration", "TSInterfaceDeclaration", "TSTypeAliasDeclaration"]);

/** The declaration an `export` wraps, or the statement itself. */
function unwrap(node: Statement): ESTree.Node {
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    return node.declaration ?? node;
  }

  return node;
}

function isMultiline(node: ESTree.Node): boolean {
  return node.loc.start.line !== node.loc.end.line;
}

function isBinding(node: ESTree.Node): boolean {
  return node.type === "VariableDeclaration";
}

/** Ends with the `}` of a block or a switch, like `if (…) { … }` or `const f = () => { … };`. */
function isBlockLike(context: Context, node: ESTree.Node): boolean {
  if (node.type === "DoWhileStatement") {
    return node.body.type === "BlockStatement";
  }

  const last = context.sourceCode.getLastToken(node, (token) => token.value !== ";");

  if (last?.value !== "}") {
    return false;
  }

  const owner = context.sourceCode.getNodeByRangeIndex(last.range[0]);

  return owner?.type === "BlockStatement" || owner?.type === "SwitchStatement";
}

/** A comment on its own line above `node` starts a new group. */
function hasLeadingComment(context: Context, node: Statement): boolean {
  const previousLine = context.sourceCode.getTokenBefore(node)?.loc.end.line;

  return context.sourceCode.getCommentsBefore(node).some((comment) => comment.loc.start.line !== previousLine);
}

/** Whether `prev` and `next` need a blank line between them; later checks override earlier ones. */
function needsBlankLine(context: Context, prev: Statement, next: Statement, topLevel: boolean): boolean {
  const before = unwrap(prev);
  const after = unwrap(next);

  if (prev.type === "ImportDeclaration") {
    return next.type !== "ImportDeclaration";
  }

  const bindings = isBinding(before) && isBinding(after) && !isMultiline(prev) && !isMultiline(next);

  if (bindings) {
    return hasLeadingComment(context, next);
  }

  return (
    topLevel ||
    DECLARATIONS.has(before.type) ||
    DECLARATIONS.has(after.type) ||
    (isBinding(before) && isMultiline(prev)) ||
    (isBinding(after) && isMultiline(next)) ||
    CONTROL_FLOW.has(after.type) ||
    isBlockLike(context, before)
  );
}

/** Whether a line with nothing on it separates `prev` from `next`. */
function hasBlankLine(context: Context, prev: Statement, next: Statement): boolean {
  const between = context.sourceCode.text.slice(prev.range[1], next.range[0]).split("\n");

  return between.slice(1, -1).some((line) => line.trim() === "");
}

function checkList(context: Context, statements: readonly Statement[], topLevel: boolean): void {
  for (const [index, next] of statements.entries()) {
    const prev = statements[index - 1];

    if (prev === undefined || !needsBlankLine(context, prev, next, topLevel) || hasBlankLine(context, prev, next)) {
      continue;
    }

    const { text } = context.sourceCode;
    const lineEnd = text.indexOf("\n", prev.range[1]);

    context.report({
      node: next,
      message: "Add a blank line before this statement: it starts a new group.",
      fix: (fixer) => fixer.insertTextAfterRange([lineEnd, lineEnd], "\n"),
    });
  }
}

/** Blank lines around declarations, multi-line bindings, control flow and blocks (autofixed). */
export const requireReadableSpacing = defineRule({
  meta: {
    type: "layout",
    fixable: "whitespace",
    docs: { description: "Require a blank line between logical groups of statements." },
    schema: [],
  },
  create(context) {
    return {
      Program: (node) => checkList(context, node.body, true),
      BlockStatement: (node) => checkList(context, node.body, false),
      StaticBlock: (node) => checkList(context, node.body, false),
      SwitchCase: (node) => checkList(context, node.consequent, false),
      TSModuleBlock: (node) => checkList(context, node.body, false),
    };
  },
});

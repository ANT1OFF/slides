import { defineRule } from "@oxlint/plugins";

import type { Context, ESTree } from "@oxlint/plugins";

const MARKER = /\bSAFETY:\s*\S/u;

/** Nodes a comment can sit above: statements, class members and object properties. */
function isCommentOwner(node: ESTree.Node): boolean {
  return (
    node.type.endsWith("Statement") ||
    node.type.endsWith("Declaration") ||
    node.type === "PropertyDefinition" ||
    node.type === "Property" ||
    node.type === "JSXAttribute"
  );
}

/** A `SAFETY:` comment before the cast, inside or directly above the statement (or property) holding it. */
function hasReason(context: Context, node: ESTree.TSAsExpression | ESTree.TSTypeAssertion): boolean {
  let owner: ESTree.Node = node;

  while (!isCommentOwner(owner) && owner.parent !== null && owner.parent.type !== "Program") {
    owner = owner.parent;
  }

  if (owner.parent?.type === "ExportNamedDeclaration") {
    owner = owner.parent;
  }

  const from = context.sourceCode.getTokenBefore(owner)?.range[1] ?? 0;

  return context.sourceCode
    .getAllComments()
    .some((comment) => comment.range[0] >= from && comment.range[1] <= node.range[0] && MARKER.test(comment.value));
}

/** Every `as` cast except `as const` states why it holds, in a `// SAFETY:` comment. */
export const requireAssertionReason = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Require a `// SAFETY:` comment explaining each type assertion." },
    schema: [],
  },
  create(context) {
    function check(node: ESTree.TSAsExpression | ESTree.TSTypeAssertion): void {
      const type = node.typeAnnotation;
      const isConst = type.type === "TSTypeReference" && type.typeName.type === "Identifier" && type.typeName.name === "const";

      if (!isConst && !hasReason(context, node)) {
        context.report({ node, message: "Say why this cast holds in a `// SAFETY:` comment above it, or remove the cast." });
      }
    }

    return { TSAsExpression: check, TSTypeAssertion: check };
  },
});

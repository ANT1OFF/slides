// Local oxlint rules, loaded by oxlint.config.ts. Written for this repo after two rules in the
// anti-slop ruleset for oxlint, which is meant to be copied and adapted:
//   require-readable-spacing   blank lines between logical groups of statements (autofixed)
//   require-assertion-reason   a `// SAFETY:` comment saying why each `as` cast holds
import { definePlugin } from "@oxlint/plugins";

import { requireAssertionReason } from "./require-assertion-reason.ts";
import { requireReadableSpacing } from "./require-readable-spacing.ts";

export default definePlugin({
  meta: { name: "local" },
  rules: {
    "require-assertion-reason": requireAssertionReason,
    "require-readable-spacing": requireReadableSpacing,
  },
});

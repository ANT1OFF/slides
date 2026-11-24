# Page-review tags

The deck tags the DOM so tools that comment on a page (for example an AI agent's preview pane) know
which slide and build step a comment was made on: `data-deck` and `data-deck-mode` on the root,
`data-slide`, `data-slide-id` and `data-notes` on each slide, `data-build` and `data-build-count` on
the current one, `data-stage`, `data-theme` and `data-scheme` on the 1920×1080 stage, and in
`npm run dev` only, `data-source` (file:line:column) on every element.

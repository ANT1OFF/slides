import type { DeckDefinition } from "@core";
import "./missing-font.css";

export default {
  title: "Missing font",
  slides: [<p style={{ fontFamily: "Verify Missing" }}>This font file is missing.</p>],
} satisfies DeckDefinition;

// Styles first: theme files (virtual:themes) must come after the default tokens to override them,
// and the team's motion files (virtual:library) last, so they can restyle a built-in transition.
import "./styles.css";
import { themes } from "virtual:themes";
import "virtual:library";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import defaultDeck from "virtual:deck";
import { Deck, Presenter, isPresenter } from "@core";
import type { DeckDefinition } from "@core";
import settings from "@library/settings.json";

// A build contains only the one deck `virtual:deck` points at, and only its theme (virtual:themes).
// The dev server shows a gallery of every deck, theme, block and library slide instead (gallery.tsx).
async function pick() {
  if (!import.meta.env.DEV) {
    return { deck: defaultDeck, name: __DECK__ };
  }
  const { devPick } = await import("./gallery.tsx");
  return devPick(new URLSearchParams(location.search));
}

/** The theme folder's logo, unless the deck sets its own. An SVG is inlined so it follows `currentColor`. */
function withThemeLogo(input: DeckDefinition): DeckDefinition {
  // A deck without a theme gets the team's default (src/library/settings.json).
  const deck = { ...input, theme: input.theme ?? settings.defaultTheme };
  if (deck.logo !== undefined) {
    return deck;
  }
  const file = themes[deck.theme];
  const logo = file?.svg ? (
    <span role="img" aria-label="Logo" className="[&>svg]:h-full [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: file.svg }} />
  ) : file?.url ? (
    <img src={file.url} alt="Logo" />
  ) : null;
  return { ...deck, logo };
}

const chosen = await pick();
const picked = chosen && { ...chosen, deck: withThemeLogo(chosen.deck) };
const Gallery = import.meta.env.DEV && !picked ? (await import("./gallery.tsx")).Gallery : null;

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    {picked ? (
      isPresenter() ? (
        <Presenter deck={picked.deck} name={picked.name} />
      ) : (
        <Deck deck={picked.deck} name={picked.name} />
      )
    ) : (
      Gallery && <Gallery />
    )}
  </StrictMode>,
);

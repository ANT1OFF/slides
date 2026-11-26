import { useImperativeHandle, useReducer, useRef, useState } from "react";
import type { CSSProperties, ElementType, ReactNode, Ref } from "react";
import { flushSync } from "react-dom";
import { StaticContext, useStatic } from "./context.ts";
import { Stage } from "./Stage.tsx";
import type { DeckSlide } from "./types.ts";

// The ids in flight while the deck swaps the slides: a Morph that mounts then is the one landing.
const landing = new Set<string>();

/** Runs `apply` (the slide change) with `ids` marked as landing. */
export function land(ids: Array<string>, apply: () => void) {
  for (const id of ids) {
    landing.add(id);
  }

  try {
    apply();
  } finally {
    landing.clear();
  }
}

const isLanding = (id: string) => landing.has(id);
const keep = (landed: boolean) => landed;

/**
 * A shared element. Give one thing on two neighbouring slides the same `id`, and it moves, resizes
 * and reshapes from one to the other while the slide changes: a card becomes the next slide's
 * header, a small number becomes the big one. Going back, it returns. The rest of each slide plays
 * the slide's `transition` (a fade when none is named). An id is used once per slide.
 *
 * What lands is shown in its final state: an entrance or a count-up inside it does not play again.
 * `origin` also makes it the point the next slide's transition opens from (`iris`).
 *
 * It is a plain wrapper everywhere else: print, the overview, the presenter window, reduced motion
 * and a browser without view transitions show it where it stands.
 */
export function Morph({
  id,
  children,
  origin = false,
  as: Tag = "div",
  className = "",
  style,
}: {
  id: string;
  children?: ReactNode;
  origin?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const still = useStatic();

  // Settled when it mounts: it either flew in or it didn't.
  const [landed] = useReducer(keep, id, isLanding);

  return (
    <Tag data-morph={id} data-origin={origin ? "" : undefined} className={`${landed ? "static-motion" : ""} ${className}`} style={style}>
      <StaticContext.Provider value={still || landed}>{children}</StaticContext.Provider>
    </Tag>
  );
}

const warned = new Set<string>();

/** The Morphs under `scope`, by id. An id used twice there is left out: two elements can't share a name. */
export function morphs(scope: ParentNode | null): Map<string, HTMLElement> {
  const found = new Map<string, HTMLElement>();
  const twice = new Set<string>();

  for (const el of scope?.querySelectorAll<HTMLElement>("[data-morph]") ?? []) {
    const id = el.dataset.morph ?? "";

    if (found.has(id)) {
      twice.add(id);
    } else {
      found.set(id, el);
    }
  }

  for (const id of twice) {
    found.delete(id);

    // Reported like an uncaught error, so it shows in the console and fails `npm run verify`, but nothing stops.
    if (!warned.has(id)) {
      warned.add(id);
      reportError(new Error(`<Morph id="${id}"> is on one slide more than once, so it will not morph. Give each its own id.`));
    }
  }

  return found;
}

/**
 * Ends the entrance effects of everything around a Morph that has just landed, up to its slide.
 * A box that is still fading in would hide what flies into it.
 */
export function settle(el: HTMLElement, slide: HTMLElement) {
  for (let box = el.parentElement; box && box !== slide; box = box.parentElement) {
    for (const entrance of box.getAnimations()) {
      // A loop has no end to jump to.
      if (Number.isFinite(entrance.effect?.getComputedTiming().endTime)) {
        entrance.finish();
      }
    }
  }
}

/** Asks which Morph ids slide `index` has, before the deck shows it. */
export type MorphPeek = (index: number) => Set<string>;

/**
 * Renders a slide out of sight, in its final state, to read its Morph ids. The deck asks only when
 * the slide being left has a Morph, so a deck without one never renders this.
 */
export function MorphProbe({ slides, ref }: { slides: Array<DeckSlide>; ref: Ref<MorphPeek> }) {
  const [index, setIndex] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => (i) => {
      flushSync(() => setIndex(i));
      const ids = new Set(morphs(box.current).keys());
      setIndex(null);

      return ids;
    },
    [],
  );

  return index === null ? null : (
    <div ref={box} hidden>
      <Stage scale={1} still>
        {slides[index]?.content}
      </Stage>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DisplayContext, StepContext } from "./context.ts";
import type { Display } from "./context.ts";
import { Overview } from "./Overview.tsx";
import { Print } from "./Print.tsx";
import { Stage, fitScale, useWindowSize } from "./Stage.tsx";
import { isMessage, postTarget, presenterUrl, sameOrigin } from "./sync.ts";
import type { Message, Position } from "./sync.ts";
import { Help } from "./Help.tsx";
import { KeysContext, NavContext } from "./nav.ts";
import type { DeckKey, DeckNav } from "./nav.ts";
import { DeckContext, deckLook } from "./theme.ts";
import { useSlideTransition } from "./transition.ts";
import { entries, slideLabel, slideNumber, slideTags } from "./types.ts";
import type { DeckDefinition } from "./types.ts";

function indexFromHash(count: number): number {
  const n = Number.parseInt(window.location.hash.slice(1), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n - 1, 0), count - 1) : 0;
}

/**
 * Presents a deck on a fixed 1920×1080 stage scaled to the window. The URL hash is the
 * 1-based slide number. Keys: → / Space / ← step through builds and slides, Home / End,
 * a number then Enter to jump, F fullscreen, N presenter window, G overview, P print to PDF,
 * B blank screen, M raw numbers or growth, ? the list of keys. See KEYS in Help.tsx.
 * A deck or a slide can name a `transition`; it runs as a view transition (see motion.css).
 * A deck's `overlay` is drawn over the window while presenting; it and the slides can read the
 * position with useDeckNav() and add keys with useDeckKey() (nav.ts).
 * `name` is the deck's folder, which the page-review tags carry.
 */
export function Deck({ deck, name }: { deck: DeckDefinition; name: string }) {
  const slides = useMemo(() => entries(deck), [deck]);
  const look = useMemo(() => deckLook(deck), [deck]);
  const count = slides.length;
  const [pos, setPos] = useState<Position>(() => ({ index: indexFromHash(count), step: 0 }));
  const [mode, setMode] = useState<"present" | "overview" | "print">("present");
  const [display, setDisplay] = useState<Display>(() => {
    const asked = new URLSearchParams(location.search).get("display");
    return asked === "relative" || asked === "absolute" ? asked : (deck.display ?? "absolute");
  });
  const [toast, setToast] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [blank, setBlank] = useState(false);
  // Keys that components added with useDeckKey(); the built-in ones are the switch below.
  const [extraKeys, setExtraKeys] = useState<Array<DeckKey>>([]);
  const addKey = useCallback((key: DeckKey) => {
    setExtraKeys((keys) => [...keys, key]);
    return () => setExtraKeys((keys) => keys.filter((k) => k !== key));
  }, []);
  const typed = useRef("");
  const steps = useRef(0);
  // The same count as `steps`, for the page-review tags, which render once the Builds register.
  const [built, setBuilt] = useState({ index: -1, count: 0 });
  const presenter = useRef<Window | null>(null);
  const { width, height } = useWindowSize();

  const register = useCallback(
    (at: number) => {
      steps.current = Math.max(steps.current, at);
      setBuilt((b) =>
        b.index === pos.index && b.count >= at ? b : { index: pos.index, count: b.index === pos.index ? Math.max(b.count, at) : at },
      );
    },
    [pos.index],
  );

  // The latest move asked for. A transition applies its move a frame later, and another key may
  // land in between, so every apply, immediate or delayed, applies this one.
  const target = useRef(pos);
  const { plain, changeSlide } = useSlideTransition();

  const goto = useCallback(
    (index: number, step = 0) => {
      const i = Math.min(Math.max(index, 0), count - 1);
      const from = target.current.index;
      target.current = { index: i, step };
      const apply = () =>
        setPos((p) => {
          if (p.index !== target.current.index) {
            steps.current = 0;
          }
          return target.current;
        });
      if (i === from) {
        apply();
        return;
      }
      // Going back plays the transition the slide being left arrived with, reversed.
      const back = i < from;
      const transition = (back ? slides[from] : slides[i]).transition ?? deck.transition;
      changeSlide(transition, back, apply);
    },
    [count, slides, deck.transition, changeSlide],
  );

  const neighbour = useCallback(
    (from: number, dir: 1 | -1) => {
      for (let i = from + dir; i >= 0 && i < count; i += dir) {
        if (!slides[i].hidden) {
          return i;
        }
      }
      return from;
    },
    [count, slides],
  );

  const nav = useCallback(
    (dir: 1 | -1) => {
      const step = Math.min(pos.step, steps.current);
      if (dir === 1 && step < steps.current) {
        goto(pos.index, step + 1);
        return;
      }
      if (dir === -1 && step > 0) {
        goto(pos.index, step - 1);
        return;
      }
      const next = neighbour(pos.index, dir);
      if (next !== pos.index) {
        goto(next, dir === -1 ? Number.POSITIVE_INFINITY : 0);
      }
    },
    [pos, goto, neighbour],
  );

  useEffect(() => {
    document.title = deck.title;
  }, [deck.title]);

  useEffect(() => {
    history.replaceState(null, "", `${location.pathname}${location.search}#${pos.index + 1}`);
    presenter.current?.postMessage({ type: "slides:state", position: pos, display } satisfies Message, postTarget());
  }, [pos, display]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onHashChange = () => goto(indexFromHash(count));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [count, goto]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only the presenter window this deck opened (N), from the same origin, may drive it.
      if (!presenter.current || e.source !== presenter.current || !sameOrigin(e) || !isMessage(e.data)) {
        return;
      }
      const m = e.data;
      if (m.type === "slides:hello") {
        presenter.current.postMessage({ type: "slides:state", position: pos, display } satisfies Message, postTarget());
      } else if (m.type === "slides:nav") {
        nav(m.dir);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pos, display, nav]);

  // While a transition runs the browser sends every click to <html>, not to the deck under it.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.target !== document.documentElement || !document.documentElement.dataset.transition) {
        return;
      }
      if (mode === "present" && !help && !blank) {
        nav(e.clientX > window.innerWidth / 3 ? 1 : -1);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [mode, help, blank, nav]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      // Letter keys work with Shift or Caps Lock too.
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (mode === "overview") {
        if (key === "Escape" || key === "g") {
          setMode("present");
        }
        return;
      }
      if (help) {
        if (e.key === "Escape" || e.key === "?") {
          setHelp(false);
        }
        return;
      }
      if (blank) {
        setBlank(false);
        return;
      }
      if (/^[0-9]$/u.test(e.key)) {
        typed.current = (typed.current + e.key).slice(-4);
        setToast(`Go to ${typed.current} ⏎`);
        return;
      }
      if (e.key === "Enter" && typed.current) {
        const n = Number(typed.current);
        typed.current = "";
        setToast(null);
        goto(n - 1);
        return;
      }
      typed.current = "";
      switch (key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ": {
          e.preventDefault();
          nav(1);
          break;
        }
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp": {
          e.preventDefault();
          nav(-1);
          break;
        }
        case "Home": {
          goto(neighbour(-1, 1));
          break;
        }
        case "End": {
          goto(neighbour(count, -1), Number.POSITIVE_INFINITY);
          break;
        }
        case "f": {
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            void document.documentElement.requestFullscreen();
          }
          break;
        }
        case "n": {
          presenter.current = window.open(presenterUrl(), "slides-presenter", "width=1280,height=800");
          break;
        }
        case "g": {
          setMode("overview");
          break;
        }
        case "p": {
          setMode("print");
          break;
        }
        case "b":
        case ".": {
          setBlank((b) => !b);
          break;
        }
        case "?": {
          setHelp(true);
          break;
        }
        case "Escape": {
          setBlank(false);
          break;
        }
        case "m": {
          const next = display === "absolute" ? "relative" : "absolute";
          setDisplay(next);
          setToast(next === "relative" ? "Growth and shares" : "Raw numbers");
          break;
        }
        default: {
          extraKeys.find((k) => k.key === key)?.run();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, help, blank, display, nav, goto, neighbour, count, extraKeys]);

  const slideInfo = useMemo(() => slides.map(({ id, hidden }) => ({ id, hidden: Boolean(hidden) })), [slides]);
  const jump = useCallback<DeckNav["goto"]>(
    (slide) => {
      if (typeof slide === "number") {
        goto(slide);
        return;
      }
      const index = slideInfo.findIndex(({ id }) => id === slide);
      if (index !== -1) {
        goto(index);
      }
    },
    [goto, slideInfo],
  );
  const deckNav = useMemo<DeckNav>(
    () => ({
      index: pos.index,
      step: Math.min(pos.step, built.index === pos.index ? built.count : 0),
      count,
      slides: slideInfo,
      nav,
      goto: jump,
    }),
    [pos, built, count, slideInfo, nav, jump],
  );
  const provide = (children: ReactNode) => (
    <DeckContext.Provider value={look}>
      <DisplayContext.Provider value={display}>
        <NavContext.Provider value={deckNav}>
          <KeysContext.Provider value={addKey}>{children}</KeysContext.Provider>
        </NavContext.Provider>
      </DisplayContext.Provider>
    </DeckContext.Provider>
  );

  if (mode === "print") {
    return provide(<Print slides={slides} name={name} onDone={() => setMode("present")} />);
  }

  const current = slides[pos.index];
  const scale = fitScale(width, height);
  const { progress } = slideLabel(slides, pos.index);
  const buildCount = built.index === pos.index ? built.count : 0;

  return provide(
    <>
      <div
        data-deck={name}
        data-deck-mode="present"
        className="fixed inset-0 grid place-items-center overflow-hidden bg-black"
        onClick={(e) => nav(e.clientX > window.innerWidth / 3 ? 1 : -1)}
      >
        <Stage scale={scale} number={slideNumber(slides, pos.index)}>
          <StepContext.Provider value={{ step: pos.step, register }}>
            <div
              key={pos.index}
              {...slideTags(current, pos.index)}
              data-build={Math.min(pos.step, buildCount)}
              data-build-count={buildCount}
              className={`absolute inset-0 ${plain.current ? "slide-enter" : ""}`}
              style={{ viewTransitionName: "slide" }}
            >
              {current.content}
            </div>
          </StepContext.Provider>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-rule">
            <div className="h-full bg-accent transition-[width] duration-500 ease-out-expo" style={{ width: `${progress * 100}%` }} />
          </div>
        </Stage>
      </div>
      {deck.overlay !== null && deck.overlay !== undefined && (
        // Over the window, themed like the stage. Clicks pass through unless the overlay asks for them.
        <div
          data-deck-overlay=""
          data-theme={look.theme}
          data-scheme={look.scheme}
          className="pointer-events-none fixed inset-0 text-ink"
          style={look.vars}
        >
          {deck.overlay}
        </div>
      )}
      {mode === "overview" && (
        <Overview
          slides={slides}
          name={name}
          current={pos.index}
          onPick={(i) => {
            goto(i);
            setMode("present");
          }}
          onClose={() => setMode("present")}
        />
      )}
      {toast && (
        <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-6 py-2 font-mono text-sm tracking-widest text-canvas uppercase">
          {toast}
        </div>
      )}
      {blank && <div className="fixed inset-0 bg-black" onClick={() => setBlank(false)} />}
      {help && <Help extra={extraKeys} onClose={() => setHelp(false)} />}
    </>,
  );
}

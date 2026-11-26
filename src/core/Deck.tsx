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
import { MorphProbe } from "./morph.tsx";
import type { MorphPeek } from "./morph.tsx";
import { KeysContext, NavContext, positionFromHash, useStagePointer } from "./nav.ts";
import type { DeckKey, DeckNav } from "./nav.ts";
import { DeckContext, deckLook } from "./theme.ts";
import { useSlideTransition } from "./transition.ts";
import { entries, slideLabel, slideNumber, slideTags } from "./types.ts";
import type { DeckDefinition } from "./types.ts";

/**
 * Presents a deck on a fixed 1920×1080 stage scaled to the window. The URL hash is the
 * 1-based slide number with an optional build step. Keys: → / Space / ← step through builds and slides, Home / End,
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
  const [pos, setPos] = useState<Position>(() => positionFromHash(count));

  // The step whose timeline plays: the one just stepped forward to. A deck opened without a hash plays its first slide.
  const [played, setPlayed] = useState(() => (location.hash ? -1 : 0));
  const [mode, setMode] = useState<"present" | "overview" | "print">("present");

  const [display, setDisplay] = useState<Display>(() => {
    const asked = new URLSearchParams(location.search).get("display");

    return asked === "relative" || asked === "absolute" ? asked : (deck.display ?? "absolute");
  });

  const [toast, setToast] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [blank, setBlank] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const presenting = mode === "present" && !help && !blank;

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

  const target = useRef(pos);
  const { plain, changeSlide, runNavigation } = useSlideTransition();
  const peek = useRef<MorphPeek>(null);

  const moveTo = useCallback(
    /** `play` is true for a step forward, whose timeline then plays; Back and jumps land settled. */
    (index: number, step = 0, play = false) => {
      const i = Math.min(Math.max(index, 0), count - 1);
      const from = target.current.index;
      target.current = { index: i, step };

      if (i === from) {
        setPos(target.current);
        setPlayed(play ? step : -1);

        return;
      }

      // Going back plays the transition the slide being left arrived with, reversed.
      const back = i < from;
      const transition = (back ? slides[from] : slides[i]).transition ?? deck.transition;
      const next = target.current;
      changeSlide(
        transition,
        back,
        () => {
          steps.current = 0;
          setPos(next);
          setPlayed(play ? step : -1);
        },
        () => peek.current?.(i),
      );
    },
    [count, slides, deck.transition, changeSlide],
  );

  const goto = useCallback(
    (index: number, step = 0) => {
      setAutoplay(false);
      runNavigation(() => moveTo(index, step));
    },
    [moveTo, runNavigation],
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

  const advance = useCallback(
    (dir: 1 | -1) => {
      runNavigation(() => {
        const { index, step: requested } = target.current;
        const step = Math.min(requested, steps.current);

        if (dir === 1 ? step < steps.current : step > 0) {
          moveTo(index, step + dir, dir === 1);

          return;
        }

        const next = neighbour(index, dir);

        if (next !== index) {
          moveTo(next, dir === -1 ? Number.POSITIVE_INFINITY : 0, dir === 1);
        }
      });
    },
    [runNavigation, moveTo, neighbour],
  );

  const nav = useCallback(
    (dir: 1 | -1) => {
      setAutoplay(false);
      advance(dir);
    },
    [advance],
  );

  const buildCount = built.index === pos.index ? built.count : 0;
  const step = Math.min(pos.step, buildCount);
  const current = slides[pos.index];

  useEffect(() => {
    if (!autoplay || !presenting) {
      return;
    }

    const atEnd = step >= buildCount && neighbour(pos.index, 1) === pos.index;
    const duration = current.duration ?? deck.duration;

    const seconds = duration && Number.isFinite(duration) && duration > 0 ? duration / (buildCount + 1) : 6;

    const timer = setTimeout(
      () => {
        if (atEnd) {
          setAutoplay(false);
          setToast("Autoplay finished");
        } else {
          advance(1);
        }
      },
      atEnd ? 0 : seconds * 1000,
    );

    return () => clearTimeout(timer);
  }, [autoplay, presenting, pos, step, buildCount, current.duration, deck.duration, neighbour, advance]);

  useEffect(() => {
    document.title = deck.title;
    // Read by npm run verify's facts check.
    document.documentElement.dataset.facts = deck.facts ?? "warn";
  }, [deck.title, deck.facts]);

  useEffect(() => {
    const hash = `#${pos.index + 1}${step ? `.${step}` : ""}`;
    history.replaceState(null, "", hash);
    presenter.current?.postMessage({ type: "slides:state", position: { index: pos.index, step }, display } satisfies Message, postTarget());
  }, [pos.index, step, display]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const t = setTimeout(() => setToast(null), 1600);

    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onHashChange = () => {
      const position = positionFromHash(count);
      goto(position.index, position.step);
    };

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
        presenter.current.postMessage(
          { type: "slides:state", position: { index: pos.index, step }, display } satisfies Message,
          postTarget(),
        );
      } else if (m.type === "slides:nav") {
        nav(m.dir);
      }
    };

    window.addEventListener("message", onMessage);

    return () => window.removeEventListener("message", onMessage);
  }, [pos.index, step, display, nav]);

  useStagePointer(stage, presenting, nav);

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

      if (e.repeat && (["Enter", "Home", "End", "a"].includes(key) || /^[0-9]$/u.test(key))) {
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

          if (!e.repeat) {
            nav(1);
          }

          break;
        }
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp": {
          e.preventDefault();

          if (!e.repeat) {
            nav(-1);
          }

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
        case "a": {
          setAutoplay(!autoplay);
          setToast(autoplay ? "Autoplay paused" : "Autoplay on");
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
          setAutoplay(false);
          setMode("overview");
          break;
        }
        case "p": {
          setAutoplay(false);
          setMode("print");
          break;
        }
        case "b":
        case ".": {
          setAutoplay(false);
          setBlank((b) => !b);
          break;
        }
        case "?": {
          setAutoplay(false);
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
  }, [mode, help, blank, display, nav, goto, neighbour, count, extraKeys, autoplay]);

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
      step,
      count,
      slides: slideInfo,
      nav,
      goto: jump,
    }),
    [pos.index, step, count, slideInfo, nav, jump],
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

  const scale = fitScale(width, height);
  const { progress } = slideLabel(slides, pos.index);

  return provide(
    <>
      <div
        data-deck={name}
        data-deck-mode="present"
        className="fixed inset-0 grid touch-pan-y touch-pinch-zoom place-items-center overflow-hidden bg-black"
        ref={stage}
      >
        <Stage scale={scale} number={slideNumber(slides, pos.index)}>
          <StepContext.Provider value={{ step: pos.step, played, register }}>
            <div
              key={pos.index}
              {...slideTags(current, pos.index)}
              data-build={step}
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
      <MorphProbe ref={peek} slides={slides} />
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

import { useEffect, useRef } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { usePlaying, useStatic } from "./context.ts";
import type { Effect } from "./motion.tsx";

/**
 * One moment in a step's timeline: plays `effect` `at` seconds after the step arrives (inside a
 * `<Build>`), or after the slide arrives (anywhere else). Without `at`, it lands one `--beat-gap`
 * (a theme token, 1.5 s by default) in: the headline after the picture. Only a step forward plays it;
 * Back, a jump, a reload, the overview, print and reduced motion show it settled, and the next
 * press of → settles it at once.
 */
export function Beat({
  at,
  effect = "rise",
  as: Tag = "div",
  className = "",
  style,
  children,
}: {
  /** Seconds after the step arrives. */
  at?: number;
  effect?: Effect;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const playing = usePlaying();

  return (
    <Tag
      className={`${playing ? effect : ""} ${className}`}
      style={playing ? { ...style, "--d": at === undefined ? "var(--beat-gap)" : `${at}s` } : style}
    >
      {children}
    </Tag>
  );
}

/** How SplitText brings its words or letters in. */
export type SplitEffect = "mask" | "blur" | "type" | "scale";

/**
 * Text that arrives a word or a letter at a time, `at` seconds into its step (or the slide's
 * entrance). `mask` rises each piece out of a clip, `blur` brings it into focus, `type` types it,
 * `scale` grows it. Pieces follow one another by `--stagger` (a word) or a third of it (a letter).
 * Screen readers get the whole text once; the pieces stay real, selectable text, and print and the
 * overview show it set.
 */
export function SplitText({
  children: text,
  effect = "mask",
  by = effect === "type" ? "letter" : "word",
  at = 0,
  as: Tag = "span",
  className = "",
  style,
}: {
  children: string;
  effect?: SplitEffect;
  by?: "word" | "letter";
  at?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const playing = usePlaying();
  const per = by === "word" ? "var(--stagger)" : "var(--stagger) / 3";
  const words = text.split(/\s+/u).filter(Boolean);

  // Letters as the reader sees them: an accent or an emoji stays one piece.
  const letters = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const pieces = words.map((word) => (by === "word" ? [word] : Array.from(letters.segment(word), ({ segment }) => segment)));
  const firsts = pieces.map((_, w) => pieces.slice(0, w).reduce((sum, p) => sum + p.length, 0));

  return (
    <Tag className={`split ${className}`} style={style}>
      <span className="split-copy">{text}</span>
      <span aria-hidden="true">
        {pieces.map((parts, w) => (
          <span key={w}>
            {w > 0 && " "}
            <span className="split-word">
              {parts.map((part, i) => (
                <span
                  key={i}
                  className={playing ? `split-piece split-${effect}` : "split-piece"}
                  style={playing ? { "--d": `calc(${at}s + ${firsts[w] + i} * ${per})` } : undefined}
                >
                  {part}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** What keeps a held picture alive. */
export type AmbientEffect = "drift" | "creep" | "parallax";

// A creep is the photo zoom the kit already has.
const moverClass = (effect: AmbientEffect) => (effect === "creep" ? "kenburns" : `ambient-${effect}`);

/**
 * Slow motion under a hold, for a background or a photo, never for text people read: `drift`
 * wanders a few pixels, `creep` zooms in very slowly, `parallax` leans away from the pointer
 * (`depth` pixels at most). It fills and clips to its own box. Off in reduced motion, the overview and print.
 */
export function Ambient({
  effect = "drift",
  depth = 16,
  as: Tag = "div",
  className = "",
  style,
  children,
}: {
  effect?: AmbientEffect;
  depth?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const still = useStatic();
  const mover = useRef<HTMLDivElement>(null);
  const parallax = effect === "parallax" && !still;

  useEffect(() => {
    const el = mover.current;

    if (!parallax || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      });
    };

    window.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [parallax]);

  return (
    <Tag className={`ambient ${className}`} style={style}>
      <div ref={mover} className={still ? "" : moverClass(effect)} style={effect === "parallax" ? { "--depth": `${depth}px` } : undefined}>
        {children}
      </div>
    </Tag>
  );
}

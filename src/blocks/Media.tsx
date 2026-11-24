import { useEffect, useRef, useState, type ReactNode } from "react";
import { Reveal, useStatic } from "@core";

/**
 * A video, inlined into the deck file like any imported asset (`import clip from "./clip.mp4"`).
 * It plays muted and loops while the slide is shown; thumbnails and print show its first frame.
 * Base64 makes a file a third bigger, so keep clips short and compressed (a few MB at most).
 */
export function Video({
  src,
  caption,
  fit = "cover",
  height = 620,
  start = 200,
}: {
  src: string;
  caption?: ReactNode;
  fit?: "cover" | "contain";
  height?: number;
  start?: number;
}) {
  const still = useStatic();
  return (
    <Reveal as="figure" delay={start} className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-box bg-surface" style={{ height }}>
        <video
          src={src}
          className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
          autoPlay={!still}
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>
      {caption && <figcaption className="type-label text-ink-2">{caption}</figcaption>}
    </Reveal>
  );
}

/** A sound clip with a play button, inlined into the deck file (`import chime from "./chime.mp3"`). */
export function Audio({ src, label, start = 200 }: { src: string; label: ReactNode; start?: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const a = ref.current;
    if (!a) {
      return;
    }
    const stop = () => setPlaying(false);
    a.addEventListener("ended", stop);
    a.addEventListener("pause", stop);
    return () => {
      a.removeEventListener("ended", stop);
      a.removeEventListener("pause", stop);
    };
  }, []);
  return (
    <Reveal delay={start} className="inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // don't advance the slide
          const a = ref.current;
          if (!a) {
            return;
          }
          if (a.paused) {
            void a.play().then(() => setPlaying(true));
          } else {
            a.pause();
          }
        }}
        className="rule-top-strong flex cursor-pointer items-center gap-6 rounded-box bg-surface px-(--pad-box) py-6 text-left"
      >
        <span className="grid size-16 place-items-center rounded-full bg-accent text-on-accent">
          {playing ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <rect x="3" y="2" width="6" height="18" />
              <rect x="13" y="2" width="6" height="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <path d="M5 2 L20 11 L5 20 Z" />
            </svg>
          )}
        </span>
        <span className="type-body">{label}</span>
      </button>
      <audio ref={ref} src={src} preload="auto" />
    </Reveal>
  );
}

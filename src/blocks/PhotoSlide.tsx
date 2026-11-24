import type { ReactNode } from "react";
import { Logo } from "./Logo.tsx";
import { Reveal, delay, loop } from "@core";

/**
 * A full-bleed photo under a dark gradient, with content laid over the dark side.
 */
export function PhotoSlide({
  src,
  alt,
  children,
  side = "left",
  position = "center",
  drift = false,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  /** Which side the gradient darkens and the content sits on. */
  side?: "left" | "bottom";
  /** CSS object-position for the photo. */
  position?: string;
  /** A slow zoom after the entrance. Off by default: use it on a photo the slide is about, not behind text people read. */
  drift?: boolean;
}) {
  const gradient =
    side === "left" ? "bg-gradient-to-r from-black/85 via-black/60 to-black/0" : "bg-gradient-to-t from-black/85 via-black/50 to-black/0";
  return (
    <section className="relative h-full overflow-hidden bg-black text-white">
      <div className="fade absolute inset-0" style={delay(0)}>
        <img
          src={src}
          alt={alt}
          className={`${drift ? "kenburns " : ""}h-full w-full object-cover`}
          style={drift ? { objectPosition: position, ...loop(1200, 26) } : { objectPosition: position }}
        />
      </div>
      <div className={`absolute inset-0 ${gradient}`} />
      <div className={`relative flex h-full flex-col px-30 py-24 ${side === "left" ? "max-w-[1100px] justify-center" : "justify-end"}`}>
        {children}
      </div>
    </section>
  );
}

/** Kicker, title and optional subtitle, sized for text laid over a photo. */
export function PhotoCaption({ kicker, title, subtitle }: { kicker?: ReactNode; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <>
      {kicker && (
        <Reveal effect="fade" delay={300} className="type-label text-white/80">
          {kicker}
        </Reveal>
      )}
      <Reveal delay={450} as="h2" className="type-title mt-6 max-w-[18ch] text-[calc(var(--text-title)*1.35)]">
        {title}
      </Reveal>
      {subtitle && (
        <Reveal delay={600} className="mt-8 max-w-[36ch] text-4xl leading-snug text-white/75">
          {subtitle}
        </Reveal>
      )}
    </>
  );
}

/** Text and stats on the canvas beside a photo that fills the other half. */
export function PhotoSplit({
  src,
  alt,
  section,
  title,
  children,
  photoWidth = "48%",
  position = "center",
  drift = false,
}: {
  src: string;
  alt: string;
  section?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  photoWidth?: string;
  position?: string;
  /** A slow zoom after the entrance. Off by default: use it on a photo the slide is about, not behind text people read. */
  drift?: boolean;
}) {
  return (
    <section className="relative flex h-full overflow-hidden bg-canvas text-ink">
      <div className="flex flex-1 flex-col px-30 pt-24 pb-28">
        <header className="flex items-center justify-between">
          <Reveal effect="fade" className="type-label text-ink-2">
            {section}
          </Reveal>
          <Logo className="h-14" />
        </header>
        <Reveal delay={80} as="h2" className="type-title mt-10">
          {title}
        </Reveal>
        <div className="mt-auto">{children}</div>
      </div>
      <div className="fade relative shrink-0 overflow-hidden" style={{ width: photoWidth, ...delay(200) }}>
        <img
          src={src}
          alt={alt}
          className={`${drift ? "kenburns " : ""}h-full w-full object-cover`}
          style={drift ? { objectPosition: position, ...loop(1500, 26) } : { objectPosition: position }}
        />
      </div>
    </section>
  );
}

/** An image with a caption, for inside a Frame or a Columns cell. */
export function Figure({
  src,
  alt,
  caption,
  fit = "cover",
  height = 620,
  start = 200,
}: {
  src: string;
  alt: string;
  caption?: ReactNode;
  fit?: "cover" | "contain";
  height?: number;
  start?: number;
}) {
  return (
    <Reveal as="figure" delay={start} className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-box bg-surface" style={{ height }}>
        <img src={src} alt={alt} className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} />
      </div>
      {caption && <figcaption className="type-label text-ink-2">{caption}</figcaption>}
    </Reveal>
  );
}

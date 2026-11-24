// Whole-slide layouts. Each fills the 1920×1080 stage; put content blocks inside Frame.
// Sizes, fonts and colours all come from the theme's tokens (src/themes/default/tokens.css).
// A layout of your own is a block built from the same pieces: Slide, SlideHeader, Footer, Kicker, Logo.
import type { ReactNode } from "react";
import { Reveal, useDeck, useSlideNumber } from "@core";
import { Logo } from "./Logo.tsx";

/**
 * The shell every whole-slide layout starts from: fills the stage with the theme's slide padding,
 * as a column. `inverted` uses the theme's other scheme. Lay out the inside with `className`.
 */
export function Slide({ children, inverted = false, className = "" }: { children?: ReactNode; inverted?: boolean; className?: string }) {
  return (
    <section className={`slide-pad flex h-full flex-col ${inverted ? "inverted" : "bg-canvas text-ink"} ${className}`}>{children}</section>
  );
}

/** A small label with an accent bar before it: the section name above a slide title. */
export function Kicker({ children, start = 0, className = "" }: { children: ReactNode; start?: number; className?: string }) {
  return (
    <Reveal effect="fade" delay={start} className={`type-label flex items-center text-ink-2 ${className}`}>
      <span className="mr-5 inline-block h-(--rule-strong) w-11 shrink-0 bg-accent" />
      {children}
    </Reveal>
  );
}

/** The top row of a slide: kicker on the left, `aside` or the logo on the right. */
export function SlideHeader({ kicker, aside }: { kicker?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex min-h-[30px] items-center justify-between">
      {kicker ? <Kicker>{kicker}</Kicker> : <span />}
      {aside === undefined ? <Logo className="h-10" /> : <div className="type-label text-ink-2">{aside}</div>}
    </header>
  );
}

/** The bottom row of a slide: the deck's footer text (or `note`) on the left, the slide number on the right. */
export function Footer({ note }: { note?: ReactNode }) {
  const { footer, title } = useDeck();
  const number = useSlideNumber();
  const left = note ?? (footer === false ? null : (footer ?? title));
  return (
    <footer className="type-label flex min-h-[30px] items-center justify-between text-ink-2">
      <span>{left}</span>
      <span className="tabular-nums">{number}</span>
    </footer>
  );
}

/** Opening slide: a big title anchored to the bottom, a subtitle, and byline and date under a strong rule. */
export function TitleSlide({
  kicker,
  aside,
  title,
  subtitle,
  byline,
  date,
  inverted = false,
}: {
  kicker?: ReactNode;
  /** Top right, e.g. "Track B · 14:30". The logo shows there when this is left out. */
  aside?: ReactNode;
  /** End it with <em>.</em> to set the full stop in the accent. */
  title: ReactNode;
  subtitle?: ReactNode;
  byline?: ReactNode;
  date?: ReactNode;
  inverted?: boolean;
}) {
  return (
    <Slide inverted={inverted} className="relative overflow-hidden">
      <SlideHeader kicker={kicker} aside={aside} />
      <Reveal delay={120} as="h1" className="type-display mt-auto max-w-[14ch]">
        {title}
      </Reveal>
      {subtitle && (
        <Reveal delay={260} className="type-lead mt-11 max-w-[30ch] text-ink-2">
          {subtitle}
        </Reveal>
      )}
      <Reveal effect="fade" delay={420} className="type-label rule-top-strong mt-16 flex justify-between pt-6 text-ink-2">
        <span>{byline}</span>
        <span>{date}</span>
      </Reveal>
    </Slide>
  );
}

/**
 * The space under a slide's title: it takes the height left between the header and the footer.
 * Use it in a layout of your own: `npm run verify` checks that what is inside fits (data-frame-body).
 */
export function FrameBody({
  children,
  align = "center",
  className = "",
}: {
  children?: ReactNode;
  /** Where the content sits in the space. */
  align?: "center" | "top";
  className?: string;
}) {
  return (
    <div
      data-frame-body=""
      className={`relative mt-(--gap-title) mb-12 flex min-h-0 flex-1 flex-col ${align === "center" ? "justify-center-safe" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The standard slide: kicker and logo on top, a title that states the point, the body, and a
 * footer with the slide number. Put any content block inside. `inverted` uses the theme's other
 * scheme (a dark slide in a light deck, and back).
 */
export function Frame({
  section,
  title,
  children,
  inverted = false,
  aside,
  footer,
  align = "center",
  className = "",
  density = "normal",
}: {
  /** The kicker above the title. */
  section?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  inverted?: boolean;
  /** Top right instead of the logo. */
  aside?: ReactNode;
  /** Bottom left instead of the deck's footer, e.g. the source of a chart. */
  footer?: ReactNode;
  /** Where the body sits in the space under the title. */
  align?: "center" | "top";
  /** Extra classes on the slide itself, e.g. a team utility from src/library/styles.css. */
  className?: string;
  /** "compact" steps body text, padding and gaps down a notch, for a dense slide (the `.compact` class). */
  density?: "normal" | "compact";
}) {
  return (
    <Slide inverted={inverted} className={`${density === "compact" ? "compact" : ""} ${className}`}>
      <SlideHeader kicker={section} aside={aside} />
      {title && (
        <Reveal delay={80} as="h2" className="type-title mt-9 max-w-(--measure)">
          {title}
        </Reveal>
      )}
      <FrameBody align={align}>{children}</FrameBody>
      <Footer note={footer} />
    </Slide>
  );
}

/**
 * Section divider, on the inverted scheme. Give `number` and `of` (2 and 5) for a "02 / 05" label
 * and a row of progress ticks, one per section.
 */
export function SectionSlide({
  number,
  of,
  title,
  subtitle,
  children,
  inverted = true,
}: {
  number?: number | ReactNode;
  of?: number;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Shown under the subtitle, e.g. a row of stats. */
  children?: ReactNode;
  inverted?: boolean;
}) {
  const label = typeof number === "number" ? [number, of].flatMap((n) => (n ? [String(n).padStart(2, "0")] : [])).join(" / ") : number;
  return (
    <Slide inverted={inverted} className="relative justify-end overflow-hidden pb-24">
      {label && (
        <Reveal effect="fade" className="type-label text-[30px] text-accent-text">
          {label}
        </Reveal>
      )}
      <Reveal delay={120} as="h2" className="type-section mt-7 max-w-[1500px]">
        {title}
      </Reveal>
      {subtitle && (
        <Reveal delay={260} className="type-lead mt-10 max-w-[32ch] text-ink-2">
          {subtitle}
        </Reveal>
      )}
      {children && <div className="mt-16">{children}</div>}
      {typeof number === "number" && of ? (
        <Reveal effect="fade" delay={400} className="mt-20 flex gap-3">
          {Array.from({ length: of }, (_, i) => (
            <i key={i} className={`h-(--rule-strong) flex-1 ${i + 1 === number ? "bg-accent" : "bg-rule"}`} />
          ))}
        </Reveal>
      ) : null}
    </Slide>
  );
}

/** One sentence, vertically centred. Wrap one phrase in <em> to emphasise it the theme's way. */
export function StatementSlide({ children, kicker, inverted = false }: { children: ReactNode; kicker?: ReactNode; inverted?: boolean }) {
  return (
    <Slide inverted={inverted}>
      <SlideHeader kicker={kicker} />
      <div className="flex flex-1 items-center">
        <Reveal delay={100} as="p" className="type-statement max-w-[20ch]">
          {children}
        </Reveal>
      </div>
      <Footer />
    </Slide>
  );
}

/** A pull quote with its opening mark hanging in the margin, and an attribution under it. */
export function QuoteSlide({
  children,
  author,
  role,
  kicker,
  inverted = false,
}: {
  children: ReactNode;
  author: ReactNode;
  role?: ReactNode;
  kicker?: ReactNode;
  inverted?: boolean;
}) {
  return (
    <Slide inverted={inverted}>
      <SlideHeader kicker={kicker} />
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={120} as="blockquote" className="type-quote relative max-w-[22ch]">
          <span className="absolute -translate-x-full pr-[0.04em] text-accent-text">“</span>
          {children}”
        </Reveal>
        <Reveal delay={320} className="type-small mt-14 flex items-center gap-6">
          <span className="h-(--rule-strong) w-18 bg-accent" />
          <span className="weight-strong">{author}</span>
          {role && <span className="text-ink-2">{role}</span>}
        </Reveal>
      </div>
      <Footer />
    </Slide>
  );
}

/** Closing slide, built like a section: a short line, a subtitle, and links under a strong rule. */
export function EndSlide({
  title = "Thank you",
  subtitle,
  links,
  inverted = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  links?: Array<ReactNode>;
  inverted?: boolean;
}) {
  return (
    <Slide inverted={inverted} className="relative justify-end overflow-hidden pb-24">
      <div className="absolute top-(--slide-pad-top) right-(--slide-pad-x)">
        <Logo className="h-10" />
      </div>
      <Reveal as="h2" className="type-section max-w-[1500px]">
        {title}
      </Reveal>
      {subtitle && (
        <Reveal delay={160} className="type-lead mt-10 max-w-[36ch] text-ink-2">
          {subtitle}
        </Reveal>
      )}
      {links && (
        <Reveal effect="fade" delay={320} className="type-label rule-top-strong mt-16 flex flex-wrap gap-x-16 gap-y-4 pt-6 text-ink-2">
          {links.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </Reveal>
      )}
    </Slide>
  );
}

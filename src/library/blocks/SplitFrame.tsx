// src/library/blocks/SplitFrame.tsx: a layout of the team's own. A layout is a block that fills the
// slide, built from the pieces Frame is made of (see docs/making-a-block.md, "Make your own layout").
import type { ReactNode } from "react";
import { Reveal } from "@core";
import { Footer, Slide, SlideHeader } from "@blocks";

/** A slide with a fixed panel down the right side, on the theme's other scheme: the point on the left, the evidence on the right. */
export function SplitFrame({
  section,
  title,
  children,
  side,
  badge,
}: {
  section?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** What the side panel shows, e.g. a Stat. */
  side: ReactNode;
  /** A small label on top of the side panel. */
  badge?: ReactNode;
}) {
  return (
    <Slide className="grid grid-cols-[1fr_640px] gap-(--gap-column)">
      <div className="flex min-h-0 flex-col">
        <SlideHeader kicker={section} aside={null} />
        <Reveal delay={80} as="h2" className="type-title mt-9 max-w-(--measure)">
          {title}
        </Reveal>
        <div className="mt-(--gap-title) mb-12 flex min-h-0 flex-1 flex-col justify-center">{children}</div>
        <Footer />
      </div>
      <aside className="inverted -mt-(--slide-pad-top) -mr-(--slide-pad-x) -mb-(--slide-pad-bottom) flex flex-col justify-center p-(--pad-box)">
        {/* "swoop" is the team's own entrance effect (src/library/motion/swoop.css). */}
        <Reveal effect="swoop" delay={300} className="flex flex-col gap-(--gap-item)">
          {badge && <span className="team-badge self-start">{badge}</span>}
          {side}
        </Reveal>
      </aside>
    </Slide>
  );
}

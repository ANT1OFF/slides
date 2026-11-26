// Every building block, once. This deck is the visual test: if a block changes, look here.
// Each slide's `id` is the block it shows, so you can find it in the overview (G).
// In `npm run dev`, add &theme=editorial (or signal, acme) and &scheme=dark to the URL to see
// every block in another theme.
import { Ambient, Beat, Build, Fact, Morph, Reveal, SplitText, asOf, slide } from "@core";
import type { DataFile, DeckDefinition } from "@core";
import {
  Agenda,
  Arrow,
  Audio,
  BarSeries,
  Bullets,
  Callout,
  Cards,
  Code,
  Columns,
  Compare,
  Cycle,
  DotGrid,
  EndSlide,
  Figure,
  Flow,
  Frame,
  HBars,
  Lead,
  LineChart,
  Node,
  PhotoCaption,
  PhotoSlide,
  PhotoSplit,
  Pie,
  Pipeline,
  Quote,
  QuoteSlide,
  SectionSlide,
  Spectrum,
  StackedArea,
  StackedBar,
  Stat,
  StatRow,
  StatementSlide,
  Table,
  Timeline,
  TitleSlide,
  Video,
} from "@blocks";
import { Backdrop } from "@blocks/backdrop";
import dusk from "./assets/dusk.svg";
import morning from "./assets/morning.svg";
import chime from "./assets/chime.wav";
import loop from "./assets/loop.webm";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SECTIONS = 6;

// A deck imports this from a *.data.json file next to it; it is inline here because the showcase's numbers are made up.
const reliability: DataFile<{ deploys: number; rollbacks: number; minutes: number }> = {
  source: "manual",
  how: "Ask the platform team for last quarter's deploy count, rollback rate and median merge-to-production time.",
  updated: "2026-10-01",
  values: { deploys: 18_400, rollbacks: 0.037, minutes: 11 },
};

const deck: DeckDefinition = {
  title: "Building blocks",
  footer: "Showcase · every block",
  // Every slide fades in; the section dividers push instead, the Motion slide zooms, and the six
  // slides after the Morph pair each arrive with one of the other built-in transitions.
  transition: "fade",
  // The showcase's numbers are made up, so the facts check in npm run verify skips it (see the Fact slide).
  facts: "off",
  slides: [
    slide(
      <TitleSlide
        kicker="Showcase"
        aside="src/decks/showcase"
        title={
          <>
            Every building block, once<em>.</em>
          </>
        }
        subtitle="Press → to step through, G for the overview, ? for every key."
        byline="slides"
        date="Visual test"
      />,
      { id: "TitleSlide", notes: "This is the presenter window. Notes are plain strings on slide().\n\nR resets the timer." },
    ),

    slide(
      <Frame section="Agenda" title="What's in the box">
        <Agenda items={["Slides", "Text and code", "Layout", "Numbers", "Diagrams", "Charts"]} active={1} />
      </Frame>,
      { id: "Agenda" },
    ),

    // ── Slides ────────────────────────────────────────────────────────────────
    slide(<SectionSlide number={1} of={SECTIONS} title="Slides" subtitle="Whole-slide layouts: title, section, statement, quote, end." />, {
      id: "SectionSlide",
      transition: "push",
    }),
    slide(
      <StatementSlide kicker="StatementSlide">
        One idea per slide. <em>Make it big.</em>
      </StatementSlide>,
      { id: "StatementSlide" },
    ),
    slide(
      <QuoteSlide kicker="QuoteSlide" author="A. Speaker" role="who prefers fewer words">
        If you can say it in a sentence, don&apos;t use a slide of bullets.
      </QuoteSlide>,
      { id: "QuoteSlide" },
    ),
    slide(
      <Frame
        section="Frame"
        title="The standard slide: a kicker, a title that states the point, and a body"
        footer="Footer: the deck's footer, or a note such as a source"
      >
        <Lead detail="Put any block inside, or plain JSX with Tailwind classes. The footer shows the slide number.">
          Frame is the slide you will use most.
        </Lead>
      </Frame>,
      { id: "Frame" },
    ),
    slide(
      <Frame section="Frame inverted" title="The same slide on the theme's other scheme" inverted>
        <Bullets
          marker="square"
          items={["Every block draws with theme tokens", "Inverting a slide switches every token", "No dark variants to maintain"]}
        />
      </Frame>,
      { id: "Frame-inverted" },
    ),

    // ── Text ──────────────────────────────────────────────────────────────────
    slide(<SectionSlide number={2} of={SECTIONS} title="Text and code" />, { id: "section-text", transition: "push" }),
    slide(
      <Frame section="Bullets" title="Rows that build, one press at a time">
        <Bullets
          build
          items={[
            { title: "Cut every change to a day or less", detail: "If it can't merge by tomorrow, it's two changes." },
            { title: "Release behind a flag", detail: "Shipping and launching become separate decisions." },
            { title: "Review within the hour", detail: "A small diff is read properly. A large one is skimmed." },
          ]}
        />
      </Frame>,
      { id: "Bullets", notes: "Three builds on this slide. → reveals each row; ← takes them back." },
    ),
    slide(
      <Frame section="Callout · Quote" title="Callouts for the one thing to remember">
        <Columns>
          <div className="flex flex-col gap-(--gap-item)">
            <Callout title="Tip">Keep body text large: it has to read from the back of the room.</Callout>
            <Callout title="Watch out" tone="accent-3" start={450}>
              The HTML file contains everything, hidden slides included.
            </Callout>
          </div>
          <Quote source="Quote, for inside a Frame" start={600}>
            Simplicity is about subtracting the obvious and adding the meaningful.
          </Quote>
        </Columns>
      </Frame>,
      { id: "Callout" },
    ),
    slide(
      <Frame section="Code" title="Code, with line highlights that step">
        <Code title="src/decks/my-talk/index.tsx" highlight="1-2|3-5|6|all">{`
          import { slide, type DeckDefinition } from "@core";
          import { Frame, TitleSlide } from "@blocks";
          const deck: DeckDefinition = {
            title: "My talk",
            theme: "editorial", // a folder in src/themes
            slides: [<TitleSlide title="Hi" />, slide(<Frame title="Two" />)],
          };
          export default deck;
        `}</Code>
      </Frame>,
      { id: "Code", notes: 'Each | in highlight="1-2|3-5|6|all" is one press of →.' },
    ),

    // ── Layout ────────────────────────────────────────────────────────────────
    slide(<SectionSlide number={3} of={SECTIONS} title="Layout" />, { id: "section-layout", transition: "push" }),
    slide(
      <Frame section="Columns · Lead · Figure" title="Text beside an image">
        <Columns ratio={[5, 6]}>
          <Lead detail="Columns take any children. Lead is the text side: a lead sentence, then quieter detail.">
            The left column is five elevenths wide.
          </Lead>
          <Figure src={morning} alt="An illustrated green valley at sunrise" caption="Figure: an image with a caption" height={560} />
        </Columns>
      </Frame>,
      { id: "Columns" },
    ),
    slide(
      <Frame section="Cards" title="Cards for features, people or options">
        <Cards
          build
          items={[
            { icon: "01", title: "One file", body: "Fonts, images and code inlined. Works offline.", meta: "build" },
            { icon: "02", title: "Real code", body: "Decks are React components, reviewed like code.", meta: "author" },
            { icon: "03", title: "Themeable", body: "A theme is a folder of tokens, fonts and a logo.", meta: "brand" },
          ]}
        />
      </Frame>,
      { id: "Cards" },
    ),
    slide(
      <Frame section="Compare" title="Before and after">
        <Compare
          sides={[
            { title: "Before", items: ["Slides in a binary file", "Copy-paste between decks", "Brand drift"] },
            {
              title: "After",
              items: ["Slides in git, reviewed like code", "Shared blocks, one fix everywhere", "One theme folder"],
              highlight: true,
            },
          ]}
        />
      </Frame>,
      { id: "Compare" },
    ),
    slide(
      <Frame section="Table" title="Tables right-align their numbers">
        <Table
          columns={["Plan", "Seats", "Price", "Change"]}
          rows={[
            ["Starter", 5, "$0", "—"],
            ["Team", 25, "$12", "+8%"],
            ["Business", 100, "$29", "+14%"],
            ["Enterprise", "Unlimited", "Custom", "+21%"],
          ]}
          numeric={[1, 2, 3]}
          highlight={2}
          build
        />
      </Frame>,
      { id: "Table" },
    ),

    // ── Numbers ───────────────────────────────────────────────────────────────
    slide(<SectionSlide number={4} of={SECTIONS} title="Numbers" subtitle="Press M to switch between raw numbers and growth." />, {
      id: "section-numbers",
      transition: "push",
    }),
    slide(
      <Frame section="Stat" title="One hero number per slide">
        <Stat
          to={11}
          suffix=" min"
          label="from merge to production, at the median"
          relative={{ to: 81, suffix: "%", label: "faster than last year" }}
        />
      </Frame>,
      { id: "Stat" },
    ),
    slide(
      <Frame section="StatRow" title="Supporting numbers stay in ink">
        <StatRow
          stats={[
            { to: 4.2, suffix: "×", label: "more releases per week" },
            { to: 63, prefix: "−", suffix: "%", label: "fewer rollbacks" },
            { to: 92, suffix: "%", label: "of changes under 200 lines" },
          ]}
        />
      </Frame>,
      { id: "StatRow" },
    ),
    slide(
      <Frame
        section="Fact"
        title={
          <>
            <Fact of={reliability.values.deploys} format="compact" /> deploys,{" "}
            <Fact of={reliability.values.rollbacks} format="percent" digits={1} /> rolled back
          </>
        }
        footer={asOf(reliability, "deploy log")}
      >
        <Columns ratio={[1, 1]} align="center">
          <Stat
            size="sm"
            of={reliability.values.minutes}
            suffix=" min"
            label="from merge to production; Stat of reads data, Stat to is typed in"
          />
          <Lead detail="The headline, the Stat and the footer read one data file. A <Fact> marks its number for the facts check in npm run verify.">
            <Fact of={reliability.values.deploys} count /> deploys last quarter.
          </Lead>
        </Columns>
      </Frame>,
      { id: "Fact", notes: "Fact and Stat of read the data file; asOf puts its date and source in the footer." },
    ),

    // ── Diagrams ──────────────────────────────────────────────────────────────
    slide(<SectionSlide number={5} of={SECTIONS} title="Diagrams" />, { id: "section-diagrams", transition: "push" }),
    slide(
      <Frame section="Flow" title="Boxes and arrows">
        <Flow
          nodes={[
            { title: "Write", sub: "a deck in TSX", strong: true },
            { title: "Preview", sub: "npm run dev" },
            { title: "Build", sub: "npm run build" },
            { title: "Present", sub: "one HTML file", strong: true },
          ]}
        />
      </Frame>,
      { id: "Flow" },
    ),
    slide(
      <Frame section="Node · Arrow" title="Or draw your own SVG with the pieces">
        <svg width={1680} height={520} className="overflow-visible">
          <Arrow from={[420, 260]} to={[700, 120]} start={400} travel={{ begin: 2, dur: 2.6 }} />
          <Arrow from={[420, 260]} to={[700, 400]} start={500} travel={{ begin: 2.6, dur: 2.6 }} />
          <Arrow from={[1060, 120]} to={[1300, 260]} start={700} />
          <Arrow from={[1060, 400]} to={[1300, 260]} start={800} />
          <Node x={240} y={260} w={340} h={160} title="Request" sub="from a browser" strong />
          <Node x={880} y={120} w={340} h={160} title="Cache" sub="hit: 92%" start={200} />
          <Node x={880} y={400} w={340} h={160} title="Origin" sub="miss: 8%" start={300} />
          <Node x={1480} y={260} w={340} h={160} title="Response" sub="p95 under 80 ms" strong start={400} />
        </svg>
      </Frame>,
      { id: "Node" },
    ),
    slide(
      <Frame section="Pipeline" title="A process, step by step">
        <Pipeline
          build
          steps={[
            { title: "Draft", detail: "Write the story first", edge: "outline" },
            { title: "Build", detail: "Pick blocks for each point", edge: "slides" },
            { title: "Rehearse", detail: "Presenter view, timer on", edge: "notes" },
            { title: "Ship", detail: "One file, sent anywhere" },
          ]}
        />
      </Frame>,
      { id: "Pipeline" },
    ),
    slide(
      <Frame section="Cycle" title="A loop that never ends">
        <Columns ratio={[1, 1]}>
          <Cycle
            nodes={[
              { title: "Plan", sub: "what to try" },
              { title: "Build", sub: "a small version" },
              { title: "Measure", sub: "what happened" },
              { title: "Learn", sub: "keep or drop" },
            ]}
          />
          <Lead detail="Arrowheads show the direction, even in print. A dot circles forever and each card glows as it passes. Loops belong on diagrams like this, not on content slides.">
            Cards on an ellipse.
          </Lead>
        </Columns>
      </Frame>,
      { id: "Cycle" },
    ),
    slide(
      <Frame section="Timeline" title="Where we are, and what's next">
        <Timeline
          items={[
            { when: "Q1", title: "Prototype", detail: "Five design partners", done: true },
            { when: "Q2", title: "Beta", detail: "Open sign-ups", done: true },
            { when: "Q3", title: "Launch", detail: "Pricing and billing" },
            { when: "Q4", title: "Scale", detail: "Second region" },
          ]}
        />
      </Frame>,
      { id: "Timeline" },
    ),
    slide(
      <Frame section="Spectrum" title="A range, with tiers along it">
        <Spectrum
          left="Manual"
          right="Automatic"
          build
          tiers={[
            { name: "Assist", rule: "Suggests; a person decides" },
            { name: "Review", rule: "Acts; a person checks" },
            { name: "Notify", rule: "Acts, then reports" },
            { name: "Autonomous", rule: "Acts on its own" },
          ]}
          floor="Every tier keeps an audit log"
        />
      </Frame>,
      { id: "Spectrum" },
    ),

    // ── Charts ────────────────────────────────────────────────────────────────
    slide(
      <SectionSlide
        number={6}
        of={SECTIONS}
        title="Charts"
        subtitle="One series: muted bars and one key bar. Several: the theme's chart colours, in order."
      />,
      {
        id: "section-charts",
        transition: "push",
      },
    ),
    slide(
      <Frame section="BarSeries" title="Signups grew every month" footer="Source: invented data">
        <BarSeries
          data={months.map((label, i) => ({ label, value: Math.round(400 + i * 180 + Math.sin(i) * 120) }))}
          max={2800}
          ticks={[0, 700, 1400, 2100, 2800]}
          axisLabelEvery={1}
          unit="signups"
          relativeTo={{ base: "first", label: "January" }}
        />
      </Frame>,
      { id: "BarSeries", notes: "Hover a bar for its value. M redraws the bars as multiples of January." },
    ),
    slide(
      <Frame section="HBars" title="Search brings the most visitors">
        <HBars
          rows={[
            { label: "Search", value: 412 },
            { label: "Referral", value: 298 },
            { label: "Social", value: 187 },
            { label: "Newsletter", value: 121 },
            { label: "Events", value: 64 },
          ]}
        />
      </Frame>,
      { id: "HBars" },
    ),
    slide(
      <Frame section="LineChart" title="Product A passes its target in October">
        <LineChart
          x={months}
          series={[
            { name: "Product A", values: [12, 15, 19, 22, 28, 31, 36, 40, 47, 52, 58, 63] },
            { name: "Product B", values: [30, 31, 30, 33, 34, 33, 35, 36, 36, 38, 39, 40] },
          ]}
          max={80}
          ticks={[0, 20, 40, 60, 80]}
          reference={{ value: 60, label: "Target" }}
          markers={[{ index: 8, label: "Today" }]}
          estimateFrom={8}
        />
      </Frame>,
      { id: "LineChart" },
    ),
    slide(
      <Frame section="StackedArea" title="Mobile is catching up with web">
        <StackedArea
          x={months}
          series={[
            { name: "Web", values: [20, 22, 25, 27, 30, 34, 37, 41, 44, 48, 52, 55] },
            { name: "Mobile", values: [8, 10, 12, 15, 18, 21, 25, 28, 32, 35, 39, 43] },
            { name: "API", values: [2, 3, 3, 4, 6, 7, 9, 11, 12, 14, 17, 19] },
          ]}
          max={120}
          ticks={[0, 40, 80, 120]}
          shares
        />
      </Frame>,
      { id: "StackedArea", notes: "M switches to shares of the total." },
    ),
    slide(
      <Frame section="StackedBar · Pie" title="Part to whole, two ways">
        <Columns ratio={[1, 1]}>
          <StackedBar
            segments={[
              { name: "Engineering", value: 46 },
              { name: "Sales", value: 22 },
              { name: "Support", value: 14 },
              { name: "Design", value: 10 },
              { name: "Other", value: 8, fill: "bg-chart-6" },
            ]}
          />
          <Pie
            ring
            highlight={0}
            size={380}
            slices={[
              { name: "Returning", value: 64 },
              { name: "New", value: 36 },
            ]}
            center={<span className="type-stat text-[72px]">64%</span>}
          />
        </Columns>
      </Frame>,
      { id: "StackedBar-Pie" },
    ),
    slide(
      <Frame section="DotGrid" title="Two in a hundred visitors start a trial">
        <Columns ratio={[1, 1]}>
          <DotGrid rows={10} cols={20} highlight={4} dot={28} gap={11} />
          <Lead detail="A dot grid makes a small share of a large whole visible at a glance.">4 of 200 visitors.</Lead>
        </Columns>
      </Frame>,
      { id: "DotGrid" },
    ),

    // ── Photos ────────────────────────────────────────────────────────────────
    slide(
      <PhotoSlide src={dusk} alt="An illustrated mountain range at dusk" drift>
        <PhotoCaption
          kicker="PhotoSlide"
          title="Full bleed, with text over a gradient"
          subtitle="The photo drifts in a slow zoom once the slide settles."
        />
      </PhotoSlide>,
      { id: "PhotoSlide" },
    ),
    slide(
      <PhotoSplit src={morning} alt="An illustrated green valley at sunrise" section="PhotoSplit" title="Text beside a photo">
        <Stat size="sm" to={48} suffix="%" label="of the slide is photo" />
      </PhotoSplit>,
      { id: "PhotoSplit" },
    ),

    slide(
      <Frame section="Video · Audio" title="Video and sound, inlined into the file">
        <Columns ratio={[6, 5]}>
          <Video src={loop} caption="Video: muted, looping, first frame in print" height={440} />
          <div className="flex flex-col gap-10">
            <Lead detail="Import media files in the deck; the build inlines them. Keep clips short: base64 adds a third.">
              Nothing is fetched when the deck opens.
            </Lead>
            <Audio src={chime} label="Play a sound" />
          </div>
        </Columns>
      </Frame>,
      { id: "Media" },
    ),
    slide(
      <Frame section="Build" title="Builds on any element">
        <div className="type-lead flex flex-col gap-8">
          <p>Wrap anything in a Build to reveal it on a press of →.</p>
          <Build at={1}>
            <p className="text-accent-text">This appears on step 1.</p>
          </Build>
          <Build at={2}>
            <p className="text-ink-2">And this on step 2.</p>
          </Build>
        </div>
      </Frame>,
      { id: "Build" },
    ),
    slide(
      <Frame section="Motion" title="Entrances, build effects and transitions, by name">
        <div className="grid grid-cols-3 gap-(--gap-item)">
          {(["rise", "fade", "pop"] as const).map((effect, i) => (
            <Reveal key={effect} effect={effect} delay={400} order={i * 3} className="rule-top-strong bg-surface p-(--pad-box)">
              <p className="type-label text-accent-text">{`effect="${effect}"`}</p>
              <p className="type-strong mt-6">{["Rises into place", "Fades in", "Pops"][i]}</p>
            </Reveal>
          ))}
        </div>
        <Build at={1} effect="pop" className="type-lead mt-(--gap-title)">
          A build step can play one too: <code className="font-mono text-accent-text">{`<Build effect="pop">`}</code>
        </Build>
        <p className="type-small mt-(--gap-item) text-ink-2">
          This slide arrived with <code className="font-mono">transition: &quot;zoom&quot;</code>. The deck&apos;s is &quot;fade&quot;, and
          its section slides &quot;push&quot;. Your own effects and transitions are CSS files in src/library/motion.
        </p>
      </Frame>,
      { id: "Motion", transition: "zoom", notes: "Press ← and the zoom plays the other way round." },
    ),
    slide(
      <Frame section="Morph" title="One thing can carry over to the next slide">
        <div className="grid grid-cols-3 gap-(--gap-item)">
          <Morph id="first-reply" className="rule-top-strong rounded-box bg-surface p-(--pad-box)">
            <p className="type-label text-accent-text">First reply</p>
            <p className="type-stat mt-6 text-stat-sm">2.1h</p>
          </Morph>
          {[
            ["Tickets answered", "18,400"],
            ["Satisfaction", "94%"],
          ].map(([label, value], i) => (
            <Reveal key={label} delay={200} order={i + 1} className="rule-top-ink rounded-box bg-surface p-(--pad-box)">
              <p className="type-label text-ink-2">{label}</p>
              <p className="type-stat mt-6 text-stat-sm">{value}</p>
            </Reveal>
          ))}
        </div>
        <p className="type-lead mt-(--gap-title)">
          The first card is inside <code className="font-mono text-accent-text">{`<Morph id="first-reply">`}</code>. Press → and watch it.
        </p>
      </Frame>,
      { id: "Morph", notes: "The next slide has a Morph with the same id. Nothing else links the two." },
    ),
    slide(
      <Frame section="Morph" title="The same id on the next slide, and it flies there">
        <Columns ratio={[1, 1]} align="center">
          <Morph id="first-reply" origin className="rule-top-strong rounded-box bg-surface px-(--pad-box) py-20">
            <p className="type-label text-accent-text">First reply</p>
            <p className="type-stat mt-8 text-[240px] leading-none">2.1h</p>
            <p className="type-small mt-8 text-ink-2">median, down from 5.4h</p>
          </Morph>
          <Lead detail="← sends it back. Print, the overview and reduced motion show each slide as it stands.">
            It moves and resizes while the rest of the slide plays its transition.
          </Lead>
        </Columns>
      </Frame>,
      { id: "Morph-2", notes: "The card is also marked `origin`: the iris on the next slide opens out of it." },
    ),
    ...(
      [
        ["iris", "Iris", " opens from a point: here, the card you just saw."],
        ["wipe", "Wipe", " sweeps a soft edge across. It takes a direction."],
        ["shove up", "Shove", ": the new slide pushes the old one out."],
        ["blur", "Blur", " passes through soft focus: a change of subject."],
        ["flip", "Flip", " turns the slide over: the other side of the story."],
        ["split", "Split", " parts the slide from the middle: a reveal."],
      ] as const
    ).map(([transition, name, rest], i) =>
      slide(
        <StatementSlide kicker={`transition: "${transition}"`} inverted={i % 2 === 0}>
          <em>{name}</em>
          {rest}
        </StatementSlide>,
        { id: `transition-${name.toLowerCase()}`, transition, notes: "Press ← and it plays the other way round, a little faster." },
      ),
    ),
    // ── Timelines ─────────────────────────────────────────────────────────────
    slide(
      <section className="relative h-full overflow-hidden bg-black text-white">
        <Ambient effect="creep" className="absolute inset-0">
          <img src={dusk} alt="An illustrated mountain range at dusk" className="h-full w-full object-cover" />
        </Ambient>
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/0" />
        <Build at={1} until={2} className="absolute top-[400px] left-[1260px]">
          <Beat at={0} effect="pop" className="size-60 rounded-full border-4 border-white/90 shadow-[0_0_48px_rgb(255_255_255/0.45)]" />
        </Build>
        <Build at={2} className="absolute top-[490px] left-[1680px]">
          <Beat at={0} effect="pop" className="size-28 rounded-full border-4 border-white/90 shadow-[0_0_48px_rgb(255_255_255/0.45)]" />
        </Build>
        <div className="relative flex h-full max-w-[1180px] flex-col justify-center px-30 py-24">
          <p className="type-label text-white/80">Beat · SplitText · Ambient</p>
          <div className="mt-8 grid *:col-start-1 *:row-start-1">
            <Build at={0} until={1}>
              <h2 className="type-title text-[calc(var(--text-title)*1.35)]">
                <SplitText at={0.3}>A press can be a short timeline</SplitText>
              </h2>
              <p className="mt-8 max-w-[34ch] text-4xl leading-snug text-white/75">Press → and watch the order.</p>
            </Build>
            <Build at={1} until={2}>
              <Beat>
                <h2 className="type-title text-[calc(var(--text-title)*1.35)]">The picture moves first, the words after</h2>
              </Beat>
              <Beat at={2.4} effect="fade" className="mt-8 max-w-[34ch] text-4xl leading-snug text-white/75">
                {"<Beat> lands one --beat-gap after the step; the old line leaves in half a second."}
              </Beat>
            </Build>
            <Build at={2}>
              <Beat>
                <h2 className="type-title text-[calc(var(--text-title)*1.35)]">Press ← and it is simply there</h2>
              </Beat>
              <Beat at={2.4} effect="fade" className="mt-8 max-w-[34ch] text-4xl leading-snug text-white/75">
                Back, a jump, print and reduced motion show each step settled. Nothing replays.
              </Beat>
            </Build>
          </div>
        </div>
      </section>,
      {
        id: "Beat",
        transition: "blur",
        notes:
          "Press → twice, and once more during a timeline: it settles at once and moves on. The photo creeps in slowly the whole time.",
      },
    ),
    slide(
      <Frame section="SplitText" title="A line can arrive a word or a letter at a time">
        <div className="grid grid-cols-2 gap-x-(--gap-item) gap-y-16">
          {(
            [
              ["mask", "Rises out of its own line", 0.4],
              ["blur", "Comes into focus", 1.4],
              ["type", "Types itself out", 2.4],
              ["scale", "Grows into place", 3.6],
            ] as const
          ).map(([effect, line, at]) => (
            <div key={effect} className="rule-top-ink pt-8">
              <p className="type-label text-accent-text">{`effect="${effect}"`}</p>
              <SplitText as="p" effect={effect} at={at} className="type-strong mt-6 text-[64px] leading-tight">
                {line}
              </SplitText>
            </div>
          ))}
        </div>
        <p className="type-small mt-(--gap-title) text-ink-2">
          Screen readers hear each line once. The pieces stay real text you can select and print.
        </p>
      </Frame>,
      { id: "SplitText" },
    ),
    slide(
      <Frame section="Ambient" title="Holds need not freeze">
        <Columns ratio={[7, 5]} align="center">
          <Ambient effect="parallax" depth={22} className="h-[620px] rounded-box">
            <img src={morning} alt="An illustrated green valley at sunrise" className="h-full w-full object-cover" />
          </Ambient>
          <Lead detail="Drift wanders a few pixels, creep zooms in slowly and parallax leans away from the pointer. Off by default, and off in reduced motion and print.">
            Move the pointer: the photo leans away from it.
          </Lead>
        </Columns>
      </Frame>,
      { id: "Ambient" },
    ),
    slide(
      <Backdrop preset="depth" scrim="left" inverted>
        <StatementSlide kicker="Backdrop">
          A picture that is <em>drawn</em>, not downloaded
        </StatementSlide>
      </Backdrop>,
      {
        id: "Backdrop",
        notes: "A few kilobytes of WebGL, in the theme's colours. It moves slowly; print and reduced motion get one still frame.",
      },
    ),
    slide(
      <Frame section="Backdrop" title="Four pictures, each a step quieter than the content">
        <div className="grid h-full grid-cols-4 gap-(--gap-item)">
          {(
            [
              ["aurora", "Pools of colour, for a title or a closing slide"],
              ["grain", "A quiet wash with film grain, behind text"],
              ["dots", "A halftone field that breathes"],
              ["depth", "Ridges that slide past each other"],
            ] as const
          ).map(([preset, line], i) => (
            <Reveal key={preset} order={i} className="flex min-h-0 flex-col">
              <Backdrop preset={preset} steps={2} className="min-h-0 flex-1 rounded-box" />
              <p className="type-label mt-6 text-accent-text">{preset}</p>
              <p className="type-small mt-2 text-ink-2">{line}</p>
            </Reveal>
          ))}
        </div>
      </Frame>,
      {
        id: "Backdrop-presets",
        notes: "Press → twice: with `steps`, each press shifts the pictures a little. Opt-in: import it from @blocks/backdrop.",
      },
    ),
    slide(
      <Frame section="Your own" title="Yours to extend: one file each" density="compact">
        <div className="flex flex-col gap-(--gap-item)">
          <Table
            columns={["To add", "A file in src/library/", "Use it"]}
            rows={[
              ["A block", <code className="font-mono">blocks/Funnel.tsx</code>, <code className="font-mono">{"<Funnel />"}</code>],
              ["A layout", <code className="font-mono">blocks/SplitFrame.tsx</code>, <code className="font-mono">{"<SplitFrame />"}</code>],
              [
                "An effect",
                <code className="font-mono">motion/swoop.css</code>,
                <code className="font-mono">effect=&quot;swoop&quot;</code>,
              ],
            ]}
            strong={0}
          />
          <Code caption="Themes, transitions, keys and the rest, each a file too: docs/extending.md">{`
            @keyframes swoop { from { opacity: 0; transform: translateX(-120px); } }
            .swoop { animation: swoop var(--duration-slow) var(--ease-out) both; }
          `}</Code>
        </div>
      </Frame>,
      { id: "Extending", notes: "Nothing to register and no upstream file to edit. docs/extending.md has the full table." },
    ),
    slide(
      <Frame section="Backup" title="A hidden slide">
        <Lead>Skipped when presenting and printing, greyed in the overview. Jump here from the overview (G).</Lead>
      </Frame>,
      { id: "hidden", hidden: true },
    ),
    slide(<EndSlide subtitle="Start your own: npm run new my-talk" links={["github.com/ANT1OFF/slides", "@ANT1OFF"]} />, {
      id: "EndSlide",
    }),
  ],
};

export default deck;

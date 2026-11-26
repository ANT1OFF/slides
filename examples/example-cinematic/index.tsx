// Example: a staged talk, in the editorial theme, dark. It uses the opt-in motion: a Backdrop on
// the three slides people look at, one Morph, one timed step, SplitText on two lines, and a motif
// (the route line) that returns. Every number is read from route.data.json. All content is invented.
import { Beat, Build, Fact, Morph, SplitText, asOf, slide } from "@core";
import type { DeckDefinition } from "@core";
import {
  Columns,
  Compare,
  EndSlide,
  Frame,
  LineChart,
  QuoteSlide,
  SectionSlide,
  StackedBar,
  Stat,
  StatementSlide,
  Timeline,
  TitleSlide,
} from "@blocks";
import { Backdrop, Crowd } from "@blocks/backdrop";
import { RouteLine } from "./RouteLine.tsx";
import { routeLight } from "./route-light.ts";
import route from "./route.data.json";

const r = route.values;
const source = asOf(route, "Route 9 pilot report");

// A name with a number in it is not a figure: marked, so the facts check (facts: "strict") passes it.
const name = (text: string) => <span data-not-fact="">{text}</span>;

const deck: DeckDefinition = {
  title: "Fewer stops, faster city",
  theme: "editorial",
  scheme: "dark",
  transition: "fade",
  facts: "strict",
  slides: [
    slide(
      <Backdrop preset="depth" scrim="left">
        <TitleSlide
          kicker="Transit forum · 2026"
          title={<SplitText at={0.4}>Fewer stops, faster city</SplitText>}
          subtitle="What one bus route learned by stopping less."
          byline="Transit planning office"
          date="October 2026"
        />
      </Backdrop>,
      { notes: "Let the title land before speaking. Then: this is a talk about one bus route." },
    ),
    slide(
      <StatementSlide kicker="The problem">
        {name("Route 9")} took{" "}
        <em>
          <Morph id="trip" as="span" className="inline-block">
            <Fact of={r.tripBefore} />
          </Morph>{" "}
          minutes
        </em>{" "}
        to cross a city you can cycle in half that.
      </StatementSlide>,
      { notes: "Hand-off: so where did the time go?" },
    ),
    slide(
      <Frame section="The problem" title="A third of every trip was spent at stops" footer={source}>
        <Columns ratio={[2, 3]} align="center">
          <Stat size="sm" morph="trip" of={r.tripBefore} suffix=" min" label="end to end, weekday mornings" />
          <StackedBar segments={r.tripSplit} highlight={1} unit=" min" />
        </Columns>
      </Frame>,
      { notes: "The minutes at stops are the ones we control. Hand-off: how many stops is that?" },
    ),
    slide(
      <Frame section="The change" title="We removed every third stop" footer={source}>
        <div className="grid *:col-start-1 *:row-start-1">
          <Build at={0} until={1}>
            <RouteLine stops={r.stopsBefore} />
            <p className="type-lead mt-(--gap-title)">
              <Fact of={r.stopsBefore} /> stops in <Fact of={r.km} unit=" km" />: one every{" "}
              <Fact of={(r.km * 1000) / (r.stopsBefore - 1)} digits={0} unit=" m" />.
            </p>
          </Build>
          <Build at={1}>
            <Beat at={0} effect="fade">
              <RouteLine stops={r.stopsBefore} after={r.stopsAfter} ghost start={0} />
            </Beat>
            <Beat as="p" className="type-lead mt-(--gap-title)">
              <Fact of={r.stopsAfter} /> stops: one every <Fact of={(r.km * 1000) / (r.stopsAfter - 1)} digits={0} unit=" m" />.{" "}
              <em>Nobody lost their route.</em>
            </Beat>
          </Build>
        </div>
      </Frame>,
      { notes: "Press once: the line thins first, then the sentence lands. Wait for it." },
    ),
    slide(<SectionSlide inverted={false} title="What happened" subtitle="Twelve weeks on the thinned route." />, { transition: "push" }),
    slide(
      <Frame
        section="What happened"
        title={
          <>
            The trip fell to <Fact of={r.tripAfter} unit=" minutes" /> within a month
          </>
        }
        footer={source}
      >
        <LineChart
          x={r.weeks}
          series={[{ name: "End to end", values: r.tripMinutes }]}
          max={48}
          ticks={[0, 12, 24, 36, 48]}
          tickLabel={(t) => `${t} min`}
          reference={{ value: r.tripGoal, label: "Goal" }}
          markers={[{ index: r.changeWeek, label: "Stops removed" }]}
        />
      </Frame>,
      { notes: "It beat the goal in week six and stayed there." },
    ),
    slide(
      <Frame section="What happened" title="Riders came back" footer={source}>
        <Columns ratio={[3, 5]} align="center">
          <div>
            <p className="type-lead">
              Every dot is one weekday boarding: <Fact of={r.ridersBefore} /> before the change.
            </p>
            {/* The picture first: the new riders arrive on the press, and the number lands a beat later. */}
            <Build at={1} className="mt-(--gap-title)">
              <Beat>
                <Stat
                  size="sm"
                  of={r.ridersUp}
                  prefix="+"
                  suffix="%"
                  label={
                    <>
                      <Fact of={r.ridersAfter} /> now. On time: <Fact of={r.onTimeBefore} unit="%" /> to{" "}
                      <Fact of={r.onTimeAfter} unit="%" />.
                    </>
                  }
                />
              </Beat>
            </Build>
          </div>
          {/* Only a GPU draws this: one dot per boarding, each on a path of its own. */}
          <Crowd count={r.ridersAfter} highlight={r.ridersAfter - r.ridersBefore} build className="h-[600px]" />
        </Columns>
      </Frame>,
      { notes: "Press once: the new riders walk in, then the number. Each dot is a boarding." },
    ),
    slide(
      <QuoteSlide kicker="A rider" author="Night-shift nurse" role={<>rides {name("Route 9")} at dawn</>}>
        I walk two more minutes and get home ten minutes sooner.
      </QuoteSlide>,
      { transition: "blur" },
    ),
    slide(
      <Frame section="The cost" title="The other side: a longer walk for some" footer={source}>
        <Compare
          sides={[
            {
              title: "Before",
              items: [
                <>
                  <Fact of={r.walkBefore} unit=" m" /> average walk to a stop
                </>,
                "Every block had its own stop",
              ],
            },
            {
              title: "After",
              items: [
                <>
                  <Fact of={r.walkAfter} unit=" m" /> average walk to a stop
                </>,
                <>
                  <Fact of={r.farShare} format="percent" /> of riders now walk over <Fact of={r.farMetres} unit=" m" />
                </>,
              ],
            },
          ]}
        />
      </Frame>,
      { transition: "flip", notes: "Say the caveat plainly. The far stops are the ones near the hospital; they keep a shuttle." },
    ),
    slide(
      <Backdrop preset="depth" scrim="left" seed={3}>
        <StatementSlide kicker="The lesson">
          <SplitText at={0.3}>The fastest stop is the one you</SplitText>{" "}
          <em>
            <SplitText at={1.1}>skip.</SplitText>
          </em>
        </StatementSlide>
      </Backdrop>,
      { notes: "Pause here. This is the sentence to repeat." },
    ),
    <Frame section="Next" title="Two more routes this winter">
      <Timeline
        items={[
          { when: "Now", title: name("Route 9"), detail: "Permanent", done: true },
          { when: "December", title: name("Route 4"), detail: "Survey, then thin" },
          { when: "February", title: name("Route 12"), detail: "With the hospital shuttle" },
          { when: "April", title: "Review", detail: "All three, one report" },
        ]}
      />
    </Frame>,
    slide(
      // The motif returns, drawn by a shader of this deck's own: the thinned route, and one bus running it.
      <Backdrop
        shader={routeLight}
        values={[r.stopsAfter, 0, 0, 0]}
        fallback="linear-gradient(to bottom, transparent 28%, var(--color-ink-2) 28%, var(--color-ink-2) calc(28% + 3px), transparent calc(28% + 3px))"
        label={`A route with ${r.stopsAfter} stops, and a bus running along it`}
      >
        <EndSlide title="Stop less." subtitle="Questions, and the full pilot report, at the planning desk." />
      </Backdrop>,
    ),
  ],
};

export default deck;

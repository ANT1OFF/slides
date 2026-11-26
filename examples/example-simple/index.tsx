// Example: a plain monthly team update, in the default theme. Nothing fancy: nine slides, no
// builds, no transition. All content is invented.
import { Fact, asOf, slide } from "@core";
import type { DeckDefinition } from "@core";
import { Bullets, Compare, EndSlide, Frame, HBars, LineChart, StatRow, Table, Timeline, TitleSlide } from "@blocks";
import month from "./month.data.json";

const m = month.values;
const buildNow = m.buildMinutes.at(-1) ?? 0;
const [buildBefore = 0] = m.buildMinutes;

const deck: DeckDefinition = {
  title: "Platform team · October",
  facts: "strict",
  slides: [
    <TitleSlide
      kicker="Monthly update"
      title="Platform, October"
      subtitle="Builds are twice as fast. Flaky tests are next."
      byline="Platform team"
      date="November 2026"
    />,
    slide(
      <Frame section="Summary" title="The month in three numbers" footer={asOf(month, "build dashboard")}>
        <StatRow
          stats={[
            {
              of: buildNow,
              suffix: " min",
              label: (
                <>
                  median build, from <Fact of={buildBefore} unit=" min" />
                </>
              ),
            },
            {
              of: m.deploys,
              label: (
                <>
                  deploys, from <Fact of={m.previousDeploys} />
                </>
              ),
            },
            {
              of: m.pages,
              label: (
                <>
                  on-call pages, from <Fact of={m.previousPages} />
                </>
              ),
            },
          ]}
        />
      </Frame>,
      { notes: "Start with the build time: it is what everyone felt this month." },
    ),
    <Frame section="Builds" title="The shared cache halved the median build" footer={asOf(month, "median build minutes by week")}>
      <LineChart
        x={m.weeks}
        series={[{ name: "Median build", values: m.buildMinutes }]}
        max={16}
        ticks={[0, 4, 8, 12, 16]}
        tickLabel={(t) => `${t} min`}
        reference={{ value: m.buildGoal, label: "Goal" }}
        markers={[{ index: m.cacheWeek, label: "Shared cache" }]}
      />
    </Frame>,
    <Frame section="Builds" title="Flaky tests cause the most red builds" footer={asOf(month, "share of red builds on main, by cause")}>
      <HBars rows={m.redBuilds} unit="%" />
    </Frame>,
    <Frame section="Shipped" title="What shipped in October">
      <Bullets
        items={[
          { title: "Shared build cache for every repository", detail: "On by default; no change needed in a project" },
          { title: "One-command local environment", detail: "New joiners run the product on day one" },
          {
            title: "Flaky-test quarantine",
            detail: (
              <>
                <Fact of={m.quarantined} /> tests moved out of the blocking run
              </>
            ),
          },
        ]}
      />
    </Frame>,
    <Frame section="Slipped" title="Two things slipped, both for the same reason">
      <Table
        columns={["Work", "Planned", "Now", "Why"]}
        rows={[
          ["Runner autoscaling", "October", "November", "Waiting on the new cloud quota"],
          ["Staging refresh", "October", "December", "Depends on autoscaling"],
        ]}
        strong={0}
      />
    </Frame>,
    <Frame section="Next" title="November is about trust in a green build">
      <Timeline
        items={[
          { when: "Week 1", title: "Quota", detail: "Approved by Finance", done: true },
          { when: "Week 2", title: "Autoscaling", detail: "Runners follow the queue" },
          { when: "Week 3", title: "Flaky tests", detail: "Fix or delete the quarantined" },
          { when: "Week 4", title: "Review", detail: "November update" },
        ]}
      />
    </Frame>,
    <Frame section="Decision" title="One decision: what to do with quarantined tests">
      <Compare
        sides={[
          { title: "Keep them quarantined", items: ["No work this month", "The list keeps growing", "Coverage quietly drops"] },
          {
            title: (
              <>
                Fix or delete within <Fact of={m.fixDays} unit=" days" />
              </>
            ),
            items: ["Each test gets an owner", "About two days per team", "A green build means something"],
            highlight: true,
          },
        ]}
      />
    </Frame>,
    <EndSlide title="Questions?" subtitle="The build dashboard is linked in the meeting notes." />,
  ],
};

export default deck;

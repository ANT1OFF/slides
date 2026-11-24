// Example: a 20-minute conference talk, in the default theme, dark scheme. All content is invented.
import { slide, type DeckDefinition } from "@core";
import {
  Agenda,
  BarSeries,
  Callout,
  Code,
  Columns,
  Compare,
  EndSlide,
  Flow,
  Frame,
  QuoteSlide,
  SectionSlide,
  StatementSlide,
  StatRow,
  TitleSlide,
} from "@blocks";

const deck: DeckDefinition = {
  title: "Small PRs, fast teams",
  theme: "default", // examples pin their theme, so a team default doesn't change them
  scheme: "dark",
  transition: "fade", // between slides; the three section dividers push in instead
  slides: [
    slide(
      <TitleSlide
        kicker="Engineering Summit 2026"
        title={
          <>
            Small PRs, fast teams<em>.</em>
          </>
        }
        subtitle="What happened when we capped pull requests at 200 lines for a quarter."
        aside="Track B · 14:30"
        byline="Alex Rivera · Platform team"
        date="12 June 2026"
      />,
      { notes: "Introduce yourself in one sentence. The talk is about one constraint and what it changed." },
    ),
    <Frame section="Agenda" title="Twenty minutes, four parts">
      <Agenda items={["Why we tried it", "The rule", "What changed", "What we'd do differently"]} />
    </Frame>,
    <StatementSlide kicker="The problem">
      Our median pull request waited <em>three days</em> for review.
    </StatementSlide>,
    slide(
      <Frame section="Why we tried it" title="Review time grew with size">
        <BarSeries
          data={[
            { label: "<50", value: 3 },
            { label: "50–100", value: 6 },
            { label: "100–200", value: 11 },
            { label: "200–400", value: 26 },
            { label: "400–800", value: 49 },
            { label: "800+", value: 71 },
          ]}
          max={80}
          ticks={[0, 20, 40, 60, 80]}
          axisLabelEvery={1}
          unit="hours to first review, by PR size"
          format={(v) => `${v}h`}
        />
      </Frame>,
      { notes: "Lines changed on the x axis. Past 200 lines, review time more than doubles." },
    ),
    slide(<SectionSlide number={1} of={3} title="The rule" subtitle="One line in the contributing guide, enforced by CI." />, {
      transition: "push",
    }),
    slide(
      <Frame section="The rule" title="A check that fails above 200 lines">
        <Code title=".github/workflows/size.yml" highlight="1-3|5-9|all">{`
          name: pr-size
          on: pull_request
          jobs:
            size:
              runs-on: ubuntu-latest
              steps:
                - uses: actions/checkout@v4
                - run: |
                    changed=$(git diff --shortstat origin/main | awk '{print $4 + $6}')
                    test "$changed" -le 200 || (echo "Split this PR" && exit 1)
        `}</Code>
      </Frame>,
      { notes: "Step through: trigger, then the check itself. Generated files were excluded via .gitattributes." },
    ),
    <Frame section="The rule" title="How a change moves now">
      <Flow
        nodes={[
          { title: "Plan", sub: "split the work", strong: true },
          { title: "Small PR", sub: "≤ 200 lines" },
          { title: "Review", sub: "same day" },
          { title: "Merge", sub: "behind a flag" },
          { title: "Release", sub: "flag on", strong: true },
        ]}
      />
    </Frame>,
    slide(<SectionSlide number={2} of={3} title="What changed" />, { transition: "push" }),
    <Frame section="What changed" title="One quarter later">
      <div className="my-auto">
        <StatRow
          stats={[
            { to: 4.5, suffix: "h", label: "median time to first review, down from 72" },
            { to: 2.8, suffix: "×", label: "more PRs merged per engineer" },
            { to: 38, suffix: "%", label: "fewer rollbacks" },
          ]}
        />
      </div>
    </Frame>,
    <Frame section="What changed" title="Reviews got better, not just faster">
      <Compare
        build
        sides={[
          {
            title: "Large PRs",
            items: ["Skimmed, approved with LGTM", "Design questions arrive too late", "Conflicts with everyone else's work"],
          },
          { title: "Small PRs", items: ["Read line by line", "Design questions on the first PR", "Rebases are trivial"], highlight: true },
        ]}
      />
    </Frame>,
    slide(
      <QuoteSlide author="A senior engineer" role="in the retro">
        I stopped dreading review requests. They take ten minutes now.
      </QuoteSlide>,
      { transition: "zoom" },
    ),
    slide(<SectionSlide number={3} of={3} title="What we'd do differently" />, { transition: "push" }),
    <Frame section="Lessons" title="Three things we'd change">
      <Columns ratio={[3, 2]}>
        <ul className="flex flex-col gap-10 text-4xl leading-snug">
          <li>
            <b>Exclude generated code</b> from day one; we lost a week to lockfile diffs.
          </li>
          <li>
            <b>Teach stacking.</b> Stacked PRs made the limit painless.
          </li>
          <li>
            <b>Allow an escape hatch</b> with a label, reviewed weekly.
          </li>
        </ul>
        <Callout title="Try it" tone="accent-2">
          Start with a warning, not a failure. Make it a failure after two weeks.
        </Callout>
      </Columns>
    </Frame>,
    <EndSlide
      title="Thank you"
      subtitle="Slides and the CI check are linked from the event page."
      links={["@alex.example", "example.dev/small-prs"]}
    />,
  ],
};

export default deck;

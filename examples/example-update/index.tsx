// Example: a quarterly team update, in the editorial theme. All content is invented.
import { Fact, asOf, slide } from "@core";
import type { DeckDefinition } from "@core";
import {
  Bullets,
  Callout,
  Cards,
  Columns,
  EndSlide,
  Frame,
  HBars,
  Lead,
  LineChart,
  Pie,
  SectionSlide,
  StatRow,
  Table,
  Timeline,
  TitleSlide,
} from "@blocks";
import quarter from "./quarter.data.json";
import replies from "./reply-times.data.json";
import satisfaction from "./satisfaction.data.json";
import tickets from "./tickets.data.json";

// Every number on screen is read from a data file, so a refresh can't leave a headline behind its chart.
const q = quarter.values;
const r = replies.values;
const [firstReply] = r.median;
const lastReply = r.median.at(-1) ?? firstReply;

const deck: DeckDefinition = {
  title: "Support team · Q3 update",
  theme: "editorial",
  // npm run verify fails if a number on a slide is typed in rather than read from data.
  facts: "strict",
  // Press M while presenting to show growth instead of raw numbers.
  slides: [
    <TitleSlide
      kicker="Quarterly update"
      title="Support, Q3"
      subtitle="Faster answers, fewer repeat tickets, and what we need for Q4."
      byline="Customer Support"
      date="October 2026"
    />,
    slide(
      <Frame section="Summary" title="The quarter in three numbers" footer={asOf(tickets, "helpdesk export and CSAT survey")}>
        <div className="my-auto">
          <StatRow
            stats={[
              {
                of: tickets.values.total,
                label: "tickets answered",
                relative: { of: Math.round((tickets.values.total / q.previousTotal - 1) * 100), suffix: "%", label: "more than Q2" },
              },
              {
                of: lastReply,
                suffix: "h",
                label: (
                  <>
                    median first reply, from <Fact of={firstReply} unit="h" />
                  </>
                ),
                relative: { of: Math.round((1 - lastReply / firstReply) * 100), suffix: "%", label: "faster than Q2" },
              },
              {
                of: satisfaction.values.csat,
                suffix: "%",
                label: (
                  <>
                    satisfaction, from <Fact of={satisfaction.values.previous} unit="%" />
                  </>
                ),
              },
            ]}
          />
        </div>
      </Frame>,
      { notes: "Lead with the reply time; that's the headline for leadership." },
    ),
    <SectionSlide number={1} of={3} title="What went well" />,
    <Frame section="What went well" title="First reply time fell every week" footer={asOf(replies, "helpdesk first-reply report")}>
      <LineChart
        x={r.weeks}
        series={[
          { name: "Median", values: r.median },
          { name: "90th pct", values: r.p90 },
        ]}
        max={16}
        ticks={[0, 4, 8, 12, 16]}
        tickLabel={(t) => `${t}h`}
        reference={{ value: r.goal, label: "Goal for the median" }}
        markers={[{ index: r.newRouting, label: "New routing" }]}
      />
    </Frame>,
    <Frame section="What went well" title="Billing and sign-in were half of all tickets">
      <HBars rows={tickets.values.byArea} />
    </Frame>,
    <Frame section="What went well" title="Most customers now reach us by chat" footer={asOf(quarter, "helpdesk, tickets by channel")}>
      <Columns ratio={[3, 2]}>
        <Pie size={460} highlight={0} slices={q.channels} />
        <Lead detail="Phone fell by half once the chat window opened from the help page.">Chat passed email in July.</Lead>
      </Columns>
    </Frame>,
    <SectionSlide number={2} of={3} title="What didn't" />,
    <Frame
      section="What didn't"
      title="Sign-in is the one area where repeats rose"
      footer={asOf(quarter, "helpdesk, repeat tickets by area")}
    >
      <Table
        columns={["Area", "Repeat rate", "Q2", "Owner"]}
        rows={q.repeats.map((a) => [
          a.area,
          <Fact key="rate" of={a.rate} unit="%" />,
          <Fact key="previous" of={a.previous} unit="%" />,
          a.owner,
        ])}
        numeric={[1, 2]}
        highlight={1}
      />
    </Frame>,
    <Frame section="What didn't" title="One ask: an Identity engineer for two sprints">
      <Callout title="Ask">
        Sign-in repeats rose after the new SSO flow. One engineer for two sprints fixes the five most common errors.
      </Callout>
    </Frame>,
    <SectionSlide number={3} of={3} title="Next quarter" />,
    <Frame section="Q4" title="Three bets for Q4">
      <Cards
        build
        items={[
          {
            icon: "A",
            title: "Self-serve billing fixes",
            body: "Let customers fix card and invoice issues without a ticket.",
            meta: (
              <>
                −<Fact of={q.billingSaves} /> tickets / quarter
              </>
            ),
          },
          {
            icon: "B",
            title: "SSO troubleshooting guide",
            body: "In-product guide for the five most common sign-in errors.",
            meta: (
              <>
                −<Fact of={q.ssoSaves} /> tickets / quarter
              </>
            ),
          },
          {
            icon: "C",
            title: "Weekend coverage",
            body: "One rotating shift, Saturday and Sunday.",
            meta: <Fact of={q.weekendHires} prefix="+" unit=" hires" />,
          },
        ]}
      />
    </Frame>,
    <Frame section="Q4" title="Roadmap">
      <Timeline
        items={[
          { when: "Oct", title: "Hire", detail: "Two weekend agents", done: true },
          { when: "Nov", title: "SSO guide", detail: "With Identity" },
          { when: "Dec", title: "Billing self-serve", detail: "With Finance tools" },
          { when: "Jan", title: "Review", detail: "Q4 update" },
        ]}
      />
    </Frame>,
    <Frame section="Decisions" title="What we need from this meeting">
      <Bullets
        build
        items={[
          { title: "Approve two weekend hires", detail: "Budget is in the Q4 plan; needs sign-off" },
          { title: "Lend one Identity engineer", detail: "Two sprints, starting November" },
          {
            title: (
              <>
                Agree the <Fact of={q.nextGoal} unit="h" /> first-reply goal for Q4
              </>
            ),
            detail: (
              <>
                Down from <Fact of={r.goal} unit="h" />
              </>
            ),
          },
        ]}
      />
    </Frame>,
    <EndSlide title="Questions?" subtitle="The full dashboard is linked in the meeting notes." />,
  ],
};

export default deck;

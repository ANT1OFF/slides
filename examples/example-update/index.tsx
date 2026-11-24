// Example: a quarterly team update, in the editorial theme. All content is invented.
import { asOf, slide } from "@core";
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
import satisfaction from "./satisfaction.data.json";
import tickets from "./tickets.data.json";

const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12", "W13"];

const deck: DeckDefinition = {
  title: "Support team · Q3 update",
  theme: "editorial",
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
              { to: tickets.values.total, label: "tickets answered", relative: { to: 12, suffix: "%", label: "more than Q2" } },
              { to: 2.1, suffix: "h", label: "median first reply, from 5.4h", relative: { to: 61, suffix: "%", label: "faster than Q2" } },
              { to: satisfaction.values.csat, suffix: "%", label: `satisfaction, from ${satisfaction.values.previous}%` },
            ]}
          />
        </div>
      </Frame>,
      { notes: "Lead with the reply time; that's the headline for leadership." },
    ),
    <SectionSlide number={1} of={3} title="What went well" />,
    <Frame section="What went well" title="First reply time fell every week">
      <LineChart
        x={weeks}
        series={[
          { name: "Median", values: [5.4, 5.1, 4.8, 4.2, 3.9, 3.6, 3.2, 2.9, 2.7, 2.5, 2.3, 2.2, 2.1] },
          { name: "90th pct", values: [14, 13.5, 13, 12, 11, 10.2, 9.5, 8.8, 8.1, 7.5, 7.1, 6.8, 6.4] },
        ]}
        max={16}
        ticks={[0, 4, 8, 12, 16]}
        tickLabel={(t) => `${t}h`}
        reference={{ value: 4, label: "Goal for the median" }}
        markers={[{ index: 4, label: "New routing" }]}
      />
    </Frame>,
    <Frame section="What went well" title="Billing and sign-in were half of all tickets">
      <HBars rows={tickets.values.byArea} />
    </Frame>,
    <Frame section="What went well" title="Most customers now reach us by chat">
      <Columns ratio={[3, 2]}>
        <Pie
          size={460}
          highlight={0}
          slices={[
            { name: "Chat", value: 58 },
            { name: "Email", value: 31 },
            { name: "Phone", value: 11 },
          ]}
        />
        <Lead detail="Phone fell by half once the chat window opened from the help page.">Chat passed email in July.</Lead>
      </Columns>
    </Frame>,
    <SectionSlide number={2} of={3} title="What didn't" />,
    <Frame section="What didn't" title="Sign-in is the one area where repeats rose">
      <Table
        columns={["Area", "Repeat rate", "Q2", "Owner"]}
        rows={[
          ["Billing", "14%", "15%", "Finance tools"],
          ["Sign-in", "22%", "19%", "Identity"],
          ["Integrations", "9%", "12%", "Platform"],
          ["Data export", "11%", "11%", "Data"],
        ]}
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
            meta: "−1,500 tickets / quarter",
          },
          {
            icon: "B",
            title: "SSO troubleshooting guide",
            body: "In-product guide for the five most common sign-in errors.",
            meta: "−900 tickets / quarter",
          },
          { icon: "C", title: "Weekend coverage", body: "One rotating shift, Saturday and Sunday.", meta: "+2 hires" },
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
          { title: "Agree the 2h first-reply goal for Q4", detail: "Down from 4h" },
        ]}
      />
    </Frame>,
    <EndSlide title="Questions?" subtitle="The full dashboard is linked in the meeting notes." />,
  ],
};

export default deck;

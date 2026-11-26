// Example: a short product pitch, in the acme example theme. The product and all numbers are invented.
import { Morph, asOf, slide } from "@core";
import type { DeckDefinition } from "@core";
import {
  Cards,
  Columns,
  Compare,
  DotGrid,
  EndSlide,
  Frame,
  Pipeline,
  QuoteSlide,
  StackedArea,
  Stat,
  StatementSlide,
  Table,
  Timeline,
  TitleSlide,
} from "@blocks";
import mrr from "./mrr.data.json";

const deck: DeckDefinition = {
  title: "Ledgerly — seed pitch",
  theme: "acme",
  slides: [
    <TitleSlide
      kicker="Seed round · 2026"
      title="Ledgerly"
      subtitle="Month-end close for small finance teams, in a day instead of a week."
      byline="Sam Okafor, CEO · Priya Natarajan, CTO"
      date="October 2026"
    />,
    <StatementSlide kicker="The problem">
      Small finance teams spend{" "}
      <Morph id="six-days" as="em" className="inline-block">
        six days
      </Morph>{" "}
      every month closing the books.
    </StatementSlide>,
    <Frame section="The problem" title="Most of that time is matching, not thinking">
      <Columns ratio={[1, 1]} align="center">
        <DotGrid rows={8} cols={20} highlight={112} />
        <div>
          {/* The one Morph in this deck: "six days" flies here from the slide before. */}
          <Stat
            size="sm"
            to={70}
            suffix="%"
            label={
              <>
                of those{" "}
                <Morph id="six-days" as="span" className="inline-block text-accent-text">
                  six days
                </Morph>{" "}
                is spent reconciling transactions by hand
              </>
            }
          />
        </div>
      </Columns>
    </Frame>,
    <Frame section="The product" title="Ledgerly reconciles while you work">
      <Pipeline
        steps={[
          { title: "Connect", detail: "Bank, card and ERP in five minutes", edge: "sync" },
          { title: "Match", detail: "Transactions paired automatically", edge: "review" },
          { title: "Review", detail: "Only the exceptions reach a person", edge: "approve" },
          { title: "Close", detail: "Locked books and an audit trail" },
        ]}
      />
    </Frame>,
    <Frame section="Why now" title="Close in one day instead of six">
      <Compare
        sides={[
          { title: "Today", items: ["Spreadsheets and exports", "Close takes six days", "Errors found by the auditor"] },
          { title: "With Ledgerly", items: ["One live ledger", "Close takes one day", "Errors flagged as they happen"], highlight: true },
        ]}
      />
    </Frame>,
    slide(
      <Frame section="Traction" title="Team plans overtook Starter in August" footer={asOf(mrr, "MRR by plan, $k")}>
        <StackedArea
          x={mrr.values.months}
          series={[
            { name: "Starter", values: mrr.values.starter },
            { name: "Team", values: mrr.values.team },
            { name: "Business", values: mrr.values.business },
          ]}
          max={100}
          ticks={[0, 25, 50, 75, 100]}
          tickLabel={(t) => `$${t}k`}
          shares
        />
      </Frame>,
      { notes: "Monthly recurring revenue in thousands. $89k MRR in September; Team overtook Starter in August." },
    ),
    <QuoteSlide author="Controller" role="at a 40-person design studio">
      We closed September on the second business day. That has never happened.
    </QuoteSlide>,
    <Frame section="Market" title="Our first segment alone is a $3.3B market">
      <Table
        columns={["Segment", "Companies", "Price / month", "Market"]}
        rows={[
          ["10–50 staff", "1.2M", "$300", "$4.3B"],
          ["50–200 staff", "310k", "$900", "$3.3B"],
          ["200–500 staff", "48k", "$2,400", "$1.4B"],
        ]}
        highlight={1}
      />
    </Frame>,
    <Frame section="Team" title="Built by people who have closed the books">
      <Cards
        items={[
          { icon: "SO", title: "Sam Okafor", body: "CEO. Ran finance at two startups through Series B.", meta: "ex-controller" },
          { icon: "PN", title: "Priya Natarajan", body: "CTO. Built payment reconciliation at a fintech.", meta: "ex-staff engineer" },
          { icon: "+4", title: "Engineering", body: "Four engineers, two with accounting backgrounds.", meta: "remote, EU + US" },
        ]}
      />
    </Frame>,
    <Frame section="The round" title="$3M to reach $1M ARR">
      <Timeline
        items={[
          { when: "Now", title: "$89k MRR", detail: "140 customers", done: true },
          { when: "Q1", title: "Sales hire", detail: "First two AEs" },
          { when: "Q2", title: "ERP integrations", detail: "Three more systems" },
          { when: "Q4", title: "$1M ARR", detail: "Series A ready" },
        ]}
      />
    </Frame>,
    <EndSlide title="Let's talk" subtitle="Ledgerly closes the books in a day." links={["sam@ledgerly.example", "ledgerly.example"]} />,
  ],
};

export default deck;

// The deck `npm run verify` checks the facts check on: <Fact>'s formats (each [data-expect] must read
// its value), a slide of numbers typed by hand that the check must list, and one of numbers it must
// not list: read from data, marked data-not-fact, years, labels like Q3, charts, code, list and section numbers.
import { Fact, asOf, slide } from "@core";
import type { DeckDefinition } from "@core";
import { Bullets, Code, Frame, HBars, SectionSlide, Stat, Table } from "@blocks";
import data from "./facts.data.json";

const v = data.values;

const deck: DeckDefinition = {
  title: "Verify facts",
  facts: "strict",
  slides: [
    slide(
      <Frame
        title={
          <>
            Tickets: <Fact of={v.tickets} />
          </>
        }
        footer={asOf(data, "fixture")}
      >
        <ul className="type-lead">
          <li data-expect="18,400">
            <Fact of={v.tickets} />
          </li>
          <li data-expect="2.1h">
            <Fact of={v.hours} unit="h" />
          </li>
          <li data-expect="94%">
            <Fact of={v.csat} format="percent" />
          </li>
          <li data-expect="61.1%">
            <Fact of={v.change} format="percent" digits={1} />
          </li>
          <li data-expect="18.4K">
            <Fact of={v.tickets} format="compact" />
          </li>
          <li data-expect="$3.3B">
            <Fact of={v.market} format="compact" currency="USD" />
          </li>
          <li data-expect="$300">
            <Fact of={v.price} currency="USD" />
          </li>
          <li data-expect="+12%">
            <Fact of={v.growth} prefix="+" unit="%" />
          </li>
          <li data-expect="1,234.5">
            <Fact of={v.users} count />
          </li>
        </ul>
      </Frame>,
      { id: "formats" },
    ),
    slide(
      <Frame title="Revenue grew 12% to $89k">
        <Stat to={70} suffix="%" label="typed into a Stat" />
        <Table columns={["Area", "Repeat rate"]} rows={[["Billing", "14%"]]} />
        <p className="type-body">1.2M users across 3 regions</p>
      </Frame>,
      { id: "typed" },
    ),
    slide(
      <Frame title="Plans for 2026, from Q3 to W12">
        <Stat of={v.tickets} label="read from data" size="sm" />
        <p className="type-body">
          <span data-not-fact="">Step 3</span> of the plan
        </p>
      </Frame>,
      { id: "exempt" },
    ),
    slide(
      <Frame title="Lists, charts and code">
        <Bullets items={["First", "Second"]} />
        <HBars rows={[{ label: "Billing", value: 5210 }]} width={900} />
        <Code>const answer = 42;</Code>
      </Frame>,
      { id: "exempt-2" },
    ),
    slide(<SectionSlide number={2} of={3} title="Section numbers are not facts" />, { id: "section" }),
  ],
};

export default deck;

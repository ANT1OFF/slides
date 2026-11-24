// Reusable slides for the team's decks: use them as they are, override their props, or spread a set.
//   import { TeamIntro, Questions, openingSlides } from "@library/slides/team.tsx";
//   slides: [...openingSlides({ title: "Q3 review" }), <TeamIntro title="Who's here today" />, …, <Questions />]
// They show up in the library gallery (npm run dev → Library) with their default props.
import type { ReactNode } from "react";
import { slide, type SlideInput } from "@core";
import { Cards, EndSlide, Frame, TitleSlide } from "@blocks";
import team from "../data/team.data.json";

/** Who the team is: one card per person, from src/library/data/team.data.json. */
export function TeamIntro({ title = `${team.values.team}: who we are`, section = "About us" }: { title?: ReactNode; section?: ReactNode }) {
  return (
    <Frame section={section} title={title}>
      <Cards items={team.values.people.map((p) => ({ icon: p.role, title: p.name, body: p.line }))} />
    </Frame>
  );
}

/** The closing slide every team deck ends with. */
export function Questions({ contact = "team@example.com" }: { contact?: ReactNode }) {
  return <EndSlide title="Questions?" subtitle="Thanks for listening." links={[contact]} />;
}

/** A slide set: the team's standard opening, a title slide then the team intro. Spread it into `slides`. */
export function openingSlides({
  title = "Team update",
  subtitle,
  presenter = team.values.team,
  date,
}: { title?: ReactNode; subtitle?: ReactNode; presenter?: ReactNode; date?: ReactNode } = {}): SlideInput[] {
  return [
    slide(<TitleSlide kicker={team.values.team} title={title} subtitle={subtitle} byline={presenter} date={date} />, { id: "team-title" }),
    slide(<TeamIntro />, { id: "team-intro" }),
  ];
}

// src/library/blocks/Sql.tsx: `Code` with the team's own highlighter. `Code` takes a `tokenize` prop,
// a function from one line of source to its nodes, so another language is a few lines here and not
// a copy of the block. This one reuses the built-in tokenizer with SQL's keywords and adds SQL's
// `--` comments. For a full highlighter, import it here and return its output: only the decks that
// use this block carry its size. See docs/extending.md, "Code highlighting".
import type { ComponentProps, ReactNode } from "react";
import { Code, tokenize } from "@blocks";

const KEYWORDS = new Set(
  "select from where and or not in is null as join left right inner outer on group by order having limit insert into values update set delete create table with distinct asc desc count sum avg min max".split(
    " ",
  ),
);

/** One line of SQL as coloured spans. The `tok-*` classes are the ones the theme colours. */
export function sqlTokens(line: string): ReactNode[] {
  const comment = line.indexOf("--");
  if (comment === -1) return tokenize(line, KEYWORDS);
  return [
    ...tokenize(line.slice(0, comment), KEYWORDS),
    <span key="comment" className="tok-comment">
      {line.slice(comment)}
    </span>,
  ];
}

/** A SQL code block: every prop of `Code`, highlighted as SQL. */
export function Sql(props: Omit<ComponentProps<typeof Code>, "tokenize">) {
  return <Code tokenize={sqlTokens} {...props} />;
}

/** What the library view shows for this block (npm run dev → Library). */
export const example = (
  <Sql title="signups.sql" highlight="all|4">{`
    select plan, count(id) as signups
    from accounts
    where created_at >= '2026-01-01' -- this year
    group by plan
    order by signups desc
  `}</Sql>
);

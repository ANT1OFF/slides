import type { ReactNode } from "react";
import { Reveal, useBuildStep } from "@core";

// A tiny tokenizer: enough colour for slides, no grammar files, about 1 KB in the built deck.
const KEYWORDS = new Set(
  (
    "import export from default const let var function return if else for while do switch case break continue new class extends " +
    "interface type enum implements public private protected readonly static async await yield try catch finally throw typeof instanceof " +
    "in of as is void null undefined true false this super def lambda pass None True False elif with fn pub mut use impl struct trait match " +
    "package func go defer select chan map range"
  ).split(" "),
);
const RULES: Array<[RegExp, string]> = [
  [/^(\/\/.*|#(?!\[).*|\/\*[\s\S]*?\*\/)/, "tok-comment"],
  [/^(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/, "tok-string"],
  // A number with whatever letters follow it (120px, 0x1f, 1e9): every rule must leave nothing
  // unmatched, or tokenize never ends.
  [/^\d(?:[eE][+-]\d|[\w.])*/, "tok-number"],
  [/^[A-Za-z_$][\w$]*(?=\s*\()/, "tok-fn"],
  [/^[A-Za-z_$][\w$]*/, "word"],
  [/^\s+/, ""],
  [/^[^\w\s]/, "tok-punct"],
];

/**
 * The built-in tokenizer: one line of source as coloured spans. The classes are the contract, and
 * the theme colours them: `tok-kw`, `tok-string`, `tok-number`, `tok-type`, `tok-fn`, `tok-comment`,
 * `tok-punct`. Pass your own `keywords` to reuse it for another language.
 */
export function tokenize(line: string, keywords: ReadonlySet<string> = KEYWORDS): Array<ReactNode> {
  const out: Array<ReactNode> = [];
  let rest = line;
  while (rest) {
    for (const [re, cls] of RULES) {
      const m = re.exec(rest);
      if (!m) {
        continue;
      }
      const text = m[0];
      const kind = cls === "word" ? (keywords.has(text) ? "tok-kw" : /^[A-Z]/.test(text) ? "tok-type" : "") : cls;
      out.push(
        kind ? (
          <span key={out.length} className={kind}>
            {text}
          </span>
        ) : (
          text
        ),
      );
      rest = rest.slice(text.length);
      break;
    }
  }
  return out;
}

/** "1|2-3|5,7|all" → one set of 1-based line numbers per step; "all" or "*" means every line. */
function parseSteps(steps: string, count: number): Array<Set<number>> {
  return steps.split("|").map((part) => {
    const set = new Set<number>();
    for (const range of part.split(",")) {
      const r = range.trim();
      if (r === "all" || r === "*" || r === "") {
        for (let i = 1; i <= count; i++) {
          set.add(i);
        }
      } else {
        const [a, b = a] = r.split("-").map(Number);
        for (let i = a; i <= b; i++) {
          set.add(i);
        }
      }
    }
    return set;
  });
}

/**
 * A code block on a surface panel, coloured from the theme's tokens (keywords, strings, comments,
 * function names). `highlight="2|5-6|all"` marks line ranges, one per press of → (as in reveal.js
 * and Slidev); the first range shows when the slide opens. Keep it under about 10 lines of 64 characters.
 * `tokenize` swaps the highlighter: a function from a line to its spans (see `tokenize` above).
 */
export function Code({
  children,
  title,
  caption,
  highlight,
  numbers = true,
  start = 200,
  tokenize: tokens = tokenize,
}: {
  /** The source, usually a template literal. Common indentation and blank edge lines are removed. */
  children: string;
  /** A file name above the panel. */
  title?: ReactNode;
  /** A sentence under the panel. */
  caption?: ReactNode;
  highlight?: string;
  numbers?: boolean;
  start?: number;
  /** Your own highlighter: one line in, its nodes out (spans with the `tok-*` classes). Defaults to the built-in one. */
  tokenize?: (line: string) => Array<ReactNode>;
}) {
  const lines = children.replace(/^\s*\n|\n\s*$/g, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  const code = lines.map((l) => l.slice(indent));
  const stepsSets = highlight ? parseSteps(highlight, code.length) : null;
  const step = useBuildStep(stepsSets ? stepsSets.length - 1 : 0);
  const lit = stepsSets ? stepsSets[Math.min(step, stepsSets.length - 1)] : null;
  const marks = lit && lit.size < code.length ? lit : null;

  return (
    <Reveal delay={start}>
      {title && <div className="type-label mb-4 text-ink-2">{title}</div>}
      <pre className="code-block rule-top-strong overflow-hidden rounded-box bg-surface py-8 font-mono text-code leading-[1.6] font-[450]">
        {code.map((line, i) => (
          <div
            key={i}
            className={`flex pr-(--pad-box) transition-colors duration-300 ${marks?.has(i + 1) ? "bg-highlight shadow-[inset_var(--rule-strong)_0_var(--color-accent)]" : ""}`}
          >
            {numbers ? (
              <span className="w-[104px] shrink-0 pr-9 text-right text-ink-3 select-none">{i + 1}</span>
            ) : (
              <span className="w-(--pad-box) shrink-0" />
            )}
            <code className="whitespace-pre">{line ? tokens(line) : " "}</code>
          </div>
        ))}
      </pre>
      {caption && <p className="type-small mt-7 text-ink-2">{caption}</p>}
    </Reveal>
  );
}

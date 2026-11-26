// The deck's motif: the route as a line with a dot per stop. It opens the talk, loses a third of
// its stops on one slide and returns, thinned, at the end. A one-off block, so it lives with the deck.
import { delay } from "@core";

/** The `after` stops that stay out of `stops`, spread evenly; both ends always stay. */
const keptStops = (stops: number, after: number) =>
  new Set(Array.from({ length: after }, (_, k) => Math.round((k * (stops - 1)) / (after - 1))));

/** A route drawn as a line with a dot per stop. `after` thins it to that many stops; `ghost` leaves the removed ones as rings. */
export function RouteLine({
  stops,
  after,
  ghost = false,
  width = 1680,
  start = 200,
}: {
  stops: number;
  after?: number;
  ghost?: boolean;
  width?: number;
  start?: number;
}) {
  const gap = width / (stops - 1);
  const stay = after === undefined ? undefined : keptStops(stops, after);

  return (
    <svg width={width} height={40} className="overflow-visible" role="img" aria-label={`A route with ${after ?? stops} stops`}>
      <line x1={0} x2={width} y1={20} y2={20} pathLength={1} className="draw stroke-ink-2" strokeWidth={4} style={delay(start)} />
      {Array.from({ length: stops }, (_, i) => {
        const stays = stay?.has(i) ?? true;

        if (!stays && !ghost) {
          return null;
        }

        return (
          <circle
            key={i}
            cx={i * gap}
            cy={20}
            r={stays ? 11 : 7}
            className={`pop ${stays ? "fill-accent" : "fill-surface stroke-ink-2"}`}
            strokeWidth={stays ? 0 : 2}
            style={delay(start + 300 + i * 25)}
          />
        );
      })}
    </svg>
  );
}

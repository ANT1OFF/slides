import type { ReactNode } from "react";
import { Build, Reveal, delay } from "@core";
import { stepOf, type BuildProp } from "./steps.ts";

export interface Tier {
  name: string;
  rule: ReactNode;
  where?: ReactNode;
}

// From ink to the accent, along the axis: one hue family, so the tiers read as one scale.
const stop = (t: number) => `color-mix(in oklab, var(--color-ink) ${Math.round((1 - t) * 100)}%, var(--color-accent))`;

/** An axis from ink to the accent with evenly spaced tiers, labelled at both ends, and an optional floor callout. */
export function Spectrum({
  tiers,
  left,
  right,
  floor,
  build = false,
}: {
  tiers: Array<Tier>;
  left: string;
  right: string;
  floor?: ReactNode;
  /** Reveal one tier per press of →, then the floor. A number sets the first tier's step. */
  build?: BuildProp;
}) {
  const n = tiers.length;
  const stepping = build !== false;

  return (
    <div className="flex flex-col gap-10">
      <div className="relative h-28">
        <div
          className="grow-x absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-ink to-accent"
          style={delay(250)}
        />
        {tiers.map((t, i) => (
          <Build key={t.name} at={stepOf(build, i)} enabled={stepping}>
            <div
              className="pop absolute top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-canvas shadow-lg"
              style={{
                left: `${((i + 0.5) / n) * 100}%`,
                background: stop(i / Math.max(n - 1, 1)),
                ...delay(700 + i * 160),
              }}
            />
          </Build>
        ))}
        <Reveal effect="fade" delay={500} className="absolute -top-6 left-0 type-label text-ink-2">
          ← {left}
        </Reveal>
        <Reveal effect="fade" delay={500} className="absolute -top-6 right-0 type-label text-ink-2">
          {right} →
        </Reveal>
      </div>
      <div className="grid gap-10" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {tiers.map((t, i) => (
          <Build key={t.name} at={stepOf(build, i)} enabled={stepping}>
            <Reveal delay={850 + i * 160} className="flex flex-col gap-4 text-center">
              <div className="type-small weight-strong">{t.name}</div>
              <div className="mt-2 text-[28px] leading-snug text-ink-2">{t.rule}</div>
              {t.where && <div className="type-label mt-2 text-ink-2">{t.where}</div>}
            </Reveal>
          </Build>
        ))}
      </div>
      {floor && (
        <Build at={stepOf(build, n)} enabled={stepping}>
          <Reveal delay={850 + n * 160 + 200} className="rule-top-strong type-body mt-4 rounded-box bg-surface px-(--pad-box) py-6">
            {floor}
          </Reveal>
        </Build>
      )}
    </div>
  );
}

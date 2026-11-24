// Messages between the deck window and the presenter window it opened. postMessage over
// window.opener works for a file:// deck, where BroadcastChannel and storage events may not.

export interface Position {
  index: number;
  /** Build step; Infinity means every build on the slide is shown. */
  step: number;
}

export type Message =
  | { type: "slides:state"; position: Position; display: "absolute" | "relative" }
  | { type: "slides:hello" }
  | { type: "slides:nav"; dir: 1 | -1 };

const isPosition = (p: unknown): p is Position =>
  typeof p === "object" &&
  p !== null &&
  Number.isInteger((p as Position).index) &&
  (p as Position).index >= 0 &&
  typeof (p as Position).step === "number" &&
  (p as Position).step >= 0;

/** Checks a message's shape fully; anything else posted to the window is ignored. */
export function isMessage(data: unknown): data is Message {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const m = data as Record<string, unknown>;
  switch (m.type) {
    case "slides:hello": {
      return true;
    }
    case "slides:nav": {
      return m.dir === 1 || m.dir === -1;
    }
    case "slides:state": {
      return isPosition(m.position) && (m.display === "absolute" || m.display === "relative");
    }
    default: {
      return false;
    }
  }
}

export function presenterUrl(): string {
  const url = new URL(location.href);
  url.searchParams.set("presenter", "1");
  return url.toString();
}

export const isPresenter = () => new URLSearchParams(location.search).has("presenter");

// A deck opened from disk has an opaque origin, which postMessage can only target with "*" and
// reports inconsistently, so there the window check (event.source) is what keeps others out.
const fromDisk = () => location.protocol === "file:";
export const postTarget = () => (fromDisk() ? "*" : location.origin);
export const sameOrigin = (e: MessageEvent) => fromDisk() || e.origin === location.origin;

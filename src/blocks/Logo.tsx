import { useDeck } from "@core";

/**
 * The logo in slide headers: the deck's `logo`, which the app fills in from its theme folder
 * (src/themes/<name>/logo.svg) unless the deck sets its own. `null` hides it.
 */
export function Logo({ className = "" }: { className?: string }) {
  const { logo } = useDeck();
  if (logo === null || logo === undefined) return null;
  return <span className={`block [&>*]:h-full [&>*]:w-auto ${className}`}>{logo}</span>;
}

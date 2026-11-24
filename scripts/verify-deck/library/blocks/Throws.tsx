// Fixture: a block whose `example` fails to render. `npm run verify` must report it, not show a blank view.
export function Throws({ items }: { items?: string[] }) {
  return <p>{items!.length}</p>;
}

export const example = <Throws />;

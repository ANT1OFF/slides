// Fixture: a library block with an `example`, which the library view shows inside a Frame.
export function Good({ text }: { text: string }) {
  return <p id="good-block">{text}</p>;
}

export const example = <Good text="A block's example" />;

// Fixture: a layout. Its `example` is a slide(), so the library view shows it as it is, not inside a Frame.
import { slide } from "@core";
import { Slide } from "@blocks";

export function Whole({ text }: { text: string }) {
  return (
    <Slide>
      <p id="whole-block">{text}</p>
    </Slide>
  );
}

export const example = slide(<Whole text="A layout's example" />);

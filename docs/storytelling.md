# Storytelling with slides

Start with the sentence you want someone to repeat after the talk. For a ten-slide update,
you might use one slide for the ask, one for the baseline, three for results, two for risks,
two for next steps and one for the decision. Read the outline aloud before choosing effects.

## For a simple deck

- **Give each slide one establishing image, one change and one payoff.** Establish what the
  audience is looking at, show what shifted and make the consequence clear. A chart or diagram
  can be the image. A single static chart can show all three by labelling the baseline,
  highlighting the difference and stating what it means in the title.
- **Write one headline of ten words or fewer.** Use a sentence that states the takeaway,
  such as “The smaller batch cleared the queue sooner.” Use a shorter title if your theme
  or house rules call for it.
- **Make the picture carry the number.** Use `DotGrid` to show how many units out of a whole
  (for thousands, a [`Crowd`](motion.md#crowd-a-number-as-that-many-dots) draws one dot each),
  `Pie` for shares of one total, `BarSeries` or `HBars` to compare amounts on a common
  scale, and `LineChart` for change over time. Keep units and labels visible. For one
  standalone value, use `Stat`, which uses `CountUp` from `@core`. Pair a count with a
  comparison chart if the size of the difference is the point.
- **Repeat one motif.** The same labelled target line on several charts can connect results
  to the original goal. Repeat it where the relationship matters.
- **Hand off to the next slide.** End with the consequence or open question the next slide
  addresses. A result about wait time can lead straight into which queue is still growing.
  Put that sentence in the speaker notes so you can deliver it before advancing.
- **Put the source and caveat on screen.** Use `asOf(data, "source label")` in a `Frame`
  footer for the date and source. Put a qualifier that affects interpretation next to the
  claim, such as “Weekdays only” beside the chart. Draw the chart and any numeric wording
  from the same [data file](working-with-decks.md#data-that-can-be-refreshed): `<Fact of>` puts
  a value from it in a headline, and `npm run verify` lists numbers that were typed in instead.
- **Close on one clear action.** Bring the opening question back with its answer, then leave
  a simple last frame with the decision or next step. `EndSlide` can carry that line.

## Going further

- **Use two to four builds on slides that need staging.** Put the establishing image on
  screen first. Use `Build` from `@core` to reveal the change and then the headline, with
  time to read the result before advancing. If you need more steps, split the slide.
  Keep the full picture and takeaway clear together in the overview and PDF.
- **Pace a step in seconds when the order matters.** Inside a `Build`, a `Beat` lands its
  content a moment after the step arrives, so the picture moves first and the headline
  follows a second or two later; `Build until` lets the previous headline leave. Keep holds
  alive with `Ambient` behind a photo. See [timed steps](motion.md#timed-steps-beat-splittext-and-ambient).
- **Carry the motif across a cut.** End one slide with a mark that the audience can find
  immediately on the next. For example, a highlighted bar can become the starting value
  on a slide that explains where it came from. Consistent placement can make the
  connection with a plain cut.
- **Try a false ending when the story earns one.** Pause on an apparent close, then return
  to an earlier image and show one detail that changes its meaning. Give that callback
  a moment to register, then settle on a quiet final frame.

Two worked examples: [example-simple](../examples/example-simple/index.tsx) is a plain monthly
update written to the first list, and [example-cinematic](../examples/example-cinematic/index.tsx)
a staged talk that uses the second, with its motif in a file of its own.

Pick blocks from the [showcase](../src/decks/showcase/index.tsx). Use the
[brief template](../templates/BRIEF.md) to plan the deck and the
[presentation checklist](checklist.md) to rehearse it.

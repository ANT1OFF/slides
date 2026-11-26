# Before you present

## Review the deck

- [ ] Say the talk aloud. Check that each headline makes one point, each visual makes the
      evidence easy to read, and the last slide leaves the audience with a clear takeaway.
- [ ] For a deck with refreshable figures, run `npm run refresh <deck>`. Follow the printed
      instructions for agent sources and get updated values for manual sources. Check for failed
      scripts, then check that charts, headlines and notes agree with the updated values.
      Confirm that source dates and important caveats are visible on the slides.
- [ ] Run `npm run check` to check formatting, lint and types and build the decks. Run
      `npm run verify` to exercise the built decks offline, including layout, assets and keys.
      It also walks every step forwards and back, jumps to each one by URL, clicks through fast,
      and audits the motion (below). Look at `dist/qa/<deck>/` when it fails, or before a talk.
- [ ] Open `dist/<deck>.html` from disk with the network off. Rehearse on the presenting
      machine at the size you'll use. Step forward and back through any builds and transitions.
      Check that the point still reads with reduced motion enabled.

## Rehearse the controls

- [ ] Press **F** for fullscreen and check which display holds the audience view.
- [ ] Press **N** to open the presenter window. Check your notes, next slide and timer.
      Keep this window on your own screen.
- [ ] Press **G** to see the overview and practice jumping to a slide. Check that the
      thumbnails show the finished content.
- [ ] Tap the stage or swipe left to advance a build or slide. Swipe right or right-click
      the stage to go back.
- [ ] If using autoplay, press **A** to start it and check the pacing through builds and
      slides. Press **A** again or navigate manually to pause.
- [ ] Press **B** or **.** to blank the audience view during discussion. Press a key to restore it.
- [ ] Press **?** to see the available shortcuts, including any added by the deck.

## Export and share

- [ ] For a handout, press **P** and choose **Save as PDF**, or run `npm run pdf <deck>` to
      write `dist/<deck>.pdf`. Check that each visible slide has one page with its final
      content, including any labels revealed during the talk.
- [ ] Before sharing the HTML, review its hidden slides, speaker notes and embedded data
      for material that is private to your team.

## Reading the QA pictures

`npm run verify` walks every built deck (in `dist/`, the examples and the showcase) and writes what
it saw to `dist/qa/<deck>/`. People and agents can read these the same way.

- **`steps.png`**: every step of every visible slide, walked with →, captioned `slide.step id`. Read
  it like a storyboard. Each step should add one thing, and nothing should be cut off or overlap.
- **`final-states.png`**: one row per slide. Left to right: the walk's last step, then with reduced
  motion, in the overview (G) and in print (P, which is what `npm run pdf` exports). All four
  should look the same. A red outline is a check that failed, and `Δ` is the share of the picture
  that differs.
- **`motion/NNN-forward|back-<from>-<kind>.png`**: a film strip of one move, read left to right,
  row by row: `before`, frames 50 ms apart (fewer for a move over 1.5 s), the last frame, `after`.
  The yellow line on top is the mean brightness, frame by frame. Each caption gives the time, the
  brightness `L` and `Δ`, the change since the frame before. A strip is written the first time
  each kind of move shows up (each transition with its direction, and each kind of build, going
  forward; each transition going back), and for every move that failed.
  - A **pop** is a red frame where a lot of the picture changes in a single frame, when nothing
    declared should move it there: a move that starts or ends away from the still picture, or a
    build that jumps between display frames. A cut, `transition: "none"` or a step back within a
    slide (which lands settled) changes at once on purpose and is not a pop. Neither is a number
    counting up (`Stat`, `CountUp`), whose digits change every frame. Neither is ambient
    drift, which is a loop.
  - A **flash** is a part of the slide (a 4×4 tile) that gets brighter and darker again by a tenth
    of the range more than three times in one second. Long before that point, motion like this
    is hard on the eyes. It is also a photosensitivity risk (WCAG 2.3.1).
- **`report.json`**: every move with its kind, its length in ms and what each check found, plus
  the seconds each part of the walk took.

What verify checks on each deck, and how it saves time:

- **Jump equals walk:** every step opened by its hash (`#5.2`, in a shuffled order) and two by
  opening the file must show the same text and visible elements as the walk, with under 0.4% of
  the picture different.
- **Back:** ← from the last step to the first must retrace the walk, step by step and picture by
  picture, across every transition. No `data-transition`, style on `<html>` or
  `view-transition-name` may be left behind.
- **Fast clicks:** →, Space and PageDown 30 ms apart through the deck, then right-clicks back,
  must land on the exact step, settled.
- **Final states and reduced motion:** with reduced motion, nothing may animate on any step.
- **Sampling, for speed:** moves are held and stepped by setting the time of their paused
  animations, so frames are exact on any machine. A move that isn't the first of its kind is shot
  only at its first and last frame. A long deck is walked in parts of 12 slides on pages of their
  own, at the same time, and the decks run alongside each other.

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

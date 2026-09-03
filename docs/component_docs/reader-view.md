# Reader view

## Scope

Show the current chunk in the overlay and let the user move, restyle, or close the session. This stage does not capture, tokenize, or chunk text.

## Input

- A shadow root to render into
- A navigator (current chunk and position)
- Reader settings (font, font size, weight, theme, display mode)
- Callbacks: close, and persist settings changes

## Output

- The on-screen reader: current chunk, place marker, previous/next, settings, close
- Calls `next` / `prev` on the navigator as the user moves
- Emits updated settings when the user changes them
- Calls close when the user dismisses the overlay

## Features

- Show one chunk at a time, with `n / total` place text
- Disable previous on the first chunk and next on the last; on the last chunk, show “end of section reached” with a confetti popper
- Move with Previous/Next, left/right arrows, and wheel
- Open a settings panel for font, font size, weight, words-on-screen, and theme (including custom background and text colors); appearance applies immediately
- Close on Escape (or close the settings panel first if it is open)
- Keep keyboard focus inside the overlay
- Announce the current chunk to screen readers
- When a new navigator is supplied (chunks rebuilt), refresh the display without recapturing text

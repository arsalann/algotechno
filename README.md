# algotechno

Live-coding rig for algorithmic acid techno, built on [Strudel](https://strudel.cc) (TidalCycles in the browser — no SuperCollider install needed).

## Run

```sh
npm start          # → http://localhost:4321
```

Open in Chrome, hit **play** once to unlock audio.

## Two ways to play

1. **In the browser** — edit code in the page, `Ctrl/Cmd+Enter` to re-evaluate, `Ctrl+.` to stop.
2. **From your editor** — edit any `patterns/*.js` file and save; the server pushes it to the browser and it hot-swaps on the next evaluation. (Toggle with the "hot-swap" checkbox.)

## Customising without memorising syntax

- **Block palette (left sidebar)** — click or drag pieces into the code.
  Green = sounds (added into the `stack`), blue = effects (added to the line your cursor is on), pink = song-level lines.
  Add your own blocks in [`blocks.js`](blocks.js).
- **Sliders** — `slider(value, min, max)` shows a draggable knob inside the code; drag it while the music plays.
- **Autocomplete** — start typing (`.lp…`) to get suggestions; hover a function name for docs.
- **Error checking** — mistakes are checked as you type: the line turns red (error) or orange (warning) and the panel under the code explains it in plain English. Typos get a "did you mean…?" you can click to fix. Code with a red error won't play; the previous version keeps going so the music never stops.
- **🎹 notes (⌘B)** — visual piano-roll for the `note("...")` on the line your cursor is on. Click to set notes, shift+click to build chords, chord mode to drop whole chords, plus acid-riff and chord-progression presets in any key.
- **💾 save (⌘S) / save as… (⇧⌘S)** — writes your browser edits to `patterns/`. "● unsaved" shows when you have changes.
- **🎲 mutate** — makes one small random musical change (new phrase, scale, sweep speed, a knob…). `⌘Z` undoes it.

## Patterns

- `01-acid-basics.js` — one 303 line + 909, learn the knobs
- `02-generative-303.js` — self-writing sequence, random accents, looped randomness
- `03-warehouse.js` — two acid lines, rumble, fills; mute layers live
- `scratch.js` — blank-ish pad for your set

See [CHEATSHEET.md](CHEATSHEET.md).

## Recording

Route browser audio with BlackHole/Loopback into your DAW, or use Strudel's built-in export at strudel.cc.

# Acid cheatsheet (Strudel)

| want | code |
|---|---|
| tempo | `setcps(BPM/60/4)` |
| 303 voice | `.s("sawtooth")` or `"square"` |
| squelch | `.lpf(800).lpq(20)` — resonance 15–25 is the sweet spot |
| filter env | `.lpenv(4).lpdecay(.1)` |
| sweep | `.lpf(sine.range(200,3000).slow(8))`, also `perlin`, `saw`, `rand` |
| short plucks | `.decay(.1).sustain(0)` |
| distortion | `.shape(.5)` / `.distort(2)` |
| random notes in key | `n(irand(8).segment(16)).scale("C2:minor")` |
| loop the randomness | `.ribbon(offset, cycles)` — change offset to reroll |
| rests | `.degradeBy(.3)` |
| accents | `.velocity(rand.range(.5,1))` |
| fills | `.every(4, x => x.fast(2))`, `.sometimesBy(.2, x => x.ply(2))` |
| alternate per bar | `"<c2 eb2 g2>"` |
| stereo widen | `.jux(rev)` |
| dub delay | `.delay(.4).delaytime(3/16).delayfeedback(.5)` |
| drum machines | `.bank("RolandTR909")`, `"RolandTR808"`, `"RolandTR707"` |
| mute a layer | prefix with `_` e.g. `_$:` or comment it out |

Keys: **Ctrl/Cmd+Enter** evaluate · **Ctrl+.** stop.
Docs: https://strudel.cc/learn

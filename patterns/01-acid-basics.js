// 01 — ACID BASICS
// one 303-style line + 909 kit. tweak the numbers, ctrl+enter.
setcps(132/60/4) // 132 bpm, 4 beats per cycle

stack(
  // drums
  s("bd*4").bank("RolandTR909").gain(1),
  s("~ hh ~ hh ~ hh ~ [hh hh]").bank("RolandTR909").gain(.5),
  s("~ cp").bank("RolandTR909").room(.3),

  // the acid line: sawtooth through a resonant lowpass
  note("<c2 c2 eb2 c2> [c3 ~ c2 c2] [~ g2 c2 bb1] [c2 c3]")
    .s("sawtooth")
    .lpf(sine.range(300, 2200).slow(8))   // filter sweep = the whole genre
    .lpq(18)                               // resonance → squelch
    .lpenv(4).lpdecay(.12)                 // per-note filter envelope
    .decay(.15).sustain(.3)
    .shape(.4)                             // dirt
    .gain(.7)
)

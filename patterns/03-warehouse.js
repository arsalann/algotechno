// 03 — WAREHOUSE
// two 303s talking, rumble bass, build/drop via `every`
setcps(140/60/4)

const kick = s("bd*4").bank("RolandTR909").shape(.3)
const rumble = note("c1*4").s("sine").late(.125).lpf(120).decay(.3).sustain(0).room(.6).gain(.6)
const hats = s("hh*16").bank("RolandTR909").gain(perlin.range(.2, .55)).pan(sine.slow(4))
const clap = s("~ cp").bank("RolandTR909").room(.5)

const acidA = note("c2 [~ c3] eb2 [c2 g2] ~ c2 bb1 [c2 c3]")
  .s("sawtooth").lpq(22).lpenv(5).lpdecay(.08)
  .lpf(sine.range(200, 1800).slow(12))
  .decay(.1).sustain(.2).shape(.6).gain(.6)
  .every(4, x => x.fast(2))              // double-time fill every 4 bars

const acidB = note("<g3 f3 eb3 bb2>*8")
  .s("square").lpq(15).lpf(cosine.range(400, 4000).slow(7))
  .decay(.07).sustain(0).gain(.3)
  .jux(rev)                              // stereo mirror
  .delay(.4).delaytime(3/16).delayfeedback(.55)

// mute groups: comment lines in/out while playing
stack(
  kick,
  rumble,
  hats,
  clap,
  acidA,
  acidB,
)

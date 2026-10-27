// SCRATCH — your live-coding pad. save this file and it hot-swaps in the browser.
setcps(130/60/4)

stack(
  s("bd*4").bank("RolandTR909"),
  note("c2*16").s("sawtooth").lpf(sine.range(200, 2000).slow(4)).lpq(20).decay(.1).sustain(0),
)

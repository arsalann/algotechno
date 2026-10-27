// 02 — GENERATIVE 303
// the sequence rewrites itself: random notes from a scale, random accents & slides
setcps(136/60/4)

const acid = n(irand(8).segment(16))      // 16 random steps per bar...
  .scale("C2:minor:pentatonic")
  .ribbon(0, 2)                           // ...locked into a 2-bar loop (change seed offset to reroll)
  .degradeBy(.25)                         // rests
  .s("sawtooth")
  .lpf(perlin.range(250, 3000).slow(16))
  .lpq(sine.range(10, 25).slow(32))
  .lpenv(perlin.range(2, 6)).lpdecay(.1)
  .decay(.12).sustain(0)
  .velocity(rand.range(.5, 1))            // accents
  .shape(.5)
  .delay(.25).delaytime(3/16).delayfeedback(.4)

stack(
  s("bd*4").bank("RolandTR909"),
  s("[~ hh]*4").bank("RolandTR909").gain(.45).sometimesBy(.2, x => x.ply(2)),
  s("~ ~ ~ oh").bank("RolandTR909").gain(.3),
  s("<~ cp ~ [cp cp]>").bank("RolandTR909").room(.4).late(.25),
  acid.gain(.7),
)

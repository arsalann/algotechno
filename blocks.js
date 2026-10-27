// Building blocks for the sidebar. Add your own!
//   kind: 'layer'    → a whole sound; goes inside stack( ... ) on its own line
//   kind: 'modifier' → starts with "." and gets added onto the end of a layer
//   kind: 'line'     → a song-level line (tempo, fresh start)
// slider(value, min, max) shows a draggable knob right in the code.
//
// Drum machines available via .bank(...): RolandTR909, RolandTR808, RolandTR707, RolandTR606,
// RolandTR505, LinnDrum, OberheimDMX, AkaiMPC60, EmuSP12, BossDR110, KorgMinipops, ... (70+)
// Each has some of: bd sd hh oh cp rim lt mt ht cr rd cb sh perc

export const BLOCKS = [
  {
    group: '909 drums',
    items: [
      { name: '909 kick', kind: 'layer', tip: 'four-on-the-floor kick', code: `s("bd*4").bank("RolandTR909").gain(slider(1, 0, 1.5)),` },
      { name: 'offbeat hats', kind: 'layer', tip: 'hats between the kicks', code: `s("[~ hh]*4").bank("RolandTR909").gain(slider(.5, 0, 1)),` },
      { name: '16th hats', kind: 'layer', tip: 'busy hats with wandering volume', code: `s("hh*16").bank("RolandTR909").gain(perlin.range(.2, .55)),` },
      { name: 'open hat', kind: 'layer', tip: 'open hat on every offbeat', code: `s("[~ oh]*4").bank("RolandTR909").gain(.35).decay(.2),` },
      { name: 'clap', kind: 'layer', tip: 'clap on 2 and 4', code: `s("~ cp").bank("RolandTR909").room(.3),` },
      { name: 'snare roll', kind: 'layer', tip: 'snare that speeds up over 4 bars — classic build', code: `s("<sd*4 sd*8 sd*16 sd*32>").bank("RolandTR909").gain(saw.range(.2, .8).slow(4)),` },
      { name: 'rimshot', kind: 'layer', tip: 'syncopated rim clicks', code: `s("~ rim ~ ~ rim ~ rim ~").bank("RolandTR909").gain(.4),` },
      { name: 'toms', kind: 'layer', tip: 'tom groove', code: `s("~ lt ~ mt ~ ~ ht ~").bank("RolandTR909").gain(.5),` },
      { name: 'ride', kind: 'layer', tip: 'ride cymbal quarter notes', code: `s("rd*4").bank("RolandTR909").gain(.25),` },
      { name: 'crash on 1', kind: 'layer', tip: 'crash at the start of every 8 bars', code: `s("<cr ~ ~ ~ ~ ~ ~ ~>").bank("RolandTR909").gain(.4),` },
    ],
  },
  {
    group: 'Other drum machines',
    items: [
      { name: '808 kick (boomy)', kind: 'layer', tip: 'long 808 kick', code: `s("bd*4").bank("RolandTR808").decay(.8).gain(1.1),` },
      { name: '808 cowbell', kind: 'layer', tip: 'the famous cowbell', code: `s("~ cb ~ [~ cb]").bank("RolandTR808").gain(.3),` },
      { name: '808 shaker', kind: 'layer', tip: '16th shaker', code: `s("sh*16").bank("RolandTR808").gain(perlin.range(.15, .4)),` },
      { name: '808 congas', kind: 'layer', tip: 'percussion pattern', code: `s("perc(5,8)").bank("RolandTR808").gain(.4),` },
      { name: '707 groove', kind: 'layer', tip: 'whole 707 kit, euclidean', code: `s("bd*4, [~ sd]*2, hh(7,16)").bank("RolandTR707"),` },
      { name: '606 hats', kind: 'layer', tip: 'thin, tight hats', code: `s("hh*8").bank("RolandTR606").gain(.4),` },
      { name: 'Linn snare', kind: 'layer', tip: 'LinnDrum snare backbeat', code: `s("~ sd").bank("LinnDrum").gain(.6),` },
      { name: 'DMX break', kind: 'layer', tip: 'Oberheim DMX broken beat', code: `s("bd ~ [~ bd] ~, ~ sd ~ [sd ~], hh*8").bank("OberheimDMX"),` },
      { name: 'euclid kick 3/8', kind: 'layer', tip: '3 kicks spread across 8 steps', code: `s("bd(3,8)").bank("RolandTR909"),` },
      { name: 'random perc', kind: 'layer', tip: 'random hits from many drum machines', code: `s("perc*8").bank("<RolandTR808 RolandTR727>").degradeBy(.5).gain(.35).pan(rand),` },
    ],
  },
  {
    group: 'Acid & bass',
    items: [
      {
        name: 'classic 303', kind: 'layer', tip: 'fixed acid riff with a filter knob',
        code: `note("c2 [~ c3] eb2 [c2 g2] ~ c2 bb1 [c2 c3]")
    .s("sawtooth").lpf(slider(800, 100, 4000)).lpq(slider(18, 0, 30))
    .lpenv(4).lpdecay(.1).decay(.12).sustain(.2).shape(.4).gain(.7),`,
      },
      {
        name: 'generative 303', kind: 'layer', tip: 'random notes in C minor, looped — change the ribbon number to reroll',
        code: `n(irand(8).segment(16)).scale("C2:minor").ribbon(0, 2)
    .s("sawtooth").lpf(slider(900, 100, 4000)).lpq(slider(20, 0, 30))
    .lpenv(4).lpdecay(.1).decay(.12).sustain(0).shape(.4).gain(.7),`,
      },
      {
        name: 'square 303', kind: 'layer', tip: 'hollow square-wave acid',
        code: `note("c2 c2 [c3 c2] ~ eb2 [~ c2] g1 c2")
    .s("square").lpf(sine.range(300, 2500).slow(6)).lpq(22).lpenv(3).lpdecay(.08)
    .decay(.1).sustain(.1).gain(.5),`,
      },
      {
        name: 'stab line', kind: 'layer', tip: 'second, higher square-wave acid part',
        code: `note("<g3 f3 eb3 bb2>*8").s("square")
    .lpf(cosine.range(400, 4000).slow(7)).lpq(15).decay(.07).sustain(0).gain(.3),`,
      },
      { name: 'rumble', kind: 'layer', tip: 'deep reverby sub after each kick', code: `note("c1*4").s("sine").late(.125).lpf(120).decay(.3).sustain(0).room(.6).gain(slider(.6, 0, 1)),` },
      { name: 'offbeat bass', kind: 'layer', tip: 'classic techno bass between kicks', code: `note("[~ c2]*4").s("sawtooth").lpf(400).decay(.15).sustain(0).gain(.6),` },
      { name: 'sub bass', kind: 'layer', tip: 'pure low sine following the root', code: `note("<c1 c1 ab0 bb0>").s("sine").gain(.5),` },
      { name: 'FM bass', kind: 'layer', tip: 'metallic FM bass', code: `note("c2*8").s("sine").fm(slider(3, 0, 8)).fmh(1.5).decay(.12).sustain(0).gain(.5),` },
      { name: 'reese bass', kind: 'layer', tip: 'detuned dark bass', code: `note("<c2 eb2 f2 g1>").s("supersaw").detune(.5).lpf(500).gain(.35),` },
      { name: 'synth bass (GM)', kind: 'layer', tip: 'sampled synth bass', code: `note("c2 ~ c2 c3 ~ c2 eb2 ~").s("gm_synth_bass_1").gain(.7),` },
    ],
  },
  {
    group: 'Synths, chords & leads',
    items: [
      { name: 'minor chord stabs', kind: 'layer', tip: 'dub-techno stab on the offbeat', code: `note("~ [c3,eb3,g3] ~ ~").s("sawtooth").lpf(1200).decay(.15).sustain(0).room(.5).delay(.4).delaytime(3/16).gain(.4),` },
      { name: 'chord progression', kind: 'layer', tip: 'Cm – Ab – Eb – Bb, one per bar', code: `note("<[c3,eb3,g3] [ab2,c3,eb3] [eb3,g3,bb3] [bb2,d3,f3]>").s("supersaw").lpf(1500).attack(.05).release(.3).gain(.3),` },
      { name: 'auto chords', kind: 'layer', tip: 'chord symbols voiced automatically', code: `chord("<Cm9 Abmaj7 Fm9 G7>").voicing().s("gm_epiano1").room(.4).gain(.5),` },
      { name: 'warm pad', kind: 'layer', tip: 'slow evolving pad', code: `note("<[c3,g3,eb4] [ab2,eb3,c4]>").s("gm_pad_warm").attack(.5).release(1).room(.7).gain(.4),` },
      { name: 'supersaw lead', kind: 'layer', tip: 'big trance-y lead', code: `note("<c4 eb4 g4 bb4>*4").s("supersaw").lpf(sine.range(800, 4000).slow(8)).decay(.2).sustain(.3).gain(.3),` },
      { name: 'arpeggio', kind: 'layer', tip: 'arpeggiated minor chord', code: `n("0 2 4 7 4 2".fast(2)).scale("C4:minor").s("triangle").decay(.1).sustain(0).delay(.3).gain(.35),` },
      { name: 'bleeps', kind: 'layer', tip: 'random high blips', code: `n(irand(12).segment(8)).scale("C5:minor:pentatonic").s("sine").degradeBy(.5).decay(.05).sustain(0).delay(.5).gain(.25),` },
      { name: 'organ', kind: 'layer', tip: 'house organ stabs', code: `note("~ [c3,eb3,g3] ~ [c3,eb3,g3]").s("gm_drawbar_organ").gain(.35),` },
      { name: 'piano chords', kind: 'layer', tip: 'house piano', code: `note("[c3,eb3,g3] ~ [~ [c3,eb3,g3]] ~").s("piano").gain(.5),` },
      { name: 'choir', kind: 'layer', tip: 'ghostly choir pad', code: `note("<[c4,eb4,g4] [bb3,d4,f4]>").s("gm_choir_aahs").room(.8).gain(.4),` },
    ],
  },
  {
    group: 'Noise & atmosphere',
    items: [
      { name: 'noise riser', kind: 'layer', tip: 'white noise sweeping up every 8 bars', code: `s("white").hpf(saw.range(200, 8000).slow(8)).gain(saw.range(0, .3).slow(8)),` },
      { name: 'pink hiss', kind: 'layer', tip: 'quiet texture underneath', code: `s("pink").lpf(3000).gain(.05),` },
      { name: 'crackle', kind: 'layer', tip: 'vinyl crackle', code: `s("crackle*4").gain(.3),` },
      { name: 'rain', kind: 'layer', tip: 'rain fx', code: `note("c3").s("gm_fx_rain").gain(.3),` },
      { name: 'sci-fi zaps', kind: 'layer', tip: 'weird fx, sometimes', code: `note("c4").s("gm_fx_sci_fi").degradeBy(.7).gain(.3),` },
      { name: 'reverse cymbal', kind: 'layer', tip: 'swell into the next 4 bars', code: `note("<~ ~ ~ c4>").s("gm_reverse_cymbal").gain(.4),` },
    ],
  },
  {
    group: 'Filter & tone',
    items: [
      { name: 'filter sweep', kind: 'modifier', tip: 'filter opens and closes over 8 bars', code: `.lpf(sine.range(200, 2500).slow(8))` },
      { name: 'filter knob', kind: 'modifier', tip: 'lowpass you control by hand', code: `.lpf(slider(1000, 100, 5000))` },
      { name: 'squelch', kind: 'modifier', tip: 'resonance — the acid "wow"', code: `.lpq(slider(20, 0, 30))` },
      { name: 'filter env', kind: 'modifier', tip: 'each note opens the filter a little', code: `.lpenv(4).lpdecay(.1)` },
      { name: 'highpass knob', kind: 'modifier', tip: 'cut the lows — great for breakdowns', code: `.hpf(slider(20, 20, 2000))` },
      { name: 'bandpass', kind: 'modifier', tip: 'telephone-y midrange', code: `.bandf(slider(1000, 200, 4000)).bandq(3)` },
      { name: 'vowel', kind: 'modifier', tip: 'talking filter', code: `.vowel("<a e i o>")` },
      { name: 'pitch up/down', kind: 'modifier', tip: 'transpose in semitones', code: `.add(note(slider(0, -12, 12)))` },
    ],
  },
  {
    group: 'Envelope & dirt',
    items: [
      { name: 'pluck', kind: 'modifier', tip: 'short bouncy notes', code: `.decay(.1).sustain(0)` },
      { name: 'long notes', kind: 'modifier', tip: 'held notes', code: `.attack(.01).sustain(1).release(.3)` },
      { name: 'slow attack', kind: 'modifier', tip: 'fades in', code: `.attack(slider(.3, 0, 2))` },
      { name: 'distortion', kind: 'modifier', tip: 'warm dirt', code: `.shape(slider(.4, 0, .9))` },
      { name: 'hard distort', kind: 'modifier', tip: 'aggressive distortion', code: `.distort(slider(2, 0, 8))` },
      { name: 'bitcrush', kind: 'modifier', tip: 'lo-fi bits (lower = crunchier)', code: `.crush(slider(6, 2, 16))` },
      { name: 'downsample', kind: 'modifier', tip: 'aliasing grit', code: `.coarse(slider(4, 1, 32))` },
      { name: 'volume knob', kind: 'modifier', tip: 'a fader for this layer', code: `.gain(slider(.7, 0, 1.2))` },
      { name: 'pump (sidechain)', kind: 'modifier', tip: 'ducks on every kick', code: `.gain("[.2 1 1 1]*4")` },
    ],
  },
  {
    group: 'Rhythm & variation',
    items: [
      { name: 'random rests', kind: 'modifier', tip: 'drop some notes at random', code: `.degradeBy(slider(.2, 0, .8))` },
      { name: 'accents', kind: 'modifier', tip: 'random loud/soft notes', code: `.velocity(rand.range(.5, 1))` },
      { name: 'fill every 4', kind: 'modifier', tip: 'double speed every 4th bar', code: `.every(4, x => x.fast(2))` },
      { name: 'stutter', kind: 'modifier', tip: 'sometimes repeat notes', code: `.sometimesBy(.2, x => x.ply(2))` },
      { name: 'swing', kind: 'modifier', tip: 'shuffle the 16ths', code: `.swingBy(1/6, 4)` },
      { name: 'shift around', kind: 'modifier', tip: 'start the pattern from a different step each bar', code: `.iter(4)` },
      { name: 'reverse sometimes', kind: 'modifier', tip: 'backwards every 3rd bar', code: `.every(3, rev)` },
      { name: 'echo off-beat', kind: 'modifier', tip: 'adds an octave-up copy an 1/8 later', code: `.off(1/8, x => x.add(note(12)).gain(.5))` },
      { name: 'ratchet', kind: 'modifier', tip: 'random rolls', code: `.sometimesBy(.15, x => x.ply("<2 3 4>"))` },
      { name: 'half time', kind: 'modifier', tip: 'everything twice as slow', code: `.slow(2)` },
      { name: 'double time', kind: 'modifier', tip: 'everything twice as fast', code: `.fast(2)` },
      { name: 'per-bar notes', kind: 'modifier', tip: 'transpose each bar: 0, 3, 5, 0', code: `.add(note("<0 3 5 0>"))` },
    ],
  },
  {
    group: 'Space & FX',
    items: [
      { name: 'dub delay', kind: 'modifier', tip: 'echoes', code: `.delay(.3).delaytime(3/16).delayfeedback(.45)` },
      { name: 'long delay', kind: 'modifier', tip: 'big spacey echoes', code: `.delay(.5).delaytime(3/8).delayfeedback(.65)` },
      { name: 'reverb', kind: 'modifier', tip: 'room', code: `.room(slider(.3, 0, 1))` },
      { name: 'huge reverb', kind: 'modifier', tip: 'cathedral', code: `.room(.9).roomsize(8)` },
      { name: 'stereo wide', kind: 'modifier', tip: 'reversed copy on the other side', code: `.jux(rev)` },
      { name: 'auto pan', kind: 'modifier', tip: 'moves left/right', code: `.pan(sine.slow(4))` },
      { name: 'random pan', kind: 'modifier', tip: 'each note somewhere else', code: `.pan(rand)` },
      { name: 'phaser', kind: 'modifier', tip: 'swooshy phaser', code: `.phaser(slider(2, 0, 8)).phaserdepth(.6)` },
      { name: 'tremolo', kind: 'modifier', tip: 'choppy volume wobble', code: `.gain(sine.range(.2, 1).fast(8))` },
      { name: 'chop', kind: 'modifier', tip: 'chop each sound into slices', code: `.chop(4)` },
    ],
  },
  {
    group: 'Song structure',
    items: [
      { name: 'tempo', kind: 'line', tip: 'sets the BPM — change the 132 (sliders can\'t control tempo)', code: `setcps(132/60/4)` },
      { name: 'empty track', kind: 'line', tip: 'a fresh start', code: `setcps(132/60/4)\n\nstack(\n  s("bd*4").bank("RolandTR909"),\n).postgain(.5)` },
      { name: 'only every other 8 bars', kind: 'modifier', tip: 'layer plays 8 bars on, 8 bars off', code: `.mask("<1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0>")` },
      { name: 'drop out last bar', kind: 'modifier', tip: 'silent on the 4th bar of every 4 — a mini-break', code: `.mask("<1 1 1 0>")` },
      { name: 'come in after 16', kind: 'modifier', tip: 'silent for 16 bars, then plays', code: `.mask("<0!16 1!16>")` },
      { name: 'fade in over 16', kind: 'modifier', tip: 'volume ramps up over 16 bars', code: `.gain(saw.range(0, 1).slow(16))` },
    ],
  },
];

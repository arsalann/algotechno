// Sounds you can play from the KEYS (chord pad). Add your own!
//   s: any Strudel sound name · params: extra settings baked into the sound (optional)
// GM sounds are sampled instruments (General MIDI soundfont); the rest are synths.

export const SOUNDS = [
  // ---- synths ----
  { id: 'supersaw', name: 'Supersaw', cat: 'Synth', s: 'supersaw' },
  { id: 'sawtooth', name: 'Saw', cat: 'Synth', s: 'sawtooth' },
  { id: 'square', name: 'Square / pulse', cat: 'Synth', s: 'square' },
  { id: 'triangle', name: 'Triangle', cat: 'Synth', s: 'triangle' },
  { id: 'sine', name: 'Sine', cat: 'Synth', s: 'sine' },
  { id: 'fm_bell', name: 'FM bell', cat: 'Synth', s: 'sine', params: { fm: 4, fmh: 3.5 } },
  { id: 'fm_epiano', name: 'FM e-piano', cat: 'Synth', s: 'sine', params: { fm: 1.5, fmh: 1 } },
  { id: 'fm_metal', name: 'FM metal', cat: 'Synth', s: 'square', params: { fm: 6, fmh: 1.41 } },
  { id: 'gm_lead_2_sawtooth', name: 'Saw lead', cat: 'Synth', s: 'gm_lead_2_sawtooth' },
  { id: 'gm_lead_1_square', name: 'Square lead', cat: 'Synth', s: 'gm_lead_1_square' },
  { id: 'gm_lead_5_charang', name: 'Charang lead', cat: 'Synth', s: 'gm_lead_5_charang' },
  { id: 'gm_synth_brass_1', name: 'Synth brass', cat: 'Synth', s: 'gm_synth_brass_1' },
  // ---- pads & strings ----
  { id: 'gm_pad_warm', name: 'Warm pad', cat: 'Pad', s: 'gm_pad_warm' },
  { id: 'gm_pad_poly', name: 'Poly pad', cat: 'Pad', s: 'gm_pad_poly' },
  { id: 'gm_pad_halo', name: 'Halo pad', cat: 'Pad', s: 'gm_pad_halo' },
  { id: 'gm_pad_sweep', name: 'Sweep pad', cat: 'Pad', s: 'gm_pad_sweep' },
  { id: 'gm_pad_bowed', name: 'Bowed pad', cat: 'Pad', s: 'gm_pad_bowed' },
  { id: 'gm_pad_new_age', name: 'New age pad', cat: 'Pad', s: 'gm_pad_new_age' },
  { id: 'gm_pad_choir', name: 'Choir pad', cat: 'Pad', s: 'gm_pad_choir' },
  { id: 'gm_synth_strings_1', name: 'Synth strings', cat: 'Pad', s: 'gm_synth_strings_1' },
  { id: 'gm_string_ensemble_1', name: 'String ensemble', cat: 'Pad', s: 'gm_string_ensemble_1' },
  { id: 'gm_choir_aahs', name: 'Choir aahs', cat: 'Pad', s: 'gm_choir_aahs' },
  // ---- keys ----
  { id: 'piano', name: 'Grand piano', cat: 'Keys', s: 'piano' },
  { id: 'gm_epiano1', name: 'E-piano (Rhodes)', cat: 'Keys', s: 'gm_epiano1' },
  { id: 'gm_epiano2', name: 'E-piano (DX)', cat: 'Keys', s: 'gm_epiano2' },
  { id: 'gm_clavinet', name: 'Clavinet', cat: 'Keys', s: 'gm_clavinet' },
  { id: 'gm_harpsichord', name: 'Harpsichord', cat: 'Keys', s: 'gm_harpsichord' },
  { id: 'gm_drawbar_organ', name: 'Drawbar organ', cat: 'Keys', s: 'gm_drawbar_organ' },
  { id: 'gm_rock_organ', name: 'Rock organ', cat: 'Keys', s: 'gm_rock_organ' },
  { id: 'gm_church_organ', name: 'Church organ', cat: 'Keys', s: 'gm_church_organ' },
  // ---- bass ----
  { id: 'gm_synth_bass_1', name: 'Synth bass 1', cat: 'Bass', s: 'gm_synth_bass_1' },
  { id: 'gm_synth_bass_2', name: 'Synth bass 2', cat: 'Bass', s: 'gm_synth_bass_2' },
  { id: 'gm_electric_bass_finger', name: 'Electric bass', cat: 'Bass', s: 'gm_electric_bass_finger' },
  { id: 'gm_fretless_bass', name: 'Fretless bass', cat: 'Bass', s: 'gm_fretless_bass' },
  { id: 'gm_acoustic_bass', name: 'Upright bass', cat: 'Bass', s: 'gm_acoustic_bass' },
  // ---- bells & mallets ----
  { id: 'gm_vibraphone', name: 'Vibraphone', cat: 'Bells', s: 'gm_vibraphone' },
  { id: 'gm_marimba', name: 'Marimba', cat: 'Bells', s: 'gm_marimba' },
  { id: 'gm_music_box', name: 'Music box', cat: 'Bells', s: 'gm_music_box' },
  { id: 'gm_celesta', name: 'Celesta', cat: 'Bells', s: 'gm_celesta' },
  { id: 'gm_glockenspiel', name: 'Glockenspiel', cat: 'Bells', s: 'gm_glockenspiel' },
  { id: 'gm_tubular_bells', name: 'Tubular bells', cat: 'Bells', s: 'gm_tubular_bells' },
  { id: 'gm_kalimba', name: 'Kalimba', cat: 'Bells', s: 'gm_kalimba' },
  { id: 'gm_steel_drums', name: 'Steel drums', cat: 'Bells', s: 'gm_steel_drums' },
  // ---- plucked ----
  { id: 'gm_acoustic_guitar_nylon', name: 'Nylon guitar', cat: 'Plucked', s: 'gm_acoustic_guitar_nylon' },
  { id: 'gm_electric_guitar_clean', name: 'Clean guitar', cat: 'Plucked', s: 'gm_electric_guitar_clean' },
  { id: 'gm_electric_guitar_muted', name: 'Muted guitar', cat: 'Plucked', s: 'gm_electric_guitar_muted' },
  { id: 'gm_pizzicato_strings', name: 'Pizzicato', cat: 'Plucked', s: 'gm_pizzicato_strings' },
  { id: 'gm_orchestral_harp', name: 'Harp', cat: 'Plucked', s: 'gm_orchestral_harp' },
  { id: 'gm_sitar', name: 'Sitar', cat: 'Plucked', s: 'gm_sitar' },
  { id: 'gm_koto', name: 'Koto', cat: 'Plucked', s: 'gm_koto' },
  // ---- brass & wind ----
  { id: 'gm_trumpet', name: 'Trumpet', cat: 'Brass & wind', s: 'gm_trumpet' },
  { id: 'gm_brass_section', name: 'Brass section', cat: 'Brass & wind', s: 'gm_brass_section' },
  { id: 'gm_alto_sax', name: 'Alto sax', cat: 'Brass & wind', s: 'gm_alto_sax' },
  { id: 'gm_flute', name: 'Flute', cat: 'Brass & wind', s: 'gm_flute' },
  { id: 'gm_pan_flute', name: 'Pan flute', cat: 'Brass & wind', s: 'gm_pan_flute' },
  { id: 'gm_ocarina', name: 'Ocarina', cat: 'Brass & wind', s: 'gm_ocarina' },
  // ---- atmospheres ----
  { id: 'gm_fx_crystal', name: 'Crystal', cat: 'Atmosphere', s: 'gm_fx_crystal' },
  { id: 'gm_fx_atmosphere', name: 'Atmosphere', cat: 'Atmosphere', s: 'gm_fx_atmosphere' },
  { id: 'gm_fx_echoes', name: 'Echoes', cat: 'Atmosphere', s: 'gm_fx_echoes' },
  { id: 'gm_fx_sci_fi', name: 'Sci-fi', cat: 'Atmosphere', s: 'gm_fx_sci_fi' },
  { id: 'gm_fx_rain', name: 'Rain', cat: 'Atmosphere', s: 'gm_fx_rain' },
];

export const soundById = (id) => SOUNDS.find((x) => x.id === id) || SOUNDS[0];

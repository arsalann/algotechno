// Hardware mode: virtual 303 / 909 / poly synth / LFOs / FX / mixer / keyboard.
// The panels are just a UI over Strudel: every change is turned into Strudel code (see gen()).
// Knobs are read live through signal(() => P('name')), so turning them never restarts anything;
// only "structural" changes (steps, waveforms, tempo) re-evaluate the code.

import { SOUNDS, soundById } from '/sounds.js';

const repl = document.getElementById('repl');
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

// ---------- notes ----------
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const fromName = (s) => {
  const m = /^([a-g])(#|b)?(-?\d)$/i.exec(s);
  return 12 * (+m[3] + 1) + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};

// ---------- parameters ----------
// exp: knob moves exponentially (frequencies, times) · struct: needs a re-evaluate · values: stepped
const DRUMS = [
  ['bd', 'BASS DRUM'], ['sd', 'SNARE'], ['lt', 'LOW TOM'], ['ht', 'HI TOM'], ['rim', 'RIM SHOT'],
  ['cp', 'HAND CLAP'], ['hh', 'CLOSED HAT'], ['oh', 'OPEN HAT'], ['cr', 'CRASH'], ['rd', 'RIDE'],
];
const META = {
  bpm: { label: 'TEMPO', min: 90, max: 160, def: 132, step: 1, struct: true },
  swing: { label: 'SWING', min: 0, max: 0.33, def: 0, struct: true, fmt: (v) => Math.round(v * 300) + '%' },
  'tb.tune': { label: 'TUNING', min: -12, max: 12, def: 0, step: 1, struct: true, fmt: (v) => (v > 0 ? '+' : '') + v + ' st' },
  'tb.cutoff': { label: 'CUT OFF FREQ', min: 80, max: 6000, def: 500, exp: true, fmt: (v) => Math.round(v) + ' Hz' },
  'tb.reso': { label: 'RESO-NANCE', min: 0, max: 30, def: 18 },
  'tb.envmod': { label: 'ENV MOD', min: 0, max: 8, def: 4 },
  'tb.decay': { label: 'DECAY', min: 0.04, max: 1, def: 0.2, exp: true, fmt: (v) => Math.round(v * 1000) + ' ms' },
  'tb.accent': { label: 'ACCENT', min: 0, max: 1, def: 0.6, struct: true },
  'tb.drive': { label: 'DRIVE', min: 0, max: 0.95, def: 0.3 },
  'pad.cutoff': { label: 'BRIGHT-NESS', min: 200, max: 8000, def: 1800, exp: true, fmt: (v) => Math.round(v) + ' Hz' },
  'pad.reso': { label: 'RESO-NANCE', min: 0, max: 20, def: 2 },
  'pad.attack': { label: 'ATTACK', min: 0.005, max: 2, def: 0.15, exp: true, fmt: (v) => v.toFixed(2) + ' s' },
  'pad.release': { label: 'RELEASE', min: 0.05, max: 4, def: 1, exp: true, fmt: (v) => v.toFixed(2) + ' s' },
  'pad.detune': { label: 'DETUNE', min: 0, max: 1, def: 0.4 },
  'fx.time': { label: 'ECHO SPEED', values: [1 / 16, 1 / 8, 3 / 16, 1 / 4, 3 / 8, 1 / 2], def: 3 / 16,
    fmt: (v) => ({ 0.0625: '1/16', 0.125: '1/8', 0.1875: '3/16', 0.25: '1/4', 0.375: '3/8', 0.5: '1/2' })[v] },
  'fx.feedback': { label: 'ECHO REPEATS', min: 0, max: 0.9, def: 0.45 },
  'fx.size': { label: 'REVERB SIZE', min: 0.5, max: 10, def: 4, exp: true },
  'fx.tbdly': { label: 'ECHO', min: 0, max: 1, def: 0.2 },
  'fx.tbrev': { label: 'REVERB', min: 0, max: 1, def: 0.1 },
  'fx.paddly': { label: 'ECHO', min: 0, max: 1, def: 0.3 },
  'fx.padrev': { label: 'REVERB', min: 0, max: 1, def: 0.6 },
  'fx.drrev': { label: 'REVERB', min: 0, max: 1, def: 0.1 },
  'mix.drums': { label: 'VOLUME', min: 0, max: 1.2, def: 0.9 },
  'mix.tb': { label: 'VOLUME', min: 0, max: 1.2, def: 0.75 },
  'mix.pad': { label: 'VOLUME', min: 0, max: 1.2, def: 0.5 },
  'mix.master': { label: 'MASTER', min: 0, max: 1.2, def: 0.5 }, // 0.5 keeps the full rig under clipping
};
for (const [d] of DRUMS) {
  META[`dr.${d}.lvl`] = { label: 'LEVEL', min: 0, max: 1.5, def: ['hh', 'oh', 'rd', 'cr'].includes(d) ? 0.55 : 1 };
  META[`dr.${d}.tune`] = { label: 'TUNE', min: 0.5, max: 2, def: 1, exp: true, fmt: (v) => v.toFixed(2) + '×' };
}
for (const i of [0, 1]) {
  META[`lfo${i}.rate`] = { label: 'SPEED', min: 0.02, max: 12, def: i ? 2 : 0.08, exp: true,
    fmt: (v) => (v < 1 ? `once / ${(1 / v).toFixed(v < 0.1 ? 0 : 1)}s` : `${v.toFixed(1)}× / s`) };
  META[`lfo${i}.depth`] = { label: 'AMOUNT', min: 0, max: 1, def: i ? 0 : 0.5, fmt: (v) => Math.round(v * 100) + '%' };
}
const canMove = (k) => META[k] && !META[k].struct && !META[k].values && !k.startsWith('lfo');

const norm = (k, v) => { const m = META[k];
  if (m.values) return m.values.indexOf(v) / (m.values.length - 1);
  return m.exp ? Math.log(v / m.min) / Math.log(m.max / m.min) : (v - m.min) / (m.max - m.min); };
const denorm = (k, n) => { const m = META[k]; n = Math.min(1, Math.max(0, n));
  if (m.values) return m.values[Math.round(n * (m.values.length - 1))];
  let v = m.exp ? m.min * Math.pow(m.max / m.min, n) : m.min + n * (m.max - m.min);
  return m.step ? Math.round(v / m.step) * m.step : v; };
const fmt = (k, v) => (META[k].fmt ? META[k].fmt(v) : Math.abs(v) >= 10 ? Math.round(v) : v.toFixed(2));

// ---------- state ----------
const blankSteps = () => Array.from({ length: 16 }, () => ({ n: 36, gate: false, acc: false, slide: false }));
const DEFAULT = () => ({
  v: Object.fromEntries(Object.entries(META).map(([k, m]) => [k, m.def])),
  tb: { wave: 'sawtooth', transpose: 0, steps: parse303('C2 C2A C3 C2 ~ C2 D#2A C2 ~ C2 G2S C2 A#1 C2A C3 C2') },
  dr: { kit: 'RolandTR909', mute: {}, rows: drumPreset('Acid house') },
  pad: { wave: 'supersaw', held: [], latch: false, shape: 'single' },
  lfo: [{ shape: 'sine', dest: 'tb.cutoff' }, { shape: 'square', dest: 'none' }],
  kb: { oct: 3, target: 'pad' },
});

// ---------- 303 & 909 presets ----------
function parse303(str) {
  // tokens: C2 = note, A = accent, S = slide, ~ = gate off
  return str.trim().split(/\s+/).map((t) => {
    if (t === '~') return { n: 36, gate: false, acc: false, slide: false };
    const m = /^([A-G]#?-?\d)([AS]*)$/i.exec(t);
    return { n: fromName(m[1]), gate: true, acc: m[2].includes('A'), slide: m[2].includes('S') };
  });
}
const PRESETS_303 = {
  'Acid house': 'C2 C2A C3 C2 ~ C2 D#2A C2 ~ C2 G2S C2 A#1 C2A C3 C2',
  'Phuture': 'C2A ~ C2 C3S C2 ~ C2A D#2 C2 C2 ~ C3A C2 ~ A#1S C2',
  'Octave pump': 'C2 C3 C2 C3A C2 C3 C2 C3S C2 C3 C2A C3 C2 C3 C2S C3',
  'Rolling': 'C2 C2 C2 D#2A C2 C2 F2S C2 C2 C2 G2A C2 C2 A#1 C2S C3',
  'Hypnotic': 'C2 ~ C2S C2 ~ C2 ~ C2A C2 ~ C2S C2 ~ C2 C3A ~',
  'Phrygian': 'C2A C#2 C2 ~ C3S C2 ~ C#2 C2A ~ D#2 C2 C3 ~ C#2S C2',
};
const P909 = {
  'Four floor': { bd: 'x...x...x...x...', hh: '..x...x...x...x.', cp: '....x.......x...' },
  'Acid house': { bd: 'x...x...x...x...', hh: '..x...x...x...x.', oh: '......x.......x.', cp: '....x.......x...', rim: '...x.....x....x.' },
  'Rolling': { bd: 'x...x...x...x...', hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.', sd: '....x.......x..x', lt: '.............x..' },
  'Warehouse': { bd: 'x...x...x...x..x', hh: '..x...x...x...x.', cp: '....x.......x...', rd: 'x.x.x.x.x.x.x.x.', ht: '...........x....' },
  'Breakbeat': { bd: 'x.....x...x.....', sd: '....x.......x.x.', hh: 'x.x.x.x.x.x.x.x.', oh: '.......x........' },
  'Minimal': { bd: 'x...x...x...x...', hh: '..x...x...x...x.', rim: '.x....x..x....x.' },
  'Empty': {},
};
function drumPreset(name) {
  const p = P909[name];
  return Object.fromEntries(DRUMS.map(([d]) => [d, [...(p[d] || '................')].map((c) => c === 'x')]));
}

// saved state from last session, merged over defaults
let S;
try { S = JSON.parse(localStorage.getItem('algotechno:hw')); } catch {}
if (!S || typeof S !== 'object') S = {};
{
  // merge every section over the defaults, so settings saved by an older version never crash the page
  const D = DEFAULT(), obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  S = { ver: S.ver, v: { ...D.v, ...obj(S.v) }, tb: { ...D.tb, ...obj(S.tb) }, dr: { ...D.dr, ...obj(S.dr) }, pad: { ...D.pad, ...obj(S.pad) },
    lfo: [0, 1].map((i) => ({ ...D.lfo[i], ...obj(S.lfo?.[i]) })), kb: { ...D.kb, ...obj(S.kb) } };
  for (const k in META) {
    const m = META[k], x = S.v[k];
    if (typeof x !== 'number' || !isFinite(x)) S.v[k] = m.def;
    else if (m.values && !m.values.includes(x)) S.v[k] = m.values.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
    else if (!m.values) S.v[k] = Math.min(m.max, Math.max(m.min, x));
  }
  const okSteps = Array.isArray(S.tb.steps) && S.tb.steps.length === 16 && S.tb.steps.every((st) => st && Number.isFinite(st.n));
  if (!okSteps) S.tb.steps = D.tb.steps;
  S.dr.rows = obj(S.dr.rows); S.dr.mute = obj(S.dr.mute);
  for (const [d] of DRUMS) if (!Array.isArray(S.dr.rows[d]) || S.dr.rows[d].length !== 16) S.dr.rows[d] = Array(16).fill(false);
  if (!Array.isArray(S.pad.held)) S.pad.held = [];
  if (!['single', 'minor', 'major', 'min7', 'maj7', 'min9', 'sus4', 'fifths'].includes(S.pad.shape)) S.pad.shape = 'single';
  if (!['pad', 'bass', 'drums', 'transpose', 'step'].includes(S.kb.target)) S.kb.target = 'pad';
  if (!(S.kb.oct >= 1 && S.kb.oct <= 6)) S.kb.oct = 3;
  // v2: master used to default to 0.9, which clipped — bring old sessions down once
  if (!(S.ver >= 2)) { S.v['mix.master'] = Math.min(S.v['mix.master'], META['mix.master'].def); S.ver = 2; }
  S.lfo.forEach((l) => { if (!['sine', 'tri', 'saw', 'square', 's&h'].includes(l.shape)) l.shape = 'sine'; });
}
const persist = () => localStorage.setItem('algotechno:hw', JSON.stringify(S));

// ---------- live values (+ LFO modulation) ----------
const lfoVal = (i, t) => {
  const r = S.v[`lfo${i}.rate`], ph = (t * r) % 1;
  switch (S.lfo[i].shape) {
    case 'sine': return Math.sin(ph * 2 * Math.PI);
    case 'tri': return 1 - 4 * Math.abs(ph - 0.5);
    case 'saw': return 2 * ph - 1;
    case 'square': return ph < 0.5 ? 1 : -1;
    case 's&h': { const k = Math.floor(t * r), x = Math.sin(k * 12.9898 + i * 78.233) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
  }
  return 0;
};
function P(k) {
  let n = null;
  for (const i of [0, 1]) {
    if (S.lfo[i].dest !== k || !S.v[`lfo${i}.depth`]) continue;
    n = (n ?? norm(k, S.v[k])) + S.v[`lfo${i}.depth`] * 0.5 * lfoVal(i, performance.now() / 1000);
  }
  return n == null ? S.v[k] : denorm(k, n);
}
// gains include mixer + mute, so a fader is just another live value
const DG = (d) => (S.dr.mute[d] ? 0 : P(`dr.${d}.lvl`) * P('mix.drums') * P('mix.master'));
const TG = () => (S.tb.mute ? 0 : P('mix.tb') * P('mix.master'));
const PG = () => P('mix.pad') * P('mix.master');
Object.assign(window, { P, DG, TG, PG });

// ---------- code generation ----------
function gen(live) {
  const num = (x) => +(+x).toFixed(3);
  // single quotes: Strudel turns "double-quoted" strings into patterns
  const v = (k) => (live ? `signal(() => P('${k}'))` : num(P(k)));
  const g = (fn, arg) => (live ? `signal(() => ${fn}(${arg ? `'${arg}'` : ''}))` : num(window[fn](arg)));
  const layers = [];

  for (const [d] of DRUMS) {
    const row = S.dr.rows[d];
    if (!row.some(Boolean)) continue;
    const pat = row.map((on) => (on ? d : '~')).join(' ');
    layers.push(`s("${pat}").bank("${S.dr.kit}").gain(${g('DG', d)}).speed(${v(`dr.${d}.tune`)}).room(${v('fx.drrev')}).roomsize(${v('fx.size')})`);
  }

  const st = S.tb.steps;
  if (st.some((s) => s.gate)) {
    const shift = S.tb.transpose + S.v['tb.tune'];
    const notes = st.map((s) => (s.gate ? noteName(s.n + shift).toLowerCase().replace('#', '#') : '~')).join(' ');
    const vel = st.map((s) => (s.acc ? 1 : num(1 - S.v['tb.accent'] * 0.55))).join(' ');
    const sus = st.map((s) => (s.slide ? 1 : 0)).join(' ');
    layers.push(`note("${notes}").s("${S.tb.wave}")
    .velocity("${vel}").sustain("${sus}")
    .lpf(${v('tb.cutoff')}).lpq(${v('tb.reso')}).lpenv(${v('tb.envmod')}).lpdecay(${v('tb.decay')})
    .decay(${live ? "signal(() => Math.max(.12, P('tb.decay')))" : num(Math.max(0.12, P('tb.decay')))}).shape(${v('tb.drive')})
    .delay(${v('fx.tbdly')}).delaytime(${v('fx.time')}).delayfeedback(${v('fx.feedback')}).room(${v('fx.tbrev')})
    .gain(${g('TG')})`);
  }

  if (S.pad.latch && S.pad.held.length) {
    const chord = `[${S.pad.held.map((m) => noteName(m).toLowerCase()).join(',')}]`;
    const snd = soundById(S.pad.wave);
    const extra = Object.entries(snd.params || {}).map(([k, x]) => `.${k}(${x})`).join('');
    layers.push(`note("${chord}").s("${snd.s}")${extra}.detune(${v('pad.detune')})
    .attack(${v('pad.attack')}).release(${v('pad.release')}).sustain(.8)
    .lpf(${v('pad.cutoff')}).lpq(${v('pad.reso')})
    .delay(${v('fx.paddly')}).delaytime(${v('fx.time')}).delayfeedback(${v('fx.feedback')}).room(${v('fx.padrev')}).roomsize(${v('fx.size')})
    .gain(${g('PG')})`);
  }

  const swing = S.v.swing > 0.005 ? `.swingBy(${num(S.v.swing)}, 8)` : ''; // 8 = swing the off-beat 16ths
  const header = live ? '' : '// exported from hardware mode — LFO movement is frozen at the moment of export\n';
  return `${header}setcps(${S.v.bpm}/60/4)\n\nstack(\n  ${layers.join(',\n  ') || 'silence'},\n)${swing}\n`;
}

// ---------- engine ----------
const ed = () => repl.editor;
let playing = false, rebuildTimer = null;
const status = (msg) => ($('#status').textContent = msg);
function rebuild() {
  persist();
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    if (!ed()) return;
    ed().setCode(gen(true));
    if (playing) ed().evaluate();
  }, 60);
}
function play() { playing = true; ed().setCode(gen(true)); ed().evaluate(); $('#play').classList.add('lit'); status('▶ running'); }
function stop() { playing = false; ed().stop(); $('#play').classList.remove('lit'); status('■ stopped'); }
repl.addEventListener('update', (e) => {
  const err = e.detail?.evalError || e.detail?.schedulerError;
  if (err) status('⚠ ' + (err.message || err));
});

// Strudel only loads its synth engine on the first ▶, so wake it on the first click/key instead
let audioReady = null;
const ensureAudio = () => (audioReady ??= (async () => {
  while (typeof initAudio !== 'function') await new Promise((r) => setTimeout(r, 50));
  await initAudio();
})());
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => ensureAudio(), { capture: true, once: true }));

// sampled instruments download on first use, and a note triggered while downloading is lost —
// so load each sound once (silently) before its first real note
const loadedSounds = new Set();
async function preload(s) {
  if (loadedSounds.has(s)) return;
  await ensureAudio();
  await superdough({ note: 60, s, gain: 0 }, getAudioContext().currentTime + 0.01, 0.05);
  loadedSounds.add(s);
}

// realtime notes (keyboard / step audition) straight into the sound engine
async function sound(midis, voice) {
  try {
    await ensureAudio();
    if (voice !== 'tb') await preload(soundById(S.pad.wave).s);
    const t = getAudioContext().currentTime + 0.01;
    for (const m of midis) {
      if (voice === 'tb')
        superdough({ note: m + S.v['tb.tune'], s: S.tb.wave, lpf: P('tb.cutoff'), lpq: P('tb.reso'), lpenv: P('tb.envmod'), lpdecay: P('tb.decay'),
          decay: Math.max(0.12, P('tb.decay')), sustain: 0, shape: P('tb.drive'), gain: TG() }, t, 0.25);
      else
        superdough({ ...soundById(S.pad.wave).params, note: m, s: soundById(S.pad.wave).s, detune: P('pad.detune'), attack: P('pad.attack'), release: P('pad.release'), sustain: 0.8,
          lpf: P('pad.cutoff'), lpq: P('pad.reso'), room: P('fx.padrev'), roomsize: P('fx.size'), delay: P('fx.paddly'),
          delaytime: P('fx.time'), delayfeedback: P('fx.feedback'), gain: PG() * 0.8 }, t, 0.6);
    }
  } catch (e) { status('click ▶ once to enable sound'); }
}

// ---------- widgets ----------
const knobs = {};
function knob(k, { small = false } = {}) {
  const m = META[k];
  const dial = h('div', { className: 'dial' });
  const val = h('div', { className: 'val' });
  const el = h('div', { className: 'knob', title: 'drag up/down · shift = fine · double-click = reset' }, dial, h('label', { textContent: m.label }), val);
  const paint = () => {
    dial.style.transform = `rotate(${-135 + 270 * norm(k, S.v[k])}deg)`;
    val.textContent = fmt(k, S.v[k]);
    el.setAttribute('aria-valuetext', fmt(k, S.v[k]));
  };
  const set = (x) => {
    S.v[k] = x; paint();
    status(`${m.label} ${fmt(k, x)}`);
    if (k === 'bpm') $('#bpm-display').textContent = x;
    m.struct ? rebuild() : persist();
  };
  if (!canMove(k)) el.classList.add('nomod');
  Object.assign(el, { tabIndex: 0 });
  el.setAttribute('role', 'slider'); el.setAttribute('aria-label', m.label.replace('-', ''));
  el.addEventListener('keydown', (e) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    set(denorm(k, norm(k, S.v[k]) + d * (m.values ? 1 / (m.values.length - 1) : e.shiftKey ? 0.005 : 0.02)));
  });
  el.addEventListener('pointerdown', (e) => {
    if (picking !== null) return pickTarget(k, e);
    el.setPointerCapture(e.pointerId); el.classList.add('drag');
    let y = e.clientY, n = norm(k, S.v[k]);
    el.onpointermove = (ev) => {
      n = Math.min(1, Math.max(0, n + (y - ev.clientY) / (ev.shiftKey ? 800 : 160)));
      y = ev.clientY;
      const x = denorm(k, n);
      if (x !== S.v[k]) set(x);
    };
    el.onpointerup = () => { el.onpointermove = null; el.classList.remove('drag'); };
  });
  el.addEventListener('wheel', (e) => { e.preventDefault(); set(denorm(k, norm(k, S.v[k]) - Math.sign(e.deltaY) * (m.values ? 1 / (m.values.length - 1) : 0.02))); }, { passive: false });
  el.ondblclick = () => set(m.def);
  paint();
  knobs[k] = { el, paint };
  return el;
}
function switcher(el, options, get, setv) {
  el.innerHTML = '';
  for (const [value, label] of options) {
    const b = h('button', { textContent: label });
    b.onclick = () => { setv(value); [...el.children].forEach((c) => c.classList.toggle('on', c === b)); };
    b.classList.toggle('on', get() === value);
    el.append(b);
  }
}

// ---------- transport ----------
$('#bpm-knob').replaceWith(knob('bpm'));
$('#swing-knob').replaceWith(knob('swing'));
$('#bpm-display').textContent = S.v.bpm;
$('#play').onclick = play;
$('#stop').onclick = stop;
$('#to-code').onclick = () => {
  localStorage.setItem('algotechno:import', gen(false));
  location.href = '/?import=1';
};

// ---------- 303 ----------
for (const k of ['tb.tune', 'tb.cutoff', 'tb.reso', 'tb.envmod', 'tb.decay', 'tb.accent', 'tb.drive']) $('#tb-knobs').append(knob(k));
switcher($('#tb-wave'), [['sawtooth', '◢ SAW'], ['square', '▭ SQUARE']], () => S.tb.wave, (w) => { S.tb.wave = w; rebuild(); });
let selStep = null;
function renderSeq() {
  const seq = $('#tb-seq'); seq.innerHTML = '';
  S.tb.steps.forEach((s, i) => {
    const toggle = (cls, key, label) => {
      const b = h('button', { className: `t ${cls} ${s[key] ? 'on' : ''}`, textContent: label });
      b.onclick = (e) => { e.stopPropagation(); s[key] = !s[key]; if (key === 'gate' && s.gate) sound([s.n + S.tb.transpose], 'tb'); renderSeq(); rebuild(); };
      return b;
    };
    const el = h('div', { className: `step ${i % 4 === 0 ? 'beat' : ''} ${s.gate ? '' : 'off'} ${selStep === i ? 'sel' : ''}` },
      h('span', { className: 'led', id: `tbled${i}` }),
      h('div', { className: 'note', textContent: s.gate ? noteName(s.n) : '·' }),
      toggle('gate', 'gate', 'ON'), toggle('acc', 'acc', 'ACC'), toggle('sld', 'slide', 'SLD'));
    el.onclick = () => {
      selStep = selStep === i ? null : i;
      if (selStep !== null) { S.kb.target = 'step'; renderKbTarget(); sound([s.n + S.tb.transpose], 'tb'); }
      renderSeq();
    };
    el.addEventListener('wheel', (e) => {
      e.preventDefault(); s.n = Math.min(84, Math.max(12, s.n + (e.deltaY < 0 ? 1 : -1))); s.gate = true;
      sound([s.n + S.tb.transpose], 'tb'); renderSeq(); rebuild();
    }, { passive: false });
    seq.append(el);
  });
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
$('#tb-random').onclick = () => {
  const scale = [0, 0, 0, 3, 5, 7, 10, 12, 12, 15];
  S.tb.steps = S.tb.steps.map(() => ({ n: 36 + pick(scale) - (Math.random() < 0.1 ? 2 : 0), gate: Math.random() < 0.75, acc: Math.random() < 0.25, slide: Math.random() < 0.15 }));
  renderSeq(); rebuild(); status('303: new random pattern');
};
$('#tb-mutate').onclick = () => {
  for (let j = 0; j < 3; j++) {
    const s = pick(S.tb.steps);
    const what = pick(['n', 'gate', 'acc', 'slide']);
    if (what === 'n') { s.n = 36 + pick([0, 3, 5, 7, 10, 12]); s.gate = true; } else s[what] = !s[what];
  }
  renderSeq(); rebuild(); status('303: mutated 3 steps');
};
function renderTbMute() {
  $('#tb-mute').classList.toggle('on', !!S.tb.mute);
  $('#tb-mute').textContent = S.tb.mute ? 'MUTED' : 'MUTE';
  $('#tb-seq').classList.toggle('muted', !!S.tb.mute);
}
$('#tb-mute').onclick = () => { S.tb.mute = !S.tb.mute; renderTbMute(); persist(); status(`303 ${S.tb.mute ? 'muted' : 'on'}`); };
$('#tb-clear').onclick = () => { S.tb.steps = blankSteps(); renderSeq(); rebuild(); status('303: cleared'); };
$('#tb-preset').append(h('option', { textContent: 'PATTERN…', value: '' }), ...Object.keys(PRESETS_303).map((n) => h('option', { textContent: n })));
$('#tb-preset').onchange = (e) => { if (!e.target.value) return; S.tb.steps = parse303(PRESETS_303[e.target.value]); e.target.value = ''; renderSeq(); rebuild(); };

// ---------- 909 ----------
const KITS = ['RolandTR909', 'RolandTR808', 'RolandTR707', 'RolandTR606', 'LinnDrum', 'OberheimDMX', 'AkaiMPC60', 'EmuSP12', 'BossDR110', 'KorgMinipops'];
$('#dr-kit').append(...KITS.map((k) => h('option', { textContent: k, selected: k === S.dr.kit })));
$('#dr-kit').onchange = (e) => { S.dr.kit = e.target.value; rebuild(); status('kit: ' + S.dr.kit); };
$('#dr-preset').append(h('option', { textContent: 'PATTERN…', value: '' }), ...Object.keys(P909).map((n) => h('option', { textContent: n })));
$('#dr-preset').onchange = (e) => { if (!e.target.value) return; S.dr.rows = drumPreset(e.target.value); e.target.value = ''; renderDrums(); rebuild(); };
$('#dr-random').onclick = () => {
  S.dr.rows.hh = S.dr.rows.hh.map((_, i) => (i % 4 === 2 ? true : Math.random() < 0.35));
  S.dr.rows.oh = S.dr.rows.oh.map((_, i) => i % 4 === 2 && Math.random() < 0.4);
  renderDrums(); rebuild();
};
$('#dr-clear').onclick = () => { S.dr.rows = drumPreset('Empty'); renderDrums(); rebuild(); };
function renderDrums() {
  const grid = $('#dr-grid'); grid.innerHTML = '';
  for (const [d, label] of DRUMS) {
    const mute = h('button', { className: `hwbtn mute ${S.dr.mute[d] ? 'on' : ''}`, textContent: S.dr.mute[d] ? 'MUTED' : 'MUTE' });
    mute.onclick = () => {
      S.dr.mute[d] = !S.dr.mute[d];
      mute.classList.toggle('on', S.dr.mute[d]); mute.textContent = S.dr.mute[d] ? 'MUTED' : 'MUTE';
      row.classList.toggle('muted', S.dr.mute[d]);
      persist(); status(`${label} ${S.dr.mute[d] ? 'muted' : 'on'}`);
    };
    const row = h('div', { className: `dr-row ${S.dr.mute[d] ? 'muted' : ''}` }, h('div', { className: 'name', textContent: label }), knob(`dr.${d}.lvl`), knob(`dr.${d}.tune`), mute);
    S.dr.rows[d].forEach((on, i) => {
      const pad = h('button', { className: `pad g${Math.floor(i / 4)} ${on ? 'on' : ''}`, title: `${label} step ${i + 1}` });
      pad.dataset.step = i;
      pad.onclick = () => {
        S.dr.rows[d][i] = !S.dr.rows[d][i]; pad.classList.toggle('on');
        if (S.dr.rows[d][i]) try { superdough({ s: d, bank: S.dr.kit, gain: DG(d), speed: P(`dr.${d}.tune`) }, getAudioContext().currentTime + 0.01, 0.2); } catch {}
        rebuild();
      };
      row.append(pad);
    });
    grid.append(row);
  }
  grid.append(h('div', { className: 'dr-steps-led' }, h('span'), h('span'), h('span'), h('span'),
    ...Array.from({ length: 16 }, (_, i) => h('span', {}, h('span', { className: 'led', id: `drled${i}` }), h('br'), String(i + 1)))));
}

// ---------- auto-move (LFOs) ----------
const modLabel = (t) => {
  const [unit, a] = t.split('.');
  if (unit === 'dr') return `${DRUMS.find(([d]) => d === a)[1]} ${META[t].label}`;
  return `${{ tb: '303', pad: 'PAD', fx: 'ECHO/REVERB' }[unit] ?? { 'mix.tb': '303', 'mix.drums': 'DRUMS', 'mix.pad': 'PAD', 'mix.master': '' }[t]} ${META[t].label.replace('-', '')}`.trim();
};
const SHAPES = [['sine', '∿ smooth'], ['tri', '△ even'], ['saw', '◢ ramp'], ['square', '⊓ on/off'], ['s&h', '⁂ random']];
const scopes = [], targetEls = [];
let picking = null;
function pickTarget(k, e) {
  e.preventDefault(); e.stopPropagation();
  if (!canMove(k)) return status("that knob can't auto-move — pick a glowing one");
  const i = picking;
  S.lfo[i].dest = k;
  if (!S.v[`lfo${i}.depth`]) { S.v[`lfo${i}.depth`] = 0.5; knobs[`lfo${i}.depth`].paint(); }
  stopPicking(); persist(); renderMovers(); markModded();
  status(`mover ${i + 1} now moves ${modLabel(k)}`);
}
function stopPicking() {
  picking = null; document.body.classList.remove('picking');
  document.querySelectorAll('.hwbtn.pick').forEach((b) => b.classList.remove('on'));
}
function renderMovers() {
  [0, 1].forEach((i) => {
    const d = S.lfo[i].dest, el = targetEls[i];
    el.classList.toggle('empty', !canMove(d));
    el.querySelector('b').textContent = canMove(d) ? modLabel(d) : 'nothing yet';
  });
}
[0, 1].forEach((i) => {
  const shape = h('div', { className: 'switch' });
  switcher(shape, SHAPES, () => S.lfo[i].shape, (v) => { S.lfo[i].shape = v; persist(); });
  const pick = h('button', { className: 'hwbtn pick', textContent: '🎯 pick a knob', title: 'then click the knob you want to move' });
  pick.onclick = () => {
    if (picking === i) return stopPicking();
    stopPicking(); picking = i; pick.classList.add('on'); document.body.classList.add('picking');
    status('click any knob to make it move… (Esc to cancel)');
  };
  const clear = h('button', { className: 'hwbtn', textContent: '✕', title: 'stop moving', ariaLabel: `stop mover ${i + 1}` });
  clear.onclick = () => { S.lfo[i].dest = 'none'; persist(); renderMovers(); markModded(); };
  const target = h('div', { className: 'target' }, `MOVER ${i + 1} moves:`, h('b'), pick, clear);
  targetEls.push(target);
  const scope = h('canvas', { className: 'scope', width: 300, height: 44 });
  scopes.push(scope);
  $('#lfos').append(h('div', { className: `mover m${i}` }, target,
    h('div', { className: 'row' }, knob(`lfo${i}.rate`), knob(`lfo${i}.depth`)),
    h('div', { className: 'side' }, scope, shape)));
});
renderMovers();
function markModded() {
  for (const k in knobs) knobs[k].el.classList.toggle('modded', S.lfo.some((l, i) => l.dest === k && S.v[`lfo${i}.depth`] > 0));
}

// ---------- pad synth ----------
for (const k of ['pad.cutoff', 'pad.reso', 'pad.attack', 'pad.release', 'pad.detune']) $('#pad-knobs').append(knob(k));
// sound browser: ◀ ▶ step through every sound, or pick from the grouped list
const cats = [...new Set(SOUNDS.map((x) => x.cat))];
$('#snd-list').append(...cats.map((c) => h('optgroup', { label: c }, ...SOUNDS.filter((x) => x.cat === c).map((x) => h('option', { value: x.id, textContent: x.name })))));
function setSound(id, audition = true) {
  S.pad.wave = soundById(id).id;
  const i = SOUNDS.indexOf(soundById(id));
  $('#snd-name').textContent = `${String(i + 1).padStart(2, '0')} · ${SOUNDS[i].name.toUpperCase()}`;
  $('#snd-list').value = S.pad.wave;
  status(`sound: ${SOUNDS[i].name} (${SOUNDS[i].cat})`);
  rebuild();
  if (audition) sound([60, 64, 67], 'pad'); // play a quick chord so you hear it (loads it first)
  else ensureAudio().then(() => preload(soundById(S.pad.wave).s)).catch(() => {});
}
const stepSound = (d) => { const i = SOUNDS.indexOf(soundById(S.pad.wave)); setSound(SOUNDS[(i + d + SOUNDS.length) % SOUNDS.length].id); };
$('#snd-prev').onclick = () => stepSound(-1);
$('#snd-next').onclick = () => stepSound(1);
$('#snd-list').onchange = (e) => setSound(e.target.value);
setSound(S.pad.wave, false);
const CHORD_SHAPES = { single: [0], minor: [0, 3, 7], major: [0, 4, 7], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], min9: [0, 3, 7, 10, 14], sus4: [0, 5, 7], fifths: [0, 7, 12] };
$('#pad-chord').append(...Object.keys(CHORD_SHAPES).map((c) => h('option', { value: c, textContent: c === 'single' ? 'ONE NOTE' : 'CHORD: ' + c.toUpperCase(), selected: S.pad.shape === c })));
$('#pad-chord').onchange = (e) => { S.pad.shape = e.target.value; persist(); };
$('#pad-latch').classList.toggle('on', S.pad.latch);
$('#pad-latch').onclick = () => {
  S.pad.latch = !S.pad.latch; $('#pad-latch').classList.toggle('on', S.pad.latch);
  if (!S.pad.latch) S.pad.held = [];
  renderHeld(); rebuild();
};
function renderHeld() {
  $('#pad-held').textContent = S.pad.latch
    ? (S.pad.held.length ? 'HOLD: ' + S.pad.held.map(noteName).join(' ') : 'HOLD on — play a chord to loop it')
    : '— play the keys · press HOLD to loop a chord —';
  document.querySelectorAll('#keyboard [data-m]').forEach((k) => k.classList.toggle('held', S.pad.latch && S.pad.held.includes(+k.dataset.m)));
}

// ---------- echo/reverb + per-section volume strips ----------
for (const k of ['fx.time', 'fx.feedback', 'fx.size']) $('#fx-knobs').append(knob(k));
const meters = {};
function strip(el, ch, sends) {
  const k = `mix.${ch}`;
  const input = h('input', { type: 'range', min: 0, max: 1.2, step: 0.01, value: S.v[k], title: 'double-click to reset' });
  input.oninput = () => { S.v[k] = +input.value; persist(); status(`${{ drums: 'DRUMS', tb: '303', pad: 'PAD' }[ch]} VOLUME ${Math.round(S.v[k] * 100)}%`); };
  input.ondblclick = () => { input.value = S.v[k] = META[k].def; persist(); };
  meters[ch] = h('i');
  el.append(h('div', { className: 'fader' }, h('div', { className: 'row' }, h('div', { className: 'meter' }, meters[ch]), input), h('label', { textContent: 'VOLUME' })),
    ...sends.map((sk) => { const kn = knob(sk); kn.classList.add('mini-knob'); return kn; }));
}
strip($('#tb-strip'), 'tb', ['fx.tbdly', 'fx.tbrev']);
strip($('#dr-strip'), 'drums', ['fx.drrev']);
strip($('#pad-strip'), 'pad', ['fx.paddly', 'fx.padrev']);
$('#master-knob').replaceWith(knob('mix.master'));
META['mix.master'].label = 'MASTER';

// ---------- keyboard ----------
const KEYMAP = 'awsedftgyhujk'; // computer keys → semitones 0..12
function renderKbTarget() {
  switcher($('#kb-target'), [['pad', '🎹 SOUNDS'], ['bass', '〰 303 LIVE'], ['drums', '🥁 DRUMS'], ['transpose', '↕ 303 KEY'], ['step', '✎ 303 NOTES']], () => S.kb.target, (t) => {
    S.kb.target = t; if (t !== 'step') { selStep = null; renderSeq(); } persist(); renderKbHint(); renderKeyboard();
  });
  renderKbHint();
}
const KB_HINTS = {
  pad: 'Keys play the sound chosen on the <b>CHORD PAD</b> (◀ ▶ to browse 60+ sounds). Pick a chord shape for full chords; HOLD keeps one looping.',
  bass: 'Keys play the <b>303 sound live</b> on top of the pattern — use the 303 knobs to shape it while you jam.',
  drums: 'Keys trigger the <b>drum machine</b> like pads — each key is one drum (names on the keys), using the current kit.',
  transpose: 'Keys move the whole <b>303 bassline</b> to a new root note — C plays it as written, D# shifts it up 3 semitones, and so on.',
  step: 'Keys <b>write notes into the 303</b>: click a step’s green note display, then play a key — it fills that step and jumps to the next.',
};
function renderKbHint() { $('#kb-hint').innerHTML = KB_HINTS[S.kb.target] + ' &nbsp;·&nbsp; computer keys <kbd>A</kbd>…<kbd>K</kbd>, <kbd>Z</kbd>/<kbd>X</kbd> = octave'; }
function renderKeyboard() {
  const kb = $('#keyboard'); kb.innerHTML = '';
  const base = 12 * (S.kb.oct + 1);
  $('#kb-oct').textContent = 'C' + S.kb.oct;
  let white = 0;
  const whites = 15;
  for (let i = 0; i <= 24; i++) {
    const m = base + i, black = [1, 3, 6, 8, 10].includes(i % 12);
    const label = i < KEYMAP.length ? KEYMAP[i].toUpperCase() : '';
    const k = h('div', { className: black ? 'bkey' : 'wkey', textContent: label });
    if (S.kb.target === 'drums') k.append(h('span', { className: 'dname', textContent: DRUMS[i % DRUMS.length][0].toUpperCase() }));
    k.dataset.m = m;
    k.onpointerdown = (e) => { e.preventDefault(); pressed.set('ptr' + m, { m, notes: press(m) }); k.classList.add('down'); };
    k.onpointerup = k.onpointerleave = () => { k.classList.remove('down'); const p = pressed.get('ptr' + m); if (p) { pressed.delete('ptr' + m); release(p.notes); } };
    if (black) { k.style.left = `calc(${(white / whites) * 100}% - 1.7%)`; kb.append(k); }
    else { kb.append(k); white++; }
    if (white >= whites) break;
  }
  renderHeld();
}
let heldNow = new Set();
function press(m) {
  if (S.kb.target === 'step' && selStep === null) { status('click a 303 step’s note display first, then play keys'); return []; }
  if (S.kb.target === 'step') {
    Object.assign(S.tb.steps[selStep], { n: m - 12, gate: true });
    sound([m - 12 + S.tb.transpose], 'tb');
    selStep = (selStep + 1) % 16; // auto-advance like real step-write
    renderSeq(); rebuild();
    status(`303 step ${selStep || 16} ← ${noteName(m - 12)}`);
    return;
  }
  if (S.kb.target === 'bass') { sound([m - 12 + S.tb.transpose], 'tb'); status(`303 ${noteName(m - 12)}`); return; }
  if (S.kb.target === 'drums') {
    const [d, label] = DRUMS[(m - 12 * (S.kb.oct + 1)) % DRUMS.length];
    ensureAudio().then(() => superdough({ s: d, bank: S.dr.kit, gain: DG(d), speed: P(`dr.${d}.tune`) }, getAudioContext().currentTime + 0.01, 0.3));
    status(`🥁 ${label}`);
    return;
  }
  if (S.kb.target === 'transpose') {
    S.tb.transpose = m - 12 * (S.kb.oct + 1);
    sound([36 + S.tb.transpose], 'tb'); rebuild();
    status(`303 transpose ${S.tb.transpose >= 0 ? '+' : ''}${S.tb.transpose}`);
    return;
  }
  const notes = CHORD_SHAPES[S.pad.shape].map((x) => m + x);
  sound(notes, 'pad');
  if (S.pad.latch) {
    // a new chord starts once all keys were released
    if (!heldNow.size) S.pad.held = [];
    notes.forEach((n) => heldNow.add(n));
    S.pad.held = [...new Set([...S.pad.held, ...notes])].sort((a, b) => a - b);
    renderHeld(); rebuild();
  }
  status(`PAD ${notes.map(noteName).join(' ')}`);
  return S.pad.latch ? notes : [];
}
// release exactly the notes a key press added (even if octave/chord shape changed meanwhile)
function release(notes) { (notes || []).forEach((n) => heldNow.delete(n)); }
$('#kb-down').onclick = () => { S.kb.oct = Math.max(1, S.kb.oct - 1); renderKeyboard(); persist(); };
$('#kb-up').onclick = () => { S.kb.oct = Math.min(6, S.kb.oct + 1); renderKeyboard(); persist(); };
const pressed = new Map(); // key code / pointer → { m, notes } for clean releases
window.addEventListener('keydown', (e) => {
  if (e.target.matches('select, textarea, [contenteditable], input:not([type=range])') || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  if (e.target.matches('.knob, input[type=range]') && e.key.startsWith('Arrow')) return; // the knob/fader uses arrows
  const key = e.key.toLowerCase();
  if (e.code === 'Space') { e.preventDefault(); e.target.blur?.(); playing ? stop() : play(); return; }
  if (key === 'escape' && picking !== null) return stopPicking();
  if (key === 'z') return $('#kb-down').click();
  if (key === 'm') return $('#tb-mute').click();
  if (key === 'x') return $('#kb-up').click();
  const i = KEYMAP.indexOf(key);
  if (i < 0) return;
  const m = 12 * (S.kb.oct + 1) + i;
  pressed.set(e.code, { m, notes: press(m) });
  document.querySelector(`#keyboard [data-m="${m}"]`)?.classList.add('down');
});
window.addEventListener('keyup', (e) => {
  const p = pressed.get(e.code);
  if (!p) return;
  pressed.delete(e.code); release(p.notes);
  document.querySelector(`#keyboard [data-m="${p.m}"]`)?.classList.remove('down');
});

// ---------- animation: playhead LEDs, scopes, mod indicators, meters ----------
let lastStep = -1;
function frame() {
  requestAnimationFrame(frame);
  const t = performance.now() / 1000;
  scopes.forEach((c, i) => {
    const x = c.getContext('2d'), W = c.width, H = c.height, r = S.v[`lfo${i}.rate`], dep = S.v[`lfo${i}.depth`];
    x.clearRect(0, 0, W, H);
    x.strokeStyle = i ? '#E69F00' : '#56B4E9'; x.lineWidth = 2; x.globalAlpha = 0.3 + 0.7 * dep; x.beginPath();
    const span = Math.max(2 / r, 0.5); // show about 2 cycles
    for (let px = 0; px < W; px++) {
      const y = H / 2 - lfoVal(i, t - span + (px / W) * span) * (H / 2 - 4) * Math.max(dep, 0.15);
      px ? x.lineTo(px, y) : x.moveTo(px, y);
    }
    x.stroke(); x.globalAlpha = 1;
  });
  // modulated knobs wobble to show what the LFO is doing
  for (const i of [0, 1]) {
    const k = S.lfo[i].dest;
    if (knobs[k] && S.v[`lfo${i}.depth`] > 0)
      knobs[k].el.querySelector('.dial').style.transform = `rotate(${-135 + 270 * norm(k, P(k))}deg)`;
  }
  if (!playing || !ed()?.repl?.scheduler) return;
  const step = Math.floor(((ed().repl.scheduler.now() % 1) + 1) % 1 * 16);
  if (step === lastStep) return;
  document.getElementById(`tbled${lastStep}`)?.classList.remove('on');
  document.getElementById(`drled${lastStep}`)?.classList.remove('on');
  document.querySelectorAll('.pad.head').forEach((p) => p.classList.remove('head'));
  lastStep = step;
  document.getElementById(`tbled${step}`)?.classList.add('on');
  document.getElementById(`drled${step}`)?.classList.add('on');
  document.querySelectorAll(`.pad[data-step="${step}"]`).forEach((p) => p.classList.add('head'));
  // fake-but-honest meters: light up when that channel has a hit on this step
  const drumHit = DRUMS.some(([d]) => S.dr.rows[d][step] && !S.dr.mute[d]);
  const tbHit = S.tb.steps[step].gate;
  const lv = { drums: drumHit ? P('mix.drums') : 0, tb: tbHit ? TG() / Math.max(P('mix.master'), 0.01) * (S.tb.steps[step].acc ? 1 : 0.7) : 0, pad: S.pad.latch && S.pad.held.length ? P('mix.pad') * 0.7 : 0 };
  lv.master = Math.max(lv.drums, lv.tb, lv.pad) * P('mix.master');
  for (const ch in meters) meters[ch].style.height = Math.min(100, (lv[ch] || 0) * 85) + '%';
}

// ---------- boot ----------
renderSeq(); renderTbMute(); renderDrums(); renderKbTarget(); renderKeyboard(); markModded();
document.addEventListener('pointerup', markModded);
requestAnimationFrame(frame);
(async () => {
  while (!ed()) await new Promise((r) => setTimeout(r, 50));
  const from = new URLSearchParams(location.search).get('from');
  const incoming = from === 'editor' && JSON.parse(localStorage.getItem('algotechno:tohw') || 'null');
  if (incoming) {
    const msg = await importCode(incoming.code, incoming.file);
    sessionStorage.setItem('algotechno:hwmsg', msg);
    location.replace('/hardware.html'); // reload so every panel redraws from the imported state
    return;
  }
  const msg = sessionStorage.getItem('algotechno:hwmsg');
  if (msg) { sessionStorage.removeItem('algotechno:hwmsg'); status(msg); }
  ed().setCode(gen(true));
})();

// ---------- import: code → hardware ----------
// Runs the code silently with Strudel, looks at the notes it makes in the first bars,
// and maps them onto the machines. Works for generated patterns too; anything that
// doesn't fit a machine is left out (the original file is never changed).
const DRUM_NAMES = { bd: 'bd', sd: 'sd', lt: 'lt', mt: 'lt', ht: 'ht', rim: 'rim', cp: 'cp', hh: 'hh', oh: 'oh', cr: 'cr', rd: 'rd' };
const toMidi = (n) => {
  if (typeof n === 'number') return Math.round(n);
  if (/^-?\d+(\.\d+)?$/.test(String(n))) return Math.round(+n); // note("60")
  const m = /^([a-g])(#|s|b)?(-?\d+)?$/i.exec(String(n));
  if (!m) return null;
  return 12 * (+(m[3] ?? 3) + 1) + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === 'b' ? -1 : m[2] ? 1 : 0);
};
const clamp = (k, v) => Math.min(META[k].max, Math.max(META[k].min, v));
async function importCode(code, file) {
  const name = file || 'the editor';
  try {
    ed().setCode(code);
    await ed().evaluate(false); // evaluate without starting playback
  } catch (e) { return `⚠ couldn't read ${name}: ${e.message}`; }
  const pat = ed().repl.state.pattern;
  if (!pat) return `⚠ ${name} has errors — fix them in the editor first`;
  const cps = ed().repl.scheduler.cps;
  if (cps) S.v.bpm = Math.round(Math.min(META.bpm.max, Math.max(META.bpm.min, cps * 240)));

  const cycles = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
    const hs = pat.queryArc(c, c + 1).filter((h) => h.hasOnset()).map((h) => ({ step: Math.min(15, Math.floor((h.whole.begin - c) * 16 + 1e-6)), v: h.value }));
    // .jux() adds a hard-right copy (pan 1) of a sound that also plays hard-left (pan 0): keep one side
    const juxed = new Set(hs.filter((h) => h.v.pan === 0).map((h) => h.v.s));
    return hs.filter((h) => !(h.v.pan === 1 && juxed.has(h.v.s)));
  });
  const isDrum = (v) => typeof v.s === 'string' && DRUM_NAMES[v.s] && v.note == null;
  // the 303 takes ONE synth line: the saw/square sound with the lowest notes
  const all = cycles.flat().map((h) => h.v);
  const bassCands = all.filter((v) => ['sawtooth', 'square'].includes(v.s) && v.note != null && toMidi(v.note) != null && toMidi(v.note) < 60);
  const avgNote = (sn) => { const ns = bassCands.filter((v) => v.s === sn).map((v) => toMidi(v.note)); return ns.reduce((a, b) => a + b, 0) / ns.length; };
  const bassSound = [...new Set(bassCands.map((v) => v.s))].sort((a, b) => avgNote(a) - avgNote(b))[0];
  const isBass = (v) => v.s === bassSound && v.note != null && toMidi(v.note) != null && toMidi(v.note) < 60;
  // the pad takes real chords only (2+ notes at once); single notes / sub bass are skipped
  const isPad = (v) => v.note != null && !isBass(v) && !isDrum(v) && toMidi(v.note) != null && toMidi(v.note) >= 36;

  // start from empty machines, so nothing from the previous session leaks in
  S.dr.rows = drumPreset('Empty'); S.dr.mute = {};
  S.tb.steps = blankSteps(); S.tb.transpose = 0; S.v['tb.tune'] = 0; S.tb.mute = false;
  S.pad.held = []; S.pad.latch = false; S.pad.wave = DEFAULT().pad.wave;
  S.lfo = DEFAULT().lfo; S.v['lfo0.depth'] = META['lfo0.depth'].def; S.v['lfo1.depth'] = META['lfo1.depth'].def;
  // use the first bar in which each machine has something to play (handles intros / masks)
  // use each machine's most typical bar, so a fill (.every(4, …)) or an intro doesn't win
  const firstWith = (fn) => {
    const bars = cycles.map((c) => c.filter((h) => fn(h.v))).filter((c) => c.length);
    const sig = (c) => c.map((h) => `${h.step}:${h.v.s}:${h.v.note}`).sort().join('|');
    const count = new Map(bars.map((c) => [sig(c), 0]));
    bars.forEach((c) => count.set(sig(c), count.get(sig(c)) + 1));
    return bars.sort((a, b) => count.get(sig(b)) - count.get(sig(a)))[0] ?? [];
  };
  const found = [], ignored = new Set();

  const drums = firstWith(isDrum);
  if (drums.length) {
    const gains = {};
    for (const { step, v } of drums) {
      if (!isDrum(v)) continue;
      const d = DRUM_NAMES[v.s];
      S.dr.rows[d][step] = true;
      if (v.bank) { const b = String(v.bank).toLowerCase(); S.dr.kit = KITS.find((k) => [b, 'roland' + b].includes(k.toLowerCase())) || S.dr.kit; }
      if (typeof v.gain === 'number') gains[d] = Math.max(gains[d] ?? 0, v.gain);
    }
    for (const d in gains) S.v[`dr.${d}.lvl`] = clamp(`dr.${d}.lvl`, gains[d]);
    found.push(`drums (${Object.values(S.dr.rows).filter((r) => r.some(Boolean)).length} sounds)`);
  }

  const bass = firstWith(isBass);
  if (bass.length) {
    const hits = bass.filter((h) => isBass(h.v));
    const loud = Math.max(...hits.map((h) => h.v.velocity ?? h.v.gain ?? 1));
    for (const { step, v } of hits) {
      const st = S.tb.steps[step], n = toMidi(v.note);
      if (st.gate && st.n <= n) continue; // keep the lowest note if several land on one step
      Object.assign(st, { n, gate: true, acc: (v.velocity ?? v.gain ?? 1) >= loud * 0.95 && hits.some((x) => (x.v.velocity ?? x.v.gain ?? 1) < loud * 0.95), slide: (v.sustain ?? 0) > 0.5 });
    }
    const v = hits[0].v;
    S.tb.wave = v.s === 'square' ? 'square' : 'sawtooth';
    if (typeof v.cutoff === 'number') S.v['tb.cutoff'] = clamp('tb.cutoff', v.cutoff);
    if (typeof v.resonance === 'number') S.v['tb.reso'] = clamp('tb.reso', v.resonance);
    if (typeof v.lpenv === 'number') S.v['tb.envmod'] = clamp('tb.envmod', v.lpenv);
    if (typeof v.decay === 'number') S.v['tb.decay'] = clamp('tb.decay', v.decay);
    if (typeof v.shape === 'number') S.v['tb.drive'] = clamp('tb.drive', v.shape);
    found.push('303 bassline');
  }

  const chordAt = (c) => { const ps = c.filter((h) => isPad(h.v)); for (const h of ps) { const at = ps.filter((x) => x.step === h.step); if (new Set(at.map((x) => toMidi(x.v.note))).size > 1) return at; } return null; };
  const first = cycles.map(chordAt).find(Boolean);
  if (first) {
    const chord = first.map((h) => toMidi(h.v.note));
    S.pad.held = [...new Set(chord)].sort((a, b) => a - b); S.pad.latch = true;
    const match = SOUNDS.find((x) => x.s === first[0].v.s && !x.params);
    if (match) S.pad.wave = match.id;
    if (typeof first[0].v.cutoff === 'number') S.v['pad.cutoff'] = clamp('pad.cutoff', first[0].v.cutoff);
    found.push(`chord pad (${S.pad.held.map(noteName).join(' ')})`);
  }

  const padSound = first?.[0].v.s;
  for (const v of all) if (!isDrum(v) && !isBass(v) && v.s !== padSound) ignored.add(v.s ?? '?');
  persist();
  if (!found.length) return `⚠ nothing in ${name} fits the machines — try a pattern with drums or a note() bassline`;
  return `loaded ${name}: ${found.join(', ')}${ignored.size ? ` · skipped: ${[...ignored].join(', ')}` : ''}`;
}
window.HW = { S, gen }; // handy for poking around in the console

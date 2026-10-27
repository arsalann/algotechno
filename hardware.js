// Hardware mode: virtual 303 / 909 / poly synth / LFOs / FX / mixer / keyboard.
// The panels are just a UI over Strudel: every change is turned into Strudel code (see gen()).
// Knobs are read live through signal(() => P('name')), so turning them never restarts anything;
// only "structural" changes (steps, waveforms, tempo) re-evaluate the code.

const repl = document.getElementById('repl');
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

// ---------- notes ----------
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
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
  'pad.cutoff': { label: 'VCF FREQ', min: 200, max: 8000, def: 1800, exp: true, fmt: (v) => Math.round(v) + ' Hz' },
  'pad.reso': { label: 'VCF RES', min: 0, max: 20, def: 2 },
  'pad.attack': { label: 'ATTACK', min: 0.005, max: 2, def: 0.15, exp: true, fmt: (v) => v.toFixed(2) + ' s' },
  'pad.release': { label: 'RELEASE', min: 0.05, max: 4, def: 1, exp: true, fmt: (v) => v.toFixed(2) + ' s' },
  'pad.detune': { label: 'DETUNE', min: 0, max: 1, def: 0.4 },
  'fx.time': { label: 'DELAY TIME', values: [1 / 16, 1 / 8, 3 / 16, 1 / 4, 3 / 8, 1 / 2], def: 3 / 16,
    fmt: (v) => ({ 0.0625: '1/16', 0.125: '1/8', 0.1875: '3/16', 0.25: '1/4', 0.375: '3/8', 0.5: '1/2' })[v] },
  'fx.feedback': { label: 'FEED BACK', min: 0, max: 0.9, def: 0.45 },
  'fx.size': { label: 'ROOM SIZE', min: 0.5, max: 10, def: 4, exp: true },
  'fx.tbdly': { label: '303 → DLY', min: 0, max: 1, def: 0.2 },
  'fx.tbrev': { label: '303 → REV', min: 0, max: 1, def: 0.1 },
  'fx.paddly': { label: 'PAD → DLY', min: 0, max: 1, def: 0.3 },
  'fx.padrev': { label: 'PAD → REV', min: 0, max: 1, def: 0.6 },
  'fx.drrev': { label: 'DRUM → REV', min: 0, max: 1, def: 0.1 },
  'mix.drums': { label: 'DRUMS', min: 0, max: 1.2, def: 0.9 },
  'mix.tb': { label: '303', min: 0, max: 1.2, def: 0.75 },
  'mix.pad': { label: 'PAD', min: 0, max: 1.2, def: 0.5 },
  'mix.master': { label: 'MASTER', min: 0, max: 1.2, def: 0.9 },
};
for (const [d] of DRUMS) {
  META[`dr.${d}.lvl`] = { label: 'LEVEL', min: 0, max: 1.5, def: ['hh', 'oh', 'rd', 'cr'].includes(d) ? 0.55 : 1 };
  META[`dr.${d}.tune`] = { label: 'TUNE', min: 0.5, max: 2, def: 1, exp: true, fmt: (v) => v.toFixed(2) + '×' };
}
for (const i of [0, 1]) {
  META[`lfo${i}.rate`] = { label: 'RATE', min: 0.02, max: 12, def: i ? 2 : 0.08, exp: true, fmt: (v) => v.toFixed(2) + ' Hz' };
  META[`lfo${i}.depth`] = { label: 'DEPTH', min: 0, max: 1, def: i ? 0 : 0.5 };
}
const MOD_TARGETS = ['none', 'tb.cutoff', 'tb.reso', 'tb.envmod', 'tb.decay', 'tb.drive', 'pad.cutoff', 'pad.detune',
  'fx.feedback', 'fx.tbdly', 'mix.tb', 'mix.pad', 'dr.hh.lvl', 'dr.hh.tune', 'dr.bd.tune'];

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
if (!S || !S.v) S = DEFAULT();
S.v = { ...DEFAULT().v, ...S.v };
const persist = () => localStorage.setItem('algotechno:hw', JSON.stringify(S));

// ---------- live values (+ LFO modulation) ----------
const lfoVal = (i, t) => {
  const r = S.v[`lfo${i}.rate`], ph = (t * r) % 1;
  switch (S.lfo[i].shape) {
    case 'sine': return Math.sin(ph * 2 * Math.PI);
    case 'tri': return 1 - 4 * Math.abs(ph - 0.5);
    case 'saw': return 2 * ph - 1;
    case 'square': return ph < 0.5 ? 1 : -1;
    case 's&h': { const k = Math.floor(t * r); return (Math.sin(k * 12.9898 + i * 78.233) * 43758.5453 % 1) * 2 - 1 || 0; }
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
const TG = () => P('mix.tb') * P('mix.master');
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
    layers.push(`note("${chord}").s("${S.pad.wave}").detune(${v('pad.detune')})
    .attack(${v('pad.attack')}).release(${v('pad.release')}).sustain(.8)
    .lpf(${v('pad.cutoff')}).lpq(${v('pad.reso')})
    .delay(${v('fx.paddly')}).delaytime(${v('fx.time')}).delayfeedback(${v('fx.feedback')}).room(${v('fx.padrev')}).roomsize(${v('fx.size')})
    .gain(${g('PG')})`);
  }

  const swing = S.v.swing > 0.005 ? `.swingBy(${num(S.v.swing)}, 4)` : '';
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

// realtime notes (keyboard / step audition) straight into the sound engine
function sound(midis, voice) {
  try {
    const t = getAudioContext().currentTime + 0.01;
    for (const m of midis) {
      if (voice === 'tb')
        superdough({ note: m + S.v['tb.tune'], s: S.tb.wave, lpf: P('tb.cutoff'), lpq: P('tb.reso'), lpenv: P('tb.envmod'), lpdecay: P('tb.decay'),
          decay: Math.max(0.12, P('tb.decay')), sustain: 0, shape: P('tb.drive'), gain: TG() }, t, 0.25);
      else
        superdough({ note: m, s: S.pad.wave, detune: P('pad.detune'), attack: P('pad.attack'), release: P('pad.release'), sustain: 0.8,
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
  };
  const set = (x) => {
    S.v[k] = x; paint();
    status(`${m.label} ${fmt(k, x)}`);
    if (k === 'bpm') $('#bpm-display').textContent = x;
    m.struct ? rebuild() : persist();
  };
  el.addEventListener('pointerdown', (e) => {
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
      e.preventDefault(); s.n += e.deltaY < 0 ? 1 : -1; s.gate = true;
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
$('#tb-clear').onclick = () => { S.tb.steps = blankSteps(); renderSeq(); rebuild(); };
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

// ---------- LFOs ----------
const modLabel = (t) => {
  const [unit, a] = t.split('.');
  if (unit === 'dr') return `${DRUMS.find(([d]) => d === a)[1]} ${META[t].label}`;
  return `${{ tb: '303', pad: 'PAD', fx: 'FX', mix: 'MIX' }[unit]} ${META[t].label}`;
};
const SHAPES = [['sine', '∿'], ['tri', '△'], ['saw', '◢'], ['square', '⊓'], ['s&h', '⁂']];
const scopes = [];
[0, 1].forEach((i) => {
  const shape = h('div', { className: 'switch' });
  switcher(shape, SHAPES, () => S.lfo[i].shape, (s) => { S.lfo[i].shape = s; persist(); });
  const dest = h('select', { className: 'hwsel' }, ...MOD_TARGETS.map((t) => h('option', { value: t, textContent: t === 'none' ? '— not patched —' : modLabel(t), selected: S.lfo[i].dest === t })));
  dest.onchange = () => { S.lfo[i].dest = dest.value; persist(); markModded(); };
  const scope = h('canvas', { className: 'scope', width: 300, height: 44 });
  scopes.push(scope);
  $('#lfos').append(h('div', { className: 'lfo' },
    h('div', { className: 'row' }, knob(`lfo${i}.rate`), knob(`lfo${i}.depth`)),
    h('div', { className: 'side' }, scope, shape, h('div', { className: 'jack' }, `LFO ${i + 1} OUT →`, dest))));
});
function markModded() {
  for (const k in knobs) knobs[k].el.classList.toggle('modded', S.lfo.some((l, i) => l.dest === k && S.v[`lfo${i}.depth`] > 0));
}

// ---------- pad synth ----------
for (const k of ['pad.cutoff', 'pad.reso', 'pad.attack', 'pad.release', 'pad.detune']) $('#pad-knobs').append(knob(k));
switcher($('#pad-wave'), [['supersaw', 'SUPERSAW'], ['sawtooth', 'SAW'], ['square', 'PULSE'], ['triangle', 'TRI'], ['gm_pad_warm', 'WARM PAD'], ['gm_epiano1', 'E.PIANO']],
  () => S.pad.wave, (w) => { S.pad.wave = w; rebuild(); });
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

// ---------- FX & mixer ----------
for (const k of ['fx.time', 'fx.feedback', 'fx.size', 'fx.tbdly', 'fx.tbrev', 'fx.paddly', 'fx.padrev', 'fx.drrev']) $('#fx-knobs').append(knob(k));
const meters = {};
for (const ch of ['drums', 'tb', 'pad', 'master']) {
  const k = `mix.${ch}`;
  const input = h('input', { type: 'range', min: 0, max: 1.2, step: 0.01, value: S.v[k] });
  input.oninput = () => { S.v[k] = +input.value; persist(); status(`${META[k].label} ${S.v[k].toFixed(2)}`); };
  input.ondblclick = () => { input.value = S.v[k] = META[k].def; persist(); };
  meters[ch] = h('i');
  $('#mixer').append(h('div', { className: 'fader' }, h('div', { className: 'row' }, h('div', { className: 'meter' }, meters[ch]), input), h('label', { textContent: META[k].label })));
}

// ---------- keyboard ----------
const KEYMAP = 'awsedftgyhujk'; // computer keys → semitones 0..12
function renderKbTarget() {
  switcher($('#kb-target'), [['pad', 'PLAY PAD'], ['transpose', '303 TRANSPOSE'], ['step', '303 STEP WRITE']], () => S.kb.target, (t) => {
    S.kb.target = t; if (t !== 'step') { selStep = null; renderSeq(); } persist();
  });
}
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
    k.dataset.m = m;
    k.onpointerdown = (e) => { e.preventDefault(); press(m); k.classList.add('down'); };
    k.onpointerup = k.onpointerleave = () => { k.classList.remove('down'); release(m); };
    if (black) { k.style.left = `calc(${(white / whites) * 100}% - 1.7%)`; kb.append(k); }
    else { kb.append(k); white++; }
    if (white >= whites) break;
  }
  renderHeld();
}
let heldNow = new Set();
function press(m) {
  if (S.kb.target === 'step' && selStep !== null) {
    Object.assign(S.tb.steps[selStep], { n: m - 12, gate: true });
    sound([m - 12 + S.tb.transpose], 'tb');
    selStep = (selStep + 1) % 16; // auto-advance like real step-write
    renderSeq(); rebuild();
    status(`303 step ${selStep || 16} ← ${noteName(m - 12)}`);
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
}
function release(m) { CHORD_SHAPES[S.pad.shape].forEach((x) => heldNow.delete(m + x)); }
$('#kb-down').onclick = () => { S.kb.oct = Math.max(1, S.kb.oct - 1); renderKeyboard(); persist(); };
$('#kb-up').onclick = () => { S.kb.oct = Math.min(6, S.kb.oct + 1); renderKeyboard(); persist(); };
const downKeys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.repeat) return;
  if (e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); return; }
  if (e.key === 'z') return $('#kb-down').click();
  if (e.key === 'x') return $('#kb-up').click();
  const i = KEYMAP.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  const m = 12 * (S.kb.oct + 1) + i;
  downKeys.add(m); press(m);
  document.querySelector(`#keyboard [data-m="${m}"]`)?.classList.add('down');
});
window.addEventListener('keyup', (e) => {
  const i = KEYMAP.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  const m = 12 * (S.kb.oct + 1) + i;
  downKeys.delete(m); release(m);
  document.querySelector(`#keyboard [data-m="${m}"]`)?.classList.remove('down');
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
renderSeq(); renderDrums(); renderKbTarget(); renderKeyboard(); markModded();
document.addEventListener('pointerup', markModded);
requestAnimationFrame(frame);
(async () => { while (!ed()) await new Promise((r) => setTimeout(r, 50)); ed().setCode(gen(true)); })();
window.HW = { S, gen }; // handy for poking around in the console

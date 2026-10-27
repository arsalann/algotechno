// 🎹 Visual note editor: edits the note("...") string of the layer under the cursor.
// Supports a simple subset of mini-notation: steps separated by spaces, where each step is
// a note (c2, eb3, f#1), a rest (~), or a chord [c3,eb3,g3]. "x*4" is expanded to 4 steps.
// Wrapping the whole thing in < > means "one step per bar" (good for chord progressions).

const NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const toName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
function toMidi(name) {
  const m = /^([a-g])(#|s|b)?(-?\d)$/i.exec(name);
  if (!m) return null;
  const acc = m[2] === '#' || m[2] === 's' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (parseInt(m[3]) + 1) + PC[m[1].toLowerCase()] + acc;
}

export const CHORDS = {
  min: [0, 3, 7], maj: [0, 4, 7], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], '7': [0, 4, 7, 10],
  min9: [0, 3, 7, 10, 14], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  power: [0, 7, 12], octave: [0, 12],
};

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  'minor pentatonic': [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], chromatic: [...Array(12).keys()],
};

// presets are written in C and transposed to the chosen key
const PRESETS = [
  { group: 'Acid riffs', name: 'riff A', bars: false, steps: 'c2 c2 c3 c2 ~ c2 eb2 c2 ~ c2 g2 c2 bb1 c2 c3 c2' },
  { group: 'Acid riffs', name: 'riff B', bars: false, steps: 'c2 ~ c2 c3 ~ eb2 ~ c2 g1 ~ c2 ~ bb1 c2 ~ c3' },
  { group: 'Acid riffs', name: 'riff C (phrygian)', bars: false, steps: 'c2 db2 c2 ~ c3 c2 ~ db2 c2 ~ eb2 c2 c3 ~ db2 c2' },
  { group: 'Acid riffs', name: 'octave pump', bars: false, steps: 'c2 c3 c2 c3 c2 c3 c2 c3' },
  { group: 'Acid riffs', name: 'offbeat', bars: false, steps: '~ c2 ~ c2 ~ c2 ~ c2' },
  { group: 'Acid riffs', name: 'arp up', bars: false, steps: 'c3 eb3 g3 c4 g3 eb3 c3 eb3' },
  { group: 'Progressions (1 chord per bar)', name: 'Cm Ab Eb Bb', bars: true, steps: '[c3,eb3,g3] [ab2,c3,eb3] [eb3,g3,bb3] [bb2,d3,f3]' },
  { group: 'Progressions (1 chord per bar)', name: 'Cm Fm Gm Cm', bars: true, steps: '[c3,eb3,g3] [f3,ab3,c4] [g3,bb3,d4] [c3,eb3,g3]' },
  { group: 'Progressions (1 chord per bar)', name: 'Cm Bb Ab Bb', bars: true, steps: '[c3,eb3,g3] [bb2,d3,f3] [ab2,c3,eb3] [bb2,d3,f3]' },
  { group: 'Progressions (1 chord per bar)', name: 'Cm7 Abmaj7 Fm7 G7', bars: true, steps: '[c3,eb3,g3,bb3] [ab2,c3,eb3,g3] [f2,ab2,c3,eb3] [g2,b2,d3,f3]' },
  { group: 'Progressions (1 chord per bar)', name: 'dub Cm7 ↔ Fm7', bars: true, steps: '[c3,eb3,g3,bb3] [c3,eb3,g3,bb3] [f3,ab3,c4,eb4] [f3,ab3,c4,eb4]' },
  { group: 'Progressions (1 chord per bar)', name: 'pop C G Am F', bars: true, steps: '[c3,e3,g3] [b2,d3,g3] [c3,e3,a3] [c3,f3,a3]' },
];

// ---------- parse / serialise ----------
function splitTop(str) {
  const out = []; let depth = 0, cur = '';
  for (const c of str) {
    if (c === '[' || c === '<' || c === '{' || c === '(') depth++;
    if (c === ']' || c === '>' || c === '}' || c === ')') depth--;
    if (/\s/.test(c) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}
function parseStep(tok) {
  if (tok === '~' || tok === '-') return [];
  const mid = toMidi(tok);
  if (mid != null) return [mid];
  const chord = /^\[([^\[\]<> ]+)\]$/.exec(tok);
  if (chord) {
    const notes = chord[1].split(',').map(toMidi);
    if (notes.every((n) => n != null)) return notes;
  }
  return null;
}
export function parse(str) {
  let s = str.trim(), bars = false;
  if (s.startsWith('<') && s.endsWith('>') && !s.slice(1, -1).includes('<')) { bars = true; s = s.slice(1, -1); }
  const steps = [];
  for (const tok of splitTop(s)) {
    const rep = /^(.+)\*(\d+)$/.exec(tok);
    const [base, n] = rep && !rep[1].startsWith('<') ? [rep[1], Math.min(+rep[2], 64)] : [tok, 1];
    const step = parseStep(base);
    if (!step) return null;
    for (let i = 0; i < n; i++) steps.push([...step]);
  }
  return steps.length ? { bars, steps } : null;
}
// best-effort: squash nested mini-notation onto a flat grid of `total` steps
// ([a b] subdivides, <a b> takes the first option, x*n repeats)
export function flatten(str, total = 16) {
  const out = Array.from({ length: total }, () => []);
  function place(tok, start, slots) {
    tok = tok.trim();
    const rep = /^(.+)\*(\d+)$/.exec(tok);
    if (rep) return placeSeq(Array(+rep[2]).fill(rep[1]), start, slots);
    if (tok.startsWith('<') && tok.endsWith('>')) return place(splitTop(tok.slice(1, -1))[0] ?? '~', start, slots);
    if (tok.startsWith('[') && tok.endsWith(']') && !tok.includes(',')) return placeSeq(splitTop(tok.slice(1, -1)), start, slots);
    const step = parseStep(tok);
    if (step && slots >= 1) out[Math.floor(start)].push(...step);
  }
  function placeSeq(toks, start, slots) {
    toks.forEach((t, i) => place(t, start + (i * slots) / toks.length, slots / toks.length));
  }
  placeSeq(splitTop(str.trim()), 0, total);
  return { bars: false, steps: out };
}

export function serialise({ bars, steps }) {
  const body = steps.map((st) => {
    const sorted = [...new Set(st)].sort((a, b) => a - b).map(toName);
    return sorted.length === 0 ? '~' : sorted.length === 1 ? sorted[0] : `[${sorted.join(',')}]`;
  }).join(' ');
  return bars ? `<${body}>` : body;
}

// ---------- UI ----------
const css = `
#ne { position: absolute; left: 0; right: 0; bottom: 0; height: 58%; background: #101010; border-top: 2px solid #d6ff3a;
  z-index: 10; display: flex; flex-direction: column; font: 12px ui-monospace, monospace; color: #d6ff3a; }
#ne .bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 10px; border-bottom: 1px solid #222; }
#ne .bar b { margin-right: 6px; }
#ne select, #ne button { background: #161616; color: #d6ff3a; border: 1px solid #333; padding: 3px 6px; font: inherit; cursor: pointer; }
#ne button:hover, #ne button.on { background: #d6ff3a; color: #000; }
#ne .body { flex: 1; display: flex; min-height: 0; }
#ne .gridwrap { flex: 1; overflow: auto; position: relative; }
#ne .grid { display: grid; user-select: none; }
#ne .key { position: sticky; left: 0; background: #181818; padding: 0 6px; font-size: 10px; line-height: 14px; z-index: 1; border-bottom: 1px solid #0b0b0b; color: #aaa; }
#ne .key.black { background: #0d0d0d; color: #666; }
#ne .key.c { color: #d6ff3a; }
#ne .cell { border-right: 1px solid #1d1d1d; border-bottom: 1px solid #1d1d1d; height: 14px; cursor: pointer; }
#ne .cell.inscale { background: #171c0c; }
#ne .cell.beat { border-left: 1px solid #333; }
#ne .cell:hover { background: #3a4a10; }
#ne .cell.on { background: #d6ff3a; box-shadow: inset 0 0 0 1px #000; }
#ne .cell.on.chord { background: #56B4E9; box-shadow: inset 0 0 0 3px #000; }
#ne .head { position: sticky; top: 0; background: #101010; z-index: 2; font-size: 10px; text-align: center; color: #777; height: 16px; }
#ne .side { width: 220px; overflow-y: auto; border-left: 1px solid #222; padding: 6px 8px; }
#ne .side h5 { margin: 8px 0 4px; font-size: 10px; letter-spacing: 1px; opacity: .6; text-transform: uppercase; }
#ne .side button { display: block; width: 100%; text-align: left; margin-bottom: 3px; }
#ne .msg { padding: 20px; color: #ffb43a; line-height: 1.6; }
#ne .help { opacity: .55; font-size: 11px; }
`;

export function createNoteEditor({ container, view, onChange, preview }) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  let el = null;
  let target = null; // { from, to } of the string contents inside note("...")
  let model = null;
  let mode = 'note', chordType = 'min', key = 0, scale = 'minor', lowOct = null;

  function findTarget() {
    const doc = view().state.doc.toString();
    const cursor = view().state.selection.main.head;
    const re = /note\(\s*(["'])((?:(?!\1)[^\n])*)\1\s*\)/g;
    let best = null;
    for (const m of doc.matchAll(re)) {
      const from = m.index + m[0].indexOf(m[1]) + 1;
      const to = from + m[2].length;
      // prefer the note() in the same layer as the cursor: the closest one at or before it
      const dist = m.index <= cursor ? cursor - m.index : (m.index - cursor) * 4;
      if (!best || dist < best.dist) best = { from, to, dist };
    }
    return best;
  }

  function write() {
    const str = serialise(model);
    view().dispatch({ changes: { from: target.from, to: target.to, insert: str } });
    target.to = target.from + str.length;
    onChange();
  }

  function close() { el?.remove(); el = null; }

  function open() {
    close();
    target = findTarget();
    el = document.createElement('div');
    el.id = 'ne';
    container.append(el);
    if (!target) {
      el.innerHTML = `<div class="bar"><b>🎹 NOTES</b><button data-x="close" style="margin-left:auto">✕ close</button></div>
        <div class="msg">There's no <code>note("...")</code> in your code yet.<br><br>
        <button data-x="new">+ add a new melody layer</button></div>`;
      el.querySelector('[data-x=close]').onclick = close;
      el.querySelector('[data-x=new]').onclick = () => {
        onChange.addLayer(`note("c2 ~ c2 ~ eb2 ~ c2 ~").s("sawtooth").lpf(slider(1200, 100, 4000)).lpq(15).decay(.15).sustain(0).gain(.6),`);
        open();
      };
      return;
    }
    const str = view().state.doc.sliceString(target.from, target.to);
    model = parse(str);
    if (!model) {
      el.innerHTML = `<div class="bar"><b>🎹 NOTES</b><button data-x="close" style="margin-left:auto">✕ close</button></div>
        <div class="msg">The notes <code>${str.replace(/</g, '&lt;')}</code> use advanced notation the grid can't show
        (nested brackets, &lt; &gt; inside, etc.).<br><br>
        <button data-x="flat">convert to a 16-step grid</button> <span class="help">(keeps the notes it can, simplifies the rest)</span></div>`;
      el.querySelector('[data-x=close]').onclick = close;
      el.querySelector('[data-x=flat]').onclick = () => {
        model = flatten(str, 16);
        if (!model.steps.some((s) => s.length)) model.steps[0] = [36];
        write(); open();
      };
      return;
    }
    const all = model.steps.flat();
    if (lowOct == null || (all.length && (Math.min(...all) < 12 * (lowOct + 1) || Math.max(...all) > 12 * (lowOct + 3)))) {
      lowOct = all.length ? Math.floor(Math.min(...all) / 12) - 1 : 2;
    }
    render();
  }

  function render() {
    const lo = 12 * (lowOct + 1), hi = lo + 24;
    const sc = SCALES[scale];
    const n = model.steps.length;
    const line = view().state.doc.lineAt(target.from).number;
    el.innerHTML = `
      <div class="bar">
        <b>🎹 NOTES · line ${line}</b>
        <button data-mode="note" class="${mode === 'note' ? 'on' : ''}" title="click = set note, shift+click = add to chord">✎ note</button>
        <button data-mode="chord" class="${mode === 'chord' ? 'on' : ''}" title="click a step's root to place a chord">♫ chord</button>
        <select data-x="chord">${Object.keys(CHORDS).map((c) => `<option ${c === chordType ? 'selected' : ''}>${c}</option>`).join('')}</select>
        | steps <select data-x="steps">${[4, 8, 12, 16, 32].map((s) => `<option ${s === n ? 'selected' : ''}>${s}</option>`).join('')}${[4, 8, 12, 16, 32].includes(n) ? '' : `<option selected>${n}</option>`}</select>
        <button data-x="bars" class="${model.bars ? 'on' : ''}" title="each step lasts a whole bar — for chord progressions">1 step = 1 bar</button>
        | key <select data-x="key">${NAMES.map((k, i) => `<option value="${i}" ${i === key ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('')}</select>
        <select data-x="scale">${Object.keys(SCALES).map((s) => `<option ${s === scale ? 'selected' : ''}>${s}</option>`).join('')}</select>
        | <button data-x="down">oct −</button><button data-x="up">oct +</button>
        <button data-x="shiftd" title="transpose everything down a semitone">♭ −1</button><button data-x="shiftu" title="transpose everything up a semitone">♯ +1</button>
        <button data-x="clear">clear</button>
        <button data-x="close" style="margin-left:auto">✕ close</button>
      </div>
      <div class="body">
        <div class="gridwrap"><div class="grid" style="grid-template-columns: 48px repeat(${n}, minmax(22px, 1fr))"></div></div>
        <div class="side"><div class="help">Click a preset to replace the notes (it uses the key you picked).<br>
          Grid: click = note · shift+click = add to chord · right-click = rest</div></div>
      </div>`;

    const grid = el.querySelector('.grid');
    grid.append(Object.assign(document.createElement('div'), { className: 'key head' }));
    for (let i = 0; i < n; i++)
      grid.append(Object.assign(document.createElement('div'), { className: 'head', textContent: model.bars ? `bar ${i + 1}` : i + 1 }));
    for (let m = hi; m >= lo; m--) {
      const pc = m % 12;
      const k = document.createElement('div');
      k.className = 'key' + ([1, 3, 6, 8, 10].includes(pc) ? ' black' : '') + (pc === 0 ? ' c' : '');
      k.textContent = toName(m);
      k.onclick = () => preview([m]);
      grid.append(k);
      const inScale = sc.includes((pc - key + 12) % 12);
      for (let i = 0; i < n; i++) {
        const c = document.createElement('div');
        const on = model.steps[i].includes(m);
        c.className = 'cell' + (inScale ? ' inscale' : '') + (i % 4 === 0 ? ' beat' : '') + (on ? ' on' : '') + (on && model.steps[i].length > 1 ? ' chord' : '');
        c.onclick = (e) => {
          const st = model.steps[i];
          if (mode === 'chord') model.steps[i] = CHORDS[chordType].map((x) => m + x);
          else if (e.shiftKey) model.steps[i] = st.includes(m) ? st.filter((x) => x !== m) : [...st, m];
          else model.steps[i] = st.length === 1 && st[0] === m ? [] : [m];
          if (model.steps[i].length) preview(model.steps[i]);
          write(); render();
        };
        c.oncontextmenu = (e) => { e.preventDefault(); model.steps[i] = []; write(); render(); };
        grid.append(c);
      }
    }

    const side = el.querySelector('.side');
    let group = null;
    for (const p of PRESETS) {
      if (p.group !== group) { group = p.group; side.append(Object.assign(document.createElement('h5'), { textContent: group })); }
      const b = document.createElement('button');
      b.textContent = p.name;
      b.onclick = () => {
        const parsed = parse(p.steps);
        const shift = key > 6 ? key - 12 : key; // transpose to the nearest key
        model = { bars: p.bars, steps: parsed.steps.map((st) => st.map((x) => x + shift)) };
        const all = model.steps.flat();
        lowOct = Math.floor(Math.min(...all) / 12) - 1;
        write(); render();
      };
      side.append(b);
    }

    const $ = (s) => el.querySelector(s);
    el.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; render(); }));
    $('[data-x=chord]').onchange = (e) => { chordType = e.target.value; mode = 'chord'; render(); };
    $('[data-x=steps]').onchange = (e) => {
      const want = +e.target.value;
      model.steps = Array.from({ length: want }, (_, i) => model.steps[i] ?? []);
      write(); render();
    };
    $('[data-x=bars]').onclick = () => { model.bars = !model.bars; write(); render(); };
    $('[data-x=key]').onchange = (e) => { key = +e.target.value; render(); };
    $('[data-x=scale]').onchange = (e) => { scale = e.target.value; render(); };
    $('[data-x=down]').onclick = () => { lowOct = Math.max(-1, lowOct - 1); render(); };
    $('[data-x=up]').onclick = () => { lowOct = Math.min(7, lowOct + 1); render(); };
    $('[data-x=shiftd]').onclick = () => { model.steps = model.steps.map((s) => s.map((x) => x - 1)); write(); render(); };
    $('[data-x=shiftu]').onclick = () => { model.steps = model.steps.map((s) => s.map((x) => x + 1)); write(); render(); };
    $('[data-x=clear]').onclick = () => { model.steps = model.steps.map(() => []); write(); render(); };
    $('[data-x=close]').onclick = close;
  }

  return { open, close, isOpen: () => !!el };
}

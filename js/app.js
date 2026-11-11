'use strict';
/* Englisch-Abenteuer – app logic. Content lives in units/*.json (see docs/UNIT_FORMAT.md). */

const KEY = 'englisch-abenteuer-v1';
const DEFAULTS = { name: 'Adam', rubies: 0, streak: { last: '', count: 0 }, lessons: {}, wrong: {}, sound: true, unlockAll: false };
const LESSON_SIZE = 10, BOSS_SIZE = 12, BOSS_HEARTS = 3;

let S = load();
let UNITS = [];
let session = null;
const app = document.getElementById('app');
const canSpeak = 'speechSynthesis' in window;

/* ---------- helpers ---------- */
function load() {
  const base = JSON.parse(JSON.stringify(DEFAULTS));
  try { return Object.assign(base, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return base; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(3)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const norm = s => String(s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.!?,]/g, '').replace(/\s+/g, ' ').trim();
const asList = a => Array.isArray(a) ? a : [a];
const today = () => new Date().toLocaleDateString('sv');
function ask(question, yesLabel, onYes) {
  const close = () => box.remove();
  const box = h('div', { class: 'overlay' }, h('div', { class: 'card dialog' },
    h('p', {}, h('strong', {}, question)),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: close }, 'Nein, weiter'),
      h('button', { class: 'btn danger', onclick: () => { close(); onYes(); } }, yesLabel))));
  document.body.append(box);
}
function show(...nodes) { app.replaceChildren(...nodes.filter(Boolean)); window.scrollTo(0, 0); }

/* ---------- sound ---------- */
let actx;
function tone(freqs, dur = 0.12) {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * dur;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.5);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur * 1.5);
    });
  } catch {}
}
let voices = [];
if (canSpeak) {
  const pick = () => { voices = speechSynthesis.getVoices(); };
  pick(); speechSynthesis.addEventListener?.('voiceschanged', pick);
}
function speak(text) {
  if (!canSpeak || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/–/g, ','));
    u.lang = 'en-GB'; u.rate = 0.85;
    const v = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {}
}
const speakBtn = (text, big) => canSpeak ? h('button', { class: 'speak' + (big ? ' big' : ''), 'aria-label': 'Anhören', onclick: () => speak(text) }, '🔊') : null;

/* ---------- data ---------- */
async function loadUnits() {
  const files = await (await fetch('units/index.json', { cache: 'no-cache' })).json();
  UNITS = await Promise.all(files.map(async f => (await fetch('units/' + f, { cache: 'no-cache' })).json()));
  for (const u of UNITS) {
    u.bossId = u.id + '/boss';
    for (const l of u.lessons) {
      l.key = u.id + '/' + l.id;
      l.exercises.forEach((ex, i) => { ex.id = l.key + '/' + i; });
    }
  }
}
const allExercises = () => UNITS.flatMap(u => u.lessons.flatMap(l => l.exercises));
const stars = key => S.lessons[key]?.stars || 0;
const lessonOpen = (u, i) => S.unlockAll || i === 0 || stars(u.lessons[i - 1].key) > 0;
const bossOpen = u => S.unlockAll || u.lessons.every(l => stars(l.key) > 0);
const usable = ex => ex.type !== 'listen' || canSpeak;
const wrongList = () => allExercises().filter(ex => S.wrong[ex.id] && usable(ex));

/* ---------- home ---------- */
function home() {
  session = null;
  const streakAlive = S.streak.last === today() || S.streak.last === new Date(Date.now() - 864e5).toLocaleDateString('sv');
  const top = h('header', { class: 'top' },
    h('div', {}, h('h1', {}, `${S.name}s Englisch-Abenteuer`), h('p', { class: 'sub' }, 'Wähle ein Level und sammle Sterne!')),
    h('div', { class: 'stats' },
      h('span', { class: 'stat', title: 'Rubine' }, '💎 ', String(S.rubies)),
      h('span', { class: 'stat', title: 'Tage in Folge' }, '🔥 ', String(streakAlive ? S.streak.count : 0)),
      h('button', { class: 'icon-btn', 'aria-label': 'Einstellungen', onclick: settings }, '⚙️')));

  const sections = UNITS.map(u => {
    const nodes = u.lessons.map((l, i) => {
      const open = lessonOpen(u, i), st = stars(l.key);
      return h('button', { class: 'node' + (open ? '' : ' locked') + (st ? ' done' : ''), disabled: !open, onclick: () => intro(u, l) },
        h('span', { class: 'node-icon' }, open ? l.icon : '🔒'),
        h('span', { class: 'node-title' }, l.title),
        h('span', { class: 'node-stars' }, '★'.repeat(st), h('i', {}, '★'.repeat(3 - st))));
    });
    const bOpen = bossOpen(u), bWon = stars(u.bossId);
    nodes.push(h('button', { class: 'node boss' + (bOpen ? '' : ' locked') + (bWon ? ' done' : ''), disabled: !bOpen, onclick: () => start(u, null, 'boss') },
      h('span', { class: 'node-icon' }, bOpen ? (u.boss?.icon || '🐉') : '🔒'),
      h('span', { class: 'node-title' }, u.boss?.title || 'Endgegner'),
      h('span', { class: 'node-stars' }, bWon ? '🏆 Besiegt!' : 'Alle Level schaffen')));
    return h('section', { class: 'unit' },
      h('h2', {}, u.icon + ' ' + u.title), h('p', { class: 'sub' }, u.subtitle || ''),
      h('div', { class: 'map' }, nodes));
  });

  const wl = wrongList();
  const training = wl.length ? h('button', { class: 'btn gold wide', onclick: () => start(null, null, 'training') },
    `💪 Fehler-Training (${wl.length} ${wl.length === 1 ? 'Aufgabe' : 'Aufgaben'})`) : null;
  show(top, training, ...sections);
}

/* ---------- lesson intro (explanation) ---------- */
function explainBlocks(blocks) {
  return (blocks || []).map(b => {
    if (b.h) return h('h3', { html: b.h });
    if (b.p) return h('p', { html: b.p });
    if (b.tip) return h('p', { class: 'tip', html: '💡 ' + b.tip });
    if (b.table) return h('table', { class: 'rule' }, b.table.map(r => h('tr', {}, r.map(c => h('td', { html: c })))));
    return null;
  });
}
function intro(u, l) {
  show(
    h('header', { class: 'top' }, h('button', { class: 'btn ghost', onclick: home }, '← Karte'), h('h1', {}, l.icon + ' ' + l.title)),
    h('div', { class: 'card explain' }, explainBlocks(l.explain)),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary big', onclick: () => start(u, l, 'lesson') }, "▶ Los geht's!"),
      h('button', { class: 'btn', onclick: () => worksheet(u, l) }, '🖨️ Arbeitsblatt')));
}

/* ---------- session ---------- */
const WEIGHT = { choice: 0, match: 0, fix: 1, order: 1, word: 2, gap: 2, listen: 2 };
function start(u, l, mode) {
  let pool, size = LESSON_SIZE;
  if (mode === 'lesson') pool = l.exercises;
  else if (mode === 'boss') { pool = u.lessons.flatMap(x => x.exercises).filter(ex => ex.type !== 'match'); size = BOSS_SIZE; }
  else pool = wrongList();
  let queue = shuffle(pool.filter(usable)).slice(0, size);
  if (mode === 'lesson') {
    let seenMatch = false;
    queue = queue.filter(ex => ex.type !== 'match' || (!seenMatch && (seenMatch = true)));
    queue.sort((a, b) => WEIGHT[a.type] - WEIGHT[b.type]);
  }
  session = { u, l, mode, queue, total: queue.length, done: 0, first: 0, missed: new Set(), hearts: BOSS_HEARTS, cur: null };
  next();
}

function next() {
  const s = session;
  if (!s) return;
  if (s.mode === 'boss' && s.hearts <= 0) return result(false);
  if (!s.queue.length) return result(true);
  const ex = s.cur = s.queue.shift();
  const left = s.queue.length + 1;
  const pct = Math.round(100 * s.done / (s.done + left));

  const checkBtn = h('button', { class: 'btn primary big', id: 'check', disabled: true, onclick: () => finish(view.check()) }, 'Prüfen');
  const ctx = { ready: ok => { checkBtn.disabled = !ok; }, submit: () => finish(view.check()) };
  const view = TYPES[ex.type](ex, ctx);
  s.view = view;

  const bar = h('header', { class: 'playbar' },
    h('button', { class: 'icon-btn', 'aria-label': 'Beenden', onclick: () => ask('Level wirklich beenden?', 'Ja, beenden', home) }, '✕'),
    s.mode === 'boss'
      ? h('div', { class: 'bosshp' }, h('span', {}, s.u.boss?.icon || '🐉'), h('div', { class: 'progress red' }, h('div', { style: `width:${100 - pct}%` })))
      : h('div', { class: 'progress' }, h('div', { style: `width:${pct}%` })),
    s.mode === 'boss' ? h('span', { class: 'hearts' }, '❤️'.repeat(s.hearts) + '🖤'.repeat(BOSS_HEARTS - s.hearts)) : null);

  const footer = h('footer', { class: 'playfoot', id: 'foot' }, view.auto ? null : checkBtn);
  show(bar, h('div', { class: 'card play' }, h('p', { class: 'instr' }, view.instr), view.el), footer);
  view.focus?.();
  if (ex.type === 'listen') setTimeout(() => speak(ex.answer), 350);
}

function finish({ ok, solution }) {
  const s = session, ex = s.cur;
  if (s.locked) return; s.locked = true;
  document.querySelector('.play').classList.add('locked', ok ? 'ok' : 'bad');
  if (ok) {
    if (!s.missed.has(ex.id)) s.first++;
    delete S.wrong[ex.id];
    s.done++;
    tone([660, 880]);
    if (S.sound && solution) speak(solution);
  } else {
    S.wrong[ex.id] = true;
    s.missed.add(ex.id);
    tone([220, 180], 0.18);
    if (s.mode === 'boss') { s.hearts--; s.done++; } else s.queue.push(ex);
  }
  save();
  const praise = ['Super!', 'Richtig!', `Stark, ${S.name}!`, 'Genau so!', 'Klasse!', 'Volltreffer!'];
  const fb = h('div', { class: 'feedback ' + (ok ? 'ok' : 'bad') },
    h('div', { class: 'fb-text' },
      h('strong', {}, ok ? '✅ ' + praise[Math.floor(Math.random() * praise.length)] : '❌ Nicht ganz …'),
      solution ? h('p', { class: 'solution' }, ok ? '' : 'Richtig ist: ', h('b', {}, solution), ' ', speakBtn(solution)) : null,
      ex.why ? h('p', { class: 'why', html: '💡 ' + ex.why }) : null,
      !ok && s.mode !== 'boss' ? h('p', { class: 'why' }, 'Diese Aufgabe kommt gleich noch einmal.') : null),
    h('button', { class: 'btn primary big', id: 'next', onclick: () => { s.locked = false; next(); } }, 'Weiter →'));
  document.getElementById('foot').replaceChildren(fb);
  document.getElementById('next').focus();
}

function result(won) {
  const s = session;
  const ratio = s.total ? s.first / s.total : 0;
  let st = 0, earned = s.first;
  if (won) {
    st = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
    earned += s.mode === 'boss' ? 10 : 5;
    const key = s.mode === 'boss' ? s.u.bossId : s.l?.key;
    if (key) S.lessons[key] = { stars: Math.max(stars(key), st), plays: (S.lessons[key]?.plays || 0) + 1 };
    const t = today(), y = new Date(Date.now() - 864e5).toLocaleDateString('sv');
    if (S.streak.last !== t) S.streak = { last: t, count: S.streak.last === y ? S.streak.count + 1 : 1 };
    tone([523, 659, 784, 1047], 0.14);
  }
  S.rubies += earned; save();
  const title = !won ? 'Der Endgegner war diesmal stärker!' : s.mode === 'boss' ? '🏆 Endgegner besiegt!' : s.mode === 'training' ? 'Training geschafft!' : 'Level geschafft!';
  const again = () => start(s.u, s.l, s.mode);
  show(
    won ? h('div', { class: 'confetti' }, Array.from({ length: 24 }, (_, i) => h('span', { style: `left:${Math.random() * 100}%;animation-delay:${Math.random() * 1.5}s` }, ['💎', '⭐', '🎉', '✨'][i % 4]))) : null,
    h('div', { class: 'card result' },
      h('div', { class: 'big-emoji' }, won ? (s.mode === 'boss' ? '🏆' : '🎉') : '😵'),
      h('h1', {}, title),
      won && s.mode !== 'training' ? h('p', { class: 'result-stars' }, '★'.repeat(st), h('i', {}, '★'.repeat(3 - st))) : null,
      h('p', {}, `${s.first} von ${s.total} gleich beim ersten Mal richtig.`),
      h('p', { class: 'earned' }, `+${earned} 💎`),
      !won ? h('p', {}, 'Übe die Level noch einmal und versuch es dann wieder. Du schaffst das!') : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn primary big', id: 'next', onclick: home }, 'Zur Karte'),
        s.mode !== 'training' ? h('button', { class: 'btn', onclick: again }, '↻ Nochmal') : null)));
}

/* ---------- exercise types ---------- */
function sentenceEl(q, fill) {
  const el = h('p', { class: 'sentence' });
  q.split('___').forEach((part, i, arr) => { el.append(part); if (i < arr.length - 1) el.append(fill); });
  return el;
}
const hintEl = ex => [ex.hint ? h('p', { class: 'hint' }, '👉 ', ex.hint) : null, ex.de ? h('p', { class: 'de' }, '🇩🇪 ', ex.de) : null];
function textInput(ctx, wide) {
  return h('input', { class: 'answer' + (wide ? ' wide' : ''), type: 'text', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
    oninput: e => ctx.ready(e.target.value.trim().length > 0) });
}
function optionButtons(options, onPick, column) {
  const box = h('div', { class: 'opts' + (column ? ' column' : '') });
  shuffle(options).forEach(o => box.append(h('button', { class: 'opt', 'data-v': o, onclick: e => {
    box.querySelectorAll('.opt').forEach(b => b.classList.toggle('sel', b === e.currentTarget)); onPick(o);
  } }, o)));
  return box;
}

const TYPES = {
  choice(ex, ctx) {
    let sel = null;
    const gap = h('span', { class: 'gap' }, ' ');
    const box = optionButtons(ex.options, o => { sel = o; gap.textContent = o; gap.classList.add('filled'); ctx.ready(true); });
    return { instr: 'Wähle das richtige Wort.', el: h('div', {}, sentenceEl(ex.q, gap), hintEl(ex), box),
      check: () => ({ ok: sel === ex.answer, solution: ex.q.replace('___', ex.answer) }) };
  },
  gap(ex, ctx) {
    const input = textInput(ctx), answers = asList(ex.answer);
    return { instr: 'Schreibe das fehlende Wort.', el: h('div', {}, sentenceEl(ex.q, input), hintEl(ex)), focus: () => input.focus(),
      check: () => ({ ok: answers.some(a => norm(a) === norm(input.value)), solution: ex.q.replace('___', answers[0]) }) };
  },
  word(ex, ctx) {
    const answers = asList(ex.answer);
    if (ex.options) {
      let sel = null;
      return { instr: 'Wie heißt das auf Englisch?', el: h('div', {}, h('p', { class: 'sentence' }, '🇩🇪 ', ex.de), optionButtons(ex.options, o => { sel = o; ctx.ready(true); })),
        check: () => ({ ok: sel === answers[0], solution: answers[0] }) };
    }
    const input = textInput(ctx, true);
    return { instr: 'Wie heißt das auf Englisch? Schreibe das Wort.', el: h('div', {}, h('p', { class: 'sentence' }, '🇩🇪 ', ex.de), input), focus: () => input.focus(),
      check: () => ({ ok: answers.some(a => norm(a) === norm(input.value)), solution: answers[0] }) };
  },
  listen(ex, ctx) {
    const play = speakBtn(ex.answer, true);
    if (ex.options) {
      let sel = null;
      return { instr: 'Hör gut zu. Was hörst du?', el: h('div', {}, play, optionButtons(ex.options, o => { sel = o; ctx.ready(true); }, true)),
        check: () => ({ ok: sel === ex.answer, solution: ex.answer }) };
    }
    const input = textInput(ctx, true);
    return { instr: 'Hör gut zu und schreibe den Satz.', el: h('div', {}, play, input), focus: () => input.focus(),
      check: () => ({ ok: norm(input.value) === norm(ex.answer), solution: ex.answer }) };
  },
  order(ex, ctx) {
    const words = ex.answer.split(' ');
    let pool = shuffle([...words, ...(ex.extra || [])].map(t => ({ t })));
    if (pool.map(p => p.t).join(' ') === ex.answer) pool.reverse();
    const line = [], lineEl = h('div', { class: 'line' }), bankEl = h('div', { class: 'bank' });
    const draw = () => {
      lineEl.replaceChildren(...line.map(p => h('button', { class: 'tok', onclick: () => { line.splice(line.indexOf(p), 1); draw(); } }, p.t)));
      bankEl.replaceChildren(...pool.map(p => h('button', { class: 'tok', disabled: line.includes(p), onclick: () => { line.push(p); draw(); } }, p.t)));
      ctx.ready(line.length >= words.length);
    };
    draw();
    return { instr: 'Bringe die Wörter in die richtige Reihenfolge.', el: h('div', {}, hintEl(ex), lineEl, bankEl),
      check: () => ({ ok: [ex.answer, ...(ex.alt || [])].includes(line.map(p => p.t).join(' ')), solution: ex.answer }) };
  },
  fix(ex, ctx) {
    let sel = -1;
    const strip = t => t.replace(/[.,!?]/g, ''), toks = ex.q.split(' ');
    const btns = toks.map((t, i) => h('button', { class: 'tok', onclick: () => { sel = i; btns.forEach((b, j) => b.classList.toggle('sel', j === i)); ctx.ready(true); } }, t));
    const solution = toks.map(t => strip(t) === ex.wrong ? t.replace(ex.wrong, ex.right) : t).join(' ');
    return { instr: 'Ein Wort ist falsch. Tippe es an!', el: h('div', {}, h('div', { class: 'line fixline' }, btns)),
      check: () => ({ ok: sel >= 0 && strip(toks[sel]) === ex.wrong, solution }) };
  },
  match(ex, ctx) {
    let mistakes = 0, left = null, done = 0;
    const isPair = (a, b) => ex.pairs.some(p => p[0] === a && p[1] === b);
    const mk = (t, side) => h('button', { class: 'tok m-' + side, 'data-v': t, onclick: e => tap(e.currentTarget, t, side) }, t);
    const L = ex.pairs.map(p => mk(p[0], 'l')), R = shuffle(ex.pairs.map(p => p[1])).map(t => mk(t, 'r'));
    function tap(btn, t, side) {
      if (side === 'l') { left = btn; L.forEach(b => b.classList.toggle('sel', b === btn)); return; }
      if (!left) return;
      if (isPair(left.dataset.v, t)) {
        [left, btn].forEach(b => { b.disabled = true; b.classList.remove('sel'); b.classList.add('matched'); });
        left = null; tone([700]);
        if (++done === ex.pairs.length) setTimeout(ctx.submit, 400);
      } else {
        mistakes++; btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 400); tone([200], 0.15);
      }
    }
    return { auto: true, instr: 'Was gehört zusammen? Tippe erst links, dann rechts.',
      el: h('div', { class: 'match' }, h('div', { class: 'col' }, L), h('div', { class: 'col' }, R)),
      check: () => ({ ok: mistakes === 0, solution: mistakes ? ex.pairs.map(p => p[0] + ' → ' + p[1]).join(' · ') : null }) };
  }
};

/* ---------- printable worksheet ---------- */
function worksheet(u, l) {
  let seenMatch = false;
  const picks = shuffle(l.exercises.filter(ex => ex.type !== 'listen'))
    .filter(ex => ex.type !== 'match' || (!seenMatch && (seenMatch = true))).slice(0, 14)
    .sort((a, b) => WEIGHT[a.type] - WEIGHT[b.type]);
  const blank = '__________';
  const task = ex => {
    switch (ex.type) {
      case 'choice': return [ex.q.replace('___', blank), h('span', { class: 'ws-opts' }, ' (' + ex.options.join(' / ') + ')')];
      case 'gap': return [ex.q.replace('___', blank), ex.hint ? h('span', { class: 'ws-opts' }, ' (' + ex.hint + ')') : ''];
      case 'word': return ['Auf Englisch: ' + ex.de + ' = ' + blank];
      case 'order': return ['Ordne die Wörter: ', h('b', {}, shuffle(ex.answer.split(' ')).join(' / ')), h('div', { class: 'ws-line' })];
      case 'fix': return ['Finde den Fehler und schreibe den Satz richtig: ', h('b', {}, ex.q), h('div', { class: 'ws-line' })];
      case 'match': return ['Verbinde, was zusammengehört:', h('div', { class: 'ws-match' },
        h('ul', {}, ex.pairs.map(p => h('li', {}, p[0] + ' •'))), h('ul', {}, shuffle(ex.pairs).map(p => h('li', {}, '• ' + p[1]))))];
    }
  };
  const sol = ex => {
    switch (ex.type) {
      case 'choice': return ex.q.replace('___', ex.answer);
      case 'gap': return ex.q.replace('___', asList(ex.answer)[0]);
      case 'word': return ex.de + ' = ' + asList(ex.answer)[0];
      case 'order': return ex.answer;
      case 'fix': return TYPES.fix(ex, { ready() {} }).check().solution;
      case 'match': return ex.pairs.map(p => p[0] + ' → ' + p[1]).join(', ');
    }
  };
  show(
    h('header', { class: 'top no-print' },
      h('button', { class: 'btn ghost', onclick: () => intro(u, l) }, '← Zurück'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => worksheet(u, l) }, '🔀 Neue Aufgaben'),
        window.NO_PRINT ? h('span', { class: 'sub' }, 'Drucken geht in der fertigen Web-Version.') : h('button', { class: 'btn primary', onclick: () => window.print() }, '🖨️ Drucken'))),
    h('div', { class: 'sheet' },
      h('div', { class: 'ws-head' }, h('h1', {}, l.icon + ' ' + l.title), h('p', {}, 'Name: ' + S.name + '   Datum: ____________')),
      h('div', { class: 'ws-rule' }, explainBlocks(l.explain)),
      h('ol', { class: 'ws-tasks' }, picks.map(ex => h('li', {}, task(ex))))),
    h('div', { class: 'sheet solutions' },
      h('h1', {}, 'Lösungen: ' + l.title),
      h('ol', {}, picks.map(ex => h('li', {}, sol(ex))))));
}

/* ---------- settings ---------- */
function settings() {
  const toggle = (label, key) => h('label', { class: 'setting' }, h('input', { type: 'checkbox', checked: S[key], onchange: e => { S[key] = e.target.checked; save(); } }), ' ', label);
  show(
    h('header', { class: 'top' }, h('button', { class: 'btn ghost', onclick: home }, '← Karte'), h('h1', {}, '⚙️ Einstellungen')),
    h('div', { class: 'card' },
      h('label', { class: 'setting' }, 'Name: ', h('input', { class: 'answer wide', type: 'text', value: S.name, oninput: e => { S.name = e.target.value.trim() || 'Adam'; save(); } })),
      toggle('Töne und Vorlesen', 'sound'),
      toggle('Alle Level freischalten (für Eltern)', 'unlockAll'),
      h('p', { class: 'sub dark' }, 'Der Fortschritt wird nur auf diesem Gerät gespeichert.'),
      h('button', { class: 'btn danger', onclick: () => ask('Wirklich den ganzen Fortschritt löschen?', 'Ja, löschen', () => {
        try { localStorage.removeItem(KEY); } catch {} S = load(); home();
      }) }, '🗑️ Fortschritt löschen')));
}

/* ---------- boot ---------- */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const btn = document.getElementById('next') || document.getElementById('check');
  if (btn && !btn.disabled && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); btn.click(); }
});
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
loadUnits().then(home).catch(err => {
  show(h('div', { class: 'card' }, h('h1', {}, 'Ups!'), h('p', {}, 'Die Aufgaben konnten nicht geladen werden.'), h('pre', {}, String(err))));
});

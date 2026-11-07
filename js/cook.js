'use strict';
/* ===================== Шаги, таймеры и режим «Готовлю» ===================== */

// Шаги рецепта: [{type: 'step'|'group', text, photo}]
function parseStepsText(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => (
    /:$/.test(l) && l.length < 70
      ? { type: 'group', text: l.replace(/:$/, '') }
      : { type: 'step', text: l.replace(/^\d+[.)]\s*/, ''), photo: null }
  ));
}
function stepsToText(items) {
  return items.filter((s) => s.text && s.text.trim()).map((s) => (s.type === 'group' ? s.text.trim().replace(/:$/, '') + ':' : s.text.trim())).join('\n');
}
function getSteps(r) {
  if (Array.isArray(r.stepItems) && r.stepItems.length) return r.stepItems;
  return parseStepsText(r.steps);
}
function stepPhotoIds(r) {
  return (Array.isArray(r.stepItems) ? r.stepItems : []).map((s) => s.photo).filter(Boolean);
}

// Время в тексте шага: «15–20 минут», «1 час», «30 сек»
const TIME_RE = /(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*(ч(?:ас(?:а|ов)?)?|мин(?:ут[аы]?|уту)?|сек(?:унд[аыу]?)?)(?![а-яё])/gi;
function findTimes(text) {
  const out = [];
  for (const m of String(text).matchAll(TIME_RE)) {
    // «перемешивать каждые 3–4 минуты» — это не таймер
    if (/кажд[а-я]*\s*$/i.test(String(text).slice(Math.max(0, m.index - 12), m.index))) continue;
    const a = parseFloat(m[1].replace(',', '.'));
    const u = m[3].toLowerCase();
    const mult = u.startsWith('ч') ? 3600 : u.startsWith('м') ? 60 : 1;
    const short = u.startsWith('ч') ? 'ч' : u.startsWith('м') ? 'мин' : 'сек';
    if (!a || a * mult > 24 * 3600) continue;
    out.push({ seconds: Math.round(a * mult), label: `${m[1]}${m[2] ? '–' + m[2] : ''} ${short}` });
  }
  return out;
}
function timerButtons(text, title, sessionId) {
  return findTimes(text).map((t) => `<button type="button" class="timer-btn" data-timer="${t.seconds}" data-tlabel="${esc((title ? title + ': ' : '') + t.label)}"${sessionId ? ` data-session="${esc(sessionId)}"` : ''}>${Icons.timer}${esc(t.label)}</button>`).join('');
}

// Шаги для просмотра рецепта (с фото и кнопками таймера)
function stepsViewHTML(r, sessionId) {
  const items = getSteps(r);
  if (!items.length) return '';
  let n = 0;
  return `<ol class="steps">${items.map((s) => {
    if (s.type === 'group') { n = 0; return `<li class="step-h">${esc(s.text)}</li>`; }
    n++;
    const t = timerButtons(s.text, r.title, sessionId);
    return `<li class="step"><span class="step-n">${n}</span><div class="step-body"><p>${esc(s.text)}</p>
      ${t ? `<div class="timer-row">${t}</div>` : ''}
      ${s.photo ? `<img class="step-ph" data-photo="${esc(s.photo)}" data-act="zoom" alt="">` : ''}</div></li>`;
  }).join('')}</ol>`;
}

/* ---------- Таймеры ---------- */
const Timers = {
  list: [],   // быстрые таймеры (живут только на этом устройстве)
  sess: [],   // таймеры готовок «в работе» (хранятся в базе и синхронизируются)
  tick: null,
  audio: null,

  all() { return [...this.list, ...this.sess]; },

  async load() {
    try { this.list = JSON.parse(localStorage.getItem('kn-timers') || '[]'); } catch (e) { this.list = []; }
    await this.loadSessions(true);
  },
  async loadSessions(first = false) {
    let sessions = [];
    try { sessions = (await DB.all('sessions')).filter((x) => x.status === 'active'); } catch (e) { /* */ }
    this.sess = sessions.flatMap((x) => (x.timers || []).map((t) => ({ ...t, sessionId: x.id, title: x.title })));
    if (first) {
      // таймеры, закончившиеся, пока приложение было закрыто
      const over = this.sess.filter((t) => !t.done && Date.now() >= t.end);
      for (const t of over) await this.markDone(t);
      if (over.length) toast(`⏰ Уже готово: ${over.map((t) => t.label).join(', ')}`);
    }
    if (this.all().length) this.ensureTick();
    this.render();
  },
  save() { try { localStorage.setItem('kn-timers', JSON.stringify(this.list)); } catch (e) { /* */ } },
  unlockAudio() {
    try {
      if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audio.state === 'suspended') this.audio.resume();
    } catch (e) { /* */ }
  },
  async start(label, seconds, sessionId) {
    this.unlockAudio();
    const t = { id: uid(), label, total: seconds, end: Date.now() + seconds * 1000, done: false };
    if (sessionId) {
      const x = await DB.get('sessions', sessionId);
      if (x) {
        x.timers = [...(x.timers || []), t];
        await DB.put('sessions', x);
        await this.loadSessions();
        toast(`Таймер запущен: ${label} · готово в ${this.clock(t.end)}`);
        document.dispatchEvent(new CustomEvent('kn-timers'));
        return t;
      }
    }
    this.list.push(t);
    this.save();
    this.ensureTick();
    this.render();
    toast(`Таймер запущен: ${label}`);
    return t;
  },
  async remove(id) {
    const st = this.sess.find((t) => t.id === id);
    if (st) {
      const x = await DB.get('sessions', st.sessionId);
      if (x) { x.timers = (x.timers || []).filter((t) => t.id !== id); await DB.put('sessions', x); }
      await this.loadSessions();
      document.dispatchEvent(new CustomEvent('kn-timers'));
      return;
    }
    this.list = this.list.filter((t) => t.id !== id);
    this.save();
    this.render();
  },
  async markDone(t) {
    t.done = true;
    if (!t.sessionId) return;
    const x = await DB.get('sessions', t.sessionId);
    if (!x) return;
    const tt = (x.timers || []).find((y) => y.id === t.id);
    if (tt && !tt.done) { tt.done = true; await DB.put('sessions', x); }
  },
  ensureTick() {
    if (this.tick) return;
    this.tick = setInterval(() => {
      let changed = false;
      for (const t of this.all()) {
        if (!t.done && Date.now() >= t.end) { changed = true; this.markDone(t); this.alarm(t); }
      }
      if (changed) { this.save(); document.dispatchEvent(new CustomEvent('kn-timers')); }
      this.render();
      if (!this.all().length) { clearInterval(this.tick); this.tick = null; }
    }, 500);
  },
  alarm(t) {
    toast(`⏰ Готово: ${t.label}`);
    try { if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) { /* */ }
    try {
      this.unlockAudio();
      const ctx = this.audio;
      if (!ctx) return;
      for (let i = 0; i < 4; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = i % 2 ? 880 : 1046;
        const t0 = ctx.currentTime + i * 0.35;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + 0.32);
      }
    } catch (e) { /* */ }
  },
  fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const z = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${z(m)}:${z(s)}` : `${z(m)}:${z(s)}`;
  },
  // «в 19:46» или «завтра в 07:30»
  clock(ts) {
    const d = new Date(ts);
    const hm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const days = Math.round((new Date(d.toDateString()) - new Date(new Date().toDateString())) / 864e5);
    if (days === 0) return hm;
    if (days === 1) return `завтра ${hm}`;
    return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${hm}`;
  },
  render() {
    let bar = document.getElementById('timerBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'timerBar';
      document.body.appendChild(bar);
      bar.addEventListener('click', (e) => {
        const x = e.target.closest('[data-tid]');
        if (x) { this.remove(x.dataset.tid); return; }
        const go = e.target.closest('[data-go]');
        if (go) location.hash = go.dataset.go;
      });
    }
    // на экране самой готовки таймеры и так видны — не дублируем
    const onSession = location.hash.startsWith('#/session/');
    const items = this.all().filter((t) => !(onSession && t.sessionId));
    bar.hidden = !items.length;
    bar.innerHTML = items.map((t) => {
      const left = (t.end - Date.now()) / 1000;
      return `<div class="tchip ${t.done ? 'done' : ''}" ${t.sessionId ? `data-go="#/session/${esc(t.sessionId)}"` : ''}>${Icons.timer}<span class="tl">${esc(t.label)}</span><b>${t.done ? 'готово!' : this.fmt(left)}</b><button type="button" data-tid="${t.id}" aria-label="Убрать таймер">${Icons.x}</button></div>`;
    }).join('');
  }
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-timer]');
  if (b) Timers.start(b.dataset.tlabel || 'Таймер', +b.dataset.timer, b.dataset.session || null);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) Timers.render(); });

/* ---------- Экран не гаснет ---------- */
const Awake = {
  lock: null,
  wanted: false,
  async on() {
    this.wanted = true;
    try {
      if ('wakeLock' in navigator) { this.lock = await navigator.wakeLock.request('screen'); return true; }
    } catch (e) { /* */ }
    return false;
  },
  off() {
    this.wanted = false;
    try { if (this.lock) this.lock.release(); } catch (e) { /* */ }
    this.lock = null;
  }
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && Awake.wanted) Awake.on(); });

/* ---------- Режим «Готовлю» ---------- */
async function viewCook(id) {
  const r = await DB.get('recipes', id);
  if (!r) return { html: topbar('#/recipes') + emptyHTML(Doodles.cutlery(), 'Рецепт не найден', '') };
  const st = state.scale[id] || { mode: 'groups', k: 1 };
  const k = st.k || 1;
  const steps = getSteps(r).filter((s) => s.text);
  const flat = [];
  let group = '';
  for (const s of steps) {
    if (s.type === 'group') { group = s.text; continue; }
    flat.push({ ...s, group });
  }
  const groups = scaleGroups(parseIngredients(r.ingredients), k);
  const cook = state.cook && state.cook.id === id ? state.cook : (state.cook = { id, i: 0, tab: flat.length ? 'steps' : 'ings', crossed: [] });

  const html = `${topbar(`#/recipe/${id}`, `<span class="cook-title">${esc(r.title)}</span>`)}
    <div class="cook">
      <div class="seg cook-tabs">
        <button type="button" data-ctab="ings" class="${cook.tab === 'ings' ? 'on' : ''}">Ингредиенты</button>
        <button type="button" data-ctab="steps" class="${cook.tab === 'steps' ? 'on' : ''}">Шаги</button>
      </div>
      ${Math.abs(k - 1) > 1e-9 ? `<p class="muted small cook-k">Граммы пересчитаны: ×${fmtAmount(k)}</p>` : ''}
      <p class="muted small" id="awakeNote"></p>
      <div id="cookBody"></div>
    </div>`;

  const bind = (root) => {
    const body = $('#cookBody', root);
    const drawIngs = () => {
      body.innerHTML = groups.length ? groups.map((g, gi) => `
        ${g.title ? `<h4 class="ing-group">${esc(g.title)}</h4>` : ''}
        <ul class="cook-ings">${g.items.map((it, ii) => {
          const key = gi + ':' + ii;
          return `<li class="${cook.crossed.includes(key) ? 'crossed' : ''}" data-cross="${key}"><span class="ci-box"></span><span class="ci-n">${esc(it.name)}</span><span class="ci-a">${it.amount == null ? '' : esc(fmtQty(it.amount, it.unit))}</span></li>`;
        }).join('')}</ul>`).join('') + '<p class="muted small center">Нажимай на продукт, когда отмерила его.</p>'
        : '<p class="muted">Ингредиенты не указаны.</p>';
    };
    const drawStep = () => {
      if (!flat.length) { body.innerHTML = '<p class="muted">Шаги не записаны.</p>'; return; }
      cook.i = Math.min(Math.max(cook.i, 0), flat.length - 1);
      const s = flat[cook.i];
      const t = timerButtons(s.text, r.title, state.cookSession && state.cookSession.recipeId === id ? state.cookSession.id : null);
      body.innerHTML = `
        <div class="cook-progress"><span style="width:${((cook.i + 1) / flat.length) * 100}%"></span></div>
        <p class="cook-count">Шаг ${cook.i + 1} из ${flat.length}${s.group ? ` · ${esc(s.group)}` : ''}</p>
        <div class="cook-step" id="cookStep">
          <p>${esc(s.text)}</p>
          ${t ? `<div class="timer-row big">${t}</div>` : ''}
          ${s.photo ? `<img class="cook-ph" data-photo="${esc(s.photo)}" data-act="zoom" alt="">` : ''}
        </div>
        <div class="cook-nav">
          <button type="button" class="btn ghost" data-cnav="-1" ${cook.i === 0 ? 'disabled' : ''}>${Icons.left} Назад</button>
          ${cook.i < flat.length - 1
            ? `<button type="button" class="btn" data-cnav="1">Дальше ${Icons.right}</button>`
            : `<a class="btn" href="#/recipe/${id}">Готово!</a>`}
        </div>`;
      Photos.hydrate(body);
    };
    const draw = () => (cook.tab === 'ings' ? drawIngs() : drawStep());
    draw();
    root.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-ctab]');
      if (tb) { cook.tab = tb.dataset.ctab; $$('[data-ctab]', root).forEach((b) => b.classList.toggle('on', b === tb)); draw(); return; }
      const nv = e.target.closest('[data-cnav]');
      if (nv) { cook.i += +nv.dataset.cnav; drawStep(); window.scrollTo(0, 0); return; }
      const cr = e.target.closest('[data-cross]');
      if (cr) {
        const key = cr.dataset.cross;
        cook.crossed = cook.crossed.includes(key) ? cook.crossed.filter((x) => x !== key) : [...cook.crossed, key];
        cr.classList.toggle('crossed');
      }
    });
    // листание шагов пальцем
    let x0 = null;
    body.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    body.addEventListener('touchend', (e) => {
      if (x0 == null || cook.tab !== 'steps') return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 60) { cook.i += dx < 0 ? 1 : -1; drawStep(); }
    });
    Awake.on().then((ok) => {
      const n = $('#awakeNote', root);
      if (n) n.textContent = ok ? 'Экран не погаснет, пока открыт этот режим.' : 'Если экран гаснет, увеличь время автоблокировки в настройках iPhone.';
    });
  };
  return { html, bind, cleanup: () => Awake.off() };
}

/* ---------- Редактор шагов (строками, с фото) ---------- */
class StepEditor {
  constructor(box, pasteBox, tools, items) {
    this.box = box;
    this.pasteBox = pasteBox;
    this.tools = tools;
    this.ta = $('textarea', pasteBox);
    this.added = [];
    this.removed = [];
    this.saved = false;
    this.paste = false;
    this.draw(items);
    box.addEventListener('click', (e) => {
      const x = e.target.closest('.sr-x');
      if (x) {
        const row = x.closest('.sr');
        if (row.dataset.photo) this.dropPhoto(row.dataset.photo);
        row.remove();
        if (!$('.sr', box)) this.draw([]);
        this.renumber();
        return;
      }
      const rp = e.target.closest('.sr-rmph');
      if (rp) {
        const row = rp.closest('.sr');
        this.dropPhoto(row.dataset.photo);
        row.dataset.photo = '';
        this.drawPhoto(row);
      }
    });
    box.addEventListener('change', async (e) => {
      if (!e.target.matches('input[type=file]')) return;
      const row = e.target.closest('.sr');
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        const id = await Photos.add(f);
        this.added.push(id);
        if (row.dataset.photo) this.dropPhoto(row.dataset.photo);
        row.dataset.photo = id;
        this.drawPhoto(row);
      } catch (err) { toast(err.message); }
    });
    box.addEventListener('input', (e) => { if (e.target.matches('textarea')) this.grow(e.target); });
    tools.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step-add]');
      if (!b) return;
      const t = b.dataset.stepAdd;
      if (t === 'paste') {
        this.ta.value = stepsToText(this.read());
        this.setPaste(true);
        this.ta.focus();
        return;
      }
      box.insertAdjacentHTML('beforeend', this.rowHTML({ type: t, text: '' }));
      this.renumber();
      const last = box.lastElementChild;
      $('textarea, input[type=text]', last).focus();
    });
    pasteBox.addEventListener('click', (e) => {
      if (!e.target.closest('[data-step-rows]')) return;
      this.draw(this.fromPaste());
      this.setPaste(false);
    });
  }
  setPaste(on) {
    this.paste = on;
    this.pasteBox.hidden = !on;
    this.box.hidden = on;
    this.tools.hidden = on;
  }
  dropPhoto(id) {
    if (!id) return;
    if (this.added.includes(id)) { this.added = this.added.filter((x) => x !== id); Photos.remove(id); }
    else this.removed.push(id);
  }
  rowHTML(s) {
    if (s.type === 'group') {
      return `<div class="sr group" data-type="group"><input type="text" class="sr-text" value="${esc(s.text)}" placeholder="Этап, например: Крем"><button type="button" class="sr-x" aria-label="Убрать">${Icons.x}</button></div>`;
    }
    return `<div class="sr" data-type="step" data-photo="${esc(s.photo || '')}">
      <span class="sr-n"></span>
      <div class="sr-main"><textarea class="sr-text" rows="2" placeholder="Что сделать на этом шаге">${esc(s.text)}</textarea><div class="sr-photo"></div></div>
      <div class="sr-side">
        <label class="sr-cam" aria-label="Фото к шагу">${Icons.camera}<input type="file" accept="image/*" hidden></label>
        <button type="button" class="sr-x" aria-label="Убрать шаг">${Icons.x}</button>
      </div>
    </div>`;
  }
  drawPhoto(row) {
    const box = $('.sr-photo', row);
    if (!box) return;
    const id = row.dataset.photo;
    box.innerHTML = id ? `<img data-photo="${esc(id)}" alt=""><button type="button" class="sr-rmph">${Icons.x} убрать фото</button>` : '';
    if (id) Photos.hydrate(box);
  }
  grow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 320) + 'px'; }
  renumber() {
    let n = 0;
    $$('.sr', this.box).forEach((row) => {
      if (row.dataset.type === 'group') { n = 0; return; }
      n++;
      $('.sr-n', row).textContent = n;
    });
  }
  draw(items) {
    if (!items.length) items = [{ type: 'step', text: '' }];
    this.box.innerHTML = items.map((s) => this.rowHTML(s)).join('');
    $$('.sr', this.box).forEach((row) => this.drawPhoto(row));
    $$('textarea', this.box).forEach((t) => requestAnimationFrame(() => this.grow(t)));
    this.renumber();
  }
  // текст → шаги; фото оставляем у шагов с тем же текстом
  fromPaste() {
    const old = this.readRows();
    const items = parseStepsText(this.ta.value);
    for (const it of items) { const o = old.find((x) => x.photo && x.text.trim() === it.text.trim()); if (o) it.photo = o.photo; }
    for (const o of old) if (o.photo && !items.some((it) => it.photo === o.photo)) this.dropPhoto(o.photo);
    return items;
  }
  read() {
    if (this.paste) return this.fromPaste();
    return this.readRows();
  }
  readRows() {
    return $$('.sr', this.box).map((row) => ({
      type: row.dataset.type,
      text: $('.sr-text', row).value.trim(),
      photo: row.dataset.type === 'step' ? (row.dataset.photo || null) : undefined
    })).filter((s) => s.text || s.photo);
  }
  async commit() { this.saved = true; await Photos.removeMany(this.removed); this.added = []; this.removed = []; }
  async cancel() { if (!this.saved) await Photos.removeMany(this.added); this.added = []; }
}

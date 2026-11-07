'use strict';
/* ===================== Помощники ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

const SLOTS = ['Завтрак', 'Обед', 'Ужин', 'Перекус', 'Десерт'];
const RECIPE_CATS = ['Десерты', 'Выпечка', 'Завтраки', 'Супы', 'Основное', 'Гарниры', 'Салаты', 'Соусы', 'Заготовки', 'Напитки'];
const FIND_CATS = ['Сладкое', 'Сыры', 'Хлеб', 'Молочное', 'Мясное', 'Снеки', 'Соусы', 'Напитки', 'Заморозка', 'Фрукты и овощи'];
const NOTE_COLORS = { butter: '#FBF0BE', rose: '#FFD6E5', sage: '#EADBFB', sky: '#D7E2F6', cream: '#FFE2CF' };
const TINTS = ['t-olive', 't-butter', 't-blue', 't-pink'];

function isoOf(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function todayISO() { return isoOf(new Date()); }
function dateObj(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(iso, n) { const d = dateObj(iso); d.setDate(d.getDate() + n); return isoOf(d); }
function fmtDay(iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) { return dateObj(iso).toLocaleDateString('ru-RU', opts); }
function fmtDateTime(ts) { return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }
function cmpVer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

let _toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ===================== Нижние листы и вопросы ===================== */
function openSheet(html, onBind) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip"></div>${html}</div>`;
  root.classList.add('open');
  document.body.classList.add('noscroll');
  $$('[data-close]', root).forEach((el) => el.addEventListener('click', closeSheet));
  if (onBind) onBind($('.sheet', root));
}
function closeSheet() {
  const root = $('#sheet-root');
  root.classList.remove('open');
  root.innerHTML = '';
  document.body.classList.remove('noscroll');
}
function ask(message, okLabel = 'Удалить', danger = true) {
  return new Promise((resolve) => {
    openSheet(`<p class="ask">${esc(message)}</p>
      <div class="row-btns"><button class="btn ghost" data-no>Отмена</button><button class="btn ${danger ? 'danger' : ''}" data-yes>${esc(okLabel)}</button></div>`,
    (s) => {
      $('[data-no]', s).onclick = () => { closeSheet(); resolve(false); };
      $('[data-yes]', s).onclick = () => { closeSheet(); resolve(true); };
    });
  });
}

/* ===================== Состояние ===================== */
const state = {
  menuStart: todayISO(),
  scale: {},
  remote: null,
  updateReady: false
};
let activeEditor = null;
let stepEditor = null;
let viewCleanup = null;

/* ===================== Обновления ===================== */
const Updater = {
  reg: null,
  applying: false,
  async init() {
    if (!('serviceWorker' in navigator)) return;
    try {
      this.reg = await navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(self.APP_VERSION));
    } catch (e) { console.warn('SW', e); }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.applying) location.reload();
    });
    this.check(true);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(true); });
  },
  async check(silent) {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      state.remote = j;
      state.updateReady = cmpVer(j.version, self.APP_VERSION) > 0;
      updateBadges();
      if (!silent) toast(state.updateReady ? `Есть новая версия ${j.version}` : `У тебя последняя версия ${self.APP_VERSION}`);
      if (location.hash.startsWith('#/settings') || location.hash.startsWith('#/recipes')) rerender();
      return j;
    } catch (e) {
      if (!silent) toast('Нет связи — не получилось проверить');
      return null;
    }
  },
  waitForWaiting(reg, ms) {
    return new Promise((resolve) => {
      const done = (w) => { clearTimeout(t); resolve(w); };
      const t = setTimeout(() => resolve(reg.waiting || null), ms);
      const watch = (sw) => sw && sw.addEventListener('statechange', () => { if (sw.state === 'installed') done(sw); });
      if (reg.waiting) return done(reg.waiting);
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
    });
  },
  async apply() {
    const v = state.remote && state.remote.version;
    if (!v) return;
    this.applying = true;
    toast('Обновляю… данные останутся на месте');
    try {
      const reg = await navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(v));
      const w = await this.waitForWaiting(reg, 10000);
      if (w) {
        w.postMessage('SKIP_WAITING');
        setTimeout(() => location.reload(), 2500);
        return;
      }
    } catch (e) { console.warn(e); }
    // Запасной путь: очищаем кэш файлов приложения (не данные!) и перезагружаем
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('kn-app-')).map((k) => caches.delete(k)));
    location.reload();
  }
};

function updateBadges() {
  const g = $('#tabbar [data-tab="settings"]');
  if (g) g.classList.toggle('dot', state.updateReady);
}

function updateBanner() {
  if (!state.updateReady) return '';
  return `<div class="banner update"><div><b>Новая версия ${esc(state.remote.version)}</b>${state.remote.notes ? `<span>${esc(state.remote.notes)}</span>` : ''}</div><button class="btn small" data-act="apply-update">Обновить</button></div>`;
}

/* ===================== Общие куски разметки ===================== */
function pageHead(title, sub, doodle = '') {
  return `<header class="page-head">
    <div class="ph-text">
      <p class="eyebrow">кулинарная тетрадь</p>
      <h1>${title}</h1>
      ${sub ? `<p class="sub">${sub}</p>` : ''}
    </div>
    <div class="ph-doodle">${doodle}</div>
  </header>`;
}
function topbar(back, right = '') {
  return `<div class="topbar"><a class="iconbtn" href="${back}" aria-label="Назад">${Icons.back}</a><div class="tb-right">${right}</div></div>`;
}
function stickerHTML(photoId, seed, i = 0) {
  const tint = TINTS[i % TINTS.length];
  return `<div class="sticker ${tint}">${photoId ? `<img data-photo="${esc(photoId)}" alt="">` : `<div class="ph">${placeholderFor(seed)}</div>`}</div>`;
}
function galleryHTML(ids, seed) {
  if (!ids || !ids.length) return `<div class="hero-doodle">${placeholderFor(seed)}</div>`;
  return `<div class="gallery">${ids.map((id, i) => `<div class="gallery-item ${TINTS[i % TINTS.length]}"><img data-photo="${esc(id)}" alt="" data-act="zoom"></div>`).join('')}</div>`;
}
function emptyHTML(doodle, title, text) {
  return `<div class="empty">${doodle}<h3>${title}</h3><p>${text}</p></div>`;
}
function hearts(n, interactive = false) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += interactive
      ? `<button type="button" class="heart ${i <= n ? 'on' : ''}" data-rate="${i}" aria-label="${i}">${i <= n ? Icons.heartFill : Icons.heart}</button>`
      : `<span class="heart ${i <= n ? 'on' : ''}">${i <= n ? Icons.heartFill : Icons.heart}</span>`;
  }
  return `<span class="hearts">${s}</span>`;
}
function zoomPhoto(src) {
  openSheet(`<img class="zoomed" src="${src}" alt=""><div class="row-btns"><button class="btn ghost" data-close>Закрыть</button></div>`, (s) => {
    $$('[data-close]', s).forEach((b) => (b.onclick = closeSheet));
  });
}

/* ===================== Редактор фото ===================== */
function thumbHTML(id, i) {
  return `<div class="thumb" data-id="${esc(id)}"><img data-photo="${esc(id)}" alt="">${i === 0 ? '<span class="cover">обложка</span>' : ''}<button type="button" class="thumb-x" data-rm="${esc(id)}" aria-label="Удалить фото">${Icons.x}</button></div>`;
}
function photoEditorHTML(ids) {
  return `<div class="photo-edit">${ids.map(thumbHTML).join('')}<label class="thumb add">${Icons.camera}<span>добавить</span><input type="file" accept="image/*" multiple hidden></label></div>
  <p class="hint">Нажми на фото, чтобы сделать его обложкой.</p>`;
}
class PhotoEditor {
  constructor(root, ids) {
    this.root = root;
    this.ids = [...(ids || [])];
    this.added = [];
    this.removed = [];
    this.saved = false;
    root.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        e.preventDefault();
        const id = rm.dataset.rm;
        this.ids = this.ids.filter((x) => x !== id);
        if (this.added.includes(id)) { this.added = this.added.filter((x) => x !== id); Photos.remove(id); }
        else this.removed.push(id);
        this.redraw();
        return;
      }
      const th = e.target.closest('.thumb:not(.add)');
      if (th) {
        const id = th.dataset.id;
        this.ids = [id, ...this.ids.filter((x) => x !== id)];
        this.redraw();
      }
    });
    root.addEventListener('change', async (e) => {
      if (!e.target.matches('input[type=file]')) return;
      const files = [...e.target.files];
      e.target.value = '';
      for (const f of files) {
        try {
          const id = await Photos.add(f);
          this.ids.push(id);
          this.added.push(id);
        } catch (err) { toast(err.message); }
      }
      this.redraw();
    });
  }
  redraw() {
    const wrap = $('.photo-edit', this.root);
    $$('.thumb:not(.add)', wrap).forEach((t) => t.remove());
    $('.thumb.add', wrap).insertAdjacentHTML('beforebegin', this.ids.map(thumbHTML).join(''));
    Photos.hydrate(wrap);
  }
  async commit() { this.saved = true; await Photos.removeMany(this.removed); this.added = []; this.removed = []; }
  async cancel() { if (!this.saved) await Photos.removeMany(this.added); this.added = []; }
}

/* ===================== Рецепты ===================== */
async function backupReminder() {
  const last = await DB.getMeta('lastBackup', 0);
  let total = 0;
  for (const s of ['recipes', 'finds', 'notes', 'places', 'holidays']) total += (await DB.all(s)).length;
  if (total < 3) return '';
  const days = last ? Math.floor((Date.now() - last) / 864e5) : null;
  if (days !== null && days < 14) return '';
  return `<div class="banner backup"><div><b>${days === null ? 'Копии ещё не было' : `Копия была ${days} ${plural(days, 'день', 'дня', 'дней')} назад`}</b><span>Сохрани файл, чтобы рецепты не потерялись.</span></div><a class="btn small ghost" href="#/settings">Сохранить</a></div>`;
}

function chipsHTML(items, active, attr) {
  return `<div class="chips" role="tablist">${items.map(([val, label]) => `<button type="button" class="chip ${val === active ? 'on' : ''}" data-${attr}="${esc(val)}">${label}</button>`).join('')}</div>`;
}

function searchHTML(placeholder) {
  return `<label class="search">${Icons.search}<input type="search" placeholder="${esc(placeholder)}" data-search autocomplete="off"></label>`;
}

// Фильтр списка без перерисовки (чтобы не терялся фокус)
function bindListFilter(root, chipAttr) {
  let filter = 'all';
  let q = '';
  const apply = () => {
    let shown = 0;
    $$('[data-item]', root).forEach((el) => {
      const okF = filter === 'all' || (filter === 'fav' ? el.dataset.fav === '1' : el.dataset.cat === filter);
      const okQ = !q || el.dataset.s.includes(q);
      el.hidden = !(okF && okQ);
      if (!el.hidden) shown++;
    });
    const nr = $('.no-results', root);
    if (nr) nr.hidden = shown > 0;
  };
  root.addEventListener('click', (e) => {
    const c = e.target.closest(`[data-${chipAttr}]`);
    if (!c) return;
    filter = c.dataset[chipAttr];
    $$(`[data-${chipAttr}]`, root).forEach((b) => b.classList.toggle('on', b === c));
    apply();
  });
  const input = $('[data-search]', root);
  if (input) input.addEventListener('input', () => { q = input.value.trim().toLowerCase(); apply(); });
}

async function viewRecipes() {
  const all = (await DB.all('recipes')).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const cats = [...new Set(all.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const list = all.map((r, i) => {
    const meta = [r.time, r.yieldCount ? `${fmtAmount(+r.yieldCount)} ${r.yieldUnit || 'порц.'}` : ''].filter(Boolean).join(' · ');
    const s = [r.title, r.category, r.ingredients, r.notes].join(' ').toLowerCase();
    return `<a class="rcard ${i % 2 ? 'flip' : ''}" href="#/recipe/${r.id}" data-item data-s="${esc(s)}" data-cat="${esc(r.category || '')}" data-fav="${r.fav ? 1 : 0}">
      ${stickerHTML(r.photos && r.photos[0], r.id, i)}
      <div class="rc-body">
        ${r.category ? `<p class="rc-cat">${esc(r.category)}</p>` : ''}
        <h3>${esc(r.title)}</h3>
        ${meta ? `<p class="rc-meta">${esc(meta)}</p>` : ''}
      </div>
      ${r.fav ? `<span class="rc-fav">${Icons.starFill}</span>` : ''}
    </a>`;
  }).join('');

  const strip = await activeStripHTML();
  const html = `${pageHead('рецепты', all.length ? `${all.length} ${plural(all.length, 'рецепт', 'рецепта', 'рецептов')} в тетради` : 'всё самое вкусное', Doodles.bowl())}
    ${strip}
    ${all.length ? `${searchHTML('Найти рецепт или продукт')}
      <button type="button" class="pantry-btn" data-act="pantry">${Icons.fridge}<span>Что приготовить из того, что есть дома?</span>${Icons.right}</button>
      ${chipsHTML([['all', 'Все'], ['fav', '★ Избранное'], ...cats.map((c) => [c, esc(c)])], 'all', 'f')}
      <div class="rlist">${list}</div>
      <p class="no-results" hidden>Ничего не нашлось</p>`
    : emptyHTML(Doodles.cake(), 'Пока пусто', 'Добавь первый рецепт — кнопка с плюсом внизу.')}
    <a class="fab" href="#/recipe/new" aria-label="Новый рецепт">${Icons.plus}</a>`;
  return {
    html,
    bind: (root) => {
      bindListFilter(root, 'f');
      root.addEventListener('click', (e) => { if (e.target.closest('[data-act="pantry"]')) openPantrySheet(); });
    }
  };
}

function scaleNote(note, k) {
  if (!note || k === 1) return note;
  return note.replace(/(\d+(?:[.,]\d+)?)\s*(г|гр|кг|мл|л|шт)(?![а-яёa-z])/gi, (m, n, u) => `${fmtAmount(parseFloat(n.replace(',', '.')) * k)} ${u}`);
}

function ingListHTML(r, st) {
  const groups = parseIngredients(r.ingredients);
  if (!groups.length) return '<p class="muted">Ингредиенты не указаны</p>';
  const k = st.k;
  const scaled = scaleGroups(groups, k);
  const blocks = st.mode === 'sum' ? [{ title: '', items: sumIngredients([{ groups: scaled }]) }] : scaled;
  return blocks.map((g) => `
    ${g.title ? `<h4 class="ing-group">${esc(g.title)}</h4>` : ''}
    <ul class="ings">${g.items.map((it) => `<li class="ing">
      <span class="ing-n">${esc(it.name)}</span><span class="ing-dots"></span>
      <span class="ing-a">${it.amount == null ? '' : esc(fmtQty(it.amount, it.unit))}</span>
      ${it.note ? `<span class="ing-note">${esc(scaleNote(it.note, k))}</span>` : ''}
    </li>`).join('')}</ul>`).join('');
}

function stepsHTML(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  let n = 0;
  return `<ol class="steps">${lines.map((l) => {
    if (/:$/.test(l) && l.length < 70) { n = 0; return `<li class="step-h">${esc(l.replace(/:$/, ''))}</li>`; }
    n++;
    return `<li class="step"><span class="step-n">${n}</span><p>${esc(l.replace(/^\d+[.)]\s*/, ''))}</p></li>`;
  }).join('')}</ol>`;
}

async function viewRecipe(id) {
  const r = await DB.get('recipes', id);
  if (!r) return { html: topbar('#/recipes') + emptyHTML(Doodles.cutlery(), 'Рецепт не найден', 'Возможно, он был удалён.') };
  const base = +r.yieldCount || 0;
  const pBase = +r.portionSize || 0;
  const pUnit = r.portionUnit || 'мл';
  const st = state.scale[id] || (state.scale[id] = { mode: 'groups', target: base || null, portion: pBase || null, k: 1 });
  const unit = r.yieldUnit || 'порц.';
  const right = `<button class="iconbtn ${r.fav ? 'on' : ''}" data-act="fav" aria-label="Избранное">${r.fav ? Icons.starFill : Icons.star}</button>
    <a class="iconbtn" href="#/recipe/${r.id}/edit" aria-label="Изменить">${Icons.edit}</a>`;

  const scaler = base
    ? `<div class="scaler"><span>На</span><button type="button" class="stepper" data-step="-1">−</button><input id="scaleInput" type="number" inputmode="decimal" min="0" step="any" value="${st.target ?? base}"><button type="button" class="stepper" data-step="1">+</button><span>${esc(unit)}</span>${pBase ? `<span class="por">по <input id="portionInput" type="number" inputmode="decimal" min="0" step="any" value="${st.portion ?? pBase}"> ${esc(pUnit)}</span>` : ''}<span class="k" id="kLabel"></span></div>`
    : `<div class="scaler"><span>Умножить на ×</span><input id="kInput" type="number" inputmode="decimal" min="0" step="any" value="${st.k}"><span class="k muted">укажи выход в рецепте, чтобы считать по порциям</span></div>`;

  const running = (await activeSessions()).find((x) => x.recipeId === r.id);
  const noQty = parseIngredients(r.ingredients).flatMap((g) => g.items).filter((it) => it.amount == null && !LOOSE_ITEM.test(it.name)).length;
  const history = await historyHTML(r);
  const html = `${topbar('#/recipes', right)}
    <article class="detail">
      ${galleryHTML(r.photos, r.id)}
      ${r.category ? `<p class="eyebrow">${esc(r.category)}</p>` : ''}
      <h1 class="detail-title">${esc(r.title)}</h1>
      <div class="meta-row">
        ${r.time ? `<span class="pill">${Icons.clock}${esc(r.time)}</span>` : ''}
        ${base ? `<span class="pill">выход: ${fmtAmount(base)} ${esc(unit)}${pBase ? ` по ${fmtAmount(pBase)} ${esc(pUnit)}` : ''}</span>` : ''}
      </div>
      <div class="quick">
        <button type="button" class="btn" data-act="start-cook">${Icons.play} ${running ? 'Продолжить готовить' : 'Начать готовить'}</button>
        <button type="button" class="btn ghost" data-act="cost">${Icons.coin} Себестоимость</button>
      </div>

      <section class="block">
        <h2 class="block-title">ингредиенты</h2>
        ${scaler}
        <div class="seg" role="tablist">
          <button type="button" class="${st.mode === 'groups' ? 'on' : ''}" data-mode="groups">По этапам</button>
          <button type="button" class="${st.mode === 'sum' ? 'on' : ''}" data-mode="sum">Всего продуктов</button>
        </div>
        <div id="ingList"></div>
        ${noQty ? `<div class="qty-banner"><div><b>${noQty} ${plural(noQty, 'продукт', 'продукта', 'продуктов')} без граммовки</b><span>Без неё не работают пересчёт порций, список покупок и точная себестоимость.</span></div><button type="button" class="btn small" data-act="fill-qty">Дописать</button></div>` : ''}
      </section>

      ${r.inventory ? `<section class="block"><h2 class="block-title">инвентарь</h2><ul class="inv">${r.inventory.split('\n').map((l) => l.replace(/^\s*[•·*-]\s*/, '').trim()).filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>` : ''}
      ${getSteps(r).length ? `<section class="block"><h2 class="block-title">технология</h2><a class="btn small ghost big-steps" href="#/recipe/${r.id}/cook">${Icons.play} Крупно, по шагам</a>${stepsViewHTML(r)}</section>` : ''}
      ${r.notes ? `<section class="block"><div class="paper-note">${Doodles.pencil()}<p>${nl2br(r.notes)}</p></div></section>` : ''}
      ${history}
      ${r.source ? `<p class="source">Источник: ${/^https?:\/\//.test(r.source) ? `<a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(r.source)}</a>` : esc(r.source)}</p>` : ''}

      <div class="actions">
        <button class="btn" data-act="to-menu">${Icons.cal} В меню</button>
        <button class="btn ghost danger-text" data-act="delete">${Icons.trash} Удалить</button>
      </div>
    </article>`;

  const bind = (root) => {
    const draw = () => {
      if (base) {
        st.k = ((st.target || 0) / base) * (pBase ? (st.portion || 0) / pBase : 1);
        $('#kLabel', root).textContent = Math.abs(st.k - 1) > 1e-9 ? `×${fmtAmount(st.k)}` : '';
      }
      $('#ingList', root).innerHTML = ingListHTML(r, st);
    };
    draw();
    const si = $('#scaleInput', root);
    if (si) si.addEventListener('input', () => { st.target = parseFloat(si.value.replace(',', '.')) || 0; draw(); });
    const pi = $('#portionInput', root);
    if (pi) pi.addEventListener('input', () => { st.portion = parseFloat(pi.value.replace(',', '.')) || 0; draw(); });
    const ki = $('#kInput', root);
    if (ki) ki.addEventListener('input', () => { st.k = parseFloat(ki.value.replace(',', '.')) || 0; draw(); });
    root.addEventListener('click', async (e) => {
      const step = e.target.closest('[data-step]');
      if (step && si) { st.target = Math.max(0, (parseFloat(si.value) || 0) + +step.dataset.step); si.value = st.target; draw(); return; }
      const mode = e.target.closest('[data-mode]');
      if (mode) { st.mode = mode.dataset.mode; $$('[data-mode]', root).forEach((b) => b.classList.toggle('on', b === mode)); draw(); return; }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'fav') { r.fav = !r.fav; r.updated = Date.now(); await DB.put('recipes', r); toast(r.fav ? 'Добавлено в избранное' : 'Убрано из избранного'); rerender(); }
      if (act.dataset.act === 'to-menu') addToMenuSheet(r);
      if (act.dataset.act === 'start-cook') startSessionSheet(r);
      if (act.dataset.act === 'fill-qty') fillQtySheet(r);
      if (act.dataset.act === 'cost') costSheet(r, st.k || 1, base ? st.target : null);
      if (act.dataset.act === 'delete') {
        if (!(await ask(`Удалить рецепт «${r.title}»? Он пропадёт и из меню.`))) return;
        await deleteRecipe(r);
        toast('Рецепт удалён');
        location.hash = '#/recipes';
      }
    });
  };
  return { html, bind, mouse: { recipe: r } };
}

// Быстро дописать граммовки продуктам, у которых их нет
function fillQtySheet(r) {
  const rows = [];
  for (const g of parseIngredients(r.ingredients)) {
    if (g.title) rows.push({ type: 'group', name: g.title });
    for (const it of g.items) rows.push({ type: 'item', name: it.name, amount: it.amount, unit: it.unit, note: it.note });
  }
  const todo = rows.map((row, i) => ({ row, i })).filter(({ row }) => row.type === 'item' && row.amount == null && !LOOSE_ITEM.test(row.name));
  // «Вода — немного, во время тушения» → название «Вода», а пояснение сохраним в скобках
  const split = (name) => {
    const m = name.match(/^(.+?)\s*[—–-]\s+(.+)$/);
    return m ? { name: m[1].trim(), hint: m[2].trim() } : { name, hint: '' };
  };
  openSheet(`<h3 class="sheet-title">Дописать граммовки</h3>
    <p class="muted small">Впиши, сколько уходит на рецепт${r.yieldCount ? ` (на ${fmtAmount(+r.yieldCount)} ${esc(r.yieldUnit || 'порц.')})` : ''}. Пустые поля можно пропустить.</p>
    <div class="qty-fill">${todo.map(({ row, i }) => {
      const sp = split(row.name);
      return `<div class="qf" data-i="${i}">
        <input class="qf-n" value="${esc(sp.name)}">
        ${sp.hint ? `<span class="qf-h">${esc(sp.hint)}</span>` : ''}
        <div class="qf-in"><input class="qf-a" inputmode="decimal" placeholder="сколько"><input class="qf-u" list="unitList" value="г" placeholder="г"></div>
      </div>`;
    }).join('')}</div>
    <datalist id="unitList"><option value="г"><option value="кг"><option value="мл"><option value="л"><option value="шт"><option value="ст.л."><option value="ч.л."><option value="упаковка"><option value="по вкусу"></datalist>
    <div class="row-btns"><button class="btn ghost" data-close>Отмена</button><button class="btn" data-save>Сохранить</button></div>`, (s) => {
    $('[data-save]', s).onclick = async () => {
      let filled = 0;
      for (const el of $$('.qf', s)) {
        const row = rows[+el.dataset.i];
        const hint = $('.qf-h', el) ? $('.qf-h', el).textContent : '';
        const name = $('.qf-n', el).value.trim() || row.name;
        const a = parseFloat($('.qf-a', el).value.replace(',', '.'));
        const u = $('.qf-u', el).value.trim();
        if (!isNaN(a) && a > 0) {
          row.name = name; row.amount = a; row.unit = u; row.note = hint ? `(${hint})` : row.note;
          filled++;
        } else if (u && /вкус/i.test(u)) { row.name = `${name} по вкусу`; filled++; }
      }
      if (!filled) { toast('Впиши хотя бы одно количество'); return; }
      const fresh = await DB.get('recipes', r.id);
      fresh.ingredients = serializeIngredients(rows);
      fresh.updated = Date.now();
      await DB.put('recipes', fresh);
      delete state.scale[r.id];
      closeSheet();
      toast(`Дописано: ${filled}`);
      rerender();
    };
  });
}

async function deleteRecipe(r) {
  await Photos.removeMany([...(r.photos || []), ...stepPhotoIds(r)]);
  for (const x of await recipeSessions(r.id)) { await Photos.removeMany(x.photos || []); await DB.del('sessions', x.id); }
  await Timers.loadSessions();
  await DB.del('recipes', r.id);
  for (const day of await DB.all('menu')) {
    const items = day.items.filter((it) => it.recipeId !== r.id);
    if (items.length !== day.items.length) {
      if (items.length) await DB.put('menu', { ...day, items }); else await DB.del('menu', day.date);
    }
  }
  delete state.scale[r.id];
}

async function viewRecipeEdit(id) {
  const r = id ? await DB.get('recipes', id) : null;
  if (id && !r) return { html: topbar('#/recipes') + emptyHTML(Doodles.cutlery(), 'Рецепт не найден', '') };
  const v = r || { title: '', category: '', time: '', yieldCount: '', yieldUnit: 'порц.', ingredients: '', inventory: '', steps: '', notes: '', source: '', photos: [], fav: false };
  const allCats = [...new Set([...RECIPE_CATS, ...(await DB.all('recipes')).map((x) => x.category).filter(Boolean)])];

  const html = `${topbar(r ? `#/recipe/${r.id}` : '#/recipes')}
    <form class="form" id="recipeForm" autocomplete="off">
      <h1 class="form-title">${r ? 'правим рецепт' : 'новый рецепт'}</h1>
      <label class="field"><span>Название</span><input name="title" required value="${esc(v.title)}" placeholder="Банановый трайфл с карамелью"></label>
      <div class="field-row">
        <label class="field"><span>Категория</span><input name="category" list="catList" value="${esc(v.category)}" placeholder="Десерты"></label>
        <label class="field"><span>Время</span><input name="time" value="${esc(v.time)}" placeholder="1 ч 30 мин"></label>
      </div>
      <datalist id="catList">${allCats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      <div class="field-row">
        <label class="field"><span>Выход</span><input name="yieldCount" type="number" inputmode="decimal" step="any" min="0" value="${esc(v.yieldCount)}" placeholder="10"></label>
        <label class="field"><span>Чего</span><input name="yieldUnit" value="${esc(v.yieldUnit)}" placeholder="порц. / шт / г"></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Одна порция <i>(необяз.)</i></span><input name="portionSize" type="number" inputmode="decimal" step="any" min="0" value="${esc(v.portionSize || '')}" placeholder="350"></label>
        <label class="field"><span>В чём</span><input name="portionUnit" list="portionUnits" value="${esc(v.portionUnit || 'мл')}" placeholder="мл / г"></label>
      </div>
      <datalist id="portionUnits"><option value="мл"><option value="г"></datalist>
      <p class="hint">Например, 10 шт по 350 мл. Тогда в рецепте можно будет пересчитать и на другое количество, и на другой объём креманок.</p>
      <div class="field"><span>Фото</span><div id="photoBox">${photoEditorHTML(v.photos || [])}</div></div>

      <div class="field"><span>Ингредиенты</span>
        <div class="ing-editor" id="ingRows"></div>
        <div class="ing-tools" id="ingTools">
          <button type="button" class="btn small ghost" data-ing="item">${Icons.plus} продукт</button>
          <button type="button" class="btn small ghost" data-ing="group">${Icons.plus} этап</button>
          <button type="button" class="btn small ghost" data-ing="paste">Вставить текстом</button>
        </div>
        <div id="ingPasteBox" hidden>
          <textarea name="ingredients" rows="10" placeholder="Вставь готовый список, например:&#10;Мука 200 г&#10;Творог 5% 180 гр&#10;Желтки 2 шт">${esc(v.ingredients)}</textarea>
          <p class="hint" style="margin-top:8px">Можно писать как удобно: «Мука 200 г», «Мука — 200 г», «200 г муки». Строка без количества перед продуктами станет названием этапа.</p>
          <details class="preview" open><summary>Как это прочиталось</summary><div id="ingPreview"></div></details>
          <button type="button" class="btn small" data-ing="rows">Готово — показать строками</button>
        </div>
      </div>
      <datalist id="unitList"><option value="г"><option value="кг"><option value="мл"><option value="л"><option value="шт"><option value="ст.л."><option value="ч.л."><option value="стакан"><option value="щепотка"><option value="по вкусу"></datalist>

      <label class="field"><span>Инвентарь <i>(необязательно)</i></span><textarea name="inventory" rows="3" placeholder="Миксер&#10;Сотейник с толстым дном">${esc(v.inventory)}</textarea></label>
      <div class="field"><span>Технология приготовления</span>
        <div class="step-editor" id="stepRows"></div>
        <div class="ing-tools" id="stepTools">
          <button type="button" class="btn small ghost" data-step-add="step">${Icons.plus} шаг</button>
          <button type="button" class="btn small ghost" data-step-add="group">${Icons.plus} этап</button>
          <button type="button" class="btn small ghost" data-step-add="paste">Вставить текстом</button>
        </div>
        <div id="stepPasteBox" hidden>
          <textarea name="steps" rows="10" placeholder="Каждый шаг — с новой строки.&#10;Строка с двоеточием в конце станет этапом: «Крем:»">${esc(v.steps)}</textarea>
          <button type="button" class="btn small" data-step-rows style="margin-top:8px">Готово — показать по шагам</button>
        </div>
        <p class="hint" style="margin-top:8px">К каждому шагу можно приложить фото. Если в шаге есть время («выпекать 20 минут»), в рецепте появится кнопка таймера.</p>
      </div>
      <label class="field"><span>Заметки</span><textarea name="notes" rows="3" placeholder="Что получилось, что поменять в следующий раз">${esc(v.notes)}</textarea></label>
      <label class="field"><span>Источник</span><input name="source" value="${esc(v.source)}" placeholder="Курс, книга или ссылка"></label>
      <label class="check"><input type="checkbox" name="fav" ${v.fav ? 'checked' : ''}><span>${Icons.star} В избранное</span></label>

      <div class="actions sticky">
        <button class="btn" type="submit">Сохранить</button>
        ${r ? `<button class="btn ghost danger-text" type="button" data-act="delete">${Icons.trash} Удалить</button>` : ''}
      </div>
    </form>`;

  const bind = (root) => {
    const form = $('#recipeForm', root);
    activeEditor = new PhotoEditor($('#photoBox', root), v.photos || []);
    stepEditor = new StepEditor($('#stepRows', root), $('#stepPasteBox', root), $('#stepTools', root), getSteps(v));
    const ta = form.elements.ingredients;
    const rowsBox = $('#ingRows', root);
    const pasteBox = $('#ingPasteBox', root);
    let pasteMode = false;
    const preview = () => {
      $('#ingPreview', root).innerHTML = ingListHTML({ ingredients: ta.value }, { mode: 'groups', k: 1 });
    };
    const rowHTML = (r) => r.type === 'group'
      ? `<div class="ir group" data-type="group"><input class="ir-name" value="${esc(r.name)}" placeholder="Этап, например: Крем" enterkeyhint="next"><button type="button" class="ir-x" aria-label="Убрать">${Icons.x}</button></div>`
      : `<div class="ir" data-type="item" data-note="${esc(r.note || '')}"><input class="ir-name" value="${esc(r.name)}" placeholder="Продукт" enterkeyhint="next"><input class="ir-amt" value="${esc(r.amount == null ? '' : String(r.amount).replace('.', ','))}" inputmode="decimal" placeholder="200" enterkeyhint="next"><input class="ir-unit" list="unitList" value="${esc(r.unit || '')}" placeholder="г" enterkeyhint="next"><button type="button" class="ir-x" aria-label="Убрать">${Icons.x}</button></div>`;
    const textToRows = (text) => {
      const rows = [];
      for (const g of parseIngredients(text)) {
        if (g.title) rows.push({ type: 'group', name: g.title });
        for (const it of g.items) rows.push({ type: 'item', name: it.name, amount: it.amount, unit: it.unit, note: it.note });
      }
      return rows;
    };
    const readRows = () => $$('.ir', rowsBox).map((el) => ({
      type: el.dataset.type,
      name: $('.ir-name', el).value,
      amount: el.dataset.type === 'item' ? $('.ir-amt', el).value : '',
      unit: el.dataset.type === 'item' ? $('.ir-unit', el).value : '',
      note: el.dataset.note || ''
    }));
    const drawRows = (rows) => {
      if (!rows.length) rows = [{ type: 'item', name: '', amount: '', unit: 'г' }];
      rowsBox.innerHTML = rows.map(rowHTML).join('');
    };
    const addRow = (type, after) => {
      const html = rowHTML(type === 'group' ? { type, name: '' } : { type, name: '', amount: '', unit: 'г' });
      if (after) after.insertAdjacentHTML('afterend', html); else rowsBox.insertAdjacentHTML('beforeend', html);
      const el = after ? after.nextElementSibling : rowsBox.lastElementChild;
      $('.ir-name', el).focus();
    };
    drawRows(textToRows(v.ingredients));
    rowsBox.addEventListener('click', (e) => {
      const x = e.target.closest('.ir-x');
      if (x) { x.closest('.ir').remove(); if (!$('.ir', rowsBox)) drawRows([]); }
    });
    rowsBox.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const row = e.target.closest('.ir');
      const inputs = $$('input', row);
      const i = inputs.indexOf(e.target);
      if (i < inputs.length - 1) inputs[i + 1].focus();
      else addRow('item', row);
    });
    $('#ingTools', root).addEventListener('click', (e) => {
      const b = e.target.closest('[data-ing]');
      if (!b) return;
      if (b.dataset.ing === 'item' || b.dataset.ing === 'group') addRow(b.dataset.ing);
      if (b.dataset.ing === 'paste') {
        ta.value = serializeIngredients(readRows());
        pasteMode = true; pasteBox.hidden = false; rowsBox.hidden = true; $('#ingTools', root).hidden = true;
        preview(); ta.focus();
      }
    });
    pasteBox.addEventListener('click', (e) => {
      if (!e.target.closest('[data-ing="rows"]')) return;
      drawRows(textToRows(ta.value));
      pasteMode = false; pasteBox.hidden = true; rowsBox.hidden = false; $('#ingTools', root).hidden = false;
    });
    ta.addEventListener('input', preview);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements;
      const title = f.title.value.trim();
      if (!title) { toast('Напиши название'); f.title.focus(); return; }
      const rec = {
        ...(r || { id: uid(), created: Date.now() }),
        title,
        category: f.category.value.trim(),
        time: f.time.value.trim(),
        yieldCount: f.yieldCount.value ? parseFloat(f.yieldCount.value.replace(',', '.')) : '',
        yieldUnit: f.yieldUnit.value.trim() || 'порц.',
        ingredients: (pasteMode ? f.ingredients.value : serializeIngredients(readRows())).trim(),
        portionSize: f.portionSize.value ? parseFloat(f.portionSize.value.replace(',', '.')) : '',
        portionUnit: f.portionUnit.value.trim() || 'мл',
        inventory: f.inventory.value.trim(),
        stepItems: stepEditor.read(),
        steps: '',
        notes: f.notes.value.trim(),
        source: f.source.value.trim(),
        fav: f.fav.checked,
        photos: activeEditor.ids,
        updated: Date.now()
      };
      rec.steps = stepsToText(rec.stepItems);
      await DB.put('recipes', rec);
      await activeEditor.commit();
      await stepEditor.commit();
      activeEditor = null;
      delete state.scale[rec.id];
      toast('Сохранено');
      location.replace(`#/recipe/${rec.id}`);
    });
    root.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-act="delete"]')) return;
      if (!(await ask(`Удалить рецепт «${r.title}»?`))) return;
      await activeEditor.cancel();
      activeEditor = null;
      await deleteRecipe(r);
      toast('Рецепт удалён');
      location.replace('#/recipes');
    });
  };
  return { html, bind };
}

/* ===================== Меню ===================== */
function addToMenuSheet(recipe) {
  const html = `<h3 class="sheet-title">В меню: ${esc(recipe.title)}</h3>
    <label class="field"><span>День</span><input type="date" id="mDate" value="${todayISO()}"></label>
    <div class="field"><span>Когда</span>${chipsHTML(SLOTS.map((s) => [s, s]), 'Ужин', 'slot')}</div>
    <label class="field"><span>Сколько ${esc(recipe.yieldUnit || 'порц.')}</span><input type="number" inputmode="decimal" step="any" min="0" id="mServ" value="${esc(recipe.yieldCount || '')}" placeholder="как в рецепте"></label>
    <div class="row-btns"><button class="btn ghost" data-close>Отмена</button><button class="btn" data-save>Добавить</button></div>`;
  openSheet(html, (s) => {
    let slot = 'Ужин';
    s.addEventListener('click', (e) => {
      const c = e.target.closest('[data-slot]');
      if (c) { slot = c.dataset.slot; $$('[data-slot]', s).forEach((b) => b.classList.toggle('on', b === c)); }
    });
    $('[data-save]', s).onclick = async () => {
      const date = $('#mDate', s).value || todayISO();
      const serv = parseFloat(($('#mServ', s).value || '').replace(',', '.'));
      await addMenuItem(date, { slot, recipeId: recipe.id, text: '', servings: isNaN(serv) ? null : serv });
      closeSheet();
      toast(`Добавлено на ${fmtDay(date, { day: 'numeric', month: 'long' })}`);
    };
  });
}

async function addMenuItem(date, item) {
  const day = (await DB.get('menu', date)) || { date, items: [] };
  day.items.push({ id: uid(), ...item });
  day.items.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  await DB.put('menu', day);
}

async function viewMenu() {
  const start = state.menuStart;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const recipes = await DB.all('recipes');
  const rmap = new Map(recipes.map((r) => [r.id, r]));
  const days = await Promise.all(dates.map((d) => DB.get('menu', d)));
  const today = todayISO();
  const range = `${fmtDay(dates[0], { day: 'numeric', month: 'short' })} — ${fmtDay(dates[6], { day: 'numeric', month: 'short' })}`;
  const totalItems = days.reduce((n, d) => n + (d ? d.items.length : 0), 0);

  const dayHTML = (date, day, i) => {
    const items = day ? day.items : [];
    return `<section class="day ${date === today ? 'today' : ''}">
      <header class="day-head"><h3>${esc(fmtDay(date, { weekday: 'long' }))}</h3><span>${esc(fmtDay(date, { day: 'numeric', month: 'long' }))}</span>${date === today ? '<em class="script">сегодня</em>' : ''}</header>
      ${items.length ? `<ul class="day-items">${items.map((it) => {
        const r = it.recipeId ? rmap.get(it.recipeId) : null;
        const title = r ? r.title : it.text || 'Блюдо';
        return `<li class="mi" data-date="${date}" data-mid="${it.id}">
          <span class="mi-slot">${esc(it.slot)}</span>
          <span class="mi-title">${esc(title)}${it.servings ? ` <i>· ${fmtAmount(it.servings)} ${esc(r ? r.yieldUnit || 'порц.' : 'порц.')}</i>` : ''}</span>
          ${r && r.photos && r.photos[0] ? `<img class="mi-ph" data-photo="${esc(r.photos[0])}" alt="">` : ''}
        </li>`;
      }).join('')}</ul>` : '<p class="muted small">Пока ничего не запланировано</p>'}
      <button type="button" class="add-line" data-add="${date}">${Icons.plus} блюдо</button>
    </section>`;
  };

  const html = `${pageHead('меню', 'что готовим на неделе', Doodles.calendar())}
    ${segNav(MENU_NAV, '#/menu')}
    <div class="week-nav">
      <button class="iconbtn" data-week="-7" aria-label="Раньше">${Icons.left}</button>
      <button class="week-label" data-week="0">${esc(range)}</button>
      <button class="iconbtn" data-week="7" aria-label="Позже">${Icons.right}</button>
    </div>
    <div class="row-btns tight">
      <button class="btn" data-act="shop" ${totalItems ? '' : 'disabled'}>${Icons.cart} Покупки</button>
      <button class="btn ghost" data-act="clear-week" ${totalItems ? '' : 'disabled'}>Очистить</button>
    </div>
    <div class="days">${dates.map((d, i) => dayHTML(d, days[i], i)).join('')}</div>`;

  const bind = (root) => {
    root.addEventListener('click', async (e) => {
      const w = e.target.closest('[data-week]');
      if (w) { const n = +w.dataset.week; state.menuStart = n ? addDays(state.menuStart, n) : todayISO(); rerender(); return; }
      const add = e.target.closest('[data-add]');
      if (add) { pickDishSheet(add.dataset.add, recipes); return; }
      const mi = e.target.closest('.mi');
      if (mi) { menuItemSheet(mi.dataset.date, mi.dataset.mid, rmap); return; }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'shop') shoppingSheet(dates, rmap);
      if (act.dataset.act === 'clear-week') {
        if (!(await ask(`Очистить меню на ${range}?`, 'Очистить'))) return;
        for (const d of dates) await DB.del('menu', d);
        rerender();
      }
    });
  };
  return { html, bind };
}

function pickDishSheet(date, recipes) {
  const sorted = [...recipes].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.title.localeCompare(b.title, 'ru'));
  const html = `<h3 class="sheet-title">${esc(fmtDay(date))}</h3>
    <div class="field"><span>Когда</span>${chipsHTML(SLOTS.map((s) => [s, s]), 'Ужин', 'slot')}</div>
    ${recipes.length ? `${searchHTML('Найти в рецептах')}
    <ul class="pick-list">${sorted.map((r) => `<li><button type="button" class="pick" data-rid="${r.id}" data-s="${esc((r.title + ' ' + (r.category || '')).toLowerCase())}">
      ${r.fav ? `<span class="pick-star">${Icons.starFill}</span>` : '<span class="pick-star"></span>'}<span>${esc(r.title)}</span><small>${esc(r.category || '')}</small></button></li>`).join('')}</ul>` : '<p class="muted">Рецептов пока нет — можно вписать блюдо словами.</p>'}
    <label class="field"><span>или своё блюдо</span><input id="freeText" placeholder="Гречка с котлетой"></label>
    <label class="field"><span>Порций <i>(для списка покупок)</i></span><input id="servIn" type="number" inputmode="decimal" step="any" min="0" placeholder="как в рецепте"></label>
    <div class="row-btns"><button class="btn ghost" data-close>Отмена</button><button class="btn" data-save>Добавить</button></div>`;
  openSheet(html, (s) => {
    let slot = 'Ужин';
    let rid = null;
    const servIn = $('#servIn', s);
    s.addEventListener('click', (e) => {
      const c = e.target.closest('[data-slot]');
      if (c) { slot = c.dataset.slot; $$('[data-slot]', s).forEach((b) => b.classList.toggle('on', b === c)); return; }
      const p = e.target.closest('[data-rid]');
      if (p) {
        rid = rid === p.dataset.rid ? null : p.dataset.rid;
        $$('[data-rid]', s).forEach((b) => b.classList.toggle('on', b.dataset.rid === rid));
        const r = recipes.find((x) => x.id === rid);
        servIn.value = r && r.yieldCount ? r.yieldCount : '';
        if (rid) $('#freeText', s).value = '';
      }
    });
    const sIn = $('[data-search]', s);
    if (sIn) sIn.addEventListener('input', () => {
      const q = sIn.value.trim().toLowerCase();
      $$('[data-rid]', s).forEach((b) => { b.parentElement.hidden = q && !b.dataset.s.includes(q); });
    });
    $('#freeText', s).addEventListener('input', (e) => {
      if (e.target.value) { rid = null; $$('[data-rid]', s).forEach((b) => b.classList.remove('on')); }
    });
    $('[data-save]', s).onclick = async () => {
      const text = $('#freeText', s).value.trim();
      if (!rid && !text) { toast('Выбери рецепт или впиши блюдо'); return; }
      const serv = parseFloat((servIn.value || '').replace(',', '.'));
      await addMenuItem(date, { slot, recipeId: rid, text, servings: isNaN(serv) ? null : serv });
      closeSheet();
      rerender();
    };
  });
}

async function menuItemSheet(date, mid, rmap) {
  const day = await DB.get('menu', date);
  const it = day && day.items.find((x) => x.id === mid);
  if (!it) return;
  const r = it.recipeId ? rmap.get(it.recipeId) : null;
  const html = `<h3 class="sheet-title">${esc(r ? r.title : it.text)}</h3>
    ${r ? `<div class="row-btns tight" style="margin:0 0 14px"><button type="button" class="btn" data-cook>${Icons.play} Начать готовить</button><a class="btn ghost" href="#/recipe/${r.id}" data-close>Рецепт</a></div>` : `<label class="field"><span>Блюдо</span><input id="miText" value="${esc(it.text)}"></label>`}
    <label class="field"><span>День</span><input type="date" id="miDate" value="${date}"></label>
    <div class="field"><span>Когда</span>${chipsHTML(SLOTS.map((s) => [s, s]), it.slot, 'slot')}</div>
    <label class="field"><span>Порций</span><input id="miServ" type="number" inputmode="decimal" step="any" min="0" value="${it.servings ?? ''}"></label>
    <div class="row-btns"><button class="btn ghost danger-text" data-del>${Icons.trash} Убрать</button><button class="btn" data-save>Сохранить</button></div>`;
  openSheet(html, (s) => {
    let slot = it.slot;
    const ck = $('[data-cook]', s);
    if (ck) ck.onclick = () => { closeSheet(); startSessionSheet(r, { target: it.servings || null }); };
    s.addEventListener('click', (e) => {
      const c = e.target.closest('[data-slot]');
      if (c) { slot = c.dataset.slot; $$('[data-slot]', s).forEach((b) => b.classList.toggle('on', b === c)); }
    });
    const removeFromDay = async () => {
      const d = await DB.get('menu', date);
      d.items = d.items.filter((x) => x.id !== mid);
      if (d.items.length) await DB.put('menu', d); else await DB.del('menu', date);
    };
    $('[data-del]', s).onclick = async () => { await removeFromDay(); closeSheet(); rerender(); };
    $('[data-save]', s).onclick = async () => {
      const newDate = $('#miDate', s).value || date;
      const serv = parseFloat(($('#miServ', s).value || '').replace(',', '.'));
      const textIn = $('#miText', s);
      const upd = { ...it, slot, servings: isNaN(serv) ? null : serv, text: textIn ? textIn.value.trim() || it.text : it.text };
      await removeFromDay();
      await addMenuItem(newDate, upd);
      closeSheet();
      rerender();
    };
  });
}

async function shoppingSheet(dates, rmap) {
  const sources = [];
  const free = [];
  for (const d of dates) {
    const day = await DB.get('menu', d);
    if (!day) continue;
    for (const it of day.items) {
      const r = it.recipeId ? rmap.get(it.recipeId) : null;
      if (!r) { if (it.text) free.push(it.text); continue; }
      const base = +r.yieldCount || 0;
      const k = base && it.servings ? it.servings / base : 1;
      sources.push({ groups: parseIngredients(r.ingredients), k, from: r.title });
    }
  }
  showShoppingList(sources, free, 'Сложены одинаковые продукты из всех блюд недели с учётом порций.', 'week:' + dates[0]);
}

async function showShoppingList(sources, free, note, listKey = 'default') {
  const list = sumIngredients(sources);
  const stKey = 'shop:' + listKey;
  const st = (await DB.get('shopstate', stKey)) || { key: stKey, checked: [], home: [] };
  const save = () => DB.put('shopstate', st);
  const qty = (e) => (e.amount != null ? fmtQty(e.amount, e.unit) : '');
  const row = (e, home) => `<li data-k="${esc(e.key)}" class="${home ? 'at-home' : ''}">
      <label><input type="checkbox" ${st.checked.includes(e.key) ? 'checked' : ''} ${home ? 'disabled' : ''}><span class="shop-n">${esc(e.name)}</span><span class="shop-a">${esc(qty(e))}</span></label>
      <button type="button" class="shop-home" data-home="${esc(e.key)}" aria-label="${home ? 'Вернуть в список' : 'Есть дома'}">${home ? Icons.cart : Icons.home}</button>
    </li>`;
  const draw = (s) => {
    const buy = list.filter((e) => !st.home.includes(e.key));
    const have = list.filter((e) => st.home.includes(e.key));
    $('#shopBody', s).innerHTML = `
      ${buy.length ? `<ul class="shop">${buy.map((e) => row(e, false)).join('')}</ul>` : '<p class="muted">Всё уже есть дома — покупать ничего не нужно.</p>'}
      ${have.length ? `<p class="pick-label">Есть дома (${have.length})</p><ul class="shop home-list">${have.map((e) => row(e, true)).join('')}</ul>` : ''}
      ${free.length ? `<p class="muted small">Без рецепта: ${esc(free.join(', '))}</p>` : ''}`;
  };
  const html = `<h3 class="sheet-title">Список покупок</h3>
    <p class="muted small">${esc(note)} Нажми ${Icons.home.replace('class="ic"', 'class="ic inline"')}, если продукт уже есть дома. Отметки сохраняются.</p>
    <div id="shopBody">${list.length ? '' : '<p class="muted">В рецептах нет ингредиентов.</p>'}</div>
    <div class="row-btns"><button class="btn ghost" data-reset>Сбросить отметки</button><button class="btn" data-copy>${Icons.copy} Скопировать</button></div>`;
  openSheet(html, (s) => {
    if (list.length) draw(s);
    s.addEventListener('change', (e) => {
      const li = e.target.closest('li[data-k]');
      if (!li || e.target.type !== 'checkbox') return;
      const k = li.dataset.k;
      st.checked = st.checked.filter((x) => x !== k);
      if (e.target.checked) st.checked.push(k);
      save();
    });
    s.addEventListener('click', (e) => {
      const hb = e.target.closest('[data-home]');
      if (hb) {
        const k = hb.dataset.home;
        if (st.home.includes(k)) st.home = st.home.filter((x) => x !== k);
        else { st.home.push(k); st.checked = st.checked.filter((x) => x !== k); }
        save();
        draw(s);
      }
    });
    $('[data-reset]', s).onclick = () => { st.checked = []; st.home = []; save(); draw(s); toast('Отметки сброшены'); };
    $('[data-copy]', s).onclick = async () => {
      const buy = list.filter((e) => !st.home.includes(e.key) && !st.checked.includes(e.key));
      const text = buy.map((e) => `${e.name}${e.amount != null ? ' — ' + qty(e) : ''}`).join('\n') + (free.length ? `\n\nБез рецепта: ${free.join(', ')}` : '');
      try { await navigator.clipboard.writeText(text); toast('Скопировано то, что осталось купить'); }
      catch (err) { if (navigator.share) navigator.share({ text }).catch(() => {}); }
    };
  });
}

/* ===================== Находки из магазинов ===================== */
async function viewFinds() {
  const all = (await DB.all('finds')).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const cats = [...new Set(all.map((f) => f.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const cards = all.map((f, i) => {
    const s = [f.name, f.shop, f.category, f.comment].join(' ').toLowerCase();
    return `<a class="fcard" href="#/find/${f.id}" data-item data-s="${esc(s)}" data-cat="${esc(f.category || '')}" data-fav="${f.fav ? 1 : 0}" style="--tilt:${(i % 3 - 1) * 1.2}deg">
      ${stickerHTML(f.photos && f.photos[0], f.id, i + 1)}
      <h3>${esc(f.name)}</h3>
      <p class="fc-meta">${esc([f.shop, f.price].filter(Boolean).join(' · '))}</p>
      ${f.rating ? hearts(f.rating) : ''}
      ${f.fav ? `<span class="rc-fav">${Icons.starFill}</span>` : ''}
    </a>`;
  }).join('');
  const html = `${pageHead('находки', 'вкусное из магазинов', Doodles.basket())}
    ${segNav(FINDS_NAV, '#/finds')}
    ${all.length ? `${searchHTML('Название, магазин…')}
      ${chipsHTML([['all', 'Все'], ['fav', '★ Любимое'], ...cats.map((c) => [c, esc(c)])], 'all', 'f')}
      <div class="fgrid">${cards}</div><p class="no-results" hidden>Ничего не нашлось</p>`
    : emptyHTML(Doodles.cheese(), 'Здесь будут находки', 'Сфотографируй вкусный сырок или хлеб из магазина, чтобы не забыть, где он продаётся.')}
    <a class="fab" href="#/find/new" aria-label="Новая находка">${Icons.plus}</a>`;
  return { html, bind: (root) => bindListFilter(root, 'f') };
}

async function viewFind(id) {
  const f = await DB.get('finds', id);
  if (!f) return { html: topbar('#/finds') + emptyHTML(Doodles.basket(), 'Находка не найдена', '') };
  const right = `<button class="iconbtn ${f.fav ? 'on' : ''}" data-act="fav" aria-label="Любимое">${f.fav ? Icons.starFill : Icons.star}</button>
    <a class="iconbtn" href="#/find/${f.id}/edit" aria-label="Изменить">${Icons.edit}</a>`;
  const html = `${topbar('#/finds', right)}
    <article class="detail">
      ${galleryHTML(f.photos, f.id)}
      ${f.category ? `<p class="eyebrow">${esc(f.category)}</p>` : ''}
      <h1 class="detail-title">${esc(f.name)}</h1>
      <div class="meta-row">
        ${f.shop ? `<span class="pill">${Icons.cart}${esc(f.shop)}</span>` : ''}
        ${f.price ? `<span class="pill">${esc(f.price)}</span>` : ''}
        ${f.rating ? hearts(f.rating) : ''}
      </div>
      ${f.comment ? `<section class="block"><div class="paper-note">${Doodles.pencil()}<p>${nl2br(f.comment)}</p></div></section>` : ''}
      <div class="actions"><button class="btn ghost danger-text" data-act="delete">${Icons.trash} Удалить</button></div>
    </article>`;
  const bind = (root) => root.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'fav') { f.fav = !f.fav; f.updated = Date.now(); await DB.put('finds', f); rerender(); }
    if (act.dataset.act === 'delete') {
      if (!(await ask(`Удалить «${f.name}»?`))) return;
      await Photos.removeMany(f.photos || []);
      await DB.del('finds', f.id);
      toast('Удалено');
      location.hash = '#/finds';
    }
  });
  return { html, bind };
}

async function viewFindEdit(id) {
  const f = id ? await DB.get('finds', id) : null;
  if (id && !f) return { html: topbar('#/finds') + emptyHTML(Doodles.basket(), 'Находка не найдена', '') };
  const v = f || { name: '', shop: '', price: '', category: '', rating: 0, comment: '', photos: [], fav: false };
  const finds = await DB.all('finds');
  const shops = [...new Set(finds.map((x) => x.shop).filter(Boolean))];
  const cats = [...new Set([...FIND_CATS, ...finds.map((x) => x.category).filter(Boolean)])];
  const html = `${topbar(f ? `#/find/${f.id}` : '#/finds')}
    <form class="form" id="findForm" autocomplete="off">
      <h1 class="form-title">${f ? 'правим находку' : 'новая находка'}</h1>
      <div class="field"><span>Фото</span><div id="photoBox">${photoEditorHTML(v.photos || [])}</div></div>
      <label class="field"><span>Что это</span><input name="name" required value="${esc(v.name)}" placeholder="Сырок с карамелью"></label>
      <div class="field-row">
        <label class="field"><span>Магазин</span><input name="shop" list="shopList" value="${esc(v.shop)}" placeholder="ВкусВилл"></label>
        <label class="field"><span>Цена</span><input name="price" value="${esc(v.price)}" placeholder="89 ₽"></label>
      </div>
      <datalist id="shopList">${shops.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>
      <label class="field"><span>Категория</span><input name="category" list="fcatList" value="${esc(v.category)}" placeholder="Сладкое"></label>
      <datalist id="fcatList">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      <div class="field"><span>Насколько вкусно</span><div id="rating">${hearts(v.rating || 0, true)}</div></div>
      <label class="field"><span>Комментарий</span><textarea name="comment" rows="4" placeholder="С чем есть, на какой полке искать…">${esc(v.comment)}</textarea></label>
      <label class="check"><input type="checkbox" name="fav" ${v.fav ? 'checked' : ''}><span>${Icons.star} Любимое</span></label>
      <div class="actions sticky">
        <button class="btn" type="submit">Сохранить</button>
        ${f ? `<button class="btn ghost danger-text" type="button" data-act="delete">${Icons.trash} Удалить</button>` : ''}
      </div>
    </form>`;
  const bind = (root) => {
    const form = $('#findForm', root);
    let rating = v.rating || 0;
    activeEditor = new PhotoEditor($('#photoBox', root), v.photos || []);
    $('#rating', root).addEventListener('click', (e) => {
      const h = e.target.closest('[data-rate]');
      if (!h) return;
      rating = +h.dataset.rate === rating ? 0 : +h.dataset.rate;
      $('#rating', root).innerHTML = hearts(rating, true);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const el = form.elements;
      const name = el.name.value.trim();
      if (!name) { toast('Напиши, что это'); return; }
      const rec = {
        ...(f || { id: uid(), created: Date.now() }),
        name, shop: el.shop.value.trim(), price: el.price.value.trim(), category: el.category.value.trim(),
        rating, comment: el.comment.value.trim(), fav: el.fav.checked, photos: activeEditor.ids, updated: Date.now()
      };
      await DB.put('finds', rec);
      await activeEditor.commit();
      activeEditor = null;
      toast('Сохранено');
      location.replace(`#/find/${rec.id}`);
    });
    root.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-act="delete"]')) return;
      if (!(await ask(`Удалить «${f.name}»?`))) return;
      await activeEditor.cancel();
      activeEditor = null;
      await Photos.removeMany(f.photos || []);
      await DB.del('finds', f.id);
      location.replace('#/finds');
    });
  };
  return { html, bind };
}

/* ===================== Заметки ===================== */
async function viewNotes() {
  const all = (await DB.all('notes')).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated || 0) - (a.updated || 0));
  const cards = all.map((n, i) => {
    const s = [n.title, n.text].join(' ').toLowerCase();
    return `<a class="note" href="#/note/${n.id}" data-item data-s="${esc(s)}" data-cat="" data-fav="${n.pinned ? 1 : 0}" style="--bg:${NOTE_COLORS[n.color] || NOTE_COLORS.butter};--tilt:${(i % 3 - 1) * 1.1}deg">
      ${n.pinned ? '<span class="pin"></span>' : ''}
      ${n.photos && n.photos[0] ? `<img class="note-ph" data-photo="${esc(n.photos[0])}" alt="">` : ''}
      ${n.title ? `<h3>${esc(n.title)}</h3>` : ''}
      <p>${nl2br(n.text)}</p>
    </a>`;
  }).join('');
  const html = `${pageHead('заметки', 'кулинарные мысли и хитрости', Doodles.pencil())}
    ${all.length ? `${searchHTML('Поиск по заметкам')}<div class="notes">${cards}</div><p class="no-results" hidden>Ничего не нашлось</p>`
    : emptyHTML(Doodles.whisk(), 'Заметок пока нет', 'Сюда удобно записывать хитрости: как темперировать шоколад, какие сливки взбиваются лучше.')}
    <a class="fab" href="#/note/new" aria-label="Новая заметка">${Icons.plus}</a>`;
  return { html, bind: (root) => bindListFilter(root, 'f') };
}

async function viewNoteEdit(id) {
  const n = id ? await DB.get('notes', id) : null;
  if (id && !n) return { html: topbar('#/notes') + emptyHTML(Doodles.pencil(), 'Заметка не найдена', '') };
  const v = n || { title: '', text: '', color: 'butter', photos: [], pinned: false };
  const html = `${topbar('#/notes', n ? `<button class="iconbtn" data-act="delete" aria-label="Удалить">${Icons.trash}</button>` : '')}
    <form class="form note-form" id="noteForm" style="--bg:${NOTE_COLORS[v.color] || NOTE_COLORS.butter}">
      <input class="note-title-in" name="title" value="${esc(v.title)}" placeholder="Заголовок">
      <textarea class="note-text-in" name="text" rows="12" placeholder="Пиши здесь…">${esc(v.text)}</textarea>
      <div class="field"><span>Цвет листка</span><div class="swatches">${Object.entries(NOTE_COLORS).map(([k, c]) => `<button type="button" class="sw ${k === v.color ? 'on' : ''}" data-color="${k}" style="background:${c}" aria-label="${k}"></button>`).join('')}</div></div>
      <div class="field"><span>Фото</span><div id="photoBox">${photoEditorHTML(v.photos || [])}</div></div>
      <label class="check"><input type="checkbox" name="pinned" ${v.pinned ? 'checked' : ''}><span>Закрепить сверху</span></label>
      <div class="actions sticky"><button class="btn" type="submit">Сохранить</button></div>
    </form>`;
  const bind = (root) => {
    const form = $('#noteForm', root);
    let color = v.color || 'butter';
    activeEditor = new PhotoEditor($('#photoBox', root), v.photos || []);
    root.addEventListener('click', async (e) => {
      const sw = e.target.closest('[data-color]');
      if (sw) {
        color = sw.dataset.color;
        $$('[data-color]', root).forEach((b) => b.classList.toggle('on', b === sw));
        form.style.setProperty('--bg', NOTE_COLORS[color]);
        return;
      }
      if (e.target.closest('[data-act="delete"]')) {
        if (!(await ask('Удалить заметку?'))) return;
        await activeEditor.cancel();
        activeEditor = null;
        await Photos.removeMany(n.photos || []);
        await DB.del('notes', n.id);
        location.replace('#/notes');
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const el = form.elements;
      if (!el.title.value.trim() && !el.text.value.trim() && !activeEditor.ids.length) { toast('Заметка пустая'); return; }
      const rec = {
        ...(n || { id: uid(), created: Date.now() }),
        title: el.title.value.trim(), text: el.text.value.trim(), color, pinned: el.pinned.checked,
        photos: activeEditor.ids, updated: Date.now()
      };
      await DB.put('notes', rec);
      await activeEditor.commit();
      activeEditor = null;
      toast('Сохранено');
      location.replace('#/notes');
    });
  };
  return { html, bind };
}

/* ===================== Настройки ===================== */
async function viewSettings() {
  const [recipes, finds, notes, menu, photos, places, holidays] = await Promise.all(['recipes', 'finds', 'notes', 'menu', 'photos', 'places', 'holidays'].map((s) => DB.all(s)));
  const last = await DB.getMeta('lastBackup', 0);
  let est = '';
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      est = `${(e.usage / 1048576).toFixed(1).replace('.', ',')} МБ`;
    }
  } catch (e) { /* нет данных */ }
  let persisted = null;
  try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { /* */ }
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  const mouseOn = await DB.getMeta('mouseOn', true);
  const mouseName = await DB.getMeta('mouseName', 'Крошка');
  const html = `${pageHead('ещё', 'версия, обновления, копия', Doodles.flour())}
    <section class="card mouse-card">
      <div class="mc-pic">${Mouse('wave')}</div>
      <div class="mc-body">
        <h2 class="card-title">Мышка-помощница</h2>
        <label class="switch"><input type="checkbox" id="mouseOn" ${mouseOn ? 'checked' : ''}><span class="sw-track"></span><span>Подсказки и вопросы</span></label>
        <label class="field slim"><span>Как её зовут</span><input id="mouseName" value="${esc(mouseName)}" maxlength="20"></label>
      </div>
    </section>
    <section class="card">
      <h2 class="card-title">Версия</h2>
      <p class="version">v${esc(self.APP_VERSION)}</p>
      ${state.updateReady
        ? `<div class="banner update inline"><div><b>Доступна версия ${esc(state.remote.version)}</b>${state.remote.notes ? `<span>${esc(state.remote.notes)}</span>` : ''}</div></div>
           <button class="btn wide" data-act="apply-update">${Icons.refresh} Обновить до ${esc(state.remote.version)}</button>`
        : `<button class="btn ghost wide" data-act="check-update">${Icons.refresh} Проверить обновления</button>`}
      <p class="hint">Обновление меняет только само приложение. Рецепты, фото и меню остаются в телефоне.</p>
    </section>

    <section class="card">
      <h2 class="card-title">Резервная копия</h2>
      <p class="muted">${last ? `Последняя: ${esc(fmtDateTime(last))}` : 'Копию ещё не сохраняли'}</p>
      <button class="btn wide" data-act="backup">${Icons.download} Сохранить копию</button>
      <label class="btn ghost wide">${Icons.upload} Восстановить из файла<input type="file" accept="application/json,.json" hidden id="restoreIn"></label>
      <p class="hint">Копия — один файл .json со всеми рецептами, находками, местами, праздниками, заметками, меню и фото. Сохрани его в «Файлы» или на Яндекс Диск.</p>
    </section>

    <section class="card">
      <h2 class="card-title">Что хранится</h2>
      <ul class="stats">
        <li><b>${recipes.length}</b><span>${plural(recipes.length, 'рецепт', 'рецепта', 'рецептов')}</span></li>
        <li><b>${finds.length}</b><span>${plural(finds.length, 'находка', 'находки', 'находок')}</span></li>
        <li><b>${places.length}</b><span>${plural(places.length, 'место', 'места', 'мест')}</span></li>
        <li><b>${holidays.length}</b><span>${plural(holidays.length, 'праздник', 'праздника', 'праздников')}</span></li>
        <li><b>${notes.length}</b><span>${plural(notes.length, 'заметка', 'заметки', 'заметок')}</span></li>
        <li><b>${photos.length}</b><span>фото</span></li>
        <li><b>${menu.length}</b><span>${plural(menu.length, 'день', 'дня', 'дней')} в меню</span></li>
      </ul>
      ${est ? `<p class="muted small">Занято в телефоне: ${est}${persisted === true ? ' · хранилище защищено от очистки' : ''}</p>` : ''}
    </section>

    ${standalone ? '' : `<section class="card soft">
      <h2 class="card-title">Как поставить на iPhone</h2>
      <p class="muted">Открой эту страницу в Safari → кнопка «Поделиться» → «На экран „Домой“». Приложение появится с иконкой и будет работать без интернета.</p>
    </section>`}

    <section class="card">
      <h2 class="card-title">Цены продуктов</h2>
      <p class="muted">Цены, которые ты вводила в «Себестоимости». Здесь их можно посмотреть и удалить.</p>
      <button class="btn ghost wide" data-act="prices">${Icons.coin} Открыть цены</button>
    </section>

    <section class="card">
      <h2 class="card-title">Удаление</h2>
      <button class="btn ghost danger-text wide" data-act="wipe">${Icons.trash} Удалить все данные</button>
    </section>
    <p class="footer-sign">${Doodles.cheers()}<span>кулинарная тетрадь · v${esc(self.APP_VERSION)}</span></p>`;

  const bind = (root) => {
    root.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'check-update') { act.disabled = true; await Updater.check(false); act.disabled = false; }
      if (a === 'backup') backupSheet();
      if (a === 'prices') pricesSheet();
      if (a === 'wipe') {
        if (!(await ask('Удалить все рецепты, находки, места, праздники, заметки, меню и фото из телефона? Вернуть можно только из резервной копии.', 'Да, удалить'))) return;
        if (!(await ask('Точно? Это действие нельзя отменить.', 'Удалить всё'))) return;
        for (const s of ['recipes', 'finds', 'notes', 'menu', 'photos', 'places', 'holidays', 'prices', 'shopstate', 'sessions']) await DB.clear(s);
        await Timers.loadSessions();
        Photos.resetCache();
        toast('Все данные удалены');
        rerender();
      }
    });
    $('#mouseOn', root).addEventListener('change', async (e) => {
      await DB.setMeta('mouseOn', e.target.checked);
      MouseHelper.dismissed.clear();
      toast(e.target.checked ? 'Мышка снова с тобой' : 'Мышка спряталась');
    });
    $('#mouseName', root).addEventListener('change', async (e) => {
      const v = e.target.value.trim() || 'Крошка';
      await DB.setMeta('mouseName', v);
      toast(`Теперь её зовут ${v}`);
    });
    $('#restoreIn', root).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const obj = await Backup.read(file);
        const c = obj.counts || {};
        const when = obj.exportedAt ? fmtDateTime(Date.parse(obj.exportedAt)) : 'неизвестно когда';
        const ok = await ask(`Копия от ${when}: ${c.recipes ?? '?'} рецептов, ${c.finds ?? '?'} находок, ${c.notes ?? '?'} заметок, ${c.places ?? 0} мест, ${c.holidays ?? 0} праздников, ${c.photos ?? '?'} фото. Текущие данные заменятся на данные из копии.`, 'Восстановить', false);
        if (!ok) return;
        toast('Восстанавливаю…');
        await Backup.restore(obj);
        state.scale = {};
        toast('Готово — данные восстановлены');
        rerender();
      } catch (err) { toast(err.message); }
    });
  };
  return { html, bind };
}

async function backupSheet() {
  toast('Готовлю копию…');
  let built;
  try { built = await Backup.build(); } catch (e) { toast('Не получилось собрать копию'); return; }
  const { name, blob, counts } = built;
  const size = (blob.size / 1048576).toFixed(1).replace('.', ',');
  const canShare = Backup.canShareFile(name, blob);
  openSheet(`<h3 class="sheet-title">Копия готова</h3>
    <p class="muted">${esc(name)} · ${size} МБ<br>${counts.recipes} рец., ${counts.finds} находок, ${counts.notes} заметок, ${counts.places} мест, ${counts.holidays} праздн., ${counts.photos} фото</p>
    ${canShare ? `<button class="btn wide" data-share>${Icons.share} Сохранить в Файлы / Яндекс Диск</button>` : ''}
    <button class="btn ${canShare ? 'ghost' : ''} wide" data-dl>${Icons.download} Скачать файл</button>
    <button class="btn ghost wide" data-close>Закрыть</button>`, (s) => {
    const sh = $('[data-share]', s);
    if (sh) sh.onclick = async () => {
      try { await Backup.share(name, blob); closeSheet(); toast('Копия сохранена'); rerender(); }
      catch (e) { if (e.name !== 'AbortError') toast('Не получилось — попробуй «Скачать файл»'); }
    };
    $('[data-dl]', s).onclick = async () => { await Backup.download(name, blob); closeSheet(); toast('Файл скачан'); rerender(); };
  });
}

/* ===================== Маршруты ===================== */
const routes = [
  [/^#\/recipes$/, () => viewRecipes(), 'recipes', 'recipes'],
  [/^#\/recipe\/new$/, () => viewRecipeEdit(null), 'recipes', 'recipe-edit'],
  [/^#\/recipe\/(\w+)\/edit$/, (m) => viewRecipeEdit(m[1]), 'recipes', 'recipe-edit'],
  [/^#\/recipe\/(\w+)\/cook$/, (m) => viewCook(m[1]), 'recipes'],
  [/^#\/session\/(\w+)$/, (m) => viewSession(m[1]), 'recipes', 'session'],
  [/^#\/recipe\/(\w+)$/, (m) => viewRecipe(m[1]), 'recipes', 'recipe'],
  [/^#\/finds$/, () => viewFinds(), 'finds', 'finds'],
  [/^#\/find\/new$/, () => viewFindEdit(null), 'finds'],
  [/^#\/find\/(\w+)\/edit$/, (m) => viewFindEdit(m[1]), 'finds'],
  [/^#\/find\/(\w+)$/, (m) => viewFind(m[1]), 'finds'],
  [/^#\/menu$/, () => viewMenu(), 'menu', 'menu'],
  [/^#\/places$/, () => viewPlaces(), 'finds', 'places'],
  [/^#\/place\/new$/, () => viewPlaceEdit(null), 'finds'],
  [/^#\/place\/(\w+)\/edit$/, (m) => viewPlaceEdit(m[1]), 'finds'],
  [/^#\/place\/(\w+)$/, (m) => viewPlace(m[1]), 'finds'],
  [/^#\/holidays$/, () => viewHolidays(), 'menu', 'holidays'],
  [/^#\/holiday\/new$/, () => viewHolidayEdit(null), 'menu'],
  [/^#\/holiday\/(\w+)\/edit$/, (m) => viewHolidayEdit(m[1]), 'menu'],
  [/^#\/holiday\/(\w+)$/, (m) => viewHoliday(m[1]), 'menu', 'holiday'],
  [/^#\/notes$/, () => viewNotes(), 'notes', 'notes'],
  [/^#\/note\/new$/, () => viewNoteEdit(null), 'notes'],
  [/^#\/note\/(\w+)$/, (m) => viewNoteEdit(m[1]), 'notes'],
  [/^#\/settings$/, () => viewSettings(), 'settings']
];

const TABS = [
  ['recipes', 'Рецепты', Icons.tabBook],
  ['finds', 'Находки', Icons.tabBasket],
  ['menu', 'Меню', Icons.tabMenu],
  ['notes', 'Заметки', Icons.tabNote],
  ['settings', 'Ещё', Icons.tabGear]
];

function drawTabbar(active) {
  $('#tabbar').innerHTML = TABS.map(([k, label, icon]) =>
    `<a href="#/${k}" data-tab="${k}" class="${k === active ? 'on' : ''}">${icon}<span>${label}</span></a>`).join('');
  updateBadges();
}

let _lastHash = null;
let _renderSeq = 0;
async function render() {
  const hash = location.hash || '#/recipes';
  if (activeEditor) { const ed = activeEditor; activeEditor = null; ed.cancel(); }
  if (stepEditor) { const se = stepEditor; stepEditor = null; se.cancel(); }
  if (viewCleanup) { try { viewCleanup(); } catch (e) { /* */ } viewCleanup = null; }
  const found = routes.find(([re]) => re.test(hash));
  if (!found) { location.replace('#/recipes'); return; }
  const seq = ++_renderSeq;
  const [re, view, tab, screen] = found;
  const res = await view(hash.match(re));
  if (seq !== _renderSeq) return;
  const isNewPage = hash !== _lastHash;
  const y = window.scrollY;
  // каждый раз новый контейнер — чтобы обработчики не накапливались
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = res.html;
  $('#app').replaceChildren(page);
  drawTabbar(tab);
  Timers.render();
  page.addEventListener('click', globalClicks);
  if (res.bind) res.bind(page);
  if (res.cleanup) viewCleanup = res.cleanup;
  Photos.hydrate(page);
  if (screen) {
    const anchor = $('.segnav', page) || $('.page-head', page) || $('.meta-row', page) || $('.form-title', page);
    if (anchor) {
      anchor.insertAdjacentHTML('afterend', '<div class="mouse-slot"></div>');
      MouseHelper.mount(page, screen, res.mouse || {});
    }
  }
  if (isNewPage) window.scrollTo(0, 0); else window.scrollTo(0, y);
  _lastHash = hash;
}
function rerender() { render(); }

function globalClicks(e) {
  const a = e.target.closest('[data-act="apply-update"]');
  if (a) { Updater.apply(); return; }
  const z = e.target.closest('[data-act="zoom"]');
  if (z && z.src) zoomPhoto(z.src);
}

window.addEventListener('hashchange', render);

(async function start() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* */ }
  if (!location.hash) history.replaceState(null, '', '#/recipes');
  Timers.load();
  let added = 0;
  try { added = await addStarterRecipes(); } catch (e) { console.warn(e); }
  try { await migrateRecipes(); } catch (e) { console.warn(e); }
  try { added += await addBanoffeeParty(); } catch (e) { console.warn(e); }
  await render();
  if (added) toast(`В тетрадь добавлено ${added} ${plural(added, 'рецепт', 'рецепта', 'рецептов')}`);
  Updater.init();
})();

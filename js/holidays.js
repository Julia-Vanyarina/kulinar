'use strict';
/* ===================== Праздники и праздничное меню ===================== */
const HOLIDAY_SECTIONS = ['Аперитив', 'Закуски', 'Салаты', 'Супы', 'Горячее', 'Гарниры', 'Десерты', 'Напитки'];
const HOLIDAY_PRESETS = ['Новый год', 'День рождения', 'Рождество', '8 Марта', 'Пасха', 'Годовщина', 'Девичник', 'Пикник', 'Ужин с друзьями'];
const MENU_NAV = [['#/menu', 'Неделя'], ['#/holidays', 'Праздники']];

function daysUntil(iso) {
  if (!iso) return null;
  return Math.round((dateObj(iso) - dateObj(todayISO())) / 864e5);
}
function whenLabel(iso) {
  const d = daysUntil(iso);
  if (d === null) return 'без даты';
  if (d === 0) return 'сегодня!';
  if (d === 1) return 'завтра';
  if (d > 1) return `через ${d} ${plural(d, 'день', 'дня', 'дней')}`;
  return 'уже прошёл';
}

async function viewHolidays() {
  const all = await DB.all('holidays');
  const upcoming = all.filter((h) => !h.date || daysUntil(h.date) >= 0).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const past = all.filter((h) => h.date && daysUntil(h.date) < 0).sort((a, b) => b.date.localeCompare(a.date));
  const card = (h, i) => {
    const d = h.date ? dateObj(h.date) : null;
    const T = CARD_THEMES[h.theme] || CARD_THEMES.journal;
    const n = (h.items || []).length;
    return `<a class="hcard" href="#/holiday/${h.id}" style="--accent:${T.title};--hbg:${T.bg}">
      <div class="h-date">${d ? `<b>${d.getDate()}</b><span>${esc(d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''))}</span>` : '<b>?</b><span>дата</span>'}</div>
      <div class="rc-body">
        <p class="rc-cat">${esc(whenLabel(h.date))}</p>
        <h3>${esc(h.title)}</h3>
        <p class="rc-meta">${n} ${plural(n, 'блюдо', 'блюда', 'блюд')}${h.guests ? ` · ${h.guests} ${plural(h.guests, 'гость', 'гостя', 'гостей')}` : ''}</p>
      </div>
      <div class="h-doodle">${Doodles[['cake', 'flower', 'wine', 'daisy'][i % 4]]()}</div>
    </a>`;
  };
  const html = `${pageHead('праздники', 'меню для гостей', Doodles.cake())}
    ${segNav(MENU_NAV, '#/holidays')}
    ${all.length ? `
      ${upcoming.length ? `<div class="hlist">${upcoming.map(card).join('')}</div>` : ''}
      ${past.length ? `<h2 class="block-title small-gap">прошедшие</h2><div class="hlist past">${past.map(card).join('')}</div>` : ''}`
    : emptyHTML(Doodles.cake(), 'Праздников пока нет', 'Создай праздник, собери меню по разделам и отправь друзьям красивую картинку.')}
    <a class="fab" href="#/holiday/new" aria-label="Новый праздник">${Icons.plus}</a>`;
  return { html };
}

async function viewHolidayEdit(id) {
  const h = id ? await DB.get('holidays', id) : null;
  if (id && !h) return { html: topbar('#/holidays') + emptyHTML(Doodles.cake(), 'Праздник не найден', '') };
  const v = h || { title: '', date: '', guests: '', subtitle: '', signature: '', theme: 'journal', items: [] };
  const html = `${topbar(h ? `#/holiday/${h.id}` : '#/holidays')}
    <form class="form" id="holForm" autocomplete="off">
      <h1 class="form-title">${h ? 'правим праздник' : 'новый праздник'}</h1>
      <label class="field"><span>Праздник</span><input name="title" list="holPresets" required value="${esc(v.title)}" placeholder="Новый год"></label>
      <datalist id="holPresets">${HOLIDAY_PRESETS.map((p) => `<option value="${esc(p)}">`).join('')}</datalist>
      <div class="field-row">
        <label class="field"><span>Дата</span><input name="date" type="date" value="${esc(v.date)}"></label>
        <label class="field"><span>Гостей</span><input name="guests" type="number" inputmode="numeric" min="0" value="${esc(v.guests)}" placeholder="6"></label>
      </div>
      <label class="field"><span>Строка под названием <i>(на картинке)</i></span><input name="subtitle" value="${esc(v.subtitle)}" placeholder="Ждём вас к 19:00"></label>
      <label class="field"><span>Подпись внизу <i>(на картинке)</i></span><input name="signature" value="${esc(v.signature)}" placeholder="с любовью, хозяева вечера"></label>
      <p class="hint">Рамку и блюда выберешь на следующем шаге.</p>
      <div class="actions sticky"><button class="btn" type="submit">${h ? 'Сохранить' : 'Дальше — составить меню'}</button></div>
    </form>`;
  const bind = (root) => {
    const form = $('#holForm', root);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const el = form.elements;
      const title = el.title.value.trim();
      if (!title) { toast('Напиши название праздника'); return; }
      const guests = parseInt(el.guests.value, 10);
      const rec = {
        ...(h || { id: uid(), created: Date.now(), theme: 'journal', items: [] }),
        title, date: el.date.value, guests: isNaN(guests) ? '' : guests,
        subtitle: el.subtitle.value.trim(), signature: el.signature.value.trim(), updated: Date.now()
      };
      await DB.put('holidays', rec);
      location.replace(`#/holiday/${rec.id}`);
    });
  };
  return { html, bind };
}

async function viewHoliday(id) {
  const h = await DB.get('holidays', id);
  if (!h) return { html: topbar('#/holidays') + emptyHTML(Doodles.cake(), 'Праздник не найден', '') };
  h.items = h.items || [];
  const recipes = await DB.all('recipes');
  const rmap = new Map(recipes.map((r) => [r.id, r]));
  const secs = MenuCard.sections(h, rmap);
  const right = `<a class="iconbtn" href="#/holiday/${h.id}/edit" aria-label="Изменить">${Icons.edit}</a>
    <button class="iconbtn" data-act="delete" aria-label="Удалить">${Icons.trash}</button>`;
  const hasRecipes = h.items.some((it) => it.recipeId && rmap.has(it.recipeId));

  const html = `${topbar('#/holidays', right)}
    <article class="detail">
      <p class="eyebrow">${h.date ? esc(fmtDay(h.date)) : 'без даты'} · ${esc(whenLabel(h.date))}</p>
      <h1 class="detail-title">${esc(h.title)}</h1>
      <div class="meta-row">
        ${h.guests ? `<span class="pill">${h.guests} ${plural(h.guests, 'гость', 'гостя', 'гостей')}</span>` : ''}
        <span class="pill">${h.items.length} ${plural(h.items.length, 'блюдо', 'блюда', 'блюд')}</span>
      </div>

      <section class="block">
        <h2 class="block-title">меню</h2>
        ${secs.length ? secs.map((s) => `<h4 class="ing-group">${esc(s.title)}</h4>
          <ul class="hitems">${s.items.map((it) => `<li class="hitem" data-hid="${it.id}">
            <span class="hi-t">${esc(it.title || 'Блюдо')}${it.recipeId && rmap.has(it.recipeId) ? ' <i class="hi-r">рецепт</i>' : ''}</span>
            ${it.desc ? `<small>${esc(it.desc)}</small>` : ''}
          </li>`).join('')}</ul>`).join('')
        : '<p class="muted">Пока пусто — добавь первое блюдо.</p>'}
        <button type="button" class="add-line" data-act="add">${Icons.plus} блюдо</button>
      </section>

      <section class="block">
        <h2 class="block-title">картинка</h2>
        <div class="themes">${Object.entries(CARD_THEMES).map(([k, T]) => `<button type="button" class="theme ${k === (CARD_THEMES[h.theme] ? h.theme : 'journal') ? 'on' : ''}" data-theme="${k}" style="--tbg:${T.bg};--tc:${T.title};--ts:${T.section}"><span class="th-sw"><i></i><i></i></span>${esc(T.name)}</button>`).join('')}</div>
        <div class="card-preview"><img id="cardImg" alt="Картинка с меню"><p class="muted small" id="cardWait">Рисую…</p></div>
        <div class="actions">
          <button class="btn" data-act="image">${Icons.share} Отправить картинку</button>
          ${hasRecipes ? `<button class="btn ghost" data-act="shop">${Icons.cart} Покупки</button>` : ''}
        </div>
      </section>
    </article>`;

  const bind = (root) => {
    let canvas = null;
    let previewUrl = null;
    let seq = 0;
    const draw = async () => {
      const my = ++seq;
      $('#cardWait', root).hidden = false;
      const c = await MenuCard.render(h, rmap);
      if (my !== seq) return;
      canvas = c;
      const blob = await MenuCard.toBlob(c);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      $('#cardImg', root).src = previewUrl;
      $('#cardWait', root).hidden = true;
    };
    draw();
    root.addEventListener('click', async (e) => {
      const th = e.target.closest('[data-theme]');
      if (th) {
        h.theme = th.dataset.theme;
        $$('[data-theme]', root).forEach((b) => b.classList.toggle('on', b === th));
        await DB.put('holidays', { ...h, updated: Date.now() });
        draw();
        return;
      }
      const hi = e.target.closest('[data-hid]');
      if (hi) { holidayItemSheet(h, recipes, h.items.find((x) => x.id === hi.dataset.hid)); return; }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'add') holidayItemSheet(h, recipes, null);
      if (a === 'image') {
        if (!canvas) await draw();
        const blob = await MenuCard.toBlob(canvas);
        imageShareSheet(blob, `menu-${(h.title || 'prazdnik').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')}.png`);
      }
      if (a === 'shop') {
        const sources = [];
        const free = [];
        for (const it of h.items) {
          const r = it.recipeId ? rmap.get(it.recipeId) : null;
          if (!r) { if (it.text) free.push(it.text); continue; }
          const base = +r.yieldCount || 0;
          const k = base && h.guests ? h.guests / base : 1;
          sources.push({ groups: parseIngredients(r.ingredients), k });
        }
        showShoppingList(sources, free, h.guests ? `Количество пересчитано на ${h.guests} ${plural(h.guests, 'гостя', 'гостей', 'гостей')} по выходу рецептов.` : 'Укажи число гостей в празднике, чтобы пересчитать продукты.');
      }
      if (a === 'delete') {
        if (!(await ask(`Удалить праздник «${h.title}»?`))) return;
        await DB.del('holidays', h.id);
        location.hash = '#/holidays';
      }
    });
  };
  return { html, bind, mouse: { holiday: h, recipes, addItem: () => holidayItemSheet(h, recipes, null) } };
}

function imageShareSheet(blob, name) {
  const url = URL.createObjectURL(blob);
  const file = new File([blob], name, { type: 'image/png' });
  let canShare = false;
  try { canShare = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { /* */ }
  openSheet(`<h3 class="sheet-title">Картинка готова</h3>
    <img class="zoomed" src="${url}" alt="Меню">
    <p class="hint" style="margin-top:10px">Можно зажать картинку и выбрать «Сохранить в Фото».</p>
    ${canShare ? `<button class="btn wide" data-share>${Icons.share} Отправить друзьям</button>` : ''}
    <button class="btn ${canShare ? 'ghost' : ''} wide" data-dl>${Icons.download} Скачать</button>
    <button class="btn ghost wide" data-close>Закрыть</button>`, (s) => {
    const sh = $('[data-share]', s);
    if (sh) sh.onclick = async () => {
      try { await navigator.share({ files: [file] }); } catch (e) { if (e.name !== 'AbortError') toast('Не получилось — попробуй «Скачать»'); }
    };
    $('[data-dl]', s).onclick = () => {
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
    };
  });
}

function holidayItemSheet(h, recipes, item) {
  const used = [...new Set(h.items.map((x) => x.section).filter(Boolean))];
  const sections = [...new Set([...HOLIDAY_SECTIONS, ...used])];
  const cur = item || { section: used[used.length - 1] || 'Закуски', recipeId: null, text: '', desc: '' };
  const sorted = [...recipes].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.title.localeCompare(b.title, 'ru'));
  const html = `<h3 class="sheet-title">${item ? 'Блюдо' : 'Добавить блюдо'}</h3>
    <div class="field"><span>Раздел</span>${chipsHTML(sections.map((s) => [s, esc(s)]), cur.section, 'sec')}</div>
    <label class="field"><span>или свой раздел</span><input id="secIn" placeholder="Например: Для детей"></label>
    ${recipes.length ? `${searchHTML('Выбрать из рецептов')}
      <ul class="pick-list">${sorted.map((r) => `<li><button type="button" class="pick ${r.id === cur.recipeId ? 'on' : ''}" data-rid="${r.id}" data-s="${esc((r.title + ' ' + (r.category || '')).toLowerCase())}">
        <span class="pick-star">${r.fav ? Icons.starFill : ''}</span><span>${esc(r.title)}</span><small>${esc(r.category || '')}</small></button></li>`).join('')}</ul>` : ''}
    <label class="field"><span>или название блюда</span><input id="txtIn" value="${esc(cur.recipeId ? '' : cur.text)}" placeholder="Оливье по-бабушкиному"></label>
    <label class="field"><span>Описание <i>(мелко под названием)</i></span><input id="descIn" value="${esc(cur.desc)}" placeholder="с домашним майонезом"></label>
    ${item ? `<div class="row-btns tight"><button class="btn ghost small" data-move="-1">↑ Выше</button><button class="btn ghost small" data-move="1">↓ Ниже</button></div>` : ''}
    <div class="row-btns">${item ? `<button class="btn ghost danger-text" data-del>${Icons.trash} Убрать</button>` : '<button class="btn ghost" data-close>Отмена</button>'}<button class="btn" data-save>${item ? 'Сохранить' : 'Добавить'}</button></div>`;
  openSheet(html, (s) => {
    let section = cur.section;
    let rid = cur.recipeId;
    const save = async () => { h.updated = Date.now(); await DB.put('holidays', h); closeSheet(); rerender(); };
    s.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-sec]');
      if (c) { section = c.dataset.sec; $('#secIn', s).value = ''; $$('[data-sec]', s).forEach((b) => b.classList.toggle('on', b === c)); return; }
      const p = e.target.closest('[data-rid]');
      if (p) {
        rid = rid === p.dataset.rid ? null : p.dataset.rid;
        $$('[data-rid]', s).forEach((b) => b.classList.toggle('on', b.dataset.rid === rid));
        if (rid) $('#txtIn', s).value = '';
        return;
      }
      const mv = e.target.closest('[data-move]');
      if (mv && item) {
        const same = h.items.filter((x) => x.section === item.section);
        const idx = same.indexOf(item);
        const other = same[idx + +mv.dataset.move];
        if (!other) { toast('Дальше двигать некуда'); return; }
        const i1 = h.items.indexOf(item), i2 = h.items.indexOf(other);
        [h.items[i1], h.items[i2]] = [h.items[i2], h.items[i1]];
        await save();
        return;
      }
      if (e.target.closest('[data-del]') && item) {
        h.items = h.items.filter((x) => x !== item);
        await save();
      }
    });
    const sIn = $('[data-search]', s);
    if (sIn) sIn.addEventListener('input', () => {
      const q = sIn.value.trim().toLowerCase();
      $$('[data-rid]', s).forEach((b) => { b.parentElement.hidden = q && !b.dataset.s.includes(q); });
    });
    $('#txtIn', s).addEventListener('input', (e) => {
      if (e.target.value) { rid = null; $$('[data-rid]', s).forEach((b) => b.classList.remove('on')); }
    });
    $('#secIn', s).addEventListener('input', (e) => {
      if (e.target.value.trim()) $$('[data-sec]', s).forEach((b) => b.classList.remove('on'));
    });
    $('[data-save]', s).onclick = async () => {
      const text = $('#txtIn', s).value.trim();
      if (!rid && !text) { toast('Выбери рецепт или впиши блюдо'); return; }
      const sec = $('#secIn', s).value.trim() || section || 'Меню';
      const upd = { section: sec, recipeId: rid, text: rid ? '' : text, desc: $('#descIn', s).value.trim() };
      if (item) Object.assign(item, upd);
      else h.items.push({ id: uid(), ...upd });
      await save();
    };
  });
}

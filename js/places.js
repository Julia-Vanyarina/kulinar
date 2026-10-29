'use strict';
/* ===================== Рестораны и доставки ===================== */
const PLACE_KINDS = ['Ресторан', 'Кафе', 'Кофейня', 'Пекарня', 'Бар', 'Доставка'];

function segNav(items, active) {
  return `<nav class="segnav">${items.map(([href, label]) => `<a href="${href}" class="${href === active ? 'on' : ''}">${label}</a>`).join('')}</nav>`;
}
const FINDS_NAV = [['#/finds', 'Продукты'], ['#/places', 'Рестораны и доставки']];

function mapLink(addr) {
  return 'https://yandex.ru/maps/?text=' + encodeURIComponent(addr);
}
function priceLevel(n) {
  if (!n) return '';
  return `<span class="price-lvl">${'₽'.repeat(n)}<i>${'₽'.repeat(4 - n)}</i></span>`;
}
function linesOf(text) {
  return String(text || '').split('\n').map((l) => l.replace(/^\s*[•·*-]\s*/, '').trim()).filter(Boolean);
}
function normalizeUrl(u) {
  u = (u || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}

async function viewPlaces() {
  const all = (await DB.all('places')).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (b.updated || 0) - (a.updated || 0));
  const kinds = [...new Set(all.map((p) => p.kind).filter(Boolean))];
  const cards = all.map((p, i) => {
    const addrs = linesOf(p.addresses);
    const s = [p.name, p.kind, p.cuisine, p.addresses, p.dishes, p.comment].join(' ').toLowerCase();
    return `<a class="pcard" href="#/place/${p.id}" data-item data-s="${esc(s)}" data-cat="${esc(p.kind || '')}" data-fav="${p.fav ? 1 : 0}">
      ${stickerHTML(p.photos && p.photos[0], p.id, i + 2)}
      <div class="rc-body">
        <p class="rc-cat">${esc([p.kind, p.cuisine].filter(Boolean).join(' · '))}</p>
        <h3>${esc(p.name)}</h3>
        ${addrs[0] ? `<p class="rc-meta with-ic">${Icons.pin}${esc(addrs[0])}${addrs.length > 1 ? ` и ещё ${addrs.length - 1}` : ''}</p>` : ''}
        <div class="pc-row">${p.rating ? hearts(p.rating) : ''}${priceLevel(p.price)}</div>
      </div>
      ${p.fav ? `<span class="rc-fav">${Icons.starFill}</span>` : ''}
    </a>`;
  }).join('');
  const html = `${pageHead('находки', 'любимые места и доставки', Doodles.cutlery())}
    ${segNav(FINDS_NAV, '#/places')}
    ${all.length ? `${searchHTML('Название, кухня, адрес…')}
      ${chipsHTML([['all', 'Все'], ['fav', '★ Любимые'], ...kinds.map((k) => [k, esc(k)])], 'all', 'f')}
      <div class="rlist">${cards}</div><p class="no-results" hidden>Ничего не нашлось</p>`
    : emptyHTML(Doodles.wine(), 'Здесь будут места', 'Добавь любимый ресторан или доставку — с адресом, телефоном и тем, что там вкусно заказывать.')}
    <a class="fab" href="#/place/new" aria-label="Новое место">${Icons.plus}</a>`;
  return { html, bind: (root) => bindListFilter(root, 'f') };
}

async function viewPlace(id) {
  const p = await DB.get('places', id);
  if (!p) return { html: topbar('#/places') + emptyHTML(Doodles.cutlery(), 'Место не найдено', '') };
  const addrs = linesOf(p.addresses);
  const dishes = linesOf(p.dishes);
  const url = normalizeUrl(p.link);
  const right = `<button class="iconbtn ${p.fav ? 'on' : ''}" data-act="fav" aria-label="Любимое">${p.fav ? Icons.starFill : Icons.star}</button>
    <a class="iconbtn" href="#/place/${p.id}/edit" aria-label="Изменить">${Icons.edit}</a>`;
  const html = `${topbar('#/places', right)}
    <article class="detail">
      ${galleryHTML(p.photos, p.id)}
      <p class="eyebrow">${esc([p.kind, p.cuisine].filter(Boolean).join(' · '))}</p>
      <h1 class="detail-title">${esc(p.name)}</h1>
      <div class="meta-row">${p.rating ? hearts(p.rating) : ''}${p.price ? `<span class="pill">${priceLevel(p.price)}</span>` : ''}</div>

      ${addrs.length || p.phone || url ? `<section class="block"><h2 class="block-title">где и как</h2>
        <ul class="contact">
          ${addrs.map((a) => `<li><a href="${esc(mapLink(a))}" target="_blank" rel="noopener"><span class="ct-ic">${Icons.pin}</span><span>${esc(a)}<small>открыть в Яндекс Картах</small></span></a></li>`).join('')}
          ${p.phone ? `<li><a href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}"><span class="ct-ic">${Icons.phone}</span><span>${esc(p.phone)}<small>позвонить</small></span></a></li>` : ''}
          ${url ? `<li><a href="${esc(url)}" target="_blank" rel="noopener"><span class="ct-ic">${Icons.link}</span><span>${esc(p.link)}<small>сайт или приложение</small></span></a></li>` : ''}
        </ul></section>` : ''}
      ${dishes.length ? `<section class="block"><h2 class="block-title">что заказывать</h2><ul class="dishes">${dishes.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></section>` : ''}
      ${p.comment ? `<section class="block"><div class="paper-note">${Doodles.pencil()}<p>${nl2br(p.comment)}</p></div></section>` : ''}
      <div class="actions"><button class="btn ghost danger-text" data-act="delete">${Icons.trash} Удалить</button></div>
    </article>`;
  const bind = (root) => root.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'fav') { p.fav = !p.fav; p.updated = Date.now(); await DB.put('places', p); rerender(); }
    if (act.dataset.act === 'delete') {
      if (!(await ask(`Удалить «${p.name}»?`))) return;
      await Photos.removeMany(p.photos || []);
      await DB.del('places', p.id);
      toast('Удалено');
      location.hash = '#/places';
    }
  });
  return { html, bind };
}

async function viewPlaceEdit(id) {
  const p = id ? await DB.get('places', id) : null;
  if (id && !p) return { html: topbar('#/places') + emptyHTML(Doodles.cutlery(), 'Место не найдено', '') };
  const v = p || { name: '', kind: 'Ресторан', cuisine: '', addresses: '', phone: '', link: '', dishes: '', price: 0, rating: 0, comment: '', photos: [], fav: false };
  const all = await DB.all('places');
  const kinds = [...new Set([...PLACE_KINDS, ...all.map((x) => x.kind).filter(Boolean)])];
  const html = `${topbar(p ? `#/place/${p.id}` : '#/places')}
    <form class="form" id="placeForm" autocomplete="off">
      <h1 class="form-title">${p ? 'правим место' : 'новое место'}</h1>
      <label class="field"><span>Название</span><input name="name" required value="${esc(v.name)}" placeholder="Хачапурная на Садовой"></label>
      <div class="field"><span>Что это</span>${chipsHTML(kinds.map((k) => [k, esc(k)]), v.kind, 'kind')}</div>
      <label class="field"><span>Кухня</span><input name="cuisine" value="${esc(v.cuisine)}" placeholder="Грузинская"></label>
      <label class="field"><span>Адреса <i>(каждый с новой строки)</i></span><textarea name="addresses" rows="3" placeholder="Москва, Садовая-Кудринская, 3">${esc(v.addresses)}</textarea></label>
      <div class="field-row">
        <label class="field"><span>Телефон</span><input name="phone" type="tel" value="${esc(v.phone)}" placeholder="+7 …"></label>
        <label class="field"><span>Сайт / приложение</span><input name="link" value="${esc(v.link)}" placeholder="eda.yandex.ru/…"></label>
      </div>
      <label class="field"><span>Что заказывать</span><textarea name="dishes" rows="4" placeholder="Хачапури по-аджарски&#10;Хинкали с бараниной">${esc(v.dishes)}</textarea></label>
      <div class="field"><span>Цены</span><div class="price-pick">${[1, 2, 3, 4].map((n) => `<button type="button" class="chip ${n === v.price ? 'on' : ''}" data-price="${n}">${'₽'.repeat(n)}</button>`).join('')}</div></div>
      <div class="field"><span>Насколько нравится</span><div id="rating">${hearts(v.rating || 0, true)}</div></div>
      <div class="field"><span>Фото</span><div id="photoBox">${photoEditorHTML(v.photos || [])}</div></div>
      <label class="field"><span>Комментарий</span><textarea name="comment" rows="3" placeholder="Бронировать заранее, промокод, кому понравилось…">${esc(v.comment)}</textarea></label>
      <label class="check"><input type="checkbox" name="fav" ${v.fav ? 'checked' : ''}><span>${Icons.star} Любимое</span></label>
      <div class="actions sticky">
        <button class="btn" type="submit">Сохранить</button>
        ${p ? `<button class="btn ghost danger-text" type="button" data-act="delete">${Icons.trash} Удалить</button>` : ''}
      </div>
    </form>`;
  const bind = (root) => {
    const form = $('#placeForm', root);
    let kind = v.kind || '';
    let price = v.price || 0;
    let rating = v.rating || 0;
    activeEditor = new PhotoEditor($('#photoBox', root), v.photos || []);
    root.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-kind]');
      if (k) { kind = k.dataset.kind; $$('[data-kind]', root).forEach((b) => b.classList.toggle('on', b === k)); return; }
      const pr = e.target.closest('[data-price]');
      if (pr) {
        price = +pr.dataset.price === price ? 0 : +pr.dataset.price;
        $$('[data-price]', root).forEach((b) => b.classList.toggle('on', +b.dataset.price === price));
        return;
      }
      const h = e.target.closest('[data-rate]');
      if (h) { rating = +h.dataset.rate === rating ? 0 : +h.dataset.rate; $('#rating', root).innerHTML = hearts(rating, true); return; }
      if (e.target.closest('[data-act="delete"]')) {
        if (!(await ask(`Удалить «${p.name}»?`))) return;
        await activeEditor.cancel();
        activeEditor = null;
        await Photos.removeMany(p.photos || []);
        await DB.del('places', p.id);
        location.replace('#/places');
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const el = form.elements;
      const name = el.name.value.trim();
      if (!name) { toast('Напиши название'); return; }
      const rec = {
        ...(p || { id: uid(), created: Date.now() }),
        name, kind, cuisine: el.cuisine.value.trim(), addresses: el.addresses.value.trim(),
        phone: el.phone.value.trim(), link: el.link.value.trim(), dishes: el.dishes.value.trim(),
        price, rating, comment: el.comment.value.trim(), fav: el.fav.checked,
        photos: activeEditor.ids, updated: Date.now()
      };
      await DB.put('places', rec);
      await activeEditor.commit();
      activeEditor = null;
      toast('Сохранено');
      location.replace(`#/place/${rec.id}`);
    });
  };
  return { html, bind };
}

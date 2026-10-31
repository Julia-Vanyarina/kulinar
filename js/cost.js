'use strict';
/* ===================== Себестоимость ===================== */
// Цена хранится один раз на продукт и подставляется во все рецепты.
// { key, name, unit, price (₽), pack (сколько единиц за эту цену) }

const DEFAULT_PACK = { 'г': 1000, 'мл': 1000, 'шт': 10, 'ст.л.': 1, 'ч.л.': 1, 'стакан': 1 };
const rub = (v) => `${(Math.round(v * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: v < 100 ? 2 : 0, maximumFractionDigits: 2 })} ₽`;

function costOf(entry, priceRec) {
  if (!priceRec || !priceRec.price || !priceRec.pack || entry.amount == null) return null;
  return (entry.amount / priceRec.pack) * priceRec.price;
}

async function costSheet(r, k = 1, count = null) {
  const list = sumIngredients([{ groups: parseIngredients(r.ingredients), k }]);
  const prices = new Map((await DB.all('prices')).map((p) => [p.key, p]));
  // для продуктов без количества — сколько ₽ уходит на этот рецепт (хранится в самом рецепте)
  const fixed = { ...(r.costFixed || {}) };
  const noQty = list.filter((e) => e.amount == null).length;
  const unitLabel = r.yieldUnit || 'порц.';
  const portion = +r.portionSize ? ` по ${fmtAmount(+r.portionSize * ((state.scale[r.id] && state.scale[r.id].portion) ? state.scale[r.id].portion / +r.portionSize : 1))} ${r.portionUnit || 'мл'}` : '';

  const row = (e) => {
    const p = prices.get(e.key);
    const pack = p ? p.pack : (DEFAULT_PACK[e.unit] || 1);
    const packLabel = e.unit === 'г' && pack === 1000 ? 'кг' : e.unit === 'мл' && pack === 1000 ? 'л' : `${fmtAmount(pack)} ${e.unit || 'шт'}`;
    return `<li class="cost-row" data-k="${esc(e.key)}">
      <div class="cr-top"><span class="cr-n">${esc(e.name)}</span><span class="cr-q">${e.amount == null ? 'без количества' : esc(fmtQty(e.amount, e.unit))}</span></div>
      ${e.amount == null ? `<div class="cr-in">
        <input class="cr-fixed" type="number" inputmode="decimal" min="0" step="any" placeholder="₽" value="${fixed[e.key] != null ? Math.round(fixed[e.key] * (k || 1) * 100) / 100 : ''}">
        <span>₽ уходит на рецепт</span>
        <b class="cr-sum"></b>
      </div>` : `<div class="cr-in">
        <input class="cr-price" type="number" inputmode="decimal" min="0" step="any" placeholder="цена" value="${p && p.price ? p.price : ''}">
        <span>₽ за</span>
        <input class="cr-pack" type="number" inputmode="decimal" min="0" step="any" value="${pack}">
        <span>${esc(e.unit || 'шт')}</span>
        <b class="cr-sum"></b>
      </div><p class="cr-hint">${p ? '' : `например, цена за ${packLabel} или за упаковку`}</p>`}
    </li>`;
  };

  openSheet(`<h3 class="sheet-title">Себестоимость</h3>
    <p class="muted small">${esc(r.title)}${count ? ` · на ${fmtAmount(count)} ${esc(unitLabel)}${esc(portion)}` : ''}. Впиши цену продукта, например «450 ₽ за 1000 г» или за упаковку. Цены запоминаются и подставятся в другие рецепты.</p>
    ${noQty ? `<p class="hint">${noQty === list.length ? 'В этом рецепте не указаны граммовки' : 'У некоторых продуктов не указано количество'}, поэтому для них впиши, сколько рублей уходит на рецепт: например, упаковка фарша — 450 ₽. Точнее будет, если указать граммовки в самом рецепте.</p>` : ''}
    <div class="cost-total" id="costTotal"></div>
    <ul class="cost-list">${list.map(row).join('')}</ul>
    <div class="row-btns"><button class="btn" data-close>Готово</button></div>`, (s) => {
    const recalc = () => {
      let total = 0, missing = 0;
      $$('.cost-row', s).forEach((li) => {
        const e = list.find((x) => x.key === li.dataset.k);
        const fi = $('.cr-fixed', li);
        if (fi) {
          const v = parseFloat(fi.value.replace(',', '.'));
          const c = v ? v * (k || 1) : null;
          $('.cr-sum', li).textContent = c == null ? '' : rub(c);
          if (c == null) missing++; else total += c;
          return;
        }
        const pi = $('.cr-price', li);
        if (!pi) return;
        const price = parseFloat(pi.value.replace(',', '.'));
        const pack = parseFloat($('.cr-pack', li).value.replace(',', '.'));
        const c = price && pack ? (e.amount / pack) * price : null;
        $('.cr-sum', li).textContent = c == null ? '' : rub(c);
        if (c == null) missing++; else total += c;
      });
      const per = count ? total / count : null;
      $('#costTotal', s).innerHTML = `
        <div><span>Всего</span><b>${rub(total)}</b></div>
        ${per != null ? `<div><span>За 1 ${esc(unitLabel.replace(/\.$/, ''))}</span><b>${rub(per)}</b></div>` : ''}
        ${missing ? `<p class="muted small">Без цены: ${missing} ${plural(missing, 'продукт', 'продукта', 'продуктов')} — сумма будет точнее, когда заполнишь.</p>` : ''}`;
    };
    let t;
    s.addEventListener('input', (ev) => {
      const li = ev.target.closest('.cost-row');
      if (!li) return;
      recalc();
      clearTimeout(t);
      t = setTimeout(async () => {
        // сохраняем все строки разом, чтобы не потерять быстрые правки в нескольких полях
        let fixedChanged = false;
        for (const row of $$('.cost-row', s)) {
          const e = list.find((x) => x.key === row.dataset.k);
          const fi = $('.cr-fixed', row);
          if (fi) {
            const v = parseFloat(fi.value.replace(',', '.'));
            // «на 1 рецепт», чтобы при пересчёте порций сумма тоже менялась
            const val = v ? Math.round((v / (k || 1)) * 100) / 100 : undefined;
            if (fixed[e.key] !== val) { if (val) fixed[e.key] = val; else delete fixed[e.key]; fixedChanged = true; }
            continue;
          }
          const pi = $('.cr-price', row);
          if (!pi) continue;
          const price = parseFloat(pi.value.replace(',', '.'));
          const pack = parseFloat($('.cr-pack', row).value.replace(',', '.'));
          const old = prices.get(e.key);
          if (price && pack) {
            if (!old || old.price !== price || old.pack !== pack) {
              const rec = { key: e.key, name: e.name, unit: e.unit, price, pack, updated: Date.now() };
              prices.set(e.key, rec);
              await DB.put('prices', rec);
            }
          } else if (!pi.value && old) { prices.delete(e.key); await DB.del('prices', e.key); }
        }
        if (fixedChanged) {
          const fresh = await DB.get('recipes', r.id);
          if (fresh) { fresh.costFixed = { ...fixed }; await DB.put('recipes', fresh); r.costFixed = { ...fixed }; }
        }
      }, 400);
    });
    recalc();
  });
}

// Список всех цен (вкладка «Ещё»)
async function pricesSheet() {
  const all = (await DB.all('prices')).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  openSheet(`<h3 class="sheet-title">Цены продуктов</h3>
    ${all.length ? `<ul class="shop">${all.map((p) => `<li data-k="${esc(p.key)}"><label><span class="shop-n">${esc(p.name)}</span><span class="shop-a">${rub(p.price)} за ${fmtAmount(p.pack)} ${esc(p.unit || 'шт')}</span></label><button type="button" class="shop-home" data-delprice="${esc(p.key)}" aria-label="Удалить">${Icons.trash}</button></li>`).join('')}</ul>`
    : '<p class="muted">Цен пока нет. Их удобно вводить в рецепте — кнопка «Себестоимость».</p>'}
    <div class="row-btns"><button class="btn" data-close>Закрыть</button></div>`, (s) => {
    s.addEventListener('click', async (e) => {
      const d = e.target.closest('[data-delprice]');
      if (!d) return;
      await DB.del('prices', d.dataset.delprice);
      d.closest('li').remove();
      toast('Цена удалена');
    });
  });
}

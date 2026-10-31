'use strict';
/* ===================== «Что приготовить из того, что есть» ===================== */
const PANTRY_BASICS = ['соль', 'вода', 'перец'];

function words(s) {
  return String(s).toLowerCase().replace(/ё/g, 'е').replace(/\([^)]*\)/g, ' ').replace(/[^a-zа-я\s-]/g, ' ').split(/[\s-]+/).filter((w) => w.length > 2);
}
function stemOf(w) { return w.slice(0, Math.max(4, w.length - 2)); }
function haveIt(ingName, have) {
  const iw = words(ingName);
  return have.some((h) => words(h).some((hw) => {
    const st = stemOf(hw);
    return iw.some((x) => x.startsWith(st) || hw.startsWith(stemOf(x)));
  }));
}

function matchRecipes(recipes, have) {
  const res = [];
  for (const r of recipes) {
    const items = [];
    const seen = new Set();
    for (const g of parseIngredients(r.ingredients)) for (const it of g.items) {
      const n = it.name.replace(/\s*\([^)]*\)/g, '').trim();
      const key = n.toLowerCase();
      if (!n || seen.has(key)) continue;
      seen.add(key);
      items.push(n);
    }
    if (!items.length) continue;
    const got = items.filter((n) => haveIt(n, have));
    if (!got.length) continue;
    const missing = items.filter((n) => !got.includes(n) && !PANTRY_BASICS.some((b) => n.toLowerCase().startsWith(b)));
    res.push({ r, got, missing, score: got.length / items.length });
  }
  return res.sort((a, b) => a.missing.length - b.missing.length || b.got.length - a.got.length);
}

async function openPantrySheet() {
  const recipes = await DB.all('recipes');
  let have = await DB.getMeta('pantry', []);
  const allNames = [...new Set(recipes.flatMap((r) => parseIngredients(r.ingredients).flatMap((g) => g.items.map((it) => it.name.replace(/\s*\([^)]*\)/g, '').trim()))))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru'));

  openSheet(`<h3 class="sheet-title">Что есть дома?</h3>
    <p class="muted small">Добавь продукты из холодильника — подберу рецепты из тетради. Соль и воду считаю, что есть всегда.</p>
    <div class="tags" id="tags"></div>
    <form class="tag-add" id="tagForm" autocomplete="off">
      <input id="tagIn" list="ingNames" placeholder="Например: бананы" enterkeyhint="done">
      <button class="btn small" type="submit">${Icons.plus}</button>
    </form>
    <datalist id="ingNames">${allNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
    <div id="pantryRes"></div>
    <div class="row-btns"><button class="btn ghost" data-clear>Очистить</button><button class="btn" data-close>Закрыть</button></div>`, (s) => {
    const save = () => DB.setMeta('pantry', have);
    const draw = () => {
      $('#tags', s).innerHTML = have.map((h, i) => `<button type="button" class="tag" data-rm="${i}">${esc(h)} ${Icons.x}</button>`).join('') || '<span class="muted small">Пока пусто</span>';
      const res = have.length ? matchRecipes(recipes, have) : [];
      $('#pantryRes', s).innerHTML = !have.length ? '' : res.length ? `<ul class="pantry-list">${res.map(({ r, got, missing }) => `
        <li><a href="#/recipe/${r.id}" data-close>
          <b>${esc(r.title)}</b>
          <span class="pl-got">есть: ${esc(got.join(', '))}</span>
          ${missing.length ? `<span class="pl-miss">не хватает: ${esc(missing.slice(0, 6).join(', '))}${missing.length > 6 ? ` и ещё ${missing.length - 6}` : ''}</span>` : '<span class="pl-ok">всё есть — можно готовить!</span>'}
        </a></li>`).join('')}</ul>` : '<p class="muted">В тетради пока нет рецептов с этими продуктами.</p>';
      $$('[data-close]', $('#pantryRes', s)).forEach((a) => a.addEventListener('click', closeSheet));
    };
    $('#tagForm', s).addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('#tagIn', s);
      const vals = inp.value.split(/[,;]/).map((v) => v.trim()).filter(Boolean);
      for (const v of vals) if (!have.some((h) => h.toLowerCase() === v.toLowerCase())) have.push(v);
      inp.value = '';
      save();
      draw();
    });
    s.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { have.splice(+rm.dataset.rm, 1); save(); draw(); return; }
      if (e.target.closest('[data-clear]')) { have = []; save(); draw(); }
    });
    draw();
  });
}

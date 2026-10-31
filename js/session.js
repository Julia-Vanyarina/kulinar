'use strict';
/* ===================== «Готовлю сейчас» — готовки в работе ===================== */
// Запись готовки (хранилище sessions):
// { id, recipeId, title, status: 'active'|'done', started, finished, target, portion, k,
//   have: [ключи продуктов, которые есть], timers: [...], photos: [...], note }

const TIMER_PRESETS = [[15, '15 мин'], [30, '30 мин'], [60, '1 ч'], [120, '2 ч'], [240, '4 ч'], [480, '8 ч'], [720, '12 ч'], [1440, '24 ч']];

async function activeSessions() {
  return (await DB.all('sessions')).filter((x) => x.status === 'active').sort((a, b) => b.started - a.started);
}
async function recipeSessions(recipeId) {
  return (await DB.all('sessions')).filter((x) => x.recipeId === recipeId).sort((a, b) => b.started - a.started);
}
function sessionIngredients(r, x) {
  return sumIngredients([{ groups: parseIngredients(r.ingredients), k: x.k || 1 }]);
}
// Шаги рецепта, разложенные по этапам, с ключами для отметок «готово»
function sessionStages(r) {
  const stages = [];
  let cur = { title: '', steps: [] };
  getSteps(r).forEach((s, i) => {
    if (s.type === 'group') {
      if (cur.title || cur.steps.length) stages.push(cur);
      cur = { title: s.text, steps: [] };
      return;
    }
    if (!s.text && !s.photo) return;
    cur.steps.push({ ...s, key: i + '|' + (s.text || '').slice(0, 40) });
  });
  if (cur.title || cur.steps.length) stages.push(cur);
  return stages.filter((st) => st.steps.length);
}
function stepProgress(r, x) {
  const all = sessionStages(r).flatMap((st) => st.steps);
  const done = new Set(x.doneSteps || []);
  const left = all.filter((s) => !done.has(s.key));
  return { total: all.length, done: all.length - left.length, next: left[0] || null };
}

function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? `${h} ч` : '', m ? `${m} мин` : ''].filter(Boolean).join(' ') || '0 мин';
}

/* ---------- Начать готовить ---------- */
async function startSessionSheet(r) {
  const running = (await activeSessions()).find((x) => x.recipeId === r.id);
  if (running) { location.hash = `#/session/${running.id}`; return; }
  const base = +r.yieldCount || 0;
  const pBase = +r.portionSize || 0;
  const st = state.scale[r.id] || {};
  const unit = r.yieldUnit || 'порц.';
  openSheet(`<h3 class="sheet-title">Готовим «${esc(r.title)}»</h3>
    ${base ? `<p class="muted small">Сколько будешь готовить? Продукты пересчитаются.</p>
      <div class="scaler">
        <span>На</span><input id="ssT" type="number" inputmode="decimal" min="0" step="any" value="${st.target ?? base}"><span>${esc(unit)}</span>
        ${pBase ? `<span class="por">по <input id="ssP" type="number" inputmode="decimal" min="0" step="any" value="${st.portion ?? pBase}"> ${esc(r.portionUnit || 'мл')}</span>` : ''}
      </div>`
    : `<p class="muted small">Во сколько раз увеличить рецепт?</p><div class="scaler"><span>×</span><input id="ssK" type="number" inputmode="decimal" min="0" step="any" value="${st.k || 1}"></div>`}
    <p class="hint" style="margin-top:12px">Дальше отметишь продукты, которые уже есть, — и сразу будет видно, что купить. Таймеры и фото результата тоже будут здесь.</p>
    <div class="row-btns"><button class="btn ghost" data-close>Отмена</button><button class="btn" data-go>${Icons.play} Начать</button></div>`, (s) => {
    $('[data-go]', s).onclick = async () => {
      const num = (id) => { const el = $(id, s); return el ? parseFloat(el.value.replace(',', '.')) || 0 : null; };
      let target = null, portion = null, k = 1;
      if (base) {
        target = num('#ssT') || base;
        portion = pBase ? (num('#ssP') || pBase) : null;
        k = (target / base) * (pBase ? portion / pBase : 1);
      } else k = num('#ssK') || 1;
      const x = { id: uid(), recipeId: r.id, title: r.title, status: 'active', started: Date.now(), finished: null, target, portion, k, have: [], timers: [], photos: [], note: '' };
      await DB.put('sessions', x);
      closeSheet();
      location.hash = `#/session/${x.id}`;
    };
  });
}

/* ---------- Экран готовки ---------- */
async function viewSession(id) {
  const x = await DB.get('sessions', id);
  if (!x) return { html: topbar('#/recipes') + emptyHTML(Doodles.bowl(), 'Готовка не найдена', 'Возможно, её удалили.') };
  const r = await DB.get('recipes', x.recipeId);
  const recipe = r || { id: x.recipeId, title: x.title, ingredients: '', steps: '' };
  const tab = state.sessionTab && state.sessionTab[id] || (x.status === 'done' ? 'photos' : 'ings');
  state.sessionTab = { ...(state.sessionTab || {}), [id]: tab };
  const unit = recipe.yieldUnit || 'порц.';
  const amount = x.target ? `${fmtAmount(x.target)} ${unit}${x.portion ? ` по ${fmtAmount(x.portion)} ${recipe.portionUnit || 'мл'}` : ''}` : (Math.abs((x.k || 1) - 1) > 1e-9 ? `×${fmtAmount(x.k)}` : '');
  const right = `<button class="iconbtn" data-act="del-session" aria-label="Удалить">${Icons.trash}</button>`;

  const html = `${topbar(r ? `#/recipe/${r.id}` : '#/recipes', right)}
    <article class="detail session ${x.status}">
      <p class="eyebrow">${x.status === 'active' ? 'готовлю сейчас' : 'приготовлено'}</p>
      <h1 class="detail-title">${esc(recipe.title)}</h1>
      <div class="meta-row">
        <span class="pill">${Icons.clock}${x.status === 'active' ? `начато ${esc(fmtDateTime(x.started))}` : esc(fmtDateTime(x.finished || x.started))}</span>
        ${amount ? `<span class="pill">${esc(amount)}</span>` : ''}
      </div>
      <div class="seg sess-tabs">
        <button type="button" data-stab="ings" class="${tab === 'ings' ? 'on' : ''}">Продукты</button>
        <button type="button" data-stab="steps" class="${tab === 'steps' ? 'on' : ''}">Шаги</button>
        <button type="button" data-stab="timers" class="${tab === 'timers' ? 'on' : ''}">Таймеры<i class="tcount" id="tcount"></i></button>
        <button type="button" data-stab="photos" class="${tab === 'photos' ? 'on' : ''}">Фото</button>
      </div>
      <div id="sessBody"></div>
    </article>`;

  const bind = (root) => {
    const body = $('#sessBody', root);
    let ticker = null;
    const save = () => DB.put('sessions', x);
    const fresh = async () => { const y = await DB.get('sessions', id); if (y) Object.assign(x, y); };
    const updCount = () => {
      const n = (x.timers || []).filter((t) => !t.done && t.end > Date.now()).length;
      $('#tcount', root).textContent = n ? n : '';
    };

    /* --- Продукты --- */
    const drawIngs = () => {
      const list = sessionIngredients(recipe, x);
      if (!list.length) { body.innerHTML = '<p class="muted">В рецепте нет ингредиентов.</p>'; return; }
      const have = new Set(x.have || []);
      const buy = list.filter((e) => !have.has(e.key));
      const got = list.filter((e) => have.has(e.key));
      const row = (e, on) => `<li data-k="${esc(e.key)}" class="${on ? 'on' : ''}"><span class="hv-box">${on ? Icons.plus.replace('M12 5v14M5 12h14', 'M5 12l5 5 9-10') : ''}</span><span class="hv-n">${esc(e.name)}</span><span class="hv-a">${e.amount == null ? '' : esc(fmtQty(e.amount, e.unit))}</span></li>`;
      body.innerHTML = `
        <p class="muted small">Отметь, что уже есть дома. Остальное — список покупок.</p>
        <div class="buy-summary ${buy.length ? '' : 'all'}">
          ${buy.length ? `<b>Купить: ${buy.length} ${plural(buy.length, 'продукт', 'продукта', 'продуктов')}</b><button type="button" class="btn small" data-act="copy-buy">${Icons.copy} Скопировать</button>` : `<b>${Icons.starFill} Всё есть — можно готовить!</b>`}
        </div>
        ${buy.length ? `<p class="pick-label">Нужно купить</p><ul class="have-list">${buy.map((e) => row(e, false)).join('')}</ul>` : ''}
        ${got.length ? `<p class="pick-label">Уже есть · ${got.length}</p><ul class="have-list got">${got.map((e) => row(e, true)).join('')}</ul>` : ''}
        <div class="row-btns tight">
          <button type="button" class="btn small ghost" data-act="have-all">Всё есть</button>
          <button type="button" class="btn small ghost" data-act="have-none">Сбросить отметки</button>
        </div>`;
    };

    /* --- Шаги --- */
    const openStages = new Set();
    const drawSteps = () => {
      const stages = sessionStages(recipe);
      if (!stages.length) { body.innerHTML = '<p class="muted">Шаги в рецепте не записаны. Таймер можно поставить во вкладке «Таймеры».</p>'; return; }
      const done = new Set(x.doneSteps || []);
      const pr = stepProgress(recipe, x);
      const active = x.status === 'active';
      const check = Icons.plus.replace('M12 5v14M5 12h14', 'M5 12l5 5 9-10');
      let n = 0;
      body.innerHTML = `
        <div class="step-progress">
          <div class="sp-text"><b>${pr.done === pr.total ? 'Все шаги готовы!' : `Готово ${pr.done} из ${pr.total}`}</b>${pr.next ? `<span>Дальше: ${esc(pr.next.text)}</span>` : ''}</div>
          <div class="cook-progress"><span style="width:${pr.total ? (pr.done / pr.total) * 100 : 0}%"></span></div>
        </div>
        <p class="muted small">Нажимай на шаг, когда он готов. Нажатие на название этапа отмечает его целиком.</p>
        ${stages.map((st, si) => {
          const allDone = st.steps.every((s) => done.has(s.key));
          const open = !allDone || openStages.has(si);
          n = 0;
          return `<section class="stage ${allDone ? 'done' : ''}">
            ${st.title || stages.length > 1 ? `<button type="button" class="stage-h" data-stage="${si}">
              <span class="stage-box">${allDone ? check : ''}</span>
              <span class="stage-t">${esc(st.title || 'Шаги')}</span>
              <span class="stage-c">${allDone ? 'готово' : `${st.steps.filter((s) => done.has(s.key)).length}/${st.steps.length}`}</span>
            </button>` : ''}
            ${allDone && !open ? `<button type="button" class="stage-more" data-open="${si}">показать шаги</button>` : `<ol class="steps check-steps">${st.steps.map((s) => {
              n++;
              const on = done.has(s.key);
              const t = timerButtons(s.text, recipe.title, active ? id : null);
              return `<li class="step ${on ? 'on' : ''}" data-step="${esc(s.key)}">
                <span class="step-n">${on ? check : n}</span>
                <div class="step-body"><p>${esc(s.text)}</p>
                  ${t && !on ? `<div class="timer-row">${t}</div>` : ''}
                  ${s.photo ? `<img class="step-ph" data-photo="${esc(s.photo)}" data-act="zoom" alt="">` : ''}</div>
              </li>`;
            }).join('')}</ol>`}
          </section>`;
        }).join('')}
        <a class="btn ghost wide" href="#/recipe/${recipe.id}/cook" data-act="big-steps" style="margin-top:14px">${Icons.play} Крупно, по одному шагу</a>`;
      Photos.hydrate(body);
    };
    const toggleSteps = async (keys, on) => {
      const set = new Set(x.doneSteps || []);
      for (const k of keys) { if (on) set.add(k); else set.delete(k); }
      x.doneSteps = [...set];
      await save();
      drawSteps();
    };

    /* --- Таймеры --- */
    const drawTimers = () => {
      const timers = [...(x.timers || [])].sort((a, b) => a.end - b.end);
      const active = x.status === 'active';
      body.innerHTML = `
        ${timers.length ? `<ul class="sess-timers">${timers.map((t) => `
          <li class="${t.done || Date.now() >= t.end ? 'done' : ''}" data-tid="${t.id}">
            <div class="st-main"><b>${esc(t.label)}</b><span>${t.done || Date.now() >= t.end ? 'готово' : `готово ${esc(Timers.clock(t.end))}`}</span></div>
            <div class="st-left" data-end="${t.end}">${t.done || Date.now() >= t.end ? '✓' : Timers.fmt((t.end - Date.now()) / 1000)}</div>
            <div class="st-acts">
              ${t.done || Date.now() >= t.end ? '' : `<button type="button" class="iconbtn sm" data-cal="${t.id}" aria-label="В Календарь">${Icons.cal}</button>`}
              <button type="button" class="iconbtn sm" data-rmtimer="${t.id}" aria-label="Убрать">${Icons.x}</button>
            </div>
          </li>`).join('')}</ul>` : '<p class="muted">Таймеров пока нет.</p>'}
        ${active ? `<div class="card timer-new">
          <h2 class="card-title">Новый таймер</h2>
          <label class="field slim"><span>Что ждём</span><input id="tLabel" placeholder="Крем стабилизируется" maxlength="60"></label>
          <div class="chips preset-chips">${TIMER_PRESETS.map(([m, l]) => `<button type="button" class="chip" data-preset="${m}">${l}</button>`).join('')}</div>
          <div class="hm">
            <label><input id="tH" type="number" inputmode="numeric" min="0" max="72" placeholder="0"><span>ч</span></label>
            <label><input id="tM" type="number" inputmode="numeric" min="0" max="59" placeholder="0"><span>мин</span></label>
          </div>
          <p class="muted small" id="tEnd"></p>
          <button type="button" class="btn wide" data-act="start-timer">${Icons.timer} Запустить</button>
        </div>
        <p class="hint">Таймер сохраняется: можно закрыть приложение и вернуться — отсчёт продолжится. Но iPhone не даёт веб-приложению звенеть, пока оно закрыто, поэтому для долгих таймеров нажми ${Icons.cal.replace('class="ic"', 'class="ic inline"')} — напоминание добавится в Календарь.</p>` : ''}`;
      const h = $('#tH', body), m = $('#tM', body);
      const showEnd = () => {
        const min = (parseInt(h && h.value, 10) || 0) * 60 + (parseInt(m && m.value, 10) || 0);
        const el = $('#tEnd', body);
        if (el) el.textContent = min ? `Будет готово ${Timers.clock(Date.now() + min * 60000)} · через ${fmtDuration(min)}` : '';
      };
      if (h) { h.addEventListener('input', showEnd); m.addEventListener('input', showEnd); }
    };
    const tick = () => {
      $$('[data-end]', body).forEach((el) => {
        const left = (+el.dataset.end - Date.now()) / 1000;
        if (left <= 0) { if (el.textContent !== '✓') { el.textContent = '✓'; el.closest('li').classList.add('done'); } }
        else el.textContent = Timers.fmt(left);
      });
    };

    /* --- Фото и итог --- */
    const drawPhotos = () => {
      const active = x.status === 'active';
      body.innerHTML = `
        <div class="sess-photos">
          ${(x.photos || []).map((p) => `<div class="sp"><img data-photo="${esc(p)}" data-act="zoom" alt=""><button type="button" class="thumb-x" data-rmph="${esc(p)}" aria-label="Удалить фото">${Icons.x}</button></div>`).join('')}
          <label class="sp add">${Icons.camera}<span>${(x.photos || []).length ? 'ещё фото' : 'сфотографировать результат'}</span><input type="file" accept="image/*" multiple hidden id="spIn"></label>
        </div>
        <label class="field" style="margin-top:16px"><span>Как получилось</span><textarea id="sNote" rows="3" placeholder="Крем взбился отлично, карамель чуть жидковата…">${esc(x.note || '')}</textarea></label>
        ${active
          ? `<button type="button" class="btn wide" data-act="finish">${Icons.starFill} Завершить готовку</button>
             <p class="hint">Фото попадут в рецепт — в подборку «Мои приготовления». Каждая новая готовка добавит свои.</p>`
          : `<p class="muted small">Готовка завершена ${esc(fmtDateTime(x.finished || x.started))}.</p>
             <button type="button" class="btn ghost wide" data-act="reopen">Вернуть в работу</button>`}`;
      Photos.hydrate(body);
      let nt;
      $('#sNote', body).addEventListener('input', (e) => {
        clearTimeout(nt);
        nt = setTimeout(() => { x.note = e.target.value.trim(); save(); }, 500);
      });
      $('#spIn', body).addEventListener('change', async (e) => {
        const files = [...e.target.files];
        e.target.value = '';
        for (const f of files) {
          try { const pid = await Photos.add(f); x.photos = [...(x.photos || []), pid]; } catch (err) { toast(err.message); }
        }
        await save();
        drawPhotos();
      });
    };

    const draw = async () => {
      await fresh();
      updCount();
      clearInterval(ticker);
      const t = state.sessionTab[id];
      if (t === 'ings') drawIngs();
      else if (t === 'steps') drawSteps();
      else if (t === 'timers') { drawTimers(); ticker = setInterval(tick, 1000); }
      else drawPhotos();
    };
    draw();
    const onTimers = () => { if (state.sessionTab[id] === 'timers' || true) draw(); };
    document.addEventListener('kn-timers', onTimers);

    root.addEventListener('click', async (e) => {
      const tb = e.target.closest('[data-stab]');
      if (tb) {
        state.sessionTab[id] = tb.dataset.stab;
        $$('[data-stab]', root).forEach((b) => b.classList.toggle('on', b === tb));
        draw();
        return;
      }
      if (state.sessionTab[id] === 'steps') {
        const op = e.target.closest('[data-open]');
        if (op) { openStages.add(+op.dataset.open); drawSteps(); return; }
        const sh = e.target.closest('[data-stage]');
        if (sh) {
          const st = sessionStages(recipe)[+sh.dataset.stage];
          const done = new Set(x.doneSteps || []);
          const all = st.steps.every((s2) => done.has(s2.key));
          openStages.delete(+sh.dataset.stage);
          await toggleSteps(st.steps.map((s2) => s2.key), !all);
          if (!all) toast(`Этап «${st.title || 'Шаги'}» готов`);
          return;
        }
        const stp = e.target.closest('li[data-step]');
        if (stp && !e.target.closest('.timer-btn, img')) {
          const k = stp.dataset.step;
          await toggleSteps([k], !(x.doneSteps || []).includes(k));
          return;
        }
      }
      const li = e.target.closest('.have-list li[data-k]');
      if (li) {
        const k = li.dataset.k;
        const set = new Set(x.have || []);
        if (set.has(k)) set.delete(k); else set.add(k);
        x.have = [...set];
        await save();
        drawIngs();
        return;
      }
      const pr = e.target.closest('[data-preset]');
      if (pr) {
        const min = +pr.dataset.preset;
        $('#tH', body).value = Math.floor(min / 60) || '';
        $('#tM', body).value = min % 60 || '';
        $$('[data-preset]', body).forEach((b) => b.classList.toggle('on', b === pr));
        $('#tH', body).dispatchEvent(new Event('input'));
        return;
      }
      const rt = e.target.closest('[data-rmtimer]');
      if (rt) { await Timers.remove(rt.dataset.rmtimer); return; }
      const cal = e.target.closest('[data-cal]');
      if (cal) { const t = (x.timers || []).find((y) => y.id === cal.dataset.cal); if (t) addToCalendar(t, recipe.title); return; }
      const rp = e.target.closest('[data-rmph]');
      if (rp) {
        if (!(await ask('Удалить это фото?'))) return;
        x.photos = (x.photos || []).filter((p) => p !== rp.dataset.rmph);
        await Photos.remove(rp.dataset.rmph);
        await save();
        drawPhotos();
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'big-steps') state.cookSession = { recipeId: recipe.id, id };
      if (a === 'copy-buy') {
        const have = new Set(x.have || []);
        const buy = sessionIngredients(recipe, x).filter((it) => !have.has(it.key));
        const text = `Купить для «${recipe.title}»:\n` + buy.map((it) => `${it.name}${it.amount != null ? ' — ' + fmtQty(it.amount, it.unit) : ''}`).join('\n');
        try { await navigator.clipboard.writeText(text); toast('Список покупок скопирован'); }
        catch (err) { if (navigator.share) navigator.share({ text }).catch(() => {}); }
      }
      if (a === 'have-all') { x.have = sessionIngredients(recipe, x).map((it) => it.key); await save(); drawIngs(); }
      if (a === 'have-none') { x.have = []; await save(); drawIngs(); }
      if (a === 'start-timer') {
        const min = (parseInt($('#tH', body).value, 10) || 0) * 60 + (parseInt($('#tM', body).value, 10) || 0);
        if (!min) { toast('Выбери время'); return; }
        const label = $('#tLabel', body).value.trim() || `${recipe.title}: ${fmtDuration(min)}`;
        await Timers.start(label, min * 60, id);
        if (min >= 60) {
          const t = (await DB.get('sessions', id)).timers.slice(-1)[0];
          openSheet(`<h3 class="sheet-title">Таймер на ${fmtDuration(min)}</h3>
            <p>Будет готово <b>${esc(Timers.clock(t.end))}</b>. Добавить напоминание в Календарь iPhone? Тогда телефон напомнит, даже если приложение закрыто.</p>
            <div class="row-btns"><button class="btn ghost" data-close>Не надо</button><button class="btn" data-calnow>${Icons.cal} В Календарь</button></div>`, (s) => {
            $('[data-calnow]', s).onclick = () => { closeSheet(); addToCalendar(t, recipe.title); };
          });
        }
      }
      if (a === 'finish') {
        x.status = 'done';
        x.finished = Date.now();
        x.note = ($('#sNote', body) || {}).value ? $('#sNote', body).value.trim() : x.note;
        await save();
        await Timers.loadSessions();
        toast((x.photos || []).length ? 'Готово! Фото добавлены в рецепт' : 'Готовка завершена');
        location.hash = r ? `#/recipe/${r.id}` : '#/recipes';
      }
      if (a === 'reopen') { x.status = 'active'; await save(); await Timers.loadSessions(); rerender(); }
      if (a === 'del-session') {
        if (!(await ask('Удалить эту готовку вместе с её фото и таймерами?'))) return;
        await Photos.removeMany(x.photos || []);
        await DB.del('sessions', id);
        await Timers.loadSessions();
        location.hash = r ? `#/recipe/${r.id}` : '#/recipes';
      }
    });

    return () => { clearInterval(ticker); document.removeEventListener('kn-timers', onTimers); };
  };

  let cleanupFn = null;
  return {
    html,
    bind: (root) => { cleanupFn = bind(root); },
    cleanup: () => { if (cleanupFn) cleanupFn(); },
    mouse: { session: x }
  };
}

/* ---------- Напоминание в Календарь (.ics) ---------- */
function addToCalendar(t, title) {
  const z = (n) => String(n).padStart(2, '0');
  const utc = (ts) => { const d = new Date(ts); return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}T${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z`; };
  const clean = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, ' ');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kulinar//RU', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${t.id}@kulinar`, `DTSTAMP:${utc(Date.now())}`, `DTSTART:${utc(t.end)}`, `DTEND:${utc(t.end + 15 * 60000)}`,
    `SUMMARY:${clean('⏰ ' + t.label)}`, `DESCRIPTION:${clean('Кулинарная тетрадь — ' + title)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${clean(t.label)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const file = new File([blob], 'timer.ics', { type: 'text/calendar' });
  let canShare = false;
  try { canShare = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { /* */ }
  const url = URL.createObjectURL(blob);
  openSheet(`<h3 class="sheet-title">Напоминание в Календарь</h3>
    <p class="muted">«${esc(t.label)}» — ${esc(Timers.clock(t.end))}. Нажми «Открыть» — iPhone предложит «Добавить в календарь».</p>
    <a class="btn wide" href="${url}" target="_blank" rel="noopener" data-close>${Icons.cal} Открыть</a>
    ${canShare ? `<button class="btn ghost wide" data-sharecal>${Icons.share} Через «Поделиться»</button>` : ''}
    <button class="btn ghost wide" data-close>Закрыть</button>`, (s) => {
    const sb = $('[data-sharecal]', s);
    if (sb) sb.onclick = async () => { try { await navigator.share({ files: [file] }); } catch (e) { /* */ } };
  });
}

/* ---------- Блоки для других экранов ---------- */
// Полоска «Готовлю сейчас» на главной
async function activeStripHTML() {
  const list = await activeSessions();
  if (!list.length) return '';
  const recipes = new Map((await DB.all('recipes')).map((r) => [r.id, r]));
  return `<section class="now-cooking">
    <p class="pick-label">${Icons.play.replace('class="ic"', 'class="ic inline"')} Готовлю сейчас</p>
    ${list.map((x) => {
      const r = recipes.get(x.recipeId);
      const have = new Set(x.have || []);
      const buy = r ? sessionIngredients(r, x).filter((e) => !have.has(e.key) && e.amount != null).length : 0;
      const next = (x.timers || []).filter((t) => !t.done && t.end > Date.now()).sort((a, b) => a.end - b.end)[0];
      const done = (x.timers || []).some((t) => t.done || t.end <= Date.now());
      const pr = r ? stepProgress(r, x) : { total: 0 };
      return `<a class="nc-card" href="#/session/${x.id}">
        <div class="nc-main"><b>${esc(r ? r.title : x.title)}</b>
          <span>${pr.total ? `шаги ${pr.done}/${pr.total} · ` : ''}${buy ? `купить: ${buy}` : 'всё есть'}${next ? ` · ⏰ ${esc(next.label)} — ${esc(Timers.clock(next.end))}` : done ? ' · ⏰ таймер готов!' : ''}</span></div>
        ${Icons.right}
      </a>`;
    }).join('')}
  </section>`;
}

// «Мои приготовления» в рецепте
async function historyHTML(r) {
  const list = (await recipeSessions(r.id)).filter((x) => x.status === 'done' || (x.photos || []).length);
  if (!list.length) return '';
  const photos = list.flatMap((x) => (x.photos || []).map((p) => ({ p, x })));
  const times = list.filter((x) => x.status === 'done').length;
  return `<section class="block">
    <h2 class="block-title">мои приготовления</h2>
    <p class="muted small">${times ? `Готовила ${times} ${plural(times, 'раз', 'раза', 'раз')}` : ''}${photos.length ? ` · ${photos.length} фото` : ''}</p>
    ${photos.length ? `<div class="hist-photos">${photos.map(({ p, x }) => `<figure><img data-photo="${esc(p)}" data-act="zoom" alt=""><figcaption>${esc(fmtDay(isoOf(new Date(x.finished || x.started)), { day: 'numeric', month: 'short', year: '2-digit' }))}</figcaption></figure>`).join('')}</div>` : ''}
    <ul class="hist-list">${list.map((x) => `<li><a href="#/session/${x.id}"><b>${esc(fmtDay(isoOf(new Date(x.finished || x.started)), { day: 'numeric', month: 'long', year: 'numeric' }))}</b>
      <span>${x.target ? `${fmtAmount(x.target)} ${esc(r.yieldUnit || 'порц.')}${x.portion ? ` по ${fmtAmount(x.portion)} ${esc(r.portionUnit || 'мл')}` : ''}` : ''}${(x.photos || []).length ? ` · ${(x.photos || []).length} фото` : ''}${x.status === 'active' ? ' · в работе' : ''}</span>
      ${x.note ? `<i>${esc(x.note)}</i>` : ''}</a></li>`).join('')}</ul>
  </section>`;
}

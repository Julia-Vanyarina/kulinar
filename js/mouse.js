'use strict';
/* ===================== Мышка-помощница ===================== */
const KITCHEN_TIPS = [
  'Сливки взбиваются быстрее и стабильнее, если они, венчик и чаша хорошо охлаждены.',
  'Масло для крамбла бери прямо из холодильника — тогда крошка будет рассыпчатой, а не жирной.',
  'Яйца комнатной температуры взбиваются пышнее. Достань их из холодильника заранее.',
  'Разогревай духовку минут 15–20 до выпечки: так температура будет ровной с первой минуты.',
  'Взвешивай продукты на весах, а не стаканами — так рецепт получается одинаковым каждый раз.',
  'Прочитай рецепт до конца, прежде чем начать. Иногда самое важное — в последнем шаге.',
  'Шоколад растапливай на водяной бане так, чтобы вода не касалась дна миски.',
  'Щепотка соли в десерте не делает его солёным — она подчёркивает сладость и вкус карамели.',
  'Нарезанные бананы и яблоки темнеют на воздухе. Сбрызни их лимонным соком.',
  'Маскарпоне не стоит перевзбивать: крем может стать зернистым и отделить жидкость.',
  'Пергамент проще уложить в форму, если сначала скомкать его и расправить.',
  'Желатин набухает в холодной воде, а растворять его нужно в тёплом, но не кипящем.',
  'Если сахарный сироп начал кристаллизоваться, смахни кристаллы со стенок кисточкой, смоченной в воде.',
  'Тесто для песочного печенья любит отдых в холодильнике: минимум 30 минут, а лучше час.',
  'Чтобы торт ровно резался, нагрей нож в горячей воде и вытри насухо перед каждым разрезом.',
  'Ванильную пасту можно заменить семенами стручка — по вкусу это даже ярче.',
  'Специи раскрываются сильнее, если их на минуту прогреть на сухой сковороде.',
  'Мясо после жарки лучше дать отдохнуть 5–10 минут, тогда соки останутся внутри.',
  'Пасту варят в хорошо подсоленной воде — это единственный шанс посолить её изнутри.',
  'Зелень дольше хранится, если поставить её в стакан с водой, как букет.',
  'Чтобы лук не щипал глаза, охлади его перед нарезкой и бери очень острый нож.',
  'Остатки рецепта удобно записывать в заметки к нему: что поменять в следующий раз.',
  'Фото готового блюда помогает потом вспомнить, как должен выглядеть результат.',
  'Ягоды для начинки можно присыпать крахмалом — тогда сок не размочит тесто.'
];

const SWEET_RE = /(торт|чизкейк|трайфл|пирож|печень|десерт|крем|тирамису|кекс|маффин|шоколад|карамел|пудинг|мусс|эклер|сырник|блин|панкейк|вафл|безе|макарон|варень|джем)/i;
const SWEET_CATS = ['Десерты', 'Выпечка'];

const MouseHelper = {
  dismissed: new Set(),
  tipIndex: Math.floor(Math.random() * KITCHEN_TIPS.length),

  async prefs() {
    return { on: await DB.getMeta('mouseOn', true), name: await DB.getMeta('mouseName', 'Крошка') };
  },

  nextTip() {
    this.tipIndex = (this.tipIndex + 1) % KITCHEN_TIPS.length;
    return KITCHEN_TIPS[this.tipIndex];
  },

  tipMsg(prefix = 'Совет от меня:') {
    return { mood: 'idle', text: `${prefix} ${this.nextTip()}`, actions: [{ label: 'Ещё совет', next: true }] };
  },

  pickRecipe(recipes, kind) {
    let pool = recipes;
    if (kind === 'sweet') pool = recipes.filter((r) => SWEET_CATS.includes(r.category) || SWEET_RE.test(r.title));
    if (kind === 'savory') pool = recipes.filter((r) => !(SWEET_CATS.includes(r.category) || SWEET_RE.test(r.title)));
    if (kind === 'fav') pool = recipes.filter((r) => r.fav);
    if (!pool.length) pool = recipes;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  suggestMsg(recipes, kind) {
    const r = this.pickRecipe(recipes, kind);
    if (!r) return { mood: 'think', text: 'Хм, в тетради пока нет рецептов. Запишем первый?', actions: [{ label: 'Добавить рецепт', href: '#/recipe/new' }] };
    return {
      mood: 'happy',
      text: `Как насчёт «${r.title}»?${r.time ? ` Это займёт ${r.time}.` : ''}`,
      actions: [{ label: 'Открыть', href: `#/recipe/${r.id}` }, { label: 'Другое', run: () => this.suggestMsg(recipes, kind) }]
    };
  },

  async backupDays() {
    const last = await DB.getMeta('lastBackup', 0);
    let total = 0;
    for (const s of ['recipes', 'finds', 'notes', 'places', 'holidays']) total += (await DB.all(s)).length;
    if (total < 3) return null;
    const days = last ? Math.floor((Date.now() - last) / 864e5) : -1;
    return days === -1 || days >= 14 ? days : null;
  },

  // Выбор сообщения для экрана
  async message(screen, ctx, name) {
    const recipes = ctx.recipes || await DB.all('recipes');
    const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

    if (screen === 'session' && ctx.session) {
      const x = ctx.session;
      if (x.status !== 'active') return { mood: 'happy', text: 'Красиво получилось! Каждая готовка — новая страничка в истории рецепта.', actions: [] };
      if (!(x.have || []).length && !(x.doneSteps || []).length) return { mood: 'think', text: 'Сначала проверим запасы: отметь продукты, которые уже есть, — остальное я соберу в список покупок.', actions: [] };
      const r = await DB.get('recipes', x.recipeId);
      const pr = r ? stepProgress(r, x) : { total: 0 };
      if (pr.total && pr.done === pr.total) return { mood: 'happy', text: 'Все шаги готовы! Сфотографируй результат во вкладке «Фото» и заверши готовку.', actions: [] };
      if (pr.done && pr.next) return { mood: 'idle', text: `Уже ${pr.done} из ${pr.total} шагов — здорово! Дальше: «${pr.next.text}»`, actions: [] };
      return { mood: 'idle', text: 'Во вкладке «Шаги» отмечай, что уже сделано, — так всегда видно, что осталось. А в конце сфотографируй результат.', actions: [] };
    }

    if (screen === 'recipes') {
      const act = await activeSessions();
      if (act.length) {
        const ready = act.flatMap((x) => (x.timers || []).filter((t) => t.done || t.end <= Date.now()));
        return ready.length
          ? { mood: 'happy', text: `Таймер «${ready[0].label}» готов! Можно продолжать.`, actions: [{ label: 'Открыть', href: `#/session/${act.find((x) => (x.timers || []).includes(ready[0])).id}` }] }
          : { mood: 'idle', text: `Ты сейчас готовишь «${act[0].title}». Вернёмся к нему?`, actions: [{ label: 'Продолжить', href: `#/session/${act[0].id}` }] };
      }
      if (state.updateReady) {
        return { mood: 'happy', text: `Вышла новая версия ${state.remote.version}! Обновим? Рецепты и фото останутся на месте.`, actions: [{ label: 'Обновить', run: () => { Updater.apply(); return null; } }] };
      }
      const bd = await this.backupDays();
      if (bd !== null) {
        return {
          mood: 'think',
          text: bd === -1 ? 'Мы ещё ни разу не сохраняли резервную копию. Сохраним, чтобы рецепты точно не потерялись?' : `Последняя копия была ${bd} ${plural(bd, 'день', 'дня', 'дней')} назад. Сохраним свежую?`,
          actions: [{ label: 'Сохранить копию', run: () => { backupSheet(); return null; } }, { label: 'Позже', close: true }]
        };
      }
      if (!recipes.length) {
        return { mood: 'wave', text: `Привет! Я ${name}, буду помогать на кухне. Запишем первый рецепт? Можно просто вставить готовый текст.`, actions: [{ label: 'Добавить рецепт', href: '#/recipe/new' }] };
      }
      return rnd([
        { mood: 'think', text: 'Что сегодня хочется: сладенького или чего-нибудь посытнее?', actions: [{ label: 'Сладкого', run: () => this.suggestMsg(recipes, 'sweet') }, { label: 'Посытнее', run: () => this.suggestMsg(recipes, 'savory') }] },
        { mood: 'think', text: 'Не знаешь, что приготовить? Могу выбрать что-нибудь из избранного.', actions: [{ label: 'Выбери мне', run: () => this.suggestMsg(recipes, 'fav') }] },
        { mood: 'think', text: 'Скажи, что есть в холодильнике, — подберу, что из этого приготовить.', actions: [{ label: 'Подобрать', run: () => { openPantrySheet(); return null; } }] },
        this.tipMsg()
      ]);
    }

    if (screen === 'recipe' && ctx.recipe) {
      const r = ctx.recipe;
      return rnd([
        { mood: 'happy', text: 'Нажми «Начать готовить»: отметишь, что есть дома, увидишь, что купить, поставишь таймеры, а в конце сфотографируешь результат.', actions: [{ label: 'Начать', run: () => { startSessionSheet(r); return null; } }] },
        { mood: 'think', text: 'Когда приготовишь, расскажи, как получилось. Запишу в заметки к рецепту, что поменять в следующий раз.', actions: [{ label: 'Записать', run: () => { quickRecipeNote(r); return null; } }] },
        r.yieldCount
          ? { mood: 'idle', text: `Нужно на другое количество? Поменяй число в строке «На … ${r.yieldUnit || 'порц.'}», и я пересчитаю все граммы.`, actions: [] }
          : { mood: 'idle', text: 'Если указать выход рецепта (сколько штук или порций), я смогу пересчитывать граммы на любое количество.', actions: [{ label: 'Указать', href: `#/recipe/${r.id}/edit` }] },
        { mood: 'happy', text: 'Хочешь приготовить это на неделе? Добавлю в меню.', actions: [{ label: 'В меню', run: () => { addToMenuSheet(r); return null; } }] }
      ]);
    }

    if (screen === 'recipe-edit') {
      return { mood: 'idle', text: 'Вставь список ингредиентов целиком — я сама разберу граммовку и этапы. Проверь в «Как это прочиталось».', actions: [] };
    }

    if (screen === 'menu') {
      const tomorrow = addDays(todayISO(), 1);
      const tday = await DB.get('menu', tomorrow);
      const holidays = (await DB.all('holidays')).filter((h) => h.date && daysUntil(h.date) >= 0 && daysUntil(h.date) <= 10).sort((a, b) => a.date.localeCompare(b.date));
      if (holidays.length) {
        const h = holidays[0];
        const d = daysUntil(h.date);
        return { mood: 'happy', text: d === 0 ? `Сегодня «${h.title}»! Всё готово?` : `До праздника «${h.title}» ${d === 1 ? 'остался 1 день' : `осталось ${d} ${plural(d, 'день', 'дня', 'дней')}`}. Посмотрим меню и список покупок?`, actions: [{ label: 'Открыть', href: `#/holiday/${h.id}` }] };
      }
      if (!tday || !tday.items.length) {
        return { mood: 'think', text: 'На завтра в меню пока ничего нет. Что приготовим?', actions: [{ label: 'Выбрать блюдо', run: () => { pickDishSheet(tomorrow, recipes); return null; } }] };
      }
      return { mood: 'idle', text: 'Когда меню на неделю готово, нажми «Покупки» — сложу все продукты в один список.', actions: [] };
    }

    if (screen === 'holidays') {
      const n = (await DB.all('holidays')).length;
      if (!n) return { mood: 'wave', text: 'Скоро праздник? Давай соберём меню и нарисуем красивую картинку для гостей.', actions: [{ label: 'Новый праздник', href: '#/holiday/new' }] };
      return { mood: 'idle', text: 'Число гостей в празднике помогает: я пересчитаю продукты из рецептов на всех.', actions: [] };
    }

    if (screen === 'holiday' && ctx.holiday) {
      if (!(ctx.holiday.items || []).length) return { mood: 'think', text: 'С чего начнём — с закусок или сразу с десерта?', actions: [{ label: 'Добавить блюдо', run: () => { ctx.addItem && ctx.addItem(); return null; } }] };
      return { mood: 'happy', text: 'Выбери фон внизу — или поставь своё фото из галереи. Шрифт тоже можно поменять, а я нарисую картинку для друзей.', actions: [] };
    }

    if (screen === 'finds') {
      return rnd([
        { mood: 'think', text: 'Нашла что-то вкусное в магазине? Сфотографируй упаковку — потом легко найти на полке.', actions: [{ label: 'Добавить находку', href: '#/find/new' }] },
        this.tipMsg()
      ]);
    }

    if (screen === 'places') {
      return { mood: 'think', text: 'Где тебе больше всего нравится заказывать? Добавь место — адрес и любимые блюда будут под рукой.', actions: [{ label: 'Добавить место', href: '#/place/new' }] };
    }

    if (screen === 'notes') {
      return rnd([
        { mood: 'think', text: 'Запиши хитрость, пока не забыла: какие сливки лучше взбиваются, сколько держать в духовке…', actions: [{ label: 'Новая заметка', href: '#/note/new' }] },
        this.tipMsg()
      ]);
    }

    return null;
  },

  async mount(page, screen, ctx = {}) {
    const slot = $('.mouse-slot', page);
    if (!slot) return;
    const { on, name } = await this.prefs();
    if (!on || this.dismissed.has(screen)) { slot.remove(); return; }
    const msg = await this.message(screen, ctx, name);
    if (!msg) { slot.remove(); return; }
    this.render(slot, msg, screen, name);
  },

  render(slot, msg, screen, name) {
    const actions = msg.actions || [];
    slot.innerHTML = `<div class="mouse">
      <button type="button" class="mouse-pic" aria-label="Ещё совет">${Mouse(msg.mood)}</button>
      <div class="bubble">
        <button type="button" class="bubble-x" aria-label="Скрыть">${Icons.x}</button>
        <p class="bubble-name">${esc(name)}</p>
        <p class="bubble-text">${esc(msg.text)}</p>
        ${actions.length ? `<div class="bubble-btns">${actions.map((a, i) => a.href
          ? `<a class="bbtn ${i ? 'ghost' : ''}" href="${a.href}">${esc(a.label)}</a>`
          : `<button type="button" class="bbtn ${i ? 'ghost' : ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
    const box = $('.mouse', slot);
    requestAnimationFrame(() => box.classList.add('in'));
    $('.mouse-pic', slot).onclick = () => this.render(slot, { mood: Math.random() < 0.5 ? 'idle' : 'happy', text: this.nextTip(), actions: [{ label: 'Ещё совет', next: true }] }, screen, name);
    $('.bubble-x', slot).onclick = () => {
      this.dismissed.add(screen);
      box.classList.add('out');
      setTimeout(() => slot.remove(), 250);
    };
    $$('[data-i]', slot).forEach((b) => {
      b.onclick = async () => {
        const a = actions[+b.dataset.i];
        if (a.close) { $('.bubble-x', slot).click(); return; }
        if (a.next) { this.render(slot, this.tipMsg('А ещё:'), screen, name); return; }
        const next = a.run ? await a.run() : null;
        if (next) this.render(slot, next, screen, name);
      };
    });
  }
};

// Быстрая заметка «как получилось» — дописывается к заметкам рецепта
function quickRecipeNote(r) {
  openSheet(`<h3 class="sheet-title">Как получилось?</h3>
    <p class="muted small">Допишу к заметкам рецепта «${esc(r.title)}» с сегодняшней датой.</p>
    <label class="field"><textarea id="qn" rows="4" placeholder="Крем вышел жидковат — в следующий раз охладить сливки"></textarea></label>
    <div class="row-btns"><button class="btn ghost" data-close>Отмена</button><button class="btn" data-save>Записать</button></div>`, (s) => {
    setTimeout(() => $('#qn', s).focus(), 250);
    $('[data-save]', s).onclick = async () => {
      const t = $('#qn', s).value.trim();
      if (!t) { toast('Напиши пару слов'); return; }
      const fresh = await DB.get('recipes', r.id);
      const line = `${fmtDay(todayISO(), { day: 'numeric', month: 'long' })}: ${t}`;
      fresh.notes = fresh.notes ? `${fresh.notes}\n${line}` : line;
      fresh.updated = Date.now();
      await DB.put('recipes', fresh);
      closeSheet();
      toast('Записала в заметки рецепта');
      rerender();
    };
  });
}

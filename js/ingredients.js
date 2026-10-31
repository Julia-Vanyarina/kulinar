'use strict';
// Разбор списка ингредиентов из текста.
// Формат: «Мука — 291 г». Строка без граммовки перед продуктами — название этапа (например, «Карамельный крамбл»).

// Разделитель: «—» или «:», либо «–»/«-» с пробелом перед ним (чтобы «33–35%» не ломало строку)
const ING_RE = /^(.+?)(?:\s*—\s*|\s+[–-]\s*|\s*:\s*)(\d+(?:[.,]\d+)?)\s*([a-zA-Zа-яА-ЯёЁ%]+\.?(?:\s?[a-zA-Zа-яА-ЯёЁ]+\.)?)?\s*(.*)$/;
const LOOSE_ITEM = /(по вкусу|щепот|для подачи|для смазывания|по желанию|опционально)/i;

function cleanLine(line) {
  return line.replace(/^\s*(?:[•·▪◦*+]|-(?=\s))\s*/, '').trim();
}

// Единицы, которые узнаём без тире: «Мука 200 г», «200 г муки»
const UNIT_SRC = '((?:кг|грамм[а-я]*|гр|г|мг|мл|л|шт|ст\\.?\\s?л|ч\\.?\\s?л|стакан[а-я]*|стак|щепотк[а-я]|щеп|упаковк[а-я]|уп|пачк[а-я]|зубч[а-я]*|зуб|g|kg|ml|pcs|tbsp|tsp)\\.?)(?![а-яёa-z])';
const TRAIL_RE = new RegExp('^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*' + UNIT_SRC + '\\s*(.*)$', 'i');
const LEAD_RE = new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*' + UNIT_SRC + '\\s+(.+)$', 'i');
const BARE_RE = /^(.+?)\s+(\d+(?:[.,]\d+)?)$/;

function parseLine(line) {
  const num = (x) => parseFloat(x.replace(',', '.'));
  let m = line.match(ING_RE);
  if (m) return { name: m[1].trim(), amount: num(m[2]), unit: (m[3] || '').trim(), note: (m[4] || '').trim() };
  m = line.match(TRAIL_RE);
  if (m) return { name: m[1].trim(), amount: num(m[2]), unit: m[3].trim(), note: (m[4] || '').trim() };
  m = line.match(LEAD_RE);
  if (m) {
    const name = toNominative(m[3].trim());
    return { name: name.charAt(0).toUpperCase() + name.slice(1), amount: num(m[1]), unit: m[2].trim(), note: '' };
  }
  m = line.match(BARE_RE);
  if (m && !/[%]$/.test(m[1])) return { name: m[1].trim(), amount: num(m[2]), unit: '', note: '' };
  return null;
}

// «200 г муки» → «мука»: частые продукты в родительном падеже
const GENITIVE = {
  муки: 'мука', сахара: 'сахар', соли: 'соль', воды: 'вода', молока: 'молоко', масла: 'масло', сливок: 'сливки', творога: 'творог',
  сыра: 'сыр', риса: 'рис', крахмала: 'крахмал', шоколада: 'шоколад', мёда: 'мёд', меда: 'мёд', орехов: 'орехи', изюма: 'изюм',
  желатина: 'желатин', ванилина: 'ванилин', кефира: 'кефир', сметаны: 'сметана', теста: 'тесто', фарша: 'фарш', пудры: 'пудра',
  яиц: 'яйца', желтков: 'желтки', белков: 'белки', бананов: 'бананы', ягод: 'ягоды', клубники: 'клубника', малины: 'малина',
  лимона: 'лимон', сока: 'сок', йогурта: 'йогурт', хлопьев: 'хлопья', соды: 'сода', разрыхлителя: 'разрыхлитель', корицы: 'корица',
  перца: 'перец', лука: 'лук', чеснока: 'чеснок', моркови: 'морковь', картофеля: 'картофель', мяса: 'мясо', курицы: 'курица',
  сливочного: 'сливочное', растительного: 'растительное', оливкового: 'оливковое', подсолнечного: 'подсолнечное',
  сахарной: 'сахарная', тростникового: 'тростниковый', коричневого: 'коричневый', тёртого: 'тёртый', тертого: 'тёртый',
  молотой: 'молотая', молотого: 'молотый', миндальной: 'миндальная', пшеничной: 'пшеничная', рисовой: 'рисовая', кукурузного: 'кукурузный',
  глюкозного: 'глюкозный', сиропа: 'сироп', какао: 'какао', маскарпоне: 'маскарпоне', печенья: 'печенье', кофе: 'кофе'
};
function toNominative(name) {
  return name.split(/\s+/).map((w) => GENITIVE[w.toLowerCase()] || w).join(' ');
}

// Приведение единиц к одной: «гр», «грамм» → «г», «кг» → г × 1000, «л» → мл × 1000
const UNIT_NORM = [
  [/^(г|гр|грамм[а-я]*|g)\.?$/i, 'г', 1],
  [/^(кг|kg|килограмм[а-я]*)\.?$/i, 'г', 1000],
  [/^мг\.?$/i, 'г', 0.001],
  [/^(мл|ml|миллилитр[а-я]*)\.?$/i, 'мл', 1],
  [/^(л|l|литр[а-я]*)\.?$/i, 'мл', 1000],
  [/^(шт|штук[а-я]*|pcs)\.?$/i, 'шт', 1],
  [/^(ст\.?\s?л\.?|столов[а-я]*\s*лож[а-я]*|tbsp)$/i, 'ст.л.', 1],
  [/^(ч\.?\s?л\.?|чайн[а-я]*\s*лож[а-я]*|tsp)$/i, 'ч.л.', 1],
  [/^стак/i, 'стакан', 1]
];
function normUnit(unit) {
  const u = (unit || '').trim();
  for (const [re, base, k] of UNIT_NORM) if (re.test(u)) return { unit: base, k };
  return { unit: u.toLowerCase(), k: 1 };
}
// Красиво показать количество: 1500 г → 1,5 кг
function fmtQty(amount, unit) {
  if (amount == null || isNaN(amount)) return '';
  if (unit === 'г' && amount >= 1000) return `${fmtAmount(amount / 1000)} кг`;
  if (unit === 'мл' && amount >= 1000) return `${fmtAmount(amount / 1000)} л`;
  return `${fmtAmount(amount)}${unit ? ' ' + unit : ''}`;
}

// Обратно в текст (для хранения): этап — строкой с двоеточием, продукт — «Название — 200 г»
function serializeIngredients(rows) {
  const out = [];
  for (const r of rows) {
    const name = (r.name || '').trim();
    if (r.type === 'group') { if (name) { if (out.length) out.push(''); out.push(name.replace(/:$/, '') + ':'); } continue; }
    const amt = String(r.amount ?? '').trim().replace('.', ',');
    const unit = (r.unit || '').trim();
    if (!name && !amt) continue;
    if (amt) out.push(`${name} — ${amt}${unit ? ' ' + unit : ''}${r.note ? ' ' + r.note : ''}`);
    else out.push(`${name}${unit ? ' ' + unit : ''}`);
  }
  return out.join('\n');
}

function parseIngredients(text) {
  const lines = String(text || '').split('\n').map(cleanLine).filter(Boolean);
  const parsed = lines.map((l) => ({ raw: l, item: parseLine(l) }));
  const groups = [];
  let cur = { title: '', items: [] };
  parsed.forEach((p, i) => {
    if (p.item) { cur.items.push(p.item); return; }
    const next = parsed[i + 1];
    // «Специи — капля» — это продукт без количества, а не название этапа
    const isHeader = /:$/.test(p.raw) || (!LOOSE_ITEM.test(p.raw) && !/\s[—–-]\s/.test(p.raw) && next && next.item && p.raw.length <= 60);
    if (isHeader) {
      if (cur.title || cur.items.length) groups.push(cur);
      cur = { title: p.raw.replace(/:$/, ''), items: [] };
    } else {
      cur.items.push({ name: p.raw, amount: null, unit: '', note: '' });
    }
  });
  if (cur.title || cur.items.length) groups.push(cur);
  return groups;
}

function fmtAmount(v) {
  if (v == null || isNaN(v)) return '';
  let r;
  if (v >= 20) r = Math.round(v * 2) / 2;
  else if (v >= 1) r = Math.round(v * 10) / 10;
  else r = Math.round(v * 100) / 100;
  return String(r).replace('.', ',');
}

function scaleGroups(groups, k) {
  return groups.map((g) => ({
    title: g.title,
    items: g.items.map((it) => ({ ...it, amount: it.amount == null ? null : it.amount * k }))
  }));
}

// Ключ для сложения одинаковых продуктов: без скобок и регистра
function ingKey(name, unit) {
  const n = name.toLowerCase().replace(/\([^)]*\)/g, '').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  return n + '|' + (unit || '').toLowerCase().replace(/\.$/, '');
}

// Складывает одинаковые продукты из нескольких списков: [{groups, k}]. Единицы приводятся к одной.
function sumIngredients(sources) {
  const map = new Map();
  for (const { groups, k = 1, from } of sources) {
    for (const g of groups) {
      for (const it of g.items) {
        const nu = it.amount == null ? { unit: '', k: 1 } : normUnit(it.unit);
        const key = ingKey(it.name, nu.unit);
        const name = it.name.replace(/\s*\([^)]*\)/g, '').trim() || it.name;
        if (!map.has(key)) map.set(key, { key, name, unit: nu.unit, amount: it.amount == null ? null : 0, from: new Set() });
        const e = map.get(key);
        if (it.amount != null) e.amount = (e.amount || 0) + it.amount * nu.k * k;
        if (from) e.from.add(from);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

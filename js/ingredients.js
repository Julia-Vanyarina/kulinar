'use strict';
// Разбор списка ингредиентов из текста.
// Формат: «Мука — 291 г». Строка без граммовки перед продуктами — название этапа (например, «Карамельный крамбл»).

// Разделитель: «—» или «:», либо «–»/«-» с пробелом перед ним (чтобы «33–35%» не ломало строку)
const ING_RE = /^(.+?)(?:\s*—\s*|\s+[–-]\s*|\s*:\s*)(\d+(?:[.,]\d+)?)\s*([a-zA-Zа-яА-ЯёЁ%]+\.?(?:\s?[a-zA-Zа-яА-ЯёЁ]+\.)?)?\s*(.*)$/;
const LOOSE_ITEM = /(по вкусу|щепот|для подачи|для смазывания|по желанию|опционально)/i;

function cleanLine(line) {
  return line.replace(/^\s*(?:[•·▪◦*+]|-(?=\s))\s*/, '').trim();
}

function parseLine(line) {
  const m = line.match(ING_RE);
  if (!m) return null;
  return {
    name: m[1].trim(),
    amount: parseFloat(m[2].replace(',', '.')),
    unit: (m[3] || '').trim(),
    note: (m[4] || '').trim()
  };
}

function parseIngredients(text) {
  const lines = String(text || '').split('\n').map(cleanLine).filter(Boolean);
  const parsed = lines.map((l) => ({ raw: l, item: parseLine(l) }));
  const groups = [];
  let cur = { title: '', items: [] };
  parsed.forEach((p, i) => {
    if (p.item) { cur.items.push(p.item); return; }
    const next = parsed[i + 1];
    const isHeader = /:$/.test(p.raw) || (!LOOSE_ITEM.test(p.raw) && next && next.item && p.raw.length <= 60);
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

// Складывает одинаковые продукты из нескольких списков: [{groups, k}]
function sumIngredients(sources) {
  const map = new Map();
  for (const { groups, k = 1, from } of sources) {
    for (const g of groups) {
      for (const it of g.items) {
        const key = ingKey(it.name, it.amount == null ? '' : it.unit);
        const name = it.name.replace(/\s*\([^)]*\)/g, '').trim() || it.name;
        if (!map.has(key)) map.set(key, { name, unit: it.unit, amount: it.amount == null ? null : 0, from: new Set() });
        const e = map.get(key);
        if (it.amount != null) e.amount = (e.amount || 0) + it.amount * k;
        if (from) e.from.add(from);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

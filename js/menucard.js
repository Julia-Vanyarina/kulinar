'use strict';
/* ===================== Картинка с праздничным меню (canvas) ===================== */
const CARD_THEMES = {
  aura: {
    name: 'Аура', css: 'radial-gradient(circle at 50% 55%, #DDA0B3 0%, #F1D6DB 45%, #F6EDE0 75%, #DDD0E8 100%)',
    title: '#5A3550', section: '#A35574', item: '#4A3346', desc: '#86697F', orn: 'sparkle', ornColor: '#C27A96', top: 250
  },
  lavender: {
    name: 'Лаванда', css: 'linear-gradient(160deg, #E6D9F0, #DDCDEA)',
    title: '#A9505A', section: '#A9505A', item: '#4A3346', desc: '#7A6488', orn: 'sparkle', ornColor: '#C46A69', top: 250
  },
  toscana: {
    name: 'Тоскана', css: 'linear-gradient(160deg, #F5ECDF, #EAD6BC)',
    title: '#A4553A', section: '#6B7347', item: '#4A3426', desc: '#8A6E58', orn: 'leaf', ornColor: '#7C8455', top: 300
  },
  limone: {
    name: 'Лимонная роща', css: 'linear-gradient(160deg, #F7F2DE, #ECE3BF)',
    title: '#5F6B3A', section: '#B07F28', item: '#3F3B26', desc: '#7E7656', orn: 'leaf', ornColor: '#8C9A5B', top: 270
  }
};
// старые названия рамок → новые
const THEME_ALIAS = { sunset: 'aura', lemon: 'limone', journal: 'aura', watercolor: 'aura', sage: 'toscana', powder: 'lavender', crayon: 'aura', classic: 'aura', olive: 'toscana', festive: 'lavender' };
// Шрифты для картинки меню
const MENU_FONTS = {
  classic: { name: 'Классика', family: '"Cormorant Garamond", serif', chip: 'font-style:italic;font-weight:600',
    title: 'italic 600 118px "Cormorant Garamond", serif', titleLh: 112, section: 'italic 700 56px "Cormorant Garamond", serif', sectionLh: 66,
    item: '600 44px "Cormorant Garamond", serif', itemLh: 54 },
  hand: { name: 'От руки', family: 'Caveat, cursive', chip: 'font-weight:700',
    title: '700 132px Caveat, cursive', titleLh: 118, section: '700 64px Caveat, cursive', sectionLh: 68,
    item: '600 44px "Cormorant Garamond", serif', itemLh: 54 },
  script: { name: 'Каллиграфия', family: '"Marck Script", cursive', chip: '',
    title: '400 116px "Marck Script", cursive', titleLh: 118, section: '400 60px "Marck Script", cursive', sectionLh: 68,
    item: '600 44px "Cormorant Garamond", serif', itemLh: 54 },
  elegant: { name: 'Элегантный', family: '"Playfair Display", serif', chip: 'font-style:italic;font-weight:600',
    title: 'italic 600 100px "Playfair Display", serif', titleLh: 108, section: 'italic 600 48px "Playfair Display", serif', sectionLh: 62,
    item: '500 38px "Playfair Display", serif', itemLh: 50 },
  vintage: { name: 'Винтаж', family: 'Lobster, cursive', chip: '',
    title: '400 108px Lobster, cursive', titleLh: 112, section: '400 52px Lobster, cursive', sectionLh: 64,
    item: '600 44px "Cormorant Garamond", serif', itemLh: 54 },
  soft: { name: 'Нежный', family: 'Comfortaa, sans-serif', chip: 'font-weight:700',
    title: '700 88px Comfortaa, sans-serif', titleLh: 100, section: '700 42px Comfortaa, sans-serif', sectionLh: 58,
    item: '500 34px Comfortaa, sans-serif', itemLh: 48 },
  chalk: { name: 'Мелом', family: '"Amatic SC", cursive', chip: 'font-weight:700',
    title: '700 132px "Amatic SC", cursive', titleLh: 120, section: '700 66px "Amatic SC", cursive', sectionLh: 70,
    item: '700 50px "Amatic SC", cursive', itemLh: 56 }
};
function menuFont(key) { return MENU_FONTS[key] || MENU_FONTS.classic; }

// Цвета текста поверх своего фото
const PHOTO_PANELS = {
  light: { name: 'Светлая', fill: [255, 251, 247], title: '#4A2F45', section: '#A35574', item: '#3B2A38', desc: '#6E5A6A', ornColor: '#C27A96' },
  dark: { name: 'Тёмная', fill: [40, 26, 36], title: '#FFF6EA', section: '#F4C6D4', item: '#FFFFFF', desc: '#EADBE3', ornColor: '#F4C6D4' },
  'none-dark': { name: 'Без неё, тёмный текст', title: '#3B2340', section: '#8E3F60', item: '#2E1F2B', desc: '#4E3D4A', ornColor: '#8E3F60', glow: 'rgba(255,255,255,.85)' },
  'none-light': { name: 'Без неё, светлый текст', title: '#FFFFFF', section: '#FFE3EC', item: '#FFFFFF', desc: '#F7ECEF', ornColor: '#FFE3EC', glow: 'rgba(0,0,0,.55)' }
};

function themeKey(key) { return CARD_THEMES[key] ? key : (THEME_ALIAS[key] || 'aura'); }
function cardTheme(key) { return CARD_THEMES[themeKey(key)]; }

const MenuCard = {
  W: 1080,
  _imgs: new Map(),

  async fonts(F) {
    if (!document.fonts || !document.fonts.load) return;
    const sample = 'Меню Праздник Menu 123';
    const extra = F ? [document.fonts.load(F.title, sample), document.fonts.load(F.section, sample), document.fonts.load(F.item, sample)] : [];
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('700 80px Caveat', sample),
          document.fonts.load('italic 600 80px "Cormorant Garamond"', sample),
          document.fonts.load('italic 700 60px "Cormorant Garamond"', sample),
          document.fonts.load('600 40px "Cormorant Garamond"', sample),
          document.fonts.load('400 26px Nunito', sample),
          document.fonts.load('700 22px Nunito', sample),
          ...extra
        ]),
        new Promise((r) => setTimeout(r, 2500))
      ]);
    } catch (e) { /* запасные шрифты */ }
  },

  doodle(spec) {
    if (this._imgs.has(spec)) return this._imgs.get(spec);
    const [name, color] = spec.split(':');
    let svg = name === 'flower' ? Doodles.flower(color) : Doodles[name]();
    const defs = document.getElementById('artDefs');
    svg = svg
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" ')
      .replace('aria-hidden="true">', `aria-hidden="true"><defs>${defs ? defs.innerHTML : ''}</defs>`);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    this._imgs.set(spec, p);
    return p;
  },

  rand(seed) {
    let a = 0;
    for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  },

  sections(h, rmap) {
    const order = [];
    const by = new Map();
    for (const it of h.items || []) {
      const sec = it.section || 'Меню';
      if (!by.has(sec)) { by.set(sec, []); order.push(sec); }
      const r = it.recipeId ? rmap.get(it.recipeId) : null;
      by.get(sec).push({ ...it, title: r ? r.title : it.text });
    }
    order.sort((a, b) => {
      const ia = HOLIDAY_SECTIONS.indexOf(a), ib = HOLIDAY_SECTIONS.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return order.map((s) => ({ title: s, items: by.get(s) }));
  },

  /* ---------- маленькие украшения ---------- */
  sparkle(ctx, x, y, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
    ctx.restore();
  },

  star8(ctx, x, y, r, color, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
      const rr = i % 2 ? r * 0.44 : r;
      if (i) ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)); else ctx.moveTo(rr * Math.cos(a), rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  leaf(ctx, x, y, len, ang, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
    ctx.fill();
    ctx.restore();
  },

  // оливковая или лимонная ветка
  branch(ctx, x, y, len, ang, o = {}) {
    const stem = o.stem || '#6B7347', leafC = o.leaf || '#7C8455';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = stem;
    ctx.lineWidth = Math.max(2, len / 90);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.08, len, 0);
    ctx.stroke();
    const n = o.leaves || 9;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const px = len * t, py = -len * 0.16 * t * (1 - t);
      const side = i % 2 ? -1 : 1;
      const l = len * (0.2 - 0.06 * t);
      this.leaf(ctx, px, py, l, side * 0.75 - 0.15, i % 3 === 0 ? (o.leaf2 || '#97A06B') : leafC);
      if (o.fruit && i % 3 === 1) {
        ctx.fillStyle = o.fruit;
        ctx.beginPath();
        ctx.ellipse(px + l * 0.25, py + side * l * 0.42, l * 0.16, l * 0.12, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.leaf(ctx, len, 0, len * 0.14, 0, leafC);
    ctx.restore();
  },

  blob(ctx, cx, cy, r, rnd, fill) {
    const n = 7, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const rr = r * (0.75 + rnd() * 0.45);
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    let m = mid(pts[n - 1], pts[0]);
    ctx.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      m = mid(p, q);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.fill();
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  grain(ctx, W, H, rnd, light = 0.18, dark = 0.05) {
    const n = Math.floor((W * H) / 50);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${light})` : `rgba(70,40,30,${dark})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
    }
  },

  /* ---------- фон и украшения для каждой рамки ---------- */
  async background(ctx, key, W, H, rnd) {
    if (key === 'aura') {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#DED0E8'); g.addColorStop(0.35, '#F4E6E8'); g.addColorStop(0.75, '#F6EDE0'); g.addColorStop(1, '#ECE4C8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const r = ctx.createRadialGradient(W / 2, H * 0.52, 20, W / 2, H * 0.52, Math.max(W, H) * 0.55);
      r.addColorStop(0, 'rgba(206,118,148,.7)'); r.addColorStop(0.45, 'rgba(232,180,195,.45)'); r.addColorStop(0.85, 'rgba(246,235,224,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
      this.grain(ctx, W, H, rnd, 0.2, 0.04);
      // светлая карточка для текста
      ctx.save();
      ctx.shadowColor = 'rgba(90,40,70,.14)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
      ctx.fillStyle = 'rgba(255,251,247,.6)';
      this.roundRect(ctx, 140, 140, W - 280, H - 280, 60); ctx.fill();
      ctx.restore();
      const sp = [[96, 210, 26], [W - 92, 300, 18], [70, H * 0.55, 20], [W - 80, H * 0.7, 28], [W / 2 + 380, 100, 14], [180, H - 90, 16], [W - 200, H - 80, 22]];
      sp.forEach(([x, y, r2]) => this.sparkle(ctx, x, y, r2, 'rgba(255,255,255,.95)'));
      this.sparkle(ctx, W - 160, 160, 16, '#D9A0B4');
    } else if (key === 'lavender') {
      ctx.fillStyle = '#E4D7EF'; ctx.fillRect(0, 0, W, H);
      this.blob(ctx, W - 80, 170, 250, rnd, 'rgba(234,190,207,.75)');
      this.blob(ctx, 50, H - 220, 270, rnd, 'rgba(234,190,207,.6)');
      this.blob(ctx, W - 30, H - 30, 170, rnd, 'rgba(196,176,226,.6)');
      this.grain(ctx, W, H, rnd, 0.22, 0.04);
      this.star8(ctx, 100, 120, 64, '#CF7B74', 0.2);
      this.star8(ctx, W - 110, 290, 26, '#CF7B74', 0.5);
      this.star8(ctx, W - 100, H - 120, 74, '#E3C677', -0.1);
      const sp = [[200, 200, 24, '#CF7B74'], [W - 150, 130, 26, '#fff'], [60, H * 0.45, 22, '#CF7B74'], [W - 70, H * 0.33, 18, '#fff'], [W - 90, H * 0.62, 16, '#fff'], [140, H - 260, 20, '#CF7B74'], [W / 2 - 380, H - 110, 14, '#fff']];
      sp.forEach(([x, y, r2, c]) => this.sparkle(ctx, x, y, r2, c));
    } else if (key === 'toscana') {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#F6EEE2'); g.addColorStop(1, '#EBD7BD');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const wash = ctx.createRadialGradient(W / 2, H + 100, 50, W / 2, H + 100, H * 0.7);
      wash.addColorStop(0, 'rgba(196,110,72,.28)'); wash.addColorStop(1, 'rgba(196,110,72,0)');
      ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
      this.grain(ctx, W, H, rnd, 0.16, 0.06);
      // арка
      const inset = 64, R = (W - inset * 2) / 2;
      ctx.strokeStyle = '#B4664A'; ctx.lineWidth = 3;
      for (const d of [0, 16]) {
        const r2 = R - d, x0 = inset + d, x1 = W - inset - d, yb = H - inset - d, yc = inset + R;
        ctx.beginPath();
        ctx.moveTo(x0, yb); ctx.lineTo(x0, yc); ctx.arc(W / 2, yc, r2, Math.PI, 0); ctx.lineTo(x1, yb); ctx.closePath();
        ctx.lineWidth = d ? 1.5 : 3; ctx.stroke();
      }
      // оливковые ветви
      const ol = { stem: '#6B6A45', leaf: '#7E8656', leaf2: '#9AA172', fruit: '#4E5532', leaves: 11 };
      this.branch(ctx, W / 2 - 20, inset + 34, 300, Math.PI + 0.25, ol);
      this.branch(ctx, W / 2 + 20, inset + 34, 300, -0.25, ol);
      this.branch(ctx, 40, H - 60, 330, -0.55, ol);
      this.branch(ctx, W - 40, H - 60, 330, Math.PI + 0.55, ol);
      const lemon = await this.doodle('lemon');
      if (lemon) { ctx.drawImage(lemon, W / 2 - 80, H - 200, 160, 160); }
    } else {
      // limone
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#F8F3E0'); g.addColorStop(1, '#ECE2BC');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      this.grain(ctx, W, H, rnd, 0.18, 0.05);
      ctx.strokeStyle = '#8C9A5B'; ctx.lineWidth = 2.5;
      this.roundRect(ctx, 52, 52, W - 104, H - 104, 40); ctx.stroke();
      ctx.lineWidth = 1.2;
      this.roundRect(ctx, 66, 66, W - 132, H - 132, 32); ctx.stroke();
      const lf = { stem: '#6E7A44', leaf: '#86955A', leaf2: '#A3AE73', leaves: 7 };
      this.branch(ctx, 20, 70, 340, 0.45, lf);
      this.branch(ctx, W - 20, H - 70, 340, Math.PI + 0.45, lf);
      this.branch(ctx, W - 30, 120, 220, Math.PI - 0.6, lf);
      this.branch(ctx, 30, H - 140, 220, -0.6, lf);
      const lemon = await this.doodle('lemon');
      if (lemon) {
        ctx.drawImage(lemon, 130, 130, 190, 190);
        ctx.drawImage(lemon, W - 320, H - 320, 190, 190);
      }
    }
  },

  // Раскладка текста: при draw=false только считает высоту
  layout(ctx, h, rmap, T, draw, startY, F) {
    const W = this.W, cx = W / 2, maxW = 720;
    let y = startY;
    const glow = (on) => {
      if (!T.glow) return;
      ctx.shadowColor = on ? T.glow : 'transparent';
      ctx.shadowBlur = on ? 18 : 0;
    };
    const text = (str, font, color, lh, opt = {}) => {
      ctx.font = font;
      for (const l of this.wrap(ctx, str, opt.maxW || maxW)) {
        y += lh * 0.8;
        if (draw) { glow(true); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(l, cx, y); glow(false); }
        y += lh * 0.2;
      }
    };
    const spaced = (str, font, color, lh) => {
      ctx.font = font;
      const chars = [...str];
      const gap = 7;
      const w = chars.reduce((s, c) => s + ctx.measureText(c).width + gap, -gap);
      y += lh * 0.8;
      if (draw) {
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        let x = cx - w / 2;
        glow(true);
        for (const c of chars) { ctx.fillText(c, x, y); x += ctx.measureText(c).width + gap; }
        glow(false);
      }
      y += lh * 0.2;
    };
    const orn = (x, yy, dir) => {
      if (T.orn === 'leaf') {
        this.leaf(ctx, x, yy, 30, dir > 0 ? -0.35 : Math.PI + 0.35, T.ornColor);
        this.leaf(ctx, x, yy, 22, dir > 0 ? 0.45 : Math.PI - 0.45, T.ornColor);
      } else this.sparkle(ctx, x, yy, 12, T.ornColor);
    };

    const date = h.date ? fmtDay(h.date, { day: 'numeric', month: 'long' }) : '';
    spaced(('меню' + (date ? ' · ' + date : '')).toUpperCase(), '700 22px Nunito, sans-serif', T.desc, 34);
    y += 4;
    text(h.title || 'Праздник', F.title, T.title, F.titleLh, { maxW: 820 });
    if (h.subtitle) { y += 2; text(h.subtitle, 'italic 500 40px "Cormorant Garamond", serif', T.desc, 50); }

    y += 26;
    if (draw) {
      if (T.orn === 'leaf') {
        this.branch(ctx, cx - 90, y, 180, 0, { stem: T.ornColor, leaf: T.ornColor, leaf2: T.ornColor, leaves: 7 });
      } else {
        ctx.strokeStyle = T.ornColor; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let x = -100; x <= 100; x += 4) {
          const yy = y + Math.sin(x / 11) * 5;
          if (x === -100) ctx.moveTo(cx + x, yy); else ctx.lineTo(cx + x, yy);
        }
        ctx.stroke();
      }
    }
    y += 22;

    const secs = this.sections(h, rmap);
    if (!secs.length) { y += 30; text('добавь блюда — и меню появится здесь', 'italic 500 38px "Cormorant Garamond", serif', T.desc, 48); }
    for (const s of secs) {
      y += 34;
      const secFont = F.section;
      ctx.font = secFont;
      const tw = ctx.measureText(s.title).width;
      const lineY = y + F.sectionLh * 0.58;
      text(s.title, secFont, T.section, F.sectionLh);
      if (draw) { orn(cx - tw / 2 - 26, lineY, -1); orn(cx + tw / 2 + 26, lineY, 1); }
      y += 2;
      for (const it of s.items) {
        y += 8;
        text(it.title || 'Блюдо', F.item, T.item, F.itemLh);
        if (it.desc) text(it.desc, '400 26px Nunito, sans-serif', T.desc, 34, { maxW: 660 });
      }
    }
    if (h.signature) { y += 46; text(h.signature, '700 52px Caveat, cursive', T.title, 58); }
    return y;
  },

  loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  async render(h, rmap) {
    const F = menuFont(h.font);
    await this.fonts(F);
    const isPhoto = h.theme === 'photo' && h.bgPhoto;
    const key = isPhoto ? 'photo' : themeKey(h.theme);
    const panelKey = PHOTO_PANELS[h.panel] ? h.panel : 'light';
    const T = isPhoto ? { ...PHOTO_PANELS[panelKey], orn: 'sparkle', top: 200 } : CARD_THEMES[key];
    const W = this.W;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const top = T.top || 250;
    const contentH = this.layout(ctx, h, rmap, T, false, 0, F);
    const minH = h.format === 'story' ? 1920 : 1350;
    const H = Math.max(minH, Math.ceil(contentH + top * 2));
    const startY = Math.max(top, (H - contentH) / 2);
    canvas.width = W;
    canvas.height = H;
    const rnd = this.rand(h.id || h.title);

    if (isPhoto) {
      const url = await Photos.url(h.bgPhoto);
      const img = url ? await this.loadImage(url) : null;
      ctx.fillStyle = '#E9DCE6'; ctx.fillRect(0, 0, W, H);
      if (img) {
        // заполняем картинку без искажений (как «обложка»)
        const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
      }
      const alpha = Math.min(0.95, Math.max(0.2, (h.panelAlpha ?? 72) / 100));
      if (T.fill) {
        const [r, g, b] = T.fill;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        this.roundRect(ctx, 110, startY - 80, W - 220, contentH + 160, 56);
        ctx.fill();
        ctx.restore();
      } else {
        // лёгкое затемнение или осветление всего фото для читаемости
        ctx.fillStyle = panelKey === 'none-light' ? `rgba(0,0,0,${alpha * 0.4})` : `rgba(255,255,255,${alpha * 0.35})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      await this.background(ctx, key, W, H, rnd);
    }
    this.layout(ctx, h, rmap, T, true, startY, F);
    return canvas;
  },

  toBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }
};

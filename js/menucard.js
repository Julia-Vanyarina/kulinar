'use strict';
/* ===================== Картинка с праздничным меню (canvas) ===================== */
const CARD_THEMES = {
  journal: {
    name: 'Блокнот', bg: '#FBF7EF', title: '#5B4636', titleFont: 'hand', section: '#B9776E', item: '#4A3B30', desc: '#8A7A6B',
    frame: 'notebook', frameColor: '#E9C3BE',
    corners: ['bowl', 'flour', 'eggs', 'rollingPin'], sides: ['lemon', 'strawberry']
  },
  watercolor: {
    name: 'Акварель', bg: '#FFFDF8', title: '#6F8DB0', titleFont: 'serif', section: '#C27C7A', item: '#4A3B30', desc: '#8A7A6B',
    frame: 'wash', frameColor: '#8A7A6B',
    corners: ['cake', 'cup', 'croissant', 'flower'], sides: []
  },
  sage: {
    name: 'Шалфей', bg: '#F4F3EC', title: '#6E7F62', titleFont: 'hand', section: '#A98760', item: '#3F3A30', desc: '#7F7A6A',
    frame: 'double', frameColor: '#9AAA8B',
    corners: ['tomatoes', 'wine', 'bread', 'cheese'], sides: []
  },
  powder: {
    name: 'Пудра', bg: '#FBF1EF', title: '#B9776E', titleFont: 'serif', section: '#8FA07F', item: '#4A3B30', desc: '#8F7C74',
    frame: 'dots', frameColor: '#E3B2AC',
    corners: ['flower', 'strawberry', 'daisy', 'flower:#BCC8AB'], sides: ['mitt', 'milk']
  }
};

const MenuCard = {
  W: 1080,
  _imgs: new Map(),

  async fonts() {
    if (!document.fonts || !document.fonts.load) return;
    const sample = 'Меню Праздник Menu 123';
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('700 80px Caveat', sample),
          document.fonts.load('700 80px "Amatic SC"', sample),
          document.fonts.load('italic 700 80px "Cormorant Garamond"', sample),
          document.fonts.load('600 40px "Cormorant Garamond"', sample),
          document.fonts.load('italic 600 40px "Cormorant Garamond"', sample),
          document.fonts.load('400 26px Nunito', sample),
          document.fonts.load('800 24px Nunito', sample)
        ]),
        new Promise((r) => setTimeout(r, 2500))
      ]);
    } catch (e) { /* без шрифтов — запасные */ }
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

  // Раскладка: при draw=false только считает высоту
  layout(ctx, h, rmap, T, draw) {
    const W = this.W, cx = W / 2, maxW = 720;
    let y = 200;
    const text = (str, font, color, lh, opt = {}) => {
      ctx.font = font;
      for (const l of this.wrap(ctx, str, opt.maxW || maxW)) {
        y += lh * 0.8;
        if (draw) { ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(l, cx, y); }
        y += lh * 0.2;
      }
    };
    const spaced = (str, font, color, lh) => {
      ctx.font = font;
      const chars = [...str];
      const gap = 6;
      const w = chars.reduce((s, c) => s + ctx.measureText(c).width + gap, -gap);
      y += lh * 0.8;
      if (draw) {
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        let x = cx - w / 2;
        for (const c of chars) { ctx.fillText(c, x, y); x += ctx.measureText(c).width + gap; }
      }
      y += lh * 0.2;
    };
    const handTitle = T.titleFont === 'hand';

    const date = h.date ? fmtDay(h.date, { day: 'numeric', month: 'long' }) : '';
    spaced(('меню' + (date ? ' · ' + date : '')).toUpperCase(), '800 24px Nunito, sans-serif', T.desc, 34);
    y += 8;
    if (handTitle) text(h.title || 'Праздник', '700 150px "Amatic SC", Caveat, cursive', T.title, 140);
    else text(h.title || 'Праздник', 'italic 700 112px "Cormorant Garamond", serif', T.title, 112);
    if (h.subtitle) { y += 4; text(h.subtitle, 'italic 600 40px "Cormorant Garamond", serif', T.desc, 50); }

    // волнистый разделитель
    y += 28;
    if (draw) {
      ctx.strokeStyle = T.section; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = -110; x <= 110; x += 4) {
        const yy = y + Math.sin(x / 11) * 6;
        if (x === -110) ctx.moveTo(cx + x, yy); else ctx.lineTo(cx + x, yy);
      }
      ctx.stroke();
    }
    y += 24;

    const secs = this.sections(h, rmap);
    if (!secs.length) { y += 30; text('добавь блюда — и меню появится здесь', 'italic 600 38px "Cormorant Garamond", serif', T.desc, 48); }
    for (const s of secs) {
      y += 34;
      ctx.font = '700 66px Caveat, cursive';
      const tw = ctx.measureText(s.title).width;
      const lineY = y + 40;
      text(s.title, '700 66px Caveat, cursive', T.section, 72);
      if (draw) {
        ctx.strokeStyle = T.section; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - tw / 2 - 90, lineY); ctx.lineTo(cx - tw / 2 - 24, lineY);
        ctx.moveTo(cx + tw / 2 + 24, lineY); ctx.lineTo(cx + tw / 2 + 90, lineY);
        ctx.stroke();
      }
      y += 4;
      for (const it of s.items) {
        y += 10;
        text(it.title || 'Блюдо', '600 46px "Cormorant Garamond", serif', T.item, 54);
        if (it.desc) text(it.desc, '400 27px Nunito, sans-serif', T.desc, 36, { maxW: 660 });
      }
    }
    if (h.signature) { y += 50; text(h.signature, '700 54px Caveat, cursive', T.title, 60); }
    y += 210;
    return y;
  },

  frame(ctx, T, W, H, rnd) {
    ctx.save();
    ctx.strokeStyle = T.frameColor;
    ctx.fillStyle = T.frameColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    if (T.frame === 'double') {
      ctx.lineWidth = 3; rr(40, 40, W - 80, H - 80, 30); ctx.stroke();
      ctx.lineWidth = 1.5; rr(54, 54, W - 108, H - 108, 22); ctx.stroke();
    } else if (T.frame === 'notebook') {
      // линованная бумага, поле и кусочки скотча
      ctx.strokeStyle = '#E8E0D3'; ctx.lineWidth = 2;
      for (let y = 150; y < H - 60; y += 48) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(W - 30, y); ctx.stroke(); }
      ctx.strokeStyle = T.frameColor; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(112, 0); ctx.lineTo(112, H); ctx.stroke();
      const tape = (x, y, w, rot, color) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = 0.75; ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(-w / 2, -18);
        for (let i = 0; i <= 6; i++) ctx.lineTo(-w / 2 + (w * i) / 6, -18 + (i % 2 ? 3 : -2));
        for (let i = 6; i >= 0; i--) ctx.lineTo(-w / 2 + (w * i) / 6, 18 + (i % 2 ? -2 : 3));
        ctx.closePath(); ctx.fill(); ctx.restore();
      };
      tape(W / 2, 40, 220, -0.03, '#EBC9C3');
      tape(W / 2 + 10, H - 40, 200, 0.04, '#CBD6BD');
    } else if (T.frame === 'wash') {
      const blob = (x, y, r, color) => {
        const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
        g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      };
      blob(120, 110, 260, 'rgba(175,195,217,.45)');
      blob(W - 120, 140, 240, 'rgba(235,186,180,.45)');
      blob(140, H - 120, 250, 'rgba(242,215,149,.40)');
      blob(W - 130, H - 130, 260, 'rgba(188,200,171,.45)');
      ctx.globalAlpha = 0.7; ctx.lineWidth = 2; rr(48, 48, W - 96, H - 96, 8); ctx.stroke();
    } else if (T.frame === 'dots') {
      const inset = 46, step = 28;
      const pts = [];
      for (let x = inset; x <= W - inset; x += step) { pts.push([x, inset]); pts.push([x, H - inset]); }
      for (let y = inset + step; y < H - inset; y += step) { pts.push([inset, y]); pts.push([W - inset, y]); }
      pts.forEach(([x, y], i) => {
        ctx.fillStyle = i % 4 < 2 ? T.frameColor : '#C9D3BB';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
  },

  async render(h, rmap) {
    await this.fonts();
    const T = CARD_THEMES[h.theme] || CARD_THEMES.journal;
    const W = this.W;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const H = Math.max(1350, Math.ceil(this.layout(ctx, h, rmap, T, false)));
    canvas.width = W;
    canvas.height = H;
    const rnd = this.rand(h.id || h.title);

    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
    // лёгкая «бумага»
    ctx.fillStyle = 'rgba(120, 95, 60, 0.035)';
    for (let i = 0; i < 1800; i++) ctx.fillRect(rnd() * W, rnd() * H, 2, 2);

    this.frame(ctx, T, W, H, rnd);

    const place = [];
    const cs = 220;
    const cpos = [[8, 4, -10], [W - cs - 8, 4, 10], [8, H - cs - 4, 8], [W - cs - 8, H - cs - 4, -8]];
    T.corners.forEach((d, i) => place.push([d, cpos[i][0], cpos[i][1], cs, cpos[i][2]]));
    const ss = 130;
    T.sides.forEach((d, i) => {
      const left = i % 2 === 0;
      const yy = H * (0.38 + 0.26 * Math.floor(i / 2)) - ss / 2;
      place.push([d, left ? 2 : W - ss - 2, yy, ss, left ? -12 : 12]);
    });
    const imgs = await Promise.all(place.map(([d]) => this.doodle(d)));
    imgs.forEach((img, i) => {
      if (!img) return;
      const [, x, y, s, rot] = place[i];
      ctx.save();
      ctx.translate(x + s / 2, y + s / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
      ctx.restore();
    });

    this.layout(ctx, h, rmap, T, true);
    return canvas;
  },

  toBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }
};

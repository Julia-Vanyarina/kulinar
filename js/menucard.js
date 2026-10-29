'use strict';
/* ===================== Картинка с праздничным меню (canvas) ===================== */
const CARD_THEMES = {
  aura: {
    name: 'Аура', bg: '#FFE3EC', css: 'radial-gradient(circle at 50% 55%, #F3477F 0%, #FFB3C8 45%, #FFF3D6 75%, #E7BEF8 100%)',
    title: '#3B2340', section: '#E2306F', item: '#3B2340', desc: '#7D5C77', paper: true
  },
  sunset: {
    name: 'Закат', bg: '#F7A6B4', css: 'linear-gradient(135deg, #E8335E, #F7A6B4 45%, #F6A04D)',
    title: '#3B2340', section: '#E8335E', item: '#3B2340', desc: '#86576A', paper: true
  },
  lavender: {
    name: 'Лаванда', bg: '#E7BEF8', css: '#E7BEF8',
    title: '#FB4645', section: '#FB4645', item: '#3B2340', desc: '#6E4C82', paper: false
  },
  lemon: {
    name: 'Лимонад', bg: '#F8EDAD', css: '#F8EDAD',
    title: '#ED7C30', section: '#ED7C30', item: '#5A3418', desc: '#8A6338', paper: false, corners: ['lemon', 'croissant', 'strawberry', 'cup']
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
          document.fonts.load('800 80px Unbounded', sample),
          document.fonts.load('500 24px Unbounded', sample),
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
    let y = 230;
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

    const date = h.date ? fmtDay(h.date, { day: 'numeric', month: 'long' }) : '';
    spaced(('меню' + (date ? ' · ' + date : '')).toUpperCase(), '500 22px Unbounded, Nunito, sans-serif', T.desc, 34);
    y += 8;
    text(h.title || 'Праздник', '800 84px Unbounded, Nunito, sans-serif', T.title, 96, { maxW: 760 });
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
      const secFont = 'italic 700 58px "Cormorant Garamond", serif';
      ctx.font = secFont;
      const tw = ctx.measureText(s.title).width;
      const lineY = y + 40;
      text(s.title, secFont, T.section, 68);
      if (draw) {
        this.sparkle(ctx, cx - tw / 2 - 34, lineY, 14, T.section);
        this.sparkle(ctx, cx + tw / 2 + 34, lineY, 14, T.section);
      }
      y += 4;
      for (const it of s.items) {
        y += 10;
        text(it.title || 'Блюдо', '600 46px "Cormorant Garamond", serif', T.item, 54);
        if (it.desc) text(it.desc, '400 27px Nunito, sans-serif', T.desc, 36, { maxW: 660 });
      }
    }
    if (h.signature) { y += 50; text(h.signature, '700 54px Caveat, cursive', T.title, 60); }
    y += 230;
    return y;
  },

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

  background(ctx, T, W, H, rnd) {
    const key = Object.keys(CARD_THEMES).find((k) => CARD_THEMES[k] === T);
    if (key === 'aura') {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#DDB0E8'); g.addColorStop(0.35, '#FFE7EE'); g.addColorStop(0.75, '#FFF2D8'); g.addColorStop(1, '#F6EE9A');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const r = ctx.createRadialGradient(W / 2, H * 0.52, 20, W / 2, H * 0.52, Math.max(W, H) * 0.55);
      r.addColorStop(0, 'rgba(243,71,127,.95)'); r.addColorStop(0.45, 'rgba(255,150,180,.7)'); r.addColorStop(0.8, 'rgba(255,240,220,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    } else if (key === 'sunset') {
      ctx.fillStyle = '#F7A6B4'; ctx.fillRect(0, 0, W, H);
      const blobs = [[80, 220, 420, ['#E8335E', '#F57C6B']], [W - 40, 60, 320, ['#E23A4E', '#F7A6B4']], [W - 60, H - 160, 420, ['#F6A04D', '#EC5C6A']], [120, H - 80, 300, ['#F27FA0', '#F7A6B4']]];
      for (const [x, y, rr, [c1, c2]] of blobs) {
        const gg = ctx.createRadialGradient(x, y, 10, x, y, rr);
        gg.addColorStop(0, c1); gg.addColorStop(1, c2);
        this.blob(ctx, x, y, rr, rnd, gg);
      }
    } else {
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
      if (key === 'lavender') {
        this.blob(ctx, W - 90, 150, 230, rnd, 'rgba(249,168,212,.75)');
        this.blob(ctx, 60, H - 220, 260, rnd, 'rgba(249,168,212,.65)');
        this.blob(ctx, W - 40, H - 40, 160, rnd, 'rgba(180,148,248,.45)');
      } else {
        this.blob(ctx, 40, 120, 220, rnd, 'rgba(255,200,150,.6)');
        this.blob(ctx, W - 60, H - 200, 260, rnd, 'rgba(255,170,190,.45)');
      }
    }
  },

  decor(ctx, T, W, H, rnd) {
    const key = Object.keys(CARD_THEMES).find((k) => CARD_THEMES[k] === T);
    const spark = key === 'lemon' ? ['#ED7C30', '#F3619C'] : key === 'lavender' ? ['#FB4645', '#FFFFFF'] : ['#FFFFFF', '#FFF6E0'];
    const stars = key === 'lemon' ? ['#ED7C30', '#F3619C'] : key === 'lavender' ? ['#FB4645', '#F8D34A'] : ['#E8335E', '#FFFFFF'];
    // крупные звёзды по краям
    this.star8(ctx, 90, 110, 70, stars[0], 0.2);
    this.star8(ctx, W - 80, H - 120, 80, stars[1], -0.1);
    this.star8(ctx, W - 120, 260, 34, stars[0], 0.4);
    // россыпь искорок
    const spots = [[150, 300], [W - 70, 420], [60, H * 0.45], [W - 90, H * 0.62], [140, H - 260], [W / 2 + 330, 120], [W / 2 - 360, H - 120], [W - 200, H - 300], [210, 190]];
    spots.forEach(([x, y], i) => this.sparkle(ctx, x, y, 14 + (i % 3) * 9, spark[i % 2]));
  },

  grain(ctx, W, H, rnd) {
    const n = Math.floor((W * H) / 45);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(80,30,60,.06)';
      ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
    }
  },

  async render(h, rmap) {
    await this.fonts();
    const T = CARD_THEMES[h.theme] || CARD_THEMES.aura;
    const W = this.W;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const H = Math.max(1350, Math.ceil(this.layout(ctx, h, rmap, T, false)));
    canvas.width = W;
    canvas.height = H;
    const rnd = this.rand(h.id || h.title);

    this.background(ctx, T, W, H, rnd);
    this.grain(ctx, W, H, rnd);
    this.decor(ctx, T, W, H, rnd);

    if (T.paper) {
      // бумажная карточка для текста, как меню на фоне
      ctx.save();
      ctx.shadowColor = 'rgba(90,20,60,.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
      ctx.fillStyle = 'rgba(255,250,246,.76)';
      const x = 140, y = 140, w = W - 280, hh = H - 280, r = 56;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
      ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
      ctx.restore();
      this.star8(ctx, x + w - 10, y + 16, 26, '#F8D34A', 0.3);
    }

    if (T.corners) {
      const imgs = await Promise.all(T.corners.map((d) => this.doodle(d)));
      const cs = 170;
      const pos = [[20, H * 0.3, -10], [W - cs - 20, H * 0.42, 10], [20, H * 0.7, 8], [W - cs - 20, H * 0.82, -8]];
      imgs.forEach((img, i) => {
        if (!img) return;
        const [x, y, rot] = pos[i];
        ctx.save(); ctx.translate(x + cs / 2, y + cs / 2); ctx.rotate((rot * Math.PI) / 180); ctx.drawImage(img, -cs / 2, -cs / 2, cs, cs); ctx.restore();
      });
    }

    this.layout(ctx, h, rmap, T, true);
    return canvas;
  },

  toBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }
};

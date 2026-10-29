'use strict';
// Иллюстрации в стиле «акварель + тонкий контур». Фильтры #wc и #ink описаны в index.html.
const P = {
  ink: '#5B4636', paper: '#FFFDF8', cream: '#F4E8D3', sand: '#E6CFA6', wood: '#CFA172', woodD: '#A97C52',
  rose: '#EBBAB4', roseD: '#CF8E88', sage: '#BCC8AB', sageD: '#90A27F', blue: '#AFC3D9', blueD: '#7896B8',
  butter: '#F2D795', yolk: '#F0B54E', cocoa: '#8E6249', tomato: '#DD8577', gray: '#DDD5CC',
  mouse: '#DCD2C8', mouseD: '#C2B4A8', earIn: '#F0C4BE', cheek: '#EDA8A1', nose: '#D9877F'
};

const wash = (inner, extra = '') => `<g filter="url(#wc)" ${extra}>${inner}</g>`;
const ink = (inner, w = 1.7) => `<g filter="url(#ink)" fill="none" stroke="${P.ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
const art = (body, vb = '0 0 120 120', cls = '') => {
  // второй аргумент может быть слоем контура, а не viewBox
  if (vb.trim().startsWith('<')) { body += vb; vb = '0 0 120 120'; }
  return `<svg class="doodle ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
};
const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${Math.max(3, rx / 9)}" fill="${P.gray}" opacity=".55"/>`;
const heartPath = (x, y, s) => `M${x} ${y + s * 0.3} C${x} ${y - s * 0.2} ${x - s * 0.9} ${y - s * 0.2} ${x - s * 0.9} ${y + s * 0.3} C${x - s * 0.9} ${y + s * 0.8} ${x} ${y + s * 1.1} ${x} ${y + s * 1.4} C${x} ${y + s * 1.1} ${x + s * 0.9} ${y + s * 0.8} ${x + s * 0.9} ${y + s * 0.3} C${x + s * 0.9} ${y - s * 0.2} ${x} ${y - s * 0.2} ${x} ${y + s * 0.3}Z`;

const Doodles = {
  bowl: () => art(
    wash(`${shadow(62, 107, 42)}
      <path d="M13 56 C14 86 34 104 60 104 C86 104 106 86 107 56 Z" fill="${P.cream}"/>
      <path d="M22 70 C28 90 44 99 60 100 C48 95 34 86 28 66 Z" fill="${P.sand}" opacity=".6"/>
      <ellipse cx="60" cy="56" rx="47" ry="14" fill="${P.blue}"/>
      <ellipse cx="60" cy="56" rx="42" ry="10.5" fill="#F7EEDC"/>
      <path d="M28 57 C34 50 48 49 56 51 C66 48 82 50 90 56 C84 62 70 64 60 63 C46 65 34 63 28 57Z" fill="#F1E0BD"/>
      <ellipse cx="47" cy="58.5" rx="8.5" ry="5" fill="#FBF4E2"/>
      <circle cx="46" cy="58.5" r="4.4" fill="${P.yolk}"/>
      <circle cx="57" cy="61.5" r="4" fill="${P.yolk}"/>
      <rect x="69" y="51" width="8" height="7" rx="1.5" fill="${P.butter}" transform="rotate(-12 73 54)"/>
      <circle cx="35" cy="55" r="5" fill="${P.paper}"/>
      <path d="M82 40 L97 13 L102 16 L88 42 Z" fill="${P.wood}"/>
      <path d="M86 100 L102 89" stroke="${P.wood}" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="106" cy="86" rx="5" ry="7" fill="${P.wood}" transform="rotate(55 106 86)"/>`),
    ink(`<path d="M13 56 C14 86 34 104 60 104 C86 104 106 86 107 56"/>
      <ellipse cx="60" cy="56" rx="47" ry="14"/><ellipse cx="60" cy="56" rx="42" ry="10.5" stroke-width="1.1"/>
      <circle cx="46" cy="58.5" r="4.4" stroke-width="1.1"/><circle cx="57" cy="61.5" r="4" stroke-width="1.1"/>
      <path d="M82 40 L97 13 L102 16 L88 42 Z"/><path d="M82 40 L88 42" stroke-width="2.4"/>
      <path d="M85 41 C70 45 58 56 63 61 C68 65 82 53 85 41 M85 41 C76 48 70 60 75 62 C80 63 86 52 85 41 M85 41 C64 42 50 52 55 58 C61 63 78 52 85 41" stroke-width="1.2"/>
      <path d="M86 100 L101 90"/><ellipse cx="106" cy="86" rx="5" ry="7" transform="rotate(55 106 86)"/>
      <path d="M20 108 l1 0 M98 106 l1 0 M104 104 l1 0" stroke-width="2"/>`)),

  flour: () => art(
    wash(`${shadow(62, 107, 38)}
      <path d="M30 104 C24 80 26 56 34 40 C44 44 76 44 88 40 C96 58 98 82 92 104 C72 108 48 108 30 104Z" fill="${P.sand}"/>
      <path d="M38 52 C42 70 40 88 44 102 C38 100 34 86 34 70Z M78 54 C74 70 80 88 76 102 C84 98 86 80 84 64Z" fill="#D7B887" opacity=".7"/>
      <ellipse cx="61" cy="41" rx="27" ry="6" fill="${P.woodD}" opacity=".5"/>
      <path d="M38 42 C44 30 54 26 62 30 C70 25 80 31 85 41 C70 46 50 46 38 42Z" fill="${P.paper}"/>
      <path d="M74 27 L90 7 L94 10 L79 30Z" fill="${P.blueD}" opacity=".85"/>
      <ellipse cx="70" cy="31" rx="9" ry="6" fill="${P.blue}" transform="rotate(-25 70 31)"/>`),
    ink(`<path d="M30 104 C24 80 26 56 34 40 M88 40 C96 58 98 82 92 104 C72 108 48 108 30 104"/>
      <path d="M34 40 C44 46 76 46 88 40"/>
      <path d="M38 42 C44 30 54 26 62 30 C70 25 80 31 85 41" stroke-width="1.2"/>
      <path d="M46 58 C49 72 46 86 50 98 M74 58 C70 72 76 86 72 100" stroke-width="1.1"/>
      <path d="M74 27 L90 7 L94 10 L79 30"/><ellipse cx="70" cy="31" rx="9" ry="6" transform="rotate(-25 70 31)"/>
      <path d="M44 34 l0.5 0 M56 26 l0.5 0 M88 46 l0.5 0" stroke-width="2"/>`)),

  rollingPin: () => art(`<g transform="rotate(-14 60 60)">
    ${wash(`${shadow(60, 78, 44)}
      <rect x="8" y="55" width="22" height="9" rx="4.5" fill="${P.wood}"/><rect x="90" y="55" width="22" height="9" rx="4.5" fill="${P.wood}"/>
      <rect x="26" y="49" width="68" height="21" rx="10" fill="${P.wood}"/>
      <rect x="31" y="52" width="58" height="5" rx="2.5" fill="#E4C194"/>`)}
    ${ink(`<rect x="26" y="49" width="68" height="21" rx="10"/><path d="M26 59.5 L8 59.5 M94 59.5 L112 59.5"/>
      <rect x="8" y="55" width="22" height="9" rx="4.5"/><rect x="90" y="55" width="22" height="9" rx="4.5"/>
      <path d="M40 63 C50 61 60 65 74 62" stroke-width="1"/>`)}</g>`),

  mitt: () => art(`<defs><clipPath id="mittClip"><path d="M34 100 L34 56 C34 40 44 30 56 30 C70 30 78 40 78 54 L78 58 C82 50 92 50 94 58 C96 66 88 74 80 80 L80 100 Z"/></clipPath></defs>
    ${wash(`${shadow(58, 112, 30)}
      <path d="M34 100 L34 56 C34 40 44 30 56 30 C70 30 78 40 78 54 L78 58 C82 50 92 50 94 58 C96 66 88 74 80 80 L80 100 Z" fill="${P.rose}"/>
      <rect x="30" y="97" width="54" height="13" rx="4" fill="${P.paper}"/>`)}
    <g clip-path="url(#mittClip)" opacity=".55">${ink(`<path d="M20 50 L90 120 M20 66 L80 126 M20 34 L100 114 M30 24 L104 98 M46 20 L110 84 M100 30 L20 110 M110 44 L36 118 M90 24 L20 94 M74 20 L20 74"/>`, 1.1)}</g>
    ${ink(`<path d="M34 97 L34 56 C34 40 44 30 56 30 C70 30 78 40 78 54 L78 58 C82 50 92 50 94 58 C96 66 88 74 80 80 L80 97"/>
      <rect x="30" y="97" width="54" height="13" rx="4"/><path d="M38 97 C34 90 36 84 40 86" stroke-width="1.2"/>`)}`),

  eggs: () => art(
    wash(`${shadow(60, 100, 38)}
      <ellipse cx="46" cy="70" rx="18" ry="23" fill="#F7ECDA"/>
      <ellipse cx="76" cy="76" rx="16" ry="20" fill="#E8CFA9"/>
      <ellipse cx="40" cy="62" rx="5" ry="8" fill="${P.paper}" opacity=".8"/>`),
    ink(`<ellipse cx="46" cy="70" rx="18" ry="23"/><ellipse cx="76" cy="76" rx="16" ry="20"/>
      <path d="M72 66 l.5 0 M80 72 l.5 0 M74 84 l.5 0 M84 82 l.5 0" stroke-width="2"/>`)),

  milk: () => art(
    wash(`${shadow(60, 110, 30)}
      <path d="M48 22 L72 22 L72 32 C82 40 84 48 84 58 L84 102 C84 106 80 108 76 108 L44 108 C40 108 36 106 36 102 L36 58 C36 48 38 40 48 32 Z" fill="${P.paper}"/>
      <path d="M36 60 L84 60 L84 102 C84 106 80 108 76 108 L44 108 C40 108 36 106 36 102Z" fill="#F1F2F0"/>
      <rect x="46" y="12" width="28" height="11" rx="3" fill="${P.blue}"/>
      <rect x="40" y="66" width="40" height="24" rx="4" fill="${P.blue}" opacity=".6"/>`),
    ink(`<path d="M48 23 L72 23 L72 32 C82 40 84 48 84 58 L84 102 C84 106 80 108 76 108 L44 108 C40 108 36 106 36 102 L36 58 C36 48 38 40 48 32 Z"/>
      <rect x="46" y="12" width="28" height="11" rx="3"/><rect x="40" y="66" width="40" height="24" rx="4" stroke-width="1.1"/>
      <path d="${heartPath(60, 73, 6)}" stroke="${P.roseD}" stroke-width="1.4"/>
      <path d="M42 48 C42 44 44 40 48 38" stroke-width="1" opacity=".6"/>`)),

  spoon: () => art(
    wash(`${shadow(60, 106, 36)}
      <path d="M50 54 L96 104" stroke="${P.wood}" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="38" cy="38" rx="15" ry="21" fill="${P.wood}" transform="rotate(-42 38 38)"/>
      <ellipse cx="36" cy="36" rx="9" ry="14" fill="#DDB78A" transform="rotate(-42 36 36)"/>`),
    ink(`<ellipse cx="38" cy="38" rx="15" ry="21" transform="rotate(-42 38 38)"/>
      <path d="M50 51 L98 102 M47 56 L94 106" stroke-width="1.3"/>`)),

  whisk: () => art(
    wash(`${shadow(60, 110, 26)}
      <rect x="54" y="70" width="12" height="36" rx="6" fill="${P.wood}"/>
      <path d="M60 70 C30 50 40 12 60 12 C80 12 90 50 60 70Z" fill="${P.blue}" opacity=".25"/>`),
    ink(`<rect x="54" y="70" width="12" height="36" rx="6"/><path d="M55 72 L65 72" stroke-width="2.6"/>
      <path d="M60 70 C30 50 40 12 60 12 C80 12 90 50 60 70Z M60 70 C46 50 50 16 60 12 C70 16 74 50 60 70Z M60 12 L60 70" stroke-width="1.2"/>`)),

  croissant: () => art(
    wash(`${shadow(60, 98, 46)}
      <ellipse cx="17" cy="80" rx="9" ry="13" fill="#DDA865" transform="rotate(-62 17 80)"/>
      <ellipse cx="103" cy="80" rx="9" ry="13" fill="#DDA865" transform="rotate(62 103 80)"/>
      <ellipse cx="32" cy="67" rx="13" ry="18" fill="#E7BC7A" transform="rotate(-40 32 67)"/>
      <ellipse cx="88" cy="67" rx="13" ry="18" fill="#E7BC7A" transform="rotate(40 88 67)"/>
      <ellipse cx="60" cy="60" rx="19" ry="25" fill="#EDC888"/>
      <ellipse cx="56" cy="50" rx="7" ry="10" fill="#F6DFAE" opacity=".8"/>`),
    ink(`<ellipse cx="17" cy="80" rx="9" ry="13" transform="rotate(-62 17 80)"/>
      <ellipse cx="103" cy="80" rx="9" ry="13" transform="rotate(62 103 80)"/>
      <ellipse cx="32" cy="67" rx="13" ry="18" transform="rotate(-40 32 67)"/>
      <ellipse cx="88" cy="67" rx="13" ry="18" transform="rotate(40 88 67)"/>
      <ellipse cx="60" cy="60" rx="19" ry="25"/>
      <path d="M48 52 C54 58 66 58 72 52 M47 66 C54 72 66 72 73 66" stroke-width="1.1"/>`)),

  lemon: () => art(
    wash(`${shadow(62, 100, 44)}
      <ellipse cx="42" cy="62" rx="26" ry="20" fill="#F1D16E" transform="rotate(-22 42 62)"/>
      <path d="M58 40 C66 30 78 30 84 36 C76 42 66 44 58 40Z" fill="${P.sage}"/>
      <circle cx="82" cy="76" r="21" fill="#F3DB86"/>
      <circle cx="82" cy="76" r="16.5" fill="#FBEFC2"/>`),
    ink(`<ellipse cx="42" cy="62" rx="26" ry="20" transform="rotate(-22 42 62)"/>
      <path d="M58 40 C66 30 78 30 84 36 C76 42 66 44 58 40Z M60 40 C68 38 74 36 82 36" stroke-width="1.2"/>
      <circle cx="82" cy="76" r="21"/><circle cx="82" cy="76" r="16.5" stroke-width="1"/>
      <path d="M82 76 L82 60 M82 76 L96 68 M82 76 L96 84 M82 76 L82 92 M82 76 L68 84 M82 76 L68 68" stroke-width="1"/>`)),

  wine: () => art(
    wash(`${shadow(60, 108, 22)}
      <path d="M38 16 L82 16 C84 46 76 64 60 64 C44 64 36 46 38 16Z" fill="${P.blue}" opacity=".22"/>
      <path d="M40 38 C48 41 72 41 80 38 C79 54 71 62 60 62 C49 62 41 54 40 38Z" fill="#C98289"/>`),
    ink(`<path d="M38 16 L82 16 C84 46 76 64 60 64 C44 64 36 46 38 16Z"/>
      <path d="M40 38 C48 41 72 41 80 38" stroke-width="1.1"/>
      <path d="M60 64 L60 98 M44 104 C52 99 68 99 76 104 C68 107 52 107 44 104Z"/>
      <path d="M46 22 C44 32 45 42 48 48" stroke-width="1" opacity=".6"/>`)),

  cup: () => art(
    wash(`<ellipse cx="60" cy="96" rx="42" ry="10" fill="${P.blue}" opacity=".75"/>
      <path d="M28 54 L92 54 C92 80 80 94 60 94 C40 94 28 80 28 54Z" fill="${P.paper}"/>
      <ellipse cx="60" cy="54" rx="32" ry="7.5" fill="${P.cocoa}"/>
      <ellipse cx="60" cy="54" rx="22" ry="4.5" fill="#C59C74"/>`),
    ink(`<path d="M28 54 C28 80 40 94 60 94 C80 94 92 80 92 54"/><ellipse cx="60" cy="54" rx="32" ry="7.5"/>
      <path d="M92 60 C106 60 106 80 88 80"/><ellipse cx="60" cy="96" rx="42" ry="10" stroke-width="1.2"/>
      <path d="M48 42 C42 34 54 30 48 20 M64 42 C58 34 70 30 64 20" stroke-width="1.2" opacity=".7"/>`)),

  cutlery: () => art(
    wash(`${shadow(60, 110, 34)}
      <path d="M38 50 L66 104" stroke="${P.wood}" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="32" cy="34" rx="12" ry="18" fill="${P.wood}" transform="rotate(-28 32 34)"/>
      <path d="M82 14 L82 44 C82 50 78 52 78 56 L74 104" stroke="${P.blue}" stroke-width="6" stroke-linecap="round" fill="none"/>`),
    ink(`<ellipse cx="32" cy="34" rx="12" ry="18" transform="rotate(-28 32 34)"/><path d="M38 51 L65 104" stroke-width="1.4"/>
      <path d="M74 12 L74 38 M82 12 L82 38 M90 12 L90 38 M74 38 C74 48 90 48 90 38 M82 46 L76 106"/>`)),

  tomatoes: () => art(
    wash(`${shadow(64, 100, 44)}
      <path d="M18 26 C40 32 70 32 102 22" stroke="${P.sageD}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="34" cy="62" r="17" fill="${P.tomato}"/><circle cx="66" cy="74" r="19" fill="#D97A6C"/><circle cx="94" cy="58" r="15" fill="${P.tomato}"/>
      <ellipse cx="28" cy="56" rx="5" ry="3" fill="${P.paper}" opacity=".55"/><ellipse cx="60" cy="67" rx="5" ry="3" fill="${P.paper}" opacity=".55"/>
      <path d="M26 46 L34 52 L42 46 L36 44 Z M58 56 L66 62 L74 56 L68 54 Z M86 44 L94 49 L102 44 L96 42 Z" fill="${P.sage}"/>`),
    ink(`<circle cx="34" cy="62" r="17"/><circle cx="66" cy="74" r="19"/><circle cx="94" cy="58" r="15"/>
      <path d="M18 26 C40 32 70 32 102 22 M38 30 L34 46 M64 31 L66 55 M90 27 L94 43" stroke-width="1.3"/>`)),

  flower: (color = P.rose) => art(
    wash(`${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="60" cy="36" rx="13" ry="21" fill="${color}" transform="rotate(${a} 60 60)"/>`).join('')}
      <circle cx="60" cy="60" r="10" fill="${P.butter}"/>`),
    ink(`${[0, 72, 144, 216, 288].map((a) => `<path d="M60 58 C50 48 48 22 60 15 C72 22 70 48 60 58" transform="rotate(${a} 60 60)"/>`).join('')}
      <circle cx="60" cy="60" r="10" stroke-width="1.2"/><path d="M57 58 l.5 0 M63 61 l.5 0 M59 64 l.5 0" stroke-width="2"/>`, 1.3)),

  daisy: () => art(
    wash(`${Array.from({ length: 12 }, (_, i) => `<ellipse cx="60" cy="34" rx="6" ry="18" fill="${P.paper}" transform="rotate(${i * 30} 60 60)"/>`).join('')}
      <circle cx="60" cy="60" r="11" fill="${P.yolk}"/>`),
    ink(`${Array.from({ length: 12 }, (_, i) => `<ellipse cx="60" cy="34" rx="6" ry="18" transform="rotate(${i * 30} 60 60)"/>`).join('')}
      <circle cx="60" cy="60" r="11"/>`, 1.1)),

  cake: () => art(
    wash(`<ellipse cx="62" cy="100" rx="52" ry="11" fill="${P.blue}" opacity=".6"/>
      <path d="M24 46 L44 32 L104 32 L84 46 Z" fill="#A87458"/>
      <path d="M84 46 L104 32 L104 82 L84 96 Z" fill="#F0E2CB"/>
      <rect x="24" y="46" width="60" height="50" fill="${P.paper}"/>
      <rect x="24" y="46" width="60" height="6" fill="#B27E5E"/>
      <rect x="24" y="60" width="60" height="9" fill="#C99366"/>
      <rect x="24" y="80" width="60" height="9" fill="#D9AC7A"/>
      <circle cx="60" cy="27" r="6" fill="${P.tomato}"/>`),
    ink(`<path d="M24 46 L44 32 L104 32 L84 46 Z M84 46 L104 32 L104 82 L84 96 L24 96 L24 46 L84 46 L84 96"/>
      <path d="M24 52 C34 54 44 50 54 52 C64 54 74 50 84 52 M24 60 C34 58 44 62 54 60 C64 58 74 62 84 60 M24 69 C34 71 44 67 54 69 C64 71 74 67 84 69 M24 80 C34 78 44 82 54 80 C64 78 74 82 84 80 M24 89 C34 91 44 87 54 89 C64 91 74 87 84 89" stroke-width="1"/>
      <circle cx="60" cy="27" r="6" stroke-width="1.2"/><path d="M60 21 C60 16 63 13 67 12" stroke-width="1.2"/>
      <path d="M50 38 l.5 0 M70 36 l.5 0 M86 38 l.5 0 M40 42 l.5 0" stroke="${P.paper}" stroke-width="2"/>`)),

  bread: () => art(
    wash(`${shadow(60, 100, 46)}
      <path d="M16 82 C14 58 36 44 60 44 C84 44 106 58 104 82 C104 90 98 94 90 94 L30 94 C22 94 16 90 16 82Z" fill="#D9A86C"/>
      <path d="M26 66 C34 54 50 50 60 50 C48 54 36 60 30 72Z" fill="#EBC893" opacity=".8"/>
      <path d="M36 70 C42 62 48 58 54 56 M56 70 C62 62 68 58 74 56 M76 72 C80 66 86 62 90 61" stroke="#F2D9AA" stroke-width="5" stroke-linecap="round" fill="none"/>`),
    ink(`<path d="M16 82 C14 58 36 44 60 44 C84 44 106 58 104 82 C104 90 98 94 90 94 L30 94 C22 94 16 90 16 82Z"/>
      <path d="M36 70 C42 62 48 58 54 56 M56 70 C62 62 68 58 74 56 M76 72 C80 66 86 62 90 61" stroke-width="1.2"/>`)),

  cheese: () => art(
    wash(`${shadow(60, 104, 46)}
      <path d="M14 76 L102 52 L102 86 L14 100 Z" fill="#EDC664"/>
      <path d="M14 76 L64 30 L102 52 Z" fill="#F4D987"/>
      <ellipse cx="38" cy="88" rx="5" ry="4" fill="#DDAF4F"/><ellipse cx="74" cy="78" rx="7" ry="5" fill="#DDAF4F"/><ellipse cx="62" cy="48" rx="5" ry="3" fill="#E5BF62"/>`),
    ink(`<path d="M14 76 L102 52 L102 86 L14 100 Z M14 76 L64 30 L102 52"/>
      <ellipse cx="38" cy="88" rx="5" ry="4" stroke-width="1"/><ellipse cx="74" cy="78" rx="7" ry="5" stroke-width="1"/>`)),

  strawberry: () => art(
    wash(`${shadow(60, 108, 26)}
      <path d="M60 104 C30 86 22 52 34 42 C44 34 76 34 86 42 C98 52 90 86 60 104Z" fill="#DE8379"/>
      <ellipse cx="46" cy="56" rx="6" ry="10" fill="${P.paper}" opacity=".35" transform="rotate(20 46 56)"/>
      <path d="M36 40 L46 26 L56 36 L64 22 L72 36 L84 28 L82 42 C70 46 50 46 36 40Z" fill="${P.sage}"/>`),
    ink(`<path d="M60 104 C30 86 22 52 34 42 M86 42 C98 52 90 86 60 104"/>
      <path d="M36 40 L46 26 L56 36 L64 22 L72 36 L84 28 L82 42 C70 46 50 46 36 40Z" stroke-width="1.2"/>
      <path d="M46 58 l1 2 M66 54 l1 2 M54 72 l1 2 M74 70 l1 2 M60 88 l1 2 M42 74 l1 2" stroke="${P.butter}" stroke-width="2.4"/>`)),

  basket: () => art(
    wash(`${shadow(60, 108, 44)}
      <path d="M70 52 L92 14 L100 18 L80 54Z" fill="#E1BB82"/>
      <path d="M40 54 C38 40 48 32 54 40 C58 32 66 36 64 52Z" fill="${P.sage}"/>
      <path d="M16 52 L104 52 L94 102 L26 102 Z" fill="${P.wood}"/>
      <path d="M20 64 L100 64 M24 80 L96 80" stroke="#E4C29A" stroke-width="5" fill="none"/>`),
    ink(`<path d="M16 52 L104 52 L94 102 L26 102 Z"/><path d="M36 52 C36 24 84 24 84 52" stroke-width="2"/>
      <path d="M20 64 L100 64 M24 80 L96 80 M42 52 L44 102 M60 52 L60 102 M78 52 L76 102" stroke-width="1"/>
      <path d="M70 52 L92 14 L100 18 L80 54 M86 26 L92 29 M82 34 L88 37" stroke-width="1.2"/>`)),

  pencil: () => art(
    wash(`${shadow(60, 108, 40)}
      <rect x="22" y="22" width="64" height="82" rx="5" fill="${P.paper}"/>
      <rect x="22" y="22" width="12" height="82" rx="4" fill="${P.rose}"/>
      <path d="M58 92 L96 30 L106 36 L68 98 Z" fill="${P.butter}"/>
      <path d="M58 92 L68 98 L56 106 Z" fill="${P.wood}"/>`),
    ink(`<rect x="22" y="22" width="64" height="82" rx="5"/><path d="M34 22 L34 104"/>
      <path d="M42 40 L78 40 M42 52 L78 52 M42 64 L70 64 M42 76 L64 76" stroke-width="1" opacity=".55"/>
      <path d="M58 92 L96 30 L106 36 L68 98 Z M58 92 L56 106 L68 98 M96 30 L100 24 L110 30 L106 36" stroke-width="1.4"/>`)),

  calendar: () => art(
    wash(`${shadow(60, 110, 44)}
      <rect x="16" y="28" width="88" height="78" rx="8" fill="${P.paper}"/>
      <rect x="16" y="28" width="88" height="20" rx="8" fill="${P.sage}"/>
      <circle cx="78" cy="84" r="9" fill="${P.rose}" opacity=".8"/>
      <path d="M86 98 L86 116 L92 110 L98 116 L98 98Z" fill="${P.roseD}" opacity=".8"/>`),
    ink(`<rect x="16" y="28" width="88" height="78" rx="8"/><path d="M16 48 L104 48"/>
      <path d="M38 20 L38 36 M60 20 L60 36 M82 20 L82 36" stroke-width="2.4"/>
      <path d="M32 62 l.5 0 M48 62 l.5 0 M64 62 l.5 0 M80 62 l.5 0 M32 76 l.5 0 M48 76 l.5 0 M64 76 l.5 0 M32 90 l.5 0 M48 90 l.5 0" stroke-width="3"/>
      <circle cx="78" cy="84" r="9" stroke="${P.roseD}" stroke-width="1.3"/>`)),

  cheers: () => `<svg class="doodle word" viewBox="0 0 200 50" aria-hidden="true"><text x="100" y="36" text-anchor="middle" fill="${P.roseD}" font-family="Caveat, cursive" font-size="36" font-weight="700">приятного аппетита</text></svg>`
};

/* ===================== Мышка-повар ===================== */
// mood: idle | wave | think | happy
function Mouse(mood = 'idle') {
  const W = (s) => wash(s);
  const K = (s, w) => ink(s, w);
  const eyes = mood === 'happy'
    ? K('<path d="M48.5 66 Q52 61.5 55.5 66 M64.5 66 Q68 61.5 71.5 66" stroke-width="1.8"/>')
    : (() => {
      const dx = mood === 'think' ? 1.4 : 0, dy = mood === 'think' ? -1.4 : 0;
      return `<ellipse cx="${52 + dx}" cy="${65 + dy}" rx="3.1" ry="3.7" fill="#3B2E27"/><ellipse cx="${68 + dx}" cy="${65 + dy}" rx="3.1" ry="3.7" fill="#3B2E27"/>
        <circle cx="${53.2 + dx}" cy="${63.5 + dy}" r="1.1" fill="#fff"/><circle cx="${69.2 + dx}" cy="${63.5 + dy}" r="1.1" fill="#fff"/>`;
    })();
  const spoon = W(`<path d="M80 100 L100 68" stroke="${P.wood}" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="102.5" cy="62" rx="5" ry="7.5" fill="${P.wood}" transform="rotate(32 102.5 62)"/>`)
    + K(`<path d="M80.5 100 L100 68" stroke-width="1.1"/><ellipse cx="102.5" cy="62" rx="5" ry="7.5" transform="rotate(32 102.5 62)" stroke-width="1.3"/>`);
  const pawR = `<ellipse cx="81" cy="99" rx="5.2" ry="4.4" fill="${P.mouse}"/>`;
  const pawL = `<ellipse cx="39" cy="101" rx="5.2" ry="4.4" fill="${P.mouse}"/>`;
  let arms = '', extra = '';
  if (mood === 'wave') {
    arms = W(`<path d="M42 96 C37 92 33 87 31 81" stroke="${P.mouse}" stroke-width="7" stroke-linecap="round" fill="none"/><ellipse cx="30" cy="79" rx="5.4" ry="4.8" fill="${P.mouse}"/>${pawR}`) + spoon
      + K('<path d="M30 79 m-5 0 a5 4.6 0 1 0 10 0 a5 4.6 0 1 0 -10 0" stroke-width="1.1"/>');
    extra = K('<path d="M20 74 C17 78 17 82 20 86 M24 70 C20 76 20 84 24 90" stroke-width="1.2" opacity=".6"/>');
  } else if (mood === 'think') {
    arms = W(`${pawL}<path d="M76 100 C74 94 70 90 67 88" stroke="${P.mouse}" stroke-width="7" stroke-linecap="round" fill="none"/><ellipse cx="66" cy="86" rx="5" ry="4.4" fill="${P.mouse}"/>`)
      + K('<ellipse cx="66" cy="86" rx="5" ry="4.4" stroke-width="1"/>');
    extra = K(`<path d="M94 20 C94 13 104 13 104 20 C104 25 99 25 99 31 M99 36 L99 36.5" stroke="${P.roseD}" stroke-width="2.4"/>`);
  } else if (mood === 'happy') {
    arms = W(`<ellipse cx="36" cy="92" rx="5.2" ry="4.6" fill="${P.mouse}"/><ellipse cx="84" cy="92" rx="5.2" ry="4.6" fill="${P.mouse}"/>`);
    extra = W(`<path d="${heartPath(98, 26, 6)}" fill="${P.rose}"/><path d="${heartPath(22, 40, 4.5)}" fill="${P.rose}"/><path d="${heartPath(104, 46, 3.5)}" fill="${P.roseD}"/>`);
  } else {
    arms = W(`${pawL}${pawR}`) + spoon;
  }

  return art(`
    ${W(`<ellipse cx="60" cy="125" rx="30" ry="3.6" fill="${P.gray}" opacity=".6"/>`)}
    ${W(`<path d="M82 112 C100 117 110 104 104 94 C99 87 90 92 95 98" stroke="#D8A8A2" stroke-width="3" fill="none" stroke-linecap="round"/>`)}
    ${W(`<ellipse cx="60" cy="102" rx="25" ry="21" fill="${P.mouse}"/><ellipse cx="49" cy="121" rx="7.5" ry="4" fill="#E9C6C0"/><ellipse cx="71" cy="121" rx="7.5" ry="4" fill="#E9C6C0"/>`)}
    ${K('<path d="M37 94 C34 110 44 122 60 122 C76 122 86 110 83 94" stroke-width="1.5"/>')}
    ${W(`<path d="M44 94 C51 90 69 90 76 94 L74.5 117 C66 121.5 54 121.5 45.5 117 Z" fill="${P.rose}"/><path d="M53 105 L67 105 L66 113 L54 113 Z" fill="${P.roseD}" opacity=".45"/>`)}
    ${K('<path d="M44 94 C51 90 69 90 76 94 L74.5 117 C66 121.5 54 121.5 45.5 117 Z M53 105 L67 105 L66 113 L54 113 Z" stroke-width="1.2"/>')}
    ${arms}
    ${W(`<circle cx="35" cy="48" r="15.5" fill="${P.mouse}"/><circle cx="85" cy="48" r="15.5" fill="${P.mouse}"/><circle cx="36" cy="49" r="10" fill="${P.earIn}"/><circle cx="84" cy="49" r="10" fill="${P.earIn}"/>`)}
    ${K('<circle cx="35" cy="48" r="15.5" stroke-width="1.4"/><circle cx="85" cy="48" r="15.5" stroke-width="1.4"/>')}
    ${W(`<ellipse cx="60" cy="68" rx="24.5" ry="21" fill="${P.mouse}"/><ellipse cx="60" cy="76" rx="15" ry="9" fill="#EAE3DB"/><ellipse cx="44" cy="74" rx="5.4" ry="3.6" fill="${P.cheek}" opacity=".75"/><ellipse cx="76" cy="74" rx="5.4" ry="3.6" fill="${P.cheek}" opacity=".75"/>`)}
    ${K('<ellipse cx="60" cy="68" rx="24.5" ry="21" stroke-width="1.5"/>')}
    ${W(`<path d="M43 43 C33 36 37 19 50 22 C51 10 69 10 70 22 C83 19 87 36 77 43 Z" fill="${P.paper}"/><rect x="43" y="38" width="34" height="10" rx="3.5" fill="#F7F1E7"/>`)}
    ${K('<path d="M43 40 C33 36 37 19 50 22 C51 10 69 10 70 22 C83 19 87 36 77 40" stroke-width="1.4"/><rect x="43" y="38" width="34" height="10" rx="3.5" stroke-width="1.4"/><path d="M54 25 L55 37 M66 25 L65 37" stroke-width="1" opacity=".6"/>')}
    ${eyes}
    <ellipse cx="60" cy="75.5" rx="3.3" ry="2.5" fill="${P.nose}"/>
    ${K('<path d="M56.5 79.5 Q58.3 81.5 60 79.5 Q61.7 81.5 63.5 79.5" stroke-width="1.2"/><path d="M48 76 L35 74 M48 78.5 L36 80.5 M72 76 L85 74 M72 78.5 L84 80.5" stroke-width=".9" opacity=".55"/>')}
    ${extra}`, '0 0 120 130', 'mouse-svg');
}

// Заглушки для карточек без фото
const PLACEHOLDERS = ['croissant', 'lemon', 'cake', 'tomatoes', 'bread', 'strawberry', 'cheese', 'cup', 'eggs', 'bowl'];
function placeholderFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Doodles[PLACEHOLDERS[h % PLACEHOLDERS.length]]();
}

// Иконки интерфейса — тонкие линии
const I = (d) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const Icons = {
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  star: I('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/>'),
  starFill: I('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" fill="currentColor"/>'),
  edit: I('<path d="M4 20l1-4L16 5l3 3L8 19z M14 7l3 3"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),
  search: I('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  camera: I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  x: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  cal: I('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  cart: I('<path d="M3 4h2l2.5 11h10l2-8H6.5"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>'),
  download: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: I('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  refresh: I('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>'),
  share: I('<path d="M12 15V3M7 8l5-5 5 5M5 12v8h14v-8"/>'),
  left: I('<path d="M15 5l-7 7 7 7"/>'),
  right: I('<path d="M9 5l7 7-7 7"/>'),
  heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  heartFill: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/>'),
  clock: I('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'),
  pin: I('<path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
  phone: I('<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  users: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.5-3.4 3-5 6-5s5.5 1.6 6 5M16 5.5a3 3 0 0 1 0 5.6M18 14c1.8.6 2.8 2.2 3 5"/>'),
  // вкладки
  tabBook: I('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>'),
  tabBasket: I('<path d="M4 10h16l-2 10H6z"/><path d="M8 10c0-4 8-4 8 0M9 14v3M15 14v3"/>'),
  tabMenu: I('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8 14h3M13 14h3M8 17h3"/>'),
  tabNote: I('<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5M8 9h8M8 12h5"/>'),
  tabGear: I('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>')
};

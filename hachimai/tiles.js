/* 牌の絵（すべて独自に描いたSVG）。viewBox は 60×84 */
const TCOL={g:'#2f8a4a',r:'#c0392b',b:'#1f5fa8',ink:'#2a2a2a',tut:'#7a2b8f'};
// 索子：竹の棒。中心の位置の並び（数ごと）。赤い棒は r
const SOU={2:[[30,25],[30,59]],3:[[30,24],[18,60],[42,60]],4:[[18,25],[42,25],[18,59],[42,59]],5:[[16,24],[44,24],[30,42,'r'],[16,60],[44,60]],
  6:[[14,26],[30,26],[46,26],[14,58],[30,58],[46,58]],7:[[30,16,'r'],[14,42],[30,42],[46,42],[14,66],[30,66],[46,66]],
  8:[[12,25],[24,25],[36,25],[48,25],[12,59],[24,59],[36,59],[48,59]],9:[[14,18],[30,18,'r'],[46,18],[14,42],[30,42,'r'],[46,42],[14,66],[30,66,'r'],[46,66]]};
const stick=(x,y,c,h)=>{h=h||20;const col=c==='r'?TCOL.r:TCOL.g;return `<rect x="${x-3.2}" y="${y-h/2}" width="6.4" height="${h}" rx="3.2" fill="${col}"/><line x1="${x-3.2}" y1="${y}" x2="${x+3.2}" y2="${y}" stroke="#fbf7ee" stroke-width="1.4"/>`;};
// 筒子：丸。中心の位置と色
const PIN={2:[[30,24],[30,60]],3:[[18,22],[30,42,'r'],[42,62]],4:[[18,24],[42,24],[18,60],[42,60]],5:[[17,20],[43,20],[30,42,'r'],[17,64],[43,64]],
  6:[[19,18],[41,18],[19,42,'r'],[41,42,'r'],[19,66,'r'],[41,66,'r']],7:[[17,15],[30,23],[43,31],[19,52,'r'],[41,52,'r'],[19,70,'r'],[41,70,'r']],
  8:[[19,14],[41,14],[19,33],[41,33],[19,52],[41,52],[19,71],[41,71]],9:[[14,18],[30,18],[46,18],[14,42,'r'],[30,42,'r'],[46,42,'r'],[14,66],[30,66],[46,66]]};
const coin=(x,y,c,r)=>{r=r||8;const col=c==='r'?TCOL.r:TCOL.b;return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${col}" stroke-width="2.6"/><circle cx="${x}" cy="${y}" r="${r*.38}" fill="${col}"/>`;};
// 1索：やたやたがらす（緑）
const CROW=`<g fill="${TCOL.g}" stroke="${TCOL.g}" stroke-linecap="round" stroke-linejoin="round"><circle cx="27" cy="22" r="14"/><path d="M36 25 Q46 26 47 31 Q40 32 34 30Z"/><path d="M28 36 L27 52" fill="none" stroke-width="2"/><circle cx="27" cy="58" r="7"/><path d="M21 61 Q12 66 12 80" fill="none" stroke-width="2.2"/><path d="M28 64 Q31 72 31 80" fill="none" stroke-width="2.2"/><path d="M33 61 Q42 66 42 80" fill="none" stroke-width="2.2"/></g><circle cx="30.5" cy="27" r="1.6" fill="#fbf7ee"/>`;
// つたきる（あみがしらに寸）
const TUTA=`<g transform="translate(5,17) scale(.5)" fill="none" stroke="${TCOL.tut}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 12H84V36H16Z"/><path d="M39 12V36M61 12V36"/><path d="M10 58H90"/><path d="M66 44V86Q66 95 55 92L47 88"/><path d="M30 66L40 78"/></g>`;
function tileFace(k){
  if(k<9){const n=k+1;if(n===1)return CROW;return SOU[n].map(([x,y,c])=>stick(x,y,c,n>=7?18:20)).join('');}
  if(k<18){const n=k-8;if(n===1)return `<circle cx="30" cy="42" r="19" fill="none" stroke="${TCOL.b}" stroke-width="3"/><circle cx="30" cy="42" r="12" fill="none" stroke="${TCOL.r}" stroke-width="3"/><circle cx="30" cy="42" r="5" fill="${TCOL.r}"/>`;
    return PIN[n].map(([x,y,c])=>coin(x,y,c,n>=7?7:n>=4?8.5:9)).join('');}
  if(k<24)return `<text x="30" y="46" text-anchor="middle" dominant-baseline="middle" font-family="nn" font-size="40" fill="${TCOL.ink}">${String.fromCodePoint(CRE[k-18].cp)}</text>`;
  return TUTA;}
// label：小さな数字や名前を添える（はじめて向け）
function tileSVG(k,o){o=o||{};const lab=o.label?(k<18?`<text x="5" y="11" font-size="11" font-weight="800" font-family="sans-serif" fill="${k<9?TCOL.g:TCOL.b}">${numOf(k)}</text>`:k<24?`<text x="30" y="80" text-anchor="middle" font-size="8.5" font-family="sans-serif" fill="#777">${CRE[k-18].id.length>8?CRE[k-18].id.slice(0,7)+'…':CRE[k-18].id}</text>`:`<text x="30" y="80" text-anchor="middle" font-size="8.5" font-family="sans-serif" fill="#777">つたきる</text>`):'';
  return `<svg viewBox="0 0 60 84" aria-label="${kindName(k)}"><rect x="1" y="1" width="58" height="82" rx="8" fill="#fbf7ee" stroke="#d8cdb4" stroke-width="1.5"/>${tileFace(k)}${lab}</svg>`;}

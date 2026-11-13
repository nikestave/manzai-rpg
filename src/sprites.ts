import type { Look } from './types';

// 16x20 の2頭身ベース。k=輪郭 h=髪 s=肌 e=目 r=ほっぺ m=口 c=上着 w=シャツ t=ネクタイ p=ズボン
const BASE = [
  '....kkkkkkkk....',
  '...khhhhhhhhk...',
  '..khhhhhhhhhhk..',
  '..khhhhhhhhhhk..',
  '..khsssssssshk..',
  '..kssssssssssk..',
  '..kssessssessk..',
  '..kssessssessk..',
  '..krsssmmsssrk..',
  '...kssssssssk...',
  '....kkkkkkkk....',
  '...kccwttwcck...',
  '..kcccwttwccck..',
  '..kcccwttwccck..',
  '..kscccwwcccsk..',
  '...kcccccccck...',
  '...kppppppppk...',
  '...kpppkkpppk...',
  '...kppk..kppk...',
  '..kkkkk..kkkkk..',
];

function set(g: string[][], x: number, y: number, ch: string) {
  if (g[y] && x >= 0 && x < 16) g[y][x] = ch;
}

function build(look: Look): string[][] {
  const g = BASE.map((r) => r.split(''));
  switch (look.hair) {
    case 'spiky':
      g[0] = '..khk.khhk.khk..'.split('');
      g[1] = '..khhhhhhhhhhk..'.split('');
      break;
    case 'bowl':
      g[4] = '..khhhhhhhhhhk..'.split('');
      g[5] = '..khsssssssshk..'.split('');
      break;
    case 'part':
      g[4] = '..khhhhsshhhhk..'.split('');
      g[5] = '..khsssssssshk..'.split('');
      break;
    case 'buzz':
      g[0] = '................'.split('');
      g[1] = '....kkkkkkkk....'.split('');
      g[2] = '...khhhhhhhhk...'.split('');
      g[4] = '..kssssssssssk..'.split('');
      break;
    case 'long':
      for (let y = 4; y <= 9; y++) { set(g, 2, y, 'h'); set(g, 13, y, 'h'); set(g, 1, y, 'k'); set(g, 14, y, 'k'); }
      break;
    case 'short':
    default:
      break;
  }
  if (look.glasses) {
    for (const x0 of [4, 9]) {
      for (let x = x0; x <= x0 + 2; x++) { set(g, x, 5, 'g'); set(g, x, 8, 'g'); }
      set(g, x0, 6, 'g'); set(g, x0, 7, 'g'); set(g, x0 + 2, 6, 'g'); set(g, x0 + 2, 7, 'g');
    }
    set(g, 7, 6, 'g'); set(g, 8, 6, 'g');
  }
  return g;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = f((n >> 16) & 255), gg = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (gg << 8) | b).toString(16).padStart(6, '0')}`;
}

export function drawPerson(look: Look, scale = 4): HTMLCanvasElement {
  const pal: Record<string, string> = {
    k: '#2b1d2e', h: look.hairColor, s: look.skin, e: '#2b1d2e', r: '#f29a9a', m: '#a8323e',
    c: look.jacket, w: look.shirt ?? '#f4f1e8', t: look.tie, p: look.pants, g: '#3a3a4a',
  };
  const grid = build(look);
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 20;
  cv.style.width = `${16 * scale}px`;
  cv.style.height = `${20 * scale}px`;
  cv.className = 'px';
  const ctx = cv.getContext('2d')!;
  grid.forEach((row, y) => row.forEach((ch, x) => {
    const col = pal[ch];
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  }));
  // 髪と上着にハイライト
  ctx.fillStyle = shade(look.hairColor, 45);
  if (look.hair !== 'buzz') ctx.fillRect(5, 2, 2, 1);
  ctx.fillStyle = shade(look.jacket, -35);
  ctx.fillRect(4, 15, 8, 1);
  // 目のハイライト
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(5, 6, 1, 1); ctx.fillRect(10, 6, 1, 1);
  ctx.fillStyle = '#2b1d2e';
  ctx.fillRect(5, 7, 1, 1); ctx.fillRect(10, 7, 1, 1);
  return cv;
}

const MIC = [
  '..kkkk..',
  '.kggggk.',
  '.kgwggk.',
  '.kggggk.',
  '..kkkk..',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '...kk...',
  '..kkkk..',
  '.kkkkkk.',
];

export function drawMic(scale = 4): HTMLCanvasElement {
  const pal: Record<string, string> = { k: '#3a3646', g: '#a7a9b8', w: '#ffffff' };
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 20;
  cv.style.width = `${8 * scale}px`;
  cv.style.height = `${20 * scale}px`;
  cv.className = 'px';
  const ctx = cv.getContext('2d')!;
  MIC.forEach((row, y) => row.split('').forEach((ch, x) => {
    if (!pal[ch]) return;
    ctx.fillStyle = pal[ch];
    ctx.fillRect(x, y, 1, 1);
  }));
  return cv;
}

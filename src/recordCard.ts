// 戦績を1枚の画像（1080x1350）にする
import type { Combo, GameState } from './types';
import { STAT_KEYS, STAT_LABEL } from './types';
import { rank } from './logic';
import { drawPerson } from './sprites';

const W = 1080;
const H = 1350;
const FONT = '"DotGothic16", "Hiragino Kaku Gothic ProN", sans-serif';
const C = { bg: '#1b1430', win: '#241c40', line: '#f4f1e8', ink: '#f4f1e8', dim: '#b7aed6', gold: '#ffd84a', red: '#ff6b8b', green: '#8be08a' };
const RANK_COLOR: Record<string, string> = { S: C.gold, A: C.red, B: '#ffa94d', C: C.green, D: '#6bd3ff', E: '#6bd3ff', F: C.dim, G: C.dim };

export async function makeRecordCard(s: GameState, combo: Combo, win: boolean, url: string): Promise<Blob> {
  try { await document.fonts.load(`40px ${FONT}`); } catch { /* フォントが無くても描く */ }
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const text = (t: string, px: number, py: number, size: number, color: string = C.ink, align: CanvasTextAlign = 'left') => {
    x.font = `${size}px ${FONT}`;
    x.fillStyle = color;
    x.textAlign = align;
    x.textBaseline = 'alphabetic';
    x.fillText(t, px, py);
  };
  const box = (bx: number, by: number, bw: number, bh: number) => {
    x.fillStyle = C.win; x.fillRect(bx, by, bw, bh);
    x.strokeStyle = C.line; x.lineWidth = 6; x.strokeRect(bx, by, bw, bh);
  };

  // 背景と枠
  x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = win ? C.gold : C.line; x.lineWidth = 12; x.strokeRect(24, 24, W - 48, H - 48);

  text('ドット漫才 〜目指せ笑王グランプリ〜', W / 2, 100, 34, C.gold, 'center');
  text(win ? '★ 笑王グランプリ 優勝 ★' : 'ラストイヤー 戦績', W / 2, 180, 64, win ? C.gold : C.ink, 'center');

  // ステージ
  const sx = 80, sy = 220, sw = W - 160, sh = 360;
  const g = x.createLinearGradient(0, sy, 0, sy + sh);
  g.addColorStop(0, '#3a1d3a'); g.addColorStop(0.7, '#5a2140'); g.addColorStop(0.7, '#7a3a2a'); g.addColorStop(1, '#5c2b1f');
  x.fillStyle = g; x.fillRect(sx, sy, sw, sh);
  for (let i = 0; i < 6; i++) {
    x.fillStyle = i % 2 ? '#8a1830' : '#b0203a';
    x.fillRect(sx + i * 24, sy, 24, sh * 0.68);
    x.fillRect(sx + sw - (i + 1) * 24, sy, 24, sh * 0.68);
  }
  const spot = x.createRadialGradient(W / 2, sy + sh, 0, W / 2, sy + sh, 340);
  spot.addColorStop(0, 'rgba(255,240,180,0.35)'); spot.addColorStop(1, 'rgba(255,240,180,0)');
  x.fillStyle = spot; x.fillRect(sx, sy, sw, sh);
  x.strokeStyle = C.line; x.lineWidth = 6; x.strokeRect(sx, sy, sw, sh);
  const u = 13; // 1ドット
  const pw = 16 * u, ph = 20 * u;
  const py = sy + sh - ph - 20;
  x.drawImage(drawPerson(combo.boke.look, 1), W / 2 - pw - 20, py, pw, ph);
  x.drawImage(drawPerson(combo.tsukkomi.look, 1), W / 2 + 20, py, pw, ph);
  if (win) {
    const colors = [C.gold, C.red, '#6bd3ff', C.green, '#ffffff'];
    for (let i = 0; i < 70; i++) {
      x.fillStyle = colors[i % colors.length];
      x.fillRect(sx + 20 + ((i * 137) % (sw - 40)), sy + 16 + ((i * 59) % (sh * 0.55)), 10, 16);
    }
  }

  // コンビ名と結果
  text(combo.name, W / 2, 660, 72, C.ink, 'center');
  text(`${combo.boke.name}（ボケ） / ${combo.tsukkomi.name}（ツッコミ）`, W / 2, 712, 30, C.dim, 'center');
  const champ = s.history.find((h) => h.result === '優勝');
  text(win && champ ? `結成${champ.year}年目で 笑王 に輝く！` : `最高成績：${s.bestLabel}`, W / 2, 785, 46, win ? C.gold : C.ink, 'center');
  if (s.finalInfo) {
    const f = s.finalInfo;
    text(`決勝 ${f.score}点（${f.rank}位）${f.votes !== undefined ? `　最終決戦 ${f.votes}票` : ''}`, W / 2, 835, 30, C.dim, 'center');
  }

  // ステータス
  box(80, 870, 440, 400);
  text('ステータス', 110, 920, 32, C.gold);
  STAT_KEYS.forEach((k, i) => {
    const yy = 970 + i * 42;
    const v = s.stats[k];
    const r = rank(v);
    text(STAT_LABEL[k], 110, yy, 28);
    text(r, 400, yy, 32, RANK_COLOR[r], 'center');
    text(String(v), 490, yy, 26, C.dim, 'right');
  });

  // 戦績
  box(560, 870, 440, 400);
  text('笑王グランプリ戦績', 590, 920, 32, C.gold);
  const hist = s.history;
  const col = hist.length > 8 ? 2 : 1;
  const per = Math.ceil(hist.length / col);
  hist.forEach((h, i) => {
    const cx = 590 + Math.floor(i / per) * 205;
    const cy = 965 + (i % per) * (col === 2 ? 36 : 40);
    const color = h.result === '優勝' ? C.gold : h.result.startsWith('決勝') || h.result.startsWith('最終') ? C.red : C.ink;
    text(`${h.year}年目`, cx, cy, col === 2 ? 20 : 24, C.dim);
    text(h.result, cx + (col === 2 ? 64 : 100), cy, col === 2 ? 19 : 24, color);
  });

  text(url.replace(/^https?:\/\//, ''), W / 2, H - 44, 26, C.dim, 'center');

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

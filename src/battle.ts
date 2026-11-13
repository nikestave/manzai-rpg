import type { Card, CardType, GameState } from './types';
import { CARDS } from './data/cards';
import { clamp, rand } from './logic';

export const PHASES = ['つかみ', '展開', '盛り上がり', 'オチ'];
const PHASE_W = [0.9, 1.0, 1.1, 1.25];

export interface BattleCtx {
  phase: number;
  prevType?: CardType;
  bokeCount: number;
  tame: boolean;
  gauge: number;
}

export function cardScore(card: Card, ctx: BattleCtx, s: GameState): { score: number; tags: string[] } {
  const tags: string[] = [];
  let v = card.base * (0.5 + s.stats[card.stat] / 100) * PHASE_W[ctx.phase];
  if (card.effect === 'tsukami') {
    if (ctx.phase === 0) { v *= 1.6; tags.push('つかみ◎'); } else v *= 0.8;
  }
  if (card.effect === 'kaishu') {
    if (ctx.phase === 3) { v *= 2; tags.push('回収！'); } else v *= 0.5;
  }
  if (card.effect === 'tenon' && ctx.bokeCount > 0) { v += 4 * ctx.bokeCount; tags.push(`天丼×${ctx.bokeCount}`); }
  if (card.effect === 'rush') { v += ctx.gauge * 0.12; if (ctx.gauge > 40) tags.push('温まってる'); }
  if (card.effect === 'combo') { v += s.stats.nakama / 8; if (s.stats.nakama >= 50) tags.push('息ぴったり'); }
  if (ctx.prevType === 'boke' && card.type === 'tsukkomi') { v *= 1.25; tags.push('コンボ！'); }
  else if (ctx.prevType === card.type && card.effect !== 'tenon') { v *= 0.85; tags.push('かぶり'); }
  if (ctx.tame) { v *= 1.4; tags.push('溜め'); }
  return { score: v, tags };
}

export function stars(score: number): string {
  const n = clamp(Math.round(score / 5), 1, 5);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function reaction(score: number): { text: string; cls: string } {
  if (score >= 26) return { text: '大爆笑！！', cls: 'r4' };
  if (score >= 16) return { text: 'ドッ！', cls: 'r3' };
  if (score >= 9) return { text: 'クスクス', cls: 'r2' };
  return { text: 'シーン…', cls: 'r1' };
}

export function drawHand(deck: string[]): Card[] {
  const pool = [...deck];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map((id) => CARDS[id]);
}

export const netaBonus = (s: GameState) => s.stats.neta * 0.5;

export const rivalScore = (power: number) => power + rand(-10, 10);

export function judgeScores(total: number): number[] {
  return Array.from({ length: 5 }, () => clamp(Math.round(62 + total * 0.22 + rand(-3, 3)), 60, 99));
}

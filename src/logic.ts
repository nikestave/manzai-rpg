import type { ActionId, GameState, StatKey } from './types';
import { STAT_LABEL } from './types';
import { comboById } from './data/combos';
import { CARDS, COMMON_POOL } from './data/cards';

export const LAST_YEAR = 15;
export const TURNS_PER_YEAR = 16;
export const LIVING_COST = 30000;
/** 全体の成長倍率（バランス調整用） */
export const GROWTH = 1.3;

export const turnLabel = (t: number) => `${4 + Math.floor(t / 2)}月${t % 2 === 0 ? '前半' : '後半'}`;

export interface Round { turn: number; name: string; th: number }
export const ROUNDS: Round[] = [
  { turn: 9, name: '1回戦', th: 35 },
  { turn: 11, name: '2回戦', th: 55 },
  { turn: 13, name: '3回戦', th: 72 },
  { turn: 14, name: '準々決勝', th: 90 },
  { turn: 15, name: '準決勝', th: 108 },
];
export const RESULT_ORDER = ['予選敗退', '1回戦突破', '2回戦突破', '3回戦突破', '準々決勝突破', '決勝進出', '最終決戦進出', '優勝'];

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const yen = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString()}円`;

export function rank(v: number): string {
  if (v >= 85) return 'S';
  if (v >= 70) return 'A';
  if (v >= 55) return 'B';
  if (v >= 40) return 'C';
  if (v >= 30) return 'D';
  if (v >= 20) return 'E';
  if (v >= 10) return 'F';
  return 'G';
}

export function newGame(comboId: string): GameState {
  const c = comboById(comboId);
  return {
    version: 1,
    comboId,
    year: c.startYear,
    turn: 0,
    stats: { ...c.stats },
    stamina: 100,
    money: 100000,
    popularity: 2,
    actionUses: {},
    deck: [...c.deck],
    alive: true,
    round: 0,
    bestLabel: '予選敗退',
    history: [],
    flags: {},
  };
}

/** ステータス変化。成長補正込み。表示用テキストを返す */
export function gain(s: GameState, key: StatKey, n: number, useGrowth = true): string {
  const g = useGrowth && n > 0 ? comboById(s.comboId).growth[key] ?? 1 : 1;
  const v = Math.round(n * g);
  const before = s.stats[key];
  s.stats[key] = clamp(before + v, 0, 100);
  const d = s.stats[key] - before;
  return `${STAT_LABEL[key]} ${d >= 0 ? '+' : ''}${d}`;
}
export function addMoney(s: GameState, n: number): string {
  s.money += n;
  return `所持金 ${n >= 0 ? '+' : ''}${yen(n)}`;
}
export function addStamina(s: GameState, n: number): string {
  const b = s.stamina;
  s.stamina = clamp(b + n, 0, 100);
  const d = s.stamina - b;
  return `体力 ${d >= 0 ? '+' : ''}${d}`;
}
export function addPop(s: GameState, n: number): string {
  s.popularity = clamp(s.popularity + n, 0, 100);
  return `人気 ${n >= 0 ? '+' : ''}${n}`;
}
export function addCard(s: GameState, id?: string): string | null {
  const pool = id ? [id] : COMMON_POOL.filter((c) => !s.deck.includes(c));
  if (pool.length === 0) return null;
  const c = pick(pool);
  if (s.deck.includes(c)) return null;
  s.deck.push(c);
  return `新ネタ「${CARDS[c].name}」をネタ帳に追加！`;
}

// ---------------- 行動 ----------------
export interface ActionDef {
  id: ActionId;
  name: string;
  icon: string;
  cost: number; // 体力消費（マイナスは回復）
  gains: Partial<Record<StatKey, number>>;
  money?: number;
  hint: string;
}

export const ACTIONS: ActionDef[] = [
  { id: 'neta', name: 'ネタ作り', icon: '📝', cost: 12, gains: { neta: 6, boke: 2 }, hint: 'ネタ↑ ボケ↑ 新ネタ' },
  { id: 'awase', name: 'ネタ合わせ', icon: '🎤', cost: 10, gains: { ma: 5, nakama: 2, tsukkomi: 1 }, hint: '間↑ 仲↑ ツッコミ↑' },
  { id: 'bokeT', name: 'ボケ特訓', icon: '🤪', cost: 12, gains: { boke: 6, hana: 1 }, hint: 'ボケ↑ 華↑' },
  { id: 'tsukT', name: 'ツッコミ特訓', icon: '✋', cost: 12, gains: { tsukkomi: 6, ma: 1 }, hint: 'ツッコミ↑ 間↑' },
  { id: 'gekijo', name: '劇場出番', icon: '🎭', cost: 15, gains: { hana: 3, mental: 3, ma: 2 }, money: 10000, hint: '華↑ メンタル↑ 間↑ 💴' },
  { id: 'baito', name: 'バイト', icon: '🍙', cost: 10, gains: { mental: 1 }, money: 90000, hint: 'お金↑↑ メンタル↑' },
  { id: 'nomi', name: '飲み会', icon: '🍺', cost: -10, gains: { nakama: 4, mental: 2 }, money: -20000, hint: '仲↑ メンタル↑ 体力↑' },
  { id: 'rest', name: '休む', icon: '💤', cost: -40, gains: { nakama: 1 }, hint: '体力↑↑ 仲↑' },
];
export const actionById = (id: ActionId) => ACTIONS.find((a) => a.id === id)!;

export const actionLevel = (s: GameState, id: ActionId) => Math.min(5, 1 + Math.floor((s.actionUses[id] ?? 0) / 4));

export function failRate(s: GameState, a: ActionDef): number {
  if (a.cost <= 0 || s.stamina >= 30) return 0;
  return Math.round(((30 - s.stamina) / 30) * 60);
}

export interface ActionResult {
  title: string;
  success: boolean;
  lines: string[];
  levelUp?: number;
}

export function doAction(s: GameState, id: ActionId): ActionResult {
  const a = actionById(id);
  const lines: string[] = [];
  const fail = Math.random() * 100 < failRate(s, a);
  const lvBefore = actionLevel(s, id);
  const lvMult = 1 + 0.2 * (lvBefore - 1);
  let buffMult = 1;
  if (s.buff && s.buff.action === id) {
    buffMult = s.buff.mult;
    lines.push('先輩のアドバイスが効いた！');
    s.buff = undefined;
  }
  let title = `${a.name}`;

  if (fail) {
    title = `${a.name}……空回りした`;
    lines.push('疲れて集中できなかった…');
    for (const [k, v] of Object.entries(a.gains)) {
      if (v && v > 0) lines.push(gain(s, k as StatKey, Math.max(1, Math.round(v * 0.3))));
    }
    lines.push(gain(s, 'mental', -2, false));
  } else {
    for (const [k, v] of Object.entries(a.gains)) {
      if (!v) continue;
      lines.push(gain(s, k as StatKey, Math.max(1, Math.round(v * GROWTH * lvMult * buffMult * rand(0.8, 1.2)))));
    }
  }

  // 行動ごとの特殊処理
  if (id === 'gekijo') {
    const power = (s.stats.boke + s.stats.tsukkomi + s.stats.ma + s.stats.hana) / 4;
    const roll = power + rand(-25, 25);
    if (!fail && roll > 45) {
      title = '劇場出番：大ウケ！';
      lines.push(addPop(s, 4));
    } else if (roll > 20) {
      title = fail ? title : '劇場出番：まずまず';
      lines.push(addPop(s, 2));
    } else {
      title = '劇場出番：スベった…';
      lines.push(gain(s, 'mental', 2, false) + '（悔しさをバネに）');
    }
    lines.push(addMoney(s, (a.money ?? 0) + s.popularity * 500));
    if (Math.random() < 0.1) {
      const c = addCard(s);
      if (c) lines.push(c);
    }
  } else if (a.money) {
    lines.push(addMoney(s, a.money));
  }
  if (id === 'neta' && !fail && Math.random() < 0.3) {
    const c = addCard(s);
    if (c) lines.push('💡 ' + c);
  }
  if (id === 'nomi' && Math.random() < 0.5) {
    const target = pick<ActionId>(['neta', 'awase', 'bokeT', 'tsukT']);
    s.buff = { action: target, mult: 1.5 };
    lines.push(`先輩から「${actionById(target).name}」のコツを教わった！（次回1.5倍）`);
  }

  lines.push(addStamina(s, -a.cost));
  s.actionUses[id] = (s.actionUses[id] ?? 0) + 1;
  const lvAfter = actionLevel(s, id);
  return { title, success: !fail, lines, levelUp: lvAfter > lvBefore ? lvAfter : undefined };
}

/** ターン終了時の生活費 */
export function payLiving(s: GameState): string[] {
  const out = [addMoney(s, -LIVING_COST) + '（生活費）'];
  if (s.money < 0) {
    out.push('家賃が払えない…');
    out.push(gain(s, 'mental', -2, false));
    out.push(gain(s, 'nakama', -2, false));
  }
  return out;
}

export function currentRound(s: GameState): Round | undefined {
  if (!s.alive) return undefined;
  const r = ROUNDS[s.round];
  return r && r.turn === s.turn ? r : undefined;
}

export function nextRoundInfo(s: GameState): string {
  if (!s.alive) return `今年の笑王グランプリは敗退… 来年に向けて力を蓄えよう`;
  const r = ROUNDS[s.round];
  if (!r) return '🏆 決勝進出決定！12月の決勝に備えよう';
  const left = r.turn - s.turn;
  return left === 0 ? `🏆 このターン後に ${r.name}！（目標 ${r.th}点）` : `🏆 ${r.name}まで あと${left}ターン（目標 ${r.th}点）`;
}

export function recordResult(s: GameState, label: string) {
  if (RESULT_ORDER.indexOf(label) > RESULT_ORDER.indexOf(s.bestLabel)) s.bestLabel = label;
  s.history.push({ year: s.year, result: label });
}

export function yearResultLabel(s: GameState): string {
  if (s.champion) return '優勝';
  if (s.flags['finalist_' + s.year]) return '最終決戦進出';
  if (s.round >= 5) return '決勝進出';
  return RESULT_ORDER[s.round];
}

// ---------- セーブ（3スロット） ----------
export const SLOTS = [1, 2, 3];
const OLD_KEY = 'manzai-rpg-save-v1';
const slotKey = (n: number) => `manzai-rpg-slot-${n}`;

export function saveSlot(n: number, s: GameState) {
  s.savedAt = Date.now();
  try { localStorage.setItem(slotKey(n), JSON.stringify(s)); } catch { /* ignore */ }
}
export function loadSlot(n: number): GameState | null {
  try {
    const raw = localStorage.getItem(slotKey(n));
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch { return null; }
}
export function deleteSlot(n: number) {
  try { localStorage.removeItem(slotKey(n)); } catch { /* ignore */ }
}
/** v0.1 の自動セーブをスロット1へ移す */
export function migrateOldSave() {
  try {
    const raw = localStorage.getItem(OLD_KEY);
    if (raw && !localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), raw);
    localStorage.removeItem(OLD_KEY);
  } catch { /* ignore */ }
}

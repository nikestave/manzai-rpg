export type StatKey = 'boke' | 'tsukkomi' | 'neta' | 'ma' | 'hana' | 'mental' | 'nakama';
export const STAT_KEYS: StatKey[] = ['boke', 'tsukkomi', 'neta', 'ma', 'hana', 'mental', 'nakama'];
export const STAT_LABEL: Record<StatKey, string> = {
  boke: 'ボケ',
  tsukkomi: 'ツッコミ',
  neta: 'ネタ',
  ma: '間',
  hana: '華',
  mental: 'メンタル',
  nakama: 'コンビ仲',
};

export type Stats = Record<StatKey, number>;

export type ActionId = 'neta' | 'awase' | 'bokeT' | 'tsukT' | 'gekijo' | 'baito' | 'nomi' | 'rest';

export type HairStyle = 'short' | 'spiky' | 'bowl' | 'part' | 'buzz' | 'long';

export interface Look {
  hair: HairStyle;
  hairColor: string;
  skin: string;
  jacket: string;
  tie: string;
  shirt?: string;
  pants: string;
  glasses?: boolean;
}

export interface Member {
  name: string;
  look: Look;
}

export interface Combo {
  id: string;
  name: string;
  style: string;
  desc: string;
  difficulty: string;
  startYear: number;
  boke: Member;
  tsukkomi: Member;
  stats: Stats;
  growth: Partial<Record<StatKey, number>>;
  deck: string[];
  ultimate: string;
  ultimateEvent: string;
  homeLines: [speaker: 'B' | 'T', text: string][];
}

export type CardType = 'boke' | 'tsukkomi' | 'ma' | 'special';
export type CardEffect = 'tsukami' | 'kaishu' | 'tenon' | 'tame' | 'rush' | 'combo';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  base: number;
  stat: StatKey;
  effect?: CardEffect;
  desc: string;
  lines: [speaker: 'B' | 'T', text: string][][];
}

export interface GameState {
  version: 1;
  comboId: string;
  year: number;
  turn: number; // 0..15
  stats: Stats;
  stamina: number;
  money: number;
  popularity: number;
  actionUses: Partial<Record<ActionId, number>>;
  deck: string[];
  alive: boolean; // まだ今年の大会で勝ち残っているか
  round: number; // 今年通過したラウンド数
  bestLabel: string;
  history: { year: number; result: string }[];
  flags: Record<string, number>;
  buff?: { action: ActionId; mult: number };
  champion?: boolean;
  savedAt?: number;
}

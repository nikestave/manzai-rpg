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

/** ステータスの説明（育成画面でタップすると表示） */
export const STAT_DESC: Record<StatKey, string> = {
  boke: 'ボケ系カードの点数が上がる',
  tsukkomi: 'ツッコミ系カードの点数が上がる',
  neta: '漫才の最初にもらえる「ネタの完成度ボーナス」が増える。あるある・伏線回収カードも強くなる',
  ma: '間を溜める・ノリツッコミ・畳みかけなど「間」のカードが強くなる。劇場出番の成功率も上がる',
  hana: '動きのボケ・ツカミのカードが強くなる。劇場出番とテレビオーディションの成功率も上がる',
  mental: '大舞台での緊張に強くなる。低いと準々決勝以降で「噛む」ことがあり、点数が下がる。高いと「堂々」でボーナス',
  nakama: '20を切ると解散の危機。コンビ技のカードも強くなる',
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
  /** 関西弁でしゃべるか（false なら標準語） */
  kansai: boolean;
  /** 漫才の出だし [ボケ, ツッコミ] と締めのツッコミ */
  open: [string, string];
  close: string;
  /** 選択画面に出す「難しさの理由」 */
  note: string;
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
  /** 直近の決勝の記録（戦績画像用） */
  finalInfo?: { year: number; score: number; rank: number; votes?: number; rivals: string[] };
}

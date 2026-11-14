import type { Combo, GameState, StatKey } from '../types';
import { STAT_KEYS } from '../types';
import { addCard, addMoney, addPop, addStamina, gain, pick } from '../logic';

export interface EventChoice {
  label: string;
  apply: (s: GameState) => string[];
}
export interface GameEvent {
  id: string;
  title: string;
  text: (s: GameState, c: Combo) => string;
  cond?: (s: GameState) => boolean;
  max?: number; // 1プレイで起きる最大回数
  choices: EventChoice[];
}

const ok = (apply: EventChoice['apply'], label = 'OK'): EventChoice[] => [{ label, apply }];

export const EVENTS: GameEvent[] = [
  {
    id: 'senpai_nomi', title: '先輩からの誘い',
    text: () => '劇場の先輩に「今夜どうや？」と飲みに誘われた。',
    choices: [
      { label: 'ついていく', apply: (s) => [addMoney(s, -15000), gain(s, 'hana', 3), gain(s, 'mental', 2)] },
      { label: '断ってネタを書く', apply: (s) => [gain(s, 'neta', 4), addStamina(s, -5)] },
    ],
  },
  {
    id: 'long_slot', title: '長尺の出番',
    text: () => '支配人「来週、15分の長い出番が空いてんねんけど、やる？」',
    choices: [
      { label: 'やります！', apply: (s) => [gain(s, 'ma', 4), gain(s, 'mental', 3), addStamina(s, -10), addPop(s, 2)] },
      { label: '今回は見送る', apply: (s) => [addStamina(s, 5)] },
    ],
  },
  {
    id: 'kenka', title: '相方と大ゲンカ',
    text: (_s, c) => `ネタの方向性で${c.boke.name}と${c.tsukkomi.name}が大ゲンカ。楽屋の空気が最悪だ…`,
    choices: [
      { label: '先に謝る', apply: (s) => [gain(s, 'nakama', 5), gain(s, 'mental', -2, false)] },
      { label: '本音でぶつかる', apply: (s) => Math.random() < 0.5
        ? ['雨降って地固まる！', gain(s, 'nakama', 8), gain(s, 'neta', 3)]
        : ['こじれてしまった…', gain(s, 'nakama', -8, false), gain(s, 'tsukkomi', 3)] },
    ],
  },
  {
    id: 'tencho', title: 'お笑い好きの店長',
    text: () => 'バイト先の店長が実はお笑い好き。「これで美味いもん食べ」と封筒をくれた。',
    max: 2,
    choices: ok((s) => [addMoney(s, 20000), gain(s, 'mental', 2)], 'ありがとうございます！'),
  },
  {
    id: 'old_note', title: '昔のノート',
    text: () => '学生時代にラジオへ送っていたハガキのネタ帳が出てきた。',
    max: 1,
    choices: ok((s) => { const c = addCard(s, 'aruaru'); return [gain(s, 'neta', 5), ...(c ? [c] : [])]; }, '読み返す'),
  },
  {
    id: 'buzz', title: 'ネタ動画がバズった！',
    text: () => '劇場で撮ったネタ動画がSNSで拡散されている！',
    cond: (s) => s.stats.hana >= 25,
    max: 3,
    choices: ok((s) => [addPop(s, 8), gain(s, 'hana', 3), gain(s, 'mental', 2)], 'やったー！'),
  },
  {
    id: 'douki_tv', title: '同期の活躍',
    text: () => '同期のコンビがテレビに出始めた。楽屋で話題になっている。',
    choices: [
      { label: '焦って特訓する', apply: (s) => [gain(s, 'boke', 3), gain(s, 'tsukkomi', 3), gain(s, 'mental', -3, false)] },
      { label: '素直に応援する', apply: (s) => [gain(s, 'mental', 3), gain(s, 'nakama', 2)] },
    ],
  },
  {
    id: 'kaze', title: '風邪をひいた',
    text: () => '季節の変わり目で風邪をひいてしまった…。',
    max: 3,
    choices: ok((s) => [addStamina(s, -20)], '寝て治す'),
  },
  {
    id: 'sakka', title: '作家志望の後輩',
    text: () => '作家志望の後輩が「ネタ、見せてもらえませんか」と声をかけてきた。',
    choices: [
      { label: '意見を聞いてみる', apply: (s) => { const c = s.deck.includes('kaishu') ? null : addCard(s, 'kaishu'); return [gain(s, 'neta', 4), ...(c ? [c] : [])]; } },
      { label: '自分たちで考える', apply: (s) => [gain(s, 'mental', 2), gain(s, 'nakama', 2)] },
    ],
  },
  {
    id: 'yume', title: '漫才の神様',
    text: () => '夢に白いヒゲの「漫才の神様」が現れて、何かをささやいた…',
    max: 2,
    choices: ok((s) => { const k = pick<StatKey>(STAT_KEYS); return ['なんだか力が湧いてきた！', gain(s, k, 6)]; }, '目を覚ます'),
  },
  {
    id: 'eigyo', title: '地方営業',
    text: () => '地方のショッピングモールでの営業の仕事が来た。',
    choices: [
      { label: '行く', apply: (s) => [addMoney(s, 40000), gain(s, 'hana', 2), addStamina(s, -15)] },
      { label: '断る', apply: (s) => [addStamina(s, 5)] },
    ],
  },
  {
    id: 'surberi', title: 'ライブで大スベリ',
    text: () => 'お客さんが3人しかいないライブで、物音ひとつしないほどスベった。',
    choices: [
      { label: '引きずらない！', apply: (s) => [gain(s, 'mental', 3)] },
      { label: '徹夜で反省会', apply: (s) => [gain(s, 'neta', 4), gain(s, 'nakama', 2), addStamina(s, -15)] },
    ],
  },
  {
    id: 'asa_made', title: '朝までネタ合わせ',
    text: (_s, c) => `${c.tsukkomi.name}の家で、気づけば朝までネタ合わせをしていた。`,
    choices: ok((s) => [gain(s, 'ma', 4), gain(s, 'nakama', 3), addStamina(s, -10)], '眠い…'),
  },
  {
    id: 'shiokuri', title: '実家から荷物',
    text: () => '実家から段ボールが届いた。お米と、封筒と、「無理せんでね」の手紙。',
    max: 2,
    choices: [
      { label: 'ありがたく受け取る', apply: (s) => [addMoney(s, 30000), gain(s, 'mental', 2)] },
      { label: 'お金は送り返す', apply: (s) => [gain(s, 'mental', 5)] },
    ],
  },
  {
    id: 'audition', title: 'ネタ番組オーディション',
    text: () => '深夜のネタ番組のオーディションの話が来た！',
    cond: (s) => s.popularity >= 10,
    choices: [
      { label: '挑戦する', apply: (s) => {
        const p = (s.stats.hana + s.popularity + s.stats.neta) / 3;
        return Math.random() * 70 < p
          ? ['合格！テレビに出られた！', addPop(s, 10), addMoney(s, 30000), gain(s, 'hana', 3)]
          : ['不合格…', gain(s, 'mental', -3, false), gain(s, 'neta', 2)];
      } },
      { label: '今は劇場に集中', apply: (s) => [gain(s, 'ma', 2)] },
    ],
  },
  {
    id: 'shinsa', title: '大物に顔を覚えられた',
    text: () => '劇場の廊下で大御所に「自分ら、おもろいな」と声をかけられた！',
    cond: (s) => s.popularity >= 25,
    max: 1,
    choices: ok((s) => [gain(s, 'mental', 5), gain(s, 'hana', 3)], '光栄です！'),
  },
  {
    id: 'kouhai', title: '後輩に慕われる',
    text: () => '後輩から「ネタの作り方を教えてください」と頼まれた。',
    cond: (s) => s.year >= 3,
    choices: [
      { label: '教える', apply: (s) => [gain(s, 'neta', 3), addMoney(s, -8000), '（ご飯をおごった）'] },
      { label: '自分らも勉強中や', apply: (s) => [gain(s, 'mental', 1)] },
    ],
  },
];

/** 条件付きの強制イベント */
export const KAISAN: GameEvent = {
  id: 'kaisan', title: '⚠ 解散の危機',
  text: (_s, c) => `${c.tsukkomi.name}「……なあ、もう${c.kansai ? '解散せえへんか' : '解散しないか'}」\n\nコンビ仲が限界だ。`,
  choices: [
    { label: 'とことん話し合う', apply: (s) => ['なんとか踏みとどまった', gain(s, 'nakama', 15, false), addStamina(s, -10)] },
    { label: '少し距離を置く', apply: (s) => [gain(s, 'nakama', 6, false), gain(s, 'mental', -5, false)] },
  ],
};

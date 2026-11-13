import type { GameState, Look } from '../types';

/** B=ボケ T=ツッコミ N=ナレーション。それ以外は NPC のキー */
export type Speaker = 'B' | 'T' | 'N' | 'minami' | 'shihainin' | 'jin' | 'haha';

export const NPC: Record<Exclude<Speaker, 'B' | 'T' | 'N'>, { name: string; look?: Look }> = {
  minami: { name: 'ミナミ先輩', look: { hair: 'long', hairColor: '#7a2e3a', skin: '#f6c9a0', jacket: '#c8323c', tie: '#f4f1e8', pants: '#2a2a3a' } },
  shihainin: { name: '支配人', look: { hair: 'buzz', hairColor: '#b8b0a8', skin: '#e8b083', jacket: '#6b4a2b', tie: '#2f5d50', pants: '#3a3036', glasses: true } },
  jin: { name: 'ジン（令和モンスター）', look: { hair: 'spiky', hairColor: '#c8c8d8', skin: '#f6c9a0', jacket: '#1e1a22', tie: '#8a5cff', pants: '#1e1a22' } },
  haha: { name: '母（電話）' },
};

export interface Scene {
  id: string;
  title: string;
  trigger: 'yearStart' | 'afterRound';
  cond: (s: GameState) => boolean;
  lines: [Speaker, string][];
}

// {B}=ボケの名前 {T}=ツッコミの名前 {C}=コンビ名
export const SCENES: Scene[] = [
  {
    id: 'prologue', title: '第1話　はじまりの劇場', trigger: 'yearStart', cond: (s) => s.year === 1,
    lines: [
      ['N', '結成1年目の春。{C}は、小さな劇場のオーディションに合格した。'],
      ['shihainin', 'ほな今日から、うちの劇場の若手や。客は少ないけど、舞台は本物やで'],
      ['B', '{T}、ついにここまで来たな！'],
      ['T', 'アホ。まだスタートラインにも立ってへんわ'],
      ['minami', '新人さん？ 私、ミナミ。ここで10年やってる'],
      ['minami', '知ってる？ 年に一度の「笑王グランプリ」。結成15年目までしか出られへん、漫才の頂点や'],
      ['B', '笑王……！'],
      ['minami', '15年なんて、あっという間やで。悔いのないようにな'],
      ['N', 'こうして、{C}の15年が始まった。\n予選は毎年8月後半から。それまでにネタを鍛えよう！'],
    ],
  },
  {
    id: 'rival', title: '第2話　同期', trigger: 'yearStart', cond: (s) => s.year === 2,
    lines: [
      ['N', '結成2年目の春。楽屋に、同期の男が現れた。'],
      ['jin', 'お前らが{C}か。去年の予選、見たで'],
      ['jin', '悪くない。けど俺ら「令和モンスター」は、いずれ決勝に行く'],
      ['T', '……同期やのに、えらい自信やな'],
      ['B', 'おもろいやん。負けへんで！'],
      ['jin', 'ほな、決勝で会おか'],
    ],
  },
  {
    id: 'third', title: '先輩の言葉', trigger: 'afterRound', cond: (s) => s.round >= 3,
    lines: [
      ['minami', '3回戦突破、おめでとう。ここからが本当の勝負や'],
      ['minami', '準々決勝からは、客の目も審査員の目も変わる'],
      ['minami', 'ボケとツッコミだけちゃう。ネタの完成度と「間」、全部が見られるで'],
      ['T', '……ネタ、もっと詰めなあかんな'],
    ],
  },
  {
    id: 'tori', title: '第3話　出番が増えた', trigger: 'yearStart', cond: (s) => s.year === 4,
    lines: [
      ['shihainin', '{C}、来月から出番増やしたるわ'],
      ['shihainin', 'お客さんアンケートで、名前書いてくれる人が出てきたんや'],
      ['B', 'ほんまですか！'],
      ['shihainin', '調子乗ったらすぐ戻すけどな'],
    ],
  },
  {
    id: 'haha', title: '第4話　実家からの電話', trigger: 'yearStart', cond: (s) => s.year === 5,
    lines: [
      ['N', '結成5年目。実家から電話が来た。'],
      ['haha', '元気にしとる？ ちゃんとご飯食べとる？'],
      ['haha', '……そろそろ、ちゃんとした仕事も考えたら？'],
      ['B', '……もうちょっとだけ、やらせて。絶対、テレビ出るから'],
      ['N', '電話を切ったあと、{T}は何も聞かずにネタ帳を開いた。'],
    ],
  },
  {
    id: 'final_first', title: '決勝進出', trigger: 'afterRound', cond: (s) => s.round >= 5,
    lines: [
      ['N', '準決勝の結果発表。ステージに並ぶ芸人たち。名前が、呼ばれた――'],
      ['B', '……え？ 今、{C}って言うた？'],
      ['T', '言うた……言うたぞ！！'],
      ['minami', 'おめでとう。……ほんまに、おめでとう'],
      ['jin', '……やっと来たか。待ちくたびれたわ'],
    ],
  },
  {
    id: 'minami_bye', title: '第5話　託されたもの', trigger: 'yearStart', cond: (s) => s.year === 8,
    lines: [
      ['minami', '私な、もう笑王グランプリには出られへんねん。ラストイヤーも、あかんかった'],
      ['minami', 'それでな……芸人、辞めることにした'],
      ['T', 'ミナミさん……'],
      ['minami', 'そんな顔せんといて。あんたらの漫才、私、好きやで'],
      ['minami', '私の分まで、獲ってきてな'],
      ['B', '……絶対、獲ります'],
    ],
  },
  {
    id: 'jin10', title: '第6話　ライバル', trigger: 'yearStart', cond: (s) => s.year === 10,
    lines: [
      ['N', '結成10年目。同期の令和モンスターは、決勝の常連になっていた。'],
      ['jin', 'まだやってたんか。……いや、嫌味ちゃう'],
      ['jin', 'お前らと決勝で当たりたいねん。それだけや'],
      ['T', '言われんでも、行ったるわ'],
    ],
  },
  {
    id: 'ato3', title: '第7話　あと3回', trigger: 'yearStart', cond: (s) => s.year === 13,
    lines: [
      ['T', 'あと3回か'],
      ['B', '「3回もある」、や'],
      ['T', '……お前のそういうとこ、昔から嫌いちゃうで'],
    ],
  },
  {
    id: 'last', title: '最終話　ラストイヤー', trigger: 'yearStart', cond: (s) => s.year === 15,
    lines: [
      ['N', '結成15年目。最後の笑王グランプリ。'],
      ['shihainin', 'ラストイヤーか。……劇場のみんな、応援しとるで'],
      ['B', '{T}。最後、楽しもな'],
      ['T', '楽しんで、獲るんや'],
    ],
  },
];

import type { Combo } from '../types';

const SKIN = '#f6c9a0';
const SKIN2 = '#e8b083';

export const COMBOS: Combo[] = [
  {
    id: 'stardust',
    name: 'スターダスト急行',
    style: '動き回る天才ボケ × 早口たとえツッコミ',
    desc: '結成したばかりの若き新星。勢いと華で駆け上がれ！',
    difficulty: 'かんたん',
    startYear: 1,
    boke: { name: 'ハヤテ', look: { hair: 'spiky', hairColor: '#2a2230', skin: SKIN, jacket: '#f08a24', tie: '#ffe066', pants: '#3a3550' } },
    tsukkomi: { name: 'タマキ', look: { hair: 'bowl', hairColor: '#5a3825', skin: SKIN, jacket: '#2f4fa8', tie: '#e84a5f', pants: '#2a2a3a' } },
    stats: { boke: 28, tsukkomi: 26, neta: 18, ma: 18, hana: 30, mental: 18, nakama: 45 },
    growth: { boke: 1.2, hana: 1.2 },
    deck: ['boke_basic', 'boke_move', 'tsuk_basic', 'tsuk_tatoe', 'tsukami', 'sd_tatoe'],
    ultimate: 'sd_run',
    ultimateEvent: 'ハヤテ「なあ、マイクの前におらんでもウケる気がしてきた」\nタマキ「……走るつもりやろ」\n\n舞台を全力で駆け回る新しいボケが生まれた！',
    homeLines: [
      ['B', '今日もいっぱい動くでー！'],
      ['T', '例えのストック、100個はあるで'],
      ['B', '笑王グランプリ、最年少で獲ったろ！'],
      ['T', 'お前はまずネタ覚えろ'],
    ],
  },
  {
    id: 'metropolis',
    name: 'メトロポリス',
    style: 'やさぐれ毒舌ツッコミ',
    desc: '斜に構えた都会派コンビ。毒で客席を刺せ！',
    difficulty: 'ふつう',
    startYear: 3,
    boke: { name: 'ヨシオ', look: { hair: 'buzz', hairColor: '#8a7a6a', skin: SKIN2, jacket: '#7d8597', tie: '#2a2a3a', pants: '#3a3a48' } },
    tsukkomi: { name: 'カズマ', look: { hair: 'part', hairColor: '#1e1a22', skin: SKIN, jacket: '#26222e', tie: '#c8323c', pants: '#26222e', glasses: true } },
    stats: { boke: 25, tsukkomi: 34, neta: 28, ma: 25, hana: 18, mental: 30, nakama: 35 },
    growth: { tsukkomi: 1.2, mental: 1.2 },
    deck: ['boke_basic', 'aruaru', 'tsuk_basic', 'oogoe', 'ma_tame', 'me_doku'],
    ultimate: 'me_bakuhatsu',
    ultimateEvent: 'カズマのぼやきがネットで話題に。\nカズマ「……別に狙ってないけど」\nヨシオ「めっちゃニヤけてんじゃん」\n\n溜め込んだ毒を一気に放つ新ネタが完成した！',
    homeLines: [
      ['T', 'どうせ今年も3回戦だろ'],
      ['B', 'そういうこと言うなって'],
      ['T', '売れたら全員見返してやる'],
      ['B', 'カズマ、今日も目が死んでるね'],
    ],
  },
  {
    id: 'nevermore',
    name: 'ネバーモア',
    style: '淡々と狂っていくしゃべくり',
    desc: '技巧派の中堅コンビ。静かな狂気で会場を飲み込め。',
    difficulty: 'ふつう',
    startYear: 5,
    boke: { name: 'サトル', look: { hair: 'part', hairColor: '#191820', skin: SKIN, jacket: '#2f5d50', tie: '#d9d4c7', pants: '#22302c' } },
    tsukkomi: { name: 'ケンジ', look: { hair: 'short', hairColor: '#6b4a2b', skin: SKIN2, jacket: '#c7b18a', tie: '#7a2e3a', pants: '#4a4036' } },
    stats: { boke: 34, tsukkomi: 28, neta: 36, ma: 36, hana: 16, mental: 24, nakama: 32 },
    growth: { ma: 1.2, neta: 1.2 },
    deck: ['boke_basic', 'tenon', 'tsuk_basic', 'noritsuk', 'kaishu', 'nm_tantan'],
    ultimate: 'nm_kyouki',
    ultimateEvent: 'ネタ合わせ中、サトルが急に黙り込んだ。\nサトル「……ケンジ、怖いって、ウケるんじゃないか」\nケンジ「お前が一番怖いわ」\n\n静かな狂気が開花した！',
    homeLines: [
      ['B', '……今日、いい天気ですね'],
      ['T', '曇っとるけどな'],
      ['B', '間、もう0.2秒伸ばしたい'],
      ['T', '細かすぎて誰も気づかんて'],
    ],
  },
  {
    id: 'radiostar',
    name: 'ラジオスター',
    style: '堂々とズレていく漫才',
    desc: '崖っぷちの遅咲きコンビ。仲は最悪、残り時間はわずか。',
    difficulty: 'むずかしい',
    startYear: 8,
    boke: { name: 'ムネオ', look: { hair: 'buzz', hairColor: '#2a2026', skin: SKIN, jacket: '#d9a52b', tie: '#f4f1e8', shirt: '#f4f1e8', pants: '#5a4a3a' } },
    tsukkomi: { name: 'ワカ', look: { hair: 'short', hairColor: '#2a2026', skin: SKIN, jacket: '#5f87b8', tie: '#2a2a3a', pants: '#2a2a3a' } },
    stats: { boke: 32, tsukkomi: 30, neta: 30, ma: 28, hana: 28, mental: 30, nakama: 18 },
    growth: { hana: 1.2, nakama: 1.3 },
    deck: ['boke_basic', 'boke_move', 'tsuk_basic', 'tsuk_tatoe', 'tsukami', 'rs_zure'],
    ultimate: 'rs_doudou',
    ultimateEvent: 'ムネオ「ワカ、俺はもう、ズレを極める！」\nワカ「……初めてお前の目を見て話した気がする」\n\n胸を張って全部間違える、新しい漫才が生まれた！',
    homeLines: [
      ['B', '今年こそ、俺の時代が来る！'],
      ['T', '……（目を合わせない）'],
      ['B', 'ワカ、今日の俺どう？'],
      ['T', '別に……いつも通りだよ'],
    ],
  },
];

export const comboById = (id: string) => COMBOS.find((c) => c.id === id)!;

/** 決勝のライバル（架空） */
export const RIVALS = [
  { name: 'ゴールデンアワー', power: 98 },
  { name: 'ハイボール兄弟', power: 102 },
  { name: 'ねじれ座', power: 106 },
  { name: 'ミッドナイト旅団', power: 110 },
  { name: 'ちくわ大明神', power: 113 },
  { name: 'サンセット通信', power: 116 },
  { name: 'ぺんぎん製作所', power: 120 },
  { name: 'カゲロウ', power: 124 },
  { name: '令和モンスター', power: 130 },
];

export const JUDGES = ['上方の重鎮', '元王者', '放送作家', '落語家', 'ベテラン女性漫才師'];

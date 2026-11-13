import type { Card } from '../types';

const list: Card[] = [
  {
    id: 'boke_basic', name: '王道ボケ', type: 'boke', base: 10, stat: 'boke',
    desc: '基本のボケ。ツッコミにつなげよう',
    lines: [
      [['B', '最近、冷蔵庫と文通してるねん'], ['T', '返事来るか！']],
      [['B', '将来の夢は、信号機の黄色です'], ['T', '真ん中に憧れるな！']],
      [['B', '休みの日は、駅の券売機を応援してます'], ['T', '何を頑張らせとんねん！']],
    ],
  },
  {
    id: 'boke_move', name: '動きのボケ', type: 'boke', base: 9, stat: 'hana',
    desc: '体を張るボケ。華が高いほど強い',
    lines: [
      [['B', '（突然スライディングで登場）'], ['T', '普通に歩いてこい！']],
      [['B', '（全身でエレベーターを表現する）'], ['T', '伝わるかそんなもん！']],
    ],
  },
  {
    id: 'tsuk_basic', name: 'なんでやねん', type: 'tsukkomi', base: 9, stat: 'tsukkomi',
    desc: '基本のツッコミ。ボケのあとに出すとコンボ',
    lines: [
      [['B', 'ほな、ワシがお母さん役やるわ'], ['T', 'なんでやねん！']],
      [['B', '趣味は乾電池の味見です'], ['T', 'なんでやねん、やめとけ！']],
    ],
  },
  {
    id: 'tsuk_tatoe', name: '例えツッコミ', type: 'tsukkomi', base: 12, stat: 'tsukkomi',
    desc: 'センスが光るツッコミ',
    lines: [
      [['B', '今日の朝ごはん、ガムだけ'], ['T', '燃費のええスポーツカーか！']],
      [['B', 'この服、3年洗ってへん'], ['T', '秘伝のタレみたいに継ぎ足すな！']],
    ],
  },
  {
    id: 'ma_tame', name: '間を溜める', type: 'ma', base: 5, stat: 'ma', effect: 'tame',
    desc: '次のカードの点数が1.4倍になる',
    lines: [
      [['B', '……'], ['T', '……いや、なんか言えや']],
      [['B', '（じっと客席を見つめる）'], ['T', '……長いねん']],
    ],
  },
  {
    id: 'tsukami', name: '自己紹介ツカミ', type: 'special', base: 8, stat: 'hana', effect: 'tsukami',
    desc: '「つかみ」で出すと1.6倍',
    lines: [
      [['B', 'どうもー！顔と名前だけでも覚えて帰ってください！'], ['T', 'ネタも覚えて帰って！']],
      [['B', '今日のお客さん、全員親戚に見えます'], ['T', '親近感の出し方おかしいやろ']],
    ],
  },
  {
    id: 'tenon', name: '天丼', type: 'boke', base: 6, stat: 'boke', effect: 'tenon',
    desc: 'それまでに出したボケの数だけ加点',
    lines: [
      [['B', '……で、冷蔵庫がな'], ['T', 'また冷蔵庫か！']],
      [['B', '（さっきと同じ顔をする）'], ['T', 'それもうええって！']],
    ],
  },
  {
    id: 'kaishu', name: '伏線回収', type: 'special', base: 12, stat: 'neta', effect: 'kaishu',
    desc: '「オチ」で出すと2倍、それ以外は半分',
    lines: [
      [['B', 'ほな最初の冷蔵庫に、帰らせてもらいます'], ['T', 'そこ繋がるんかい！']],
      [['B', 'だから言うたやろ、黄色が一番やって'], ['T', '最初のフリ回収すな！']],
    ],
  },
  {
    id: 'aruaru', name: 'あるあるボケ', type: 'boke', base: 11, stat: 'neta',
    desc: 'ネタ力で決まる共感ボケ',
    lines: [
      [['B', 'エレベーターで「閉」連打する人おるよな'], ['T', 'おるけど、お前がそれや！']],
      [['B', 'リモコン探してたら手に持ってるやつ'], ['T', '今まさに持っとるやないか！']],
    ],
  },
  {
    id: 'oogoe', name: '大声ツッコミ', type: 'tsukkomi', base: 11, stat: 'mental',
    desc: '度胸（メンタル）で押し切る',
    lines: [
      [['B', '僕、実はロボットなんです'], ['T', 'いやいやいやいや！！']],
      [['B', 'ここで一曲歌います'], ['T', '歌うなァァ！！']],
    ],
  },
  {
    id: 'noritsuk', name: 'ノリツッコミ', type: 'tsukkomi', base: 13, stat: 'ma',
    desc: '間の取り方がカギ',
    lines: [
      [['B', 'ほな、お前お寿司屋さんやって'], ['T', 'へいらっしゃい！何握りましょ……ってやるか！']],
    ],
  },
  {
    id: 'rush', name: '畳みかけ', type: 'special', base: 6, stat: 'ma', effect: 'rush',
    desc: '会場が温まっているほど強い',
    lines: [
      [['B', 'あとな、それとな、もう一個な'], ['T', '多い多い多い！畳みかけんな！']],
    ],
  },
  // --- スターダスト急行 ---
  {
    id: 'sd_tatoe', name: '早口たとえ連打', type: 'tsukkomi', base: 16, stat: 'tsukkomi',
    desc: '【得意技】例えを3連発',
    lines: [
      [['B', '休みの日は家でずっと寝てる'], ['T', '冬眠中のクマか！充電中のスマホか！日曜の父親か！']],
    ],
  },
  {
    id: 'sd_run', name: '全力疾走ボケ', type: 'boke', base: 22, stat: 'hana',
    desc: '【奥義】舞台を縦横無尽に走る',
    lines: [
      [['B', '（舞台の端から端まで全力で走る）'], ['T', 'マイクから離れんな！何メートル行くねん！']],
    ],
  },
  // --- メトロポリス ---
  {
    id: 'me_doku', name: '毒舌ツッコミ', type: 'tsukkomi', base: 15, stat: 'mental',
    desc: '【得意技】切れ味鋭い一言',
    lines: [
      [['B', '俺、インスタのフォロワー50人いるんだよ'], ['T', 'それ全員親戚だろ']],
      [['B', '最近、自分探しの旅に出てて'], ['T', 'お前はまず家の鍵を探せ']],
    ],
  },
  {
    id: 'me_bakuhatsu', name: '皮肉の大爆発', type: 'tsukkomi', base: 22, stat: 'tsukkomi',
    desc: '【奥義】溜め込んだ毒を一気に放つ',
    lines: [
      [['B', '将来は、みんなに愛される人になりたい'], ['T', 'まず自分を愛せるようになってから言え。話はそれからだ']],
    ],
  },
  // --- ネバーモア ---
  {
    id: 'nm_tantan', name: '淡々ボケ', type: 'boke', base: 15, stat: 'ma',
    desc: '【得意技】表情を変えずに狂う',
    lines: [
      [['B', '昨日、家に帰ったら知らない人がいました'], ['T', 'え、大丈夫？'], ['B', 'はい。一緒にご飯を食べました'], ['T', '受け入れんな！']],
    ],
  },
  {
    id: 'nm_kyouki', name: '静かな狂気', type: 'boke', base: 22, stat: 'boke',
    desc: '【奥義】客席がざわつくほどの不穏さ',
    lines: [
      [['B', '（静かに）……実はこの漫才、今日で3回目なんです'], ['T', 'え？……え？？ 怖い怖い怖い！']],
    ],
  },
  // --- ラジオスター ---
  {
    id: 'rs_zure', name: 'ズレ漫才', type: 'special', base: 14, stat: 'nakama', effect: 'combo',
    desc: '【得意技】コンビ仲が高いほど噛み合う「ズレ」',
    lines: [
      [['B', '僕ね、最近ジムに通い始めて'], ['T', 'おお、いいじゃない'], ['B', '受付のお姉さんと友達になりました'], ['T', '筋肉の話じゃないのかよ！']],
    ],
  },
  {
    id: 'rs_doudou', name: '堂々たるズレ', type: 'special', base: 22, stat: 'hana', effect: 'combo',
    desc: '【奥義】胸を張って、全部間違える',
    lines: [
      [['B', '（胸を張って）本日は、晴天なり！'], ['T', '土砂降りだよ！どこ見て言ってんだ！']],
    ],
  },
];

export const CARDS: Record<string, Card> = Object.fromEntries(list.map((c) => [c.id, c]));

/** ネタ作り・劇場で拾える汎用カード */
export const COMMON_POOL = ['boke_basic', 'boke_move', 'tsuk_basic', 'tsuk_tatoe', 'ma_tame', 'tsukami', 'tenon', 'kaishu', 'aruaru', 'oogoe', 'noritsuk', 'rush'];

export const TYPE_LABEL: Record<Card['type'], string> = {
  boke: 'ボケ',
  tsukkomi: 'ツッコミ',
  ma: '間',
  special: '技',
};

# ドット漫才 〜目指せ笑王グランプリ〜

架空の若手漫才コンビを育てて「笑王グランプリ」優勝を目指す、スマホ縦画面向けの育成シミュレーション。

## 動かし方
```bash
npm install
npm run dev      # → http://localhost:5173 （同じWi-Fiのスマホからは表示される Network のURLで）
npm run build    # dist/ に静的ファイルを出力（GitHub Pages / Vercel にそのまま置ける）
```

## 構成
- `src/data/` … コンビ・ネタカード・イベント（中身を増やすときはここを編集する）
- `src/logic.ts` … 育成ロジック・大会日程・セーブ（`GROWTH` で成長速度を調整できる）
- `src/battle.ts` … 漫才バトルの点数計算
- `src/sprites.ts` … ドット絵キャラの生成（16×20）
- `docs/design.md` … 企画書

## 音楽・効果音
音楽：[魔王魂](https://maou.audio/)（`public/audio/`。魔王魂の利用規約に従って使用）

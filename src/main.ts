import './style.css';
import type { ActionId, Card, CardType, GameState } from './types';
import { STAT_DESC, STAT_KEYS, STAT_LABEL } from './types';
import { COMBOS, JUDGES, RIVALS, comboById } from './data/combos';
import { CARDS, TYPE_LABEL } from './data/cards';
import { EVENTS, KAISAN, type GameEvent } from './data/events';
import {
  ACTIONS, LAST_YEAR, ROUNDS, TURNS_PER_YEAR, actionLevel, currentRound, SLOTS, saveSlot, loadSlot, deleteSlot, migrateOldSave, doAction, failRate,
  newGame, nextRoundInfo, payLiving, pick, rand, rank, recordResult, turnLabel, yearResultLabel, yen,
  addCard,
} from './logic';
import { PHASES, PRESSURE, applyNerves, cardScore, drawHand, judgeScores, nerves, netaBonus, reaction, rivalScore, stars, type BattleCtx } from './battle';
import { cardLines } from './data/voices';
import { drawMic, drawPerson } from './sprites';
import { bgm, currentBgm, isSoundOn, se, setSound, stopBgm, unlockOnFirstTouch, type BgmName } from './audio';
import { makeRecordCard } from './recordCard';
import { NPC, SCENES, type Scene, type SceneLine, type Speaker } from './data/story';

const app = document.getElementById('app')!;
let S: GameState;
let busy = false;
/** 1手戻す用のスナップショット（大会・年越しを挟んだら消える） */
let undoSnap: string | null = null;
/** いま遊んでいるセーブスロット */
let slot = 1;
const save = (s: GameState) => saveSlot(slot, s);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const br = (t: string) => t.replace(/\n/g, '<br>');

// ---------------- 共通UI ----------------
function modal(title: string, body: string, buttons: string[], cls = ''): Promise<number> {
  return new Promise((res) => {
    const el = document.createElement('div');
    el.className = 'modal-bg';
    el.innerHTML = `<div class="win modal ${cls}">
      ${title ? `<div class="modal-title">${title}</div>` : ''}
      <div class="modal-body">${body}</div>
      <div class="modal-btns">${buttons.map((b, i) => `<button class="btn" data-i="${i}">${b}</button>`).join('')}</div>
    </div>`;
    el.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
      b.addEventListener('click', () => { el.remove(); res(Number(b.dataset.i)); }),
    );
    document.body.appendChild(el);
  });
}

const resultList = (lines: string[]) =>
  `<ul class="gains">${lines.map((l) => {
    const cls = /[+＋]\d/.test(l) && !/-\d/.test(l) ? 'up' : /-\d/.test(l) ? 'down' : '';
    return `<li class="${cls}">${l}</li>`;
  }).join('')}</ul>`;

function stage(comboId: string, opts: { mic?: boolean; scale?: number } = {}): HTMLElement {
  const c = comboById(comboId);
  const scale = opts.scale ?? 4;
  const el = document.createElement('div');
  el.className = 'stage';
  el.innerHTML = `<div class="curtain l"></div><div class="curtain r"></div><div class="spot"></div>
    <div class="bubble" hidden></div>
    <div class="duo"><div class="who b"></div>${opts.mic ? '<div class="mic"></div>' : ''}<div class="who t"></div></div>
    <div class="floor"></div><div class="react" hidden></div>`;
  const b = el.querySelector('.who.b')!;
  const t = el.querySelector('.who.t')!;
  b.append(drawPerson(c.boke.look, scale));
  t.append(drawPerson(c.tsukkomi.look, scale));
  b.insertAdjacentHTML('beforeend', `<span class="nm">${c.boke.name}</span>`);
  t.insertAdjacentHTML('beforeend', `<span class="nm">${c.tsukkomi.name}</span>`);
  if (opts.mic) el.querySelector('.mic')!.append(drawMic(scale));
  return el;
}

function say(st: HTMLElement, speaker: 'B' | 'T', text: string) {
  const bub = st.querySelector<HTMLElement>('.bubble')!;
  bub.hidden = false;
  bub.className = `bubble ${speaker === 'B' ? 'left' : 'right'}`;
  bub.textContent = text;
  st.querySelectorAll('.who').forEach((w) => w.classList.remove('talk'));
  st.querySelector(speaker === 'B' ? '.who.b' : '.who.t')!.classList.add('talk');
}

// ---------------- セーブスロット ----------------
function slotLabel(n: number): string {
  const d = loadSlot(n);
  if (!d) return `<span class="slot">スロット${n}<small>（空き）</small></span>`;
  const at = d.savedAt ? new Date(d.savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return `<span class="slot">スロット${n}${n === slot && S ? ' ▶' : ''}<b>${comboById(d.comboId).name}</b><small>結成${d.year}年目 ${turnLabel(d.turn)}　${at}</small></span>`;
}
async function pickSlot(title: string, onlyFilled = false): Promise<number | null> {
  const nums = onlyFilled ? SLOTS.filter((n) => loadSlot(n)) : SLOTS;
  const i = await modal(title, '', [...nums.map(slotLabel), 'もどる']);
  return i < nums.length ? nums[i] : null;
}
function toast(text: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

/** コンビの方言でセリフを切り替える（関西弁, 標準語） */
const kv = (kansai: string, std: string) => (comboById(S.comboId).kansai ? kansai : std);

// ---------------- ストーリー ----------------
function fill(t: string): string {
  const c = comboById(S.comboId);
  return t.replace(/\{Y\}/g, String(S.year)).replace(/\{B\}/g, c.boke.name).replace(/\{T\}/g, c.tsukkomi.name).replace(/\{C\}/g, c.name);
}
function speakerInfo(sp: Speaker): { name: string; look?: import('./types').Look } {
  const c = comboById(S.comboId);
  if (sp === 'B') return { name: c.boke.name, look: c.boke.look };
  if (sp === 'T') return { name: c.tsukkomi.name, look: c.tsukkomi.look };
  if (sp === 'N') return { name: '' };
  return NPC[sp];
}

function playScene(sc: Scene, music: BgmName = 'story'): Promise<void> {
  const prevBgm: BgmName | null = currentBgm();
  bgm(music);
  return new Promise((res) => {
    const el = document.createElement('div');
    el.className = 'scene';
    el.innerHTML = `<div class="scene-inner">
      <div class="scene-title">${sc.title}</div>
      <div class="scene-stage"></div>
      <div class="win msgbox"><div class="portrait"></div><div class="mb"><div class="spk"></div><div class="txt"></div></div><div class="nx">▼</div></div>
      <div class="scene-foot"><span>タップで次へ</span><button class="btn sm skip">スキップ ≫</button></div>
    </div>`;
    const st = stage(S.comboId, { scale: 4 });
    el.querySelector('.scene-stage')!.append(st);
    const portrait = el.querySelector<HTMLElement>('.portrait')!;
    const spk = el.querySelector<HTMLElement>('.spk')!;
    const txt = el.querySelector<HTMLElement>('.txt')!;
    const box = el.querySelector<HTMLElement>('.msgbox')!;
    let i = 0;
    const end = () => { el.remove(); if (prevBgm) bgm(prevBgm); res(); };
    const next = () => {
      if (i >= sc.lines.length) return end();
      const [sp, kan, std] = sc.lines[i++];
      const raw = std && !comboById(S.comboId).kansai ? std : kan;
      const info = speakerInfo(sp);
      portrait.innerHTML = '';
      if (info.look) portrait.append(drawPerson(info.look, 3));
      else if (sp !== 'N') portrait.textContent = '📞';
      box.classList.toggle('narr', sp === 'N');
      spk.textContent = info.name;
      txt.innerHTML = br(fill(raw));
      st.querySelectorAll('.who').forEach((w) => w.classList.remove('talk'));
      if (sp === 'B' || sp === 'T') st.querySelector(sp === 'B' ? '.who.b' : '.who.t')!.classList.add('talk');
    };
    el.addEventListener('click', () => { se('menu'); next(); });
    el.querySelector('.skip')!.addEventListener('click', (e) => { e.stopPropagation(); end(); });
    document.body.append(el);
    next();
  });
}

async function checkStory(trigger: Scene['trigger']) {
  for (const sc of SCENES) {
    if (sc.trigger !== trigger || S.flags['story_' + sc.id] || !sc.cond(S)) continue;
    S.flags['story_' + sc.id] = 1;
    await playScene(sc);
  }
}

// ---------------- タイトル ----------------
function renderTitle() {
  bgm('title');
  const anySave = SLOTS.some((n) => loadSlot(n));
  app.innerHTML = `<div class="screen title">
    <div class="logo"><div class="sub">ドット漫才</div><h1>目指せ<br><span>笑王</span>グランプリ</h1></div>
    <div class="title-stage"></div>
    <div class="menu">
      <button class="btn big" id="new">はじめから</button>
      ${anySave ? '<button class="btn big" id="cont">つづきから</button>' : ''}
    </div>
    <div class="sub-menu">
      ${isStandalone() ? '' : '<button class="btn sm" id="install">📱 ホームに追加</button>'}
      <button class="btn sm" id="share">🔗 友達にシェア</button>
    </div>
    <p class="note">※登場するコンビ・大会はすべて架空です<br>音楽：<a href="https://maou.audio/" target="_blank" rel="noopener">魔王魂</a></p>
  </div>`;
  const ts = app.querySelector('.title-stage')!;
  const pair = COMBOS.slice(0, 4);
  pair.forEach((c, i) => {
    const w = document.createElement('div');
    w.className = 'mini';
    w.style.animationDelay = `${i * 0.15}s`;
    w.append(drawPerson(c.boke.look, 3), drawPerson(c.tsukkomi.look, 3));
    ts.append(w);
  });
  app.querySelector('#new')!.addEventListener('click', async () => {
    const n = await pickSlot('どのスロットで始めますか？');
    if (n === null) return;
    if (loadSlot(n) && (await modal('', `スロット${n}のデータは上書きされます。<br>よろしいですか？`, ['はじめから', 'やめる'])) !== 0) return;
    slot = n;
    renderSelect();
  });
  app.querySelector('#install')?.addEventListener('click', showInstall);
  app.querySelector('#share')!.addEventListener('click', share);
  app.querySelector('#cont')?.addEventListener('click', async () => {
    const n = await pickSlot('どのデータで遊びますか？', true);
    if (n === null) return;
    S = loadSlot(n)!;
    slot = n;
    undoSnap = null;
    renderHome();
  });
}

// ---------------- コンビ選択 ----------------
function renderSelect() {
  app.innerHTML = `<div class="screen select"><div class="win head"><button class="btn sm back" id="back">← もどる</button><span>コンビを選んでください</span></div><div class="list"></div></div>`;
  app.querySelector('#back')!.addEventListener('click', renderTitle);
  const list = app.querySelector('.list')!;
  for (const c of COMBOS) {
    const card = document.createElement('button');
    card.className = 'win combo-card';
    card.innerHTML = `<div class="sprites"></div>
      <div class="info">
        <div class="cname">${c.name}</div>
        <div class="cstyle">${c.style}</div>
        <div class="cdesc">${c.desc}</div>
        <div class="cmeta"><span class="diff">${c.difficulty}</span>${c.note}</div>
        <div class="cbars">${STAT_KEYS.map((k) => `<span><small>${STAT_LABEL[k]}</small><i style="width:${c.stats[k] * 2}%"></i></span>`).join('')}</div>
      </div>`;
    card.querySelector('.sprites')!.append(drawPerson(c.boke.look, 3), drawPerson(c.tsukkomi.look, 3));
    card.addEventListener('click', async () => {
      const ok = await modal(c.name, `ボケ：${c.boke.name}　ツッコミ：${c.tsukkomi.name}<br><br>${c.desc}<br><br>このコンビで笑王を目指しますか？`, ['決定！', 'もどる']);
      if (ok !== 0) return;
      S = newGame(c.id);
      undoSnap = null;
      save(S);
      renderHome();
      await checkStory('yearStart');
      save(S);
    });
    list.append(card);
  }
}

// ---------------- ホーム（育成） ----------------
function renderHome() {
  bgm('home');
  const c = comboById(S.comboId);
  app.innerHTML = `<div class="screen home">
    <div class="win hud">
      <div><b>${c.name}</b></div>
      <div class="row"><span>結成<b>${S.year}</b>年目</span><span class="when">${turnLabel(S.turn)}</span></div>
      <div class="row"><span class="${S.money < 0 ? 'neg' : ''}">💴 ${yen(S.money)}</span><span>⭐ 人気 ${S.popularity}</span></div>
    </div>
    <div class="stage-wrap"></div>
    <div class="win next">${nextRoundInfo(S)}</div>
    <div class="win stats" id="stats" title="タップで説明">
      ${STAT_KEYS.map((k) => `<div class="stat"><span class="lb">${STAT_LABEL[k]}</span>
        <span class="bar"><i style="width:${S.stats[k]}%"></i></span>
        <span class="rk r-${rank(S.stats[k])}">${rank(S.stats[k])}</span><span class="v">${S.stats[k]}</span></div>`).join('')}
      <div class="stat stamina"><span class="lb">体力</span>
        <span class="bar hp ${S.stamina < 30 ? 'low' : ''}"><i style="width:${S.stamina}%"></i></span>
        <span class="v">${S.stamina}</span></div>
      <div class="stat-help">？ タップでステータスの説明</div>
    </div>
    <div class="actions">
      ${ACTIONS.map((a) => {
        const lv = actionLevel(S, a.id);
        const fr = failRate(S, a);
        const buff = S.buff?.action === a.id;
        return `<button class="btn act ${buff ? 'buff' : ''}" data-id="${a.id}">
          <span class="ic">${a.icon}</span><span class="an">${a.name}</span>
          <span class="lv">Lv${lv}</span>
          <span class="hint">${fr > 0 ? `<em>失敗${fr}%</em>` : a.hint}</span></button>`;
      }).join('')}
    </div>
    <div class="foot"><button class="btn sm" id="undo" ${undoSnap ? '' : 'disabled'}>↩ 1手戻る</button><button class="btn sm" id="save">💾 セーブ</button><button class="btn sm" id="deck">📒 ネタ帳</button><button class="btn sm" id="hist">📜 戦績</button><button class="btn sm" id="title">🏠</button></div>
  </div>`;
  const st = stage(S.comboId, { scale: 4 });
  app.querySelector('.stage-wrap')!.append(st);
  const [sp, tx] = pick(c.homeLines);
  say(st, sp, tx);

  app.querySelectorAll<HTMLButtonElement>('.act').forEach((b) =>
    b.addEventListener('click', () => takeTurn(b.dataset.id as ActionId)),
  );
  app.querySelector('#deck')!.addEventListener('click', showDeck);
  app.querySelector('#undo')!.addEventListener('click', async () => {
    if (!undoSnap || busy) return;
    if ((await modal('', '直前の行動を取り消して、<br>1ターン前に戻りますか？', ['戻る', 'やめる'])) !== 0) return;
    S = JSON.parse(undoSnap);
    undoSnap = null;
    save(S);
    renderHome();
  });
  app.querySelector('#hist')!.addEventListener('click', showHistory);
  app.querySelector('#stats')!.addEventListener('click', showStatHelp);
  app.querySelector('#title')!.addEventListener('click', async () => {
    if ((await modal('', 'タイトルに戻りますか？<br><small>（今の状態は自動でセーブされています）</small>', ['タイトルへ', 'やめる'])) !== 0) return;
    save(S);
    renderTitle();
  });
  app.querySelector('#save')!.addEventListener('click', async () => {
    const n = await pickSlot('どこにセーブしますか？');
    if (n === null) return;
    const other = loadSlot(n);
    if (n !== slot && other && (await modal('', `スロット${n}のデータを上書きしますか？`, ['上書きする', 'やめる'])) !== 0) return;
    slot = n;
    save(S);
    toast(`スロット${n}にセーブしました`);
  });
}

function showDeck() {
  const body = S.deck.map((id) => {
    const cd = CARDS[id];
    return `<div class="deck-item t-${cd.type}"><b>${cd.name}</b><span class="tag">${TYPE_LABEL[cd.type]}</span><span class="pw">基礎${cd.base}・${STAT_LABEL[cd.stat]}</span><div class="d">${cd.desc}</div></div>`;
  }).join('');
  modal('📒 ネタ帳', `<div class="deck">${body}</div>`, ['とじる'], 'tall');
}

function showStatHelp() {
  const rows = STAT_KEYS.map((k) => `<li><b>${STAT_LABEL[k]}</b>（${rank(S.stats[k])}）<br>${STAT_DESC[k]}</li>`).join('');
  const acts = ACTIONS.map((a) => `<li>${a.icon} ${a.name}：${a.hint}</li>`).join('');
  modal('📊 ステータスの効果', `<ul class="stat-desc">${rows}<li><b>体力</b><br>30を切ると練習が失敗しやすくなる。休むで回復</li></ul><div class="modal-sub">行動で上がるもの</div><ul class="stat-desc acts">${acts}</ul>`, ['とじる'], 'tall');
}

function showHistory() {
  const rows = S.history.length
    ? S.history.map((h) => `<li>結成${h.year}年目：<b>${h.result}</b></li>`).join('')
    : '<li>まだ記録がありません</li>';
  modal('📜 笑王グランプリ戦績', `<ul class="hist">${rows}</ul><p>最高成績：<b>${S.bestLabel}</b></p>`, ['とじる']);
}

// ---------------- ターン進行 ----------------
async function takeTurn(id: ActionId) {
  if (busy) return;
  busy = true;
  try {
    const snap = JSON.stringify(S);
    const yearBefore = S.year;
    const res = doAction(S, id);
    const lines = [...res.lines, ...payLiving(S)];
    if (res.levelUp) lines.push(`🎉 ${ACTIONS.find((a) => a.id === id)!.name}がLv${res.levelUp}に上がった！`);
    if (res.levelUp || lines.some((l) => l.includes('新ネタ'))) se('piro');
    // やっぱり別の行動にしたいときは、その場で取り消せる
    if ((await modal(res.title, resultList(lines), ['OK', '↩ 取り消して選び直す'])) === 1) {
      S = JSON.parse(snap); // 1つ前の「1手戻る」はそのまま使える
      save(S);
      renderHome();
      return;
    }

    const round = currentRound(S);
    if (!round) await maybeEvent();

    if (round) {
      const total = await runBattle(`${round.name}`, round.th, 'prelim');
      if (total >= round.th) {
        S.round++;
        se('correct');
        await modal('🎉 通過！', `${round.name}を <b>${total.toFixed(1)}点</b> で突破！<br>（目標 ${round.th}点）`, ['よっしゃ！']);
        await checkStory('afterRound');
      } else {
        S.alive = false;
        se('miss');
        await modal('😢 敗退…', `${round.name}で敗退…<br><b>${total.toFixed(1)}点</b>（目標 ${round.th}点）<br><br>今年は残りの時間で力を蓄えよう。`, ['来年こそ…']);
      }
    }

    S.turn++;
    if (S.turn >= TURNS_PER_YEAR) {
      if (S.alive && S.round >= ROUNDS.length) await runFinal();
      if (S.champion) { recordResult(S, '優勝'); save(S); await playLines('エピローグ　笑王', endingLines(true), 'ending'); renderEnding(true); return; }
      const ended = await yearEnd();
      if (ended) return;
    }
    // 大会があったターン・年をまたいだターンは戻せない
    undoSnap = round || S.year !== yearBefore ? null : snap;
    save(S);
    renderHome();
  } finally {
    busy = false;
  }
}

async function maybeEvent() {
  const c = comboById(S.comboId);
  let ev: GameEvent | undefined;
  if (S.stats.nakama < 20 && (S.flags.kaisan_cd ?? 0) <= 0) {
    ev = KAISAN;
    S.flags.kaisan_cd = 6;
  } else {
    if (S.flags.kaisan_cd) S.flags.kaisan_cd--;
    // コンビ専用の奥義イベント
    const progressed = (S.year - c.startYear) * TURNS_PER_YEAR + S.turn;
    if (!S.flags.ultimate && progressed >= 10 && Math.random() < 0.35) {
      S.flags.ultimate = 1;
      addCard(S, c.ultimate);
      se('sparkle');
      await modal('✨ 覚醒イベント', `${br(c.ultimateEvent)}<br><br><b>奥義「${CARDS[c.ultimate].name}」をネタ帳に追加！</b>`, ['すごい！']);
      return;
    }
    if (Math.random() > 0.32) return;
    const cands = EVENTS.filter((e) => (!e.cond || e.cond(S)) && (!e.max || (S.flags['ev_' + e.id] ?? 0) < e.max) && S.flags.last_ev_id !== EVENTS.indexOf(e));
    if (!cands.length) return;
    ev = pick(cands);
    S.flags.last_ev_id = EVENTS.indexOf(ev);
  }
  S.flags['ev_' + ev.id] = (S.flags['ev_' + ev.id] ?? 0) + 1;
  se('hatena');
  const i = await modal(`❗ ${ev.title}`, br(ev.text(S, c)), ev.choices.map((ch) => ch.label), 'event');
  const out = ev.choices[i].apply(S);
  await modal('', resultList(out), ['OK']);
}

async function yearEnd(): Promise<boolean> {
  const label = yearResultLabel(S);
  recordResult(S, label);
  const c = comboById(S.comboId);
  if (S.year >= LAST_YEAR) {
    save(S);
    await playLines('エピローグ　15年目の冬', endingLines(false));
    renderEnding(false);
    return true;
  }
  await modal('🎍 年末', `結成${S.year}年目が終わった。<br><br>今年の笑王グランプリ：<b>${label}</b><br><br>${c.boke.name}「${kv('来年こそ、獲ったろな', '来年こそ、獲ろうな')}」<br>${c.tsukkomi.name}「${kv('せやな', 'ああ')}」<br><br><small>体力が全回復した。出場できるのはあと${LAST_YEAR - S.year}回。</small>`, ['結成' + (S.year + 1) + '年目へ']);
  S.year++;
  S.turn = 0;
  S.round = 0;
  S.alive = true;
  S.stamina = 100;
  await checkStory('yearStart');
  return false;
}

// ---------------- 漫才バトル ----------------
function renderBattle(title: string, sub: string, gaugeMax: number, th: number | null) {
  app.innerHTML = `<div class="screen battle">
    <div class="win hud center"><div class="bt">🏆 笑王グランプリ ${title}</div><div class="bs">${sub}</div></div>
    <div class="stage-wrap"></div>
    <div class="win gauge-box">
      <div class="gauge"><i></i>${th ? `<b class="th" style="left:${Math.min(100, (th / gaugeMax) * 100)}%"></b>` : ''}</div>
      <div class="gnum"><span class="cur">0</span> 点</div>
    </div>
    <div class="phases">${PHASES.map((p, i) => `<span data-i="${i}">${p}</span>`).join('')}</div>
    <div class="hand"></div>
  </div>`;
  const st = stage(S.comboId, { mic: true, scale: 4 });
  app.querySelector('.stage-wrap')!.append(st);
  return st;
}

/** 4局面の漫才を行い、合計点を返す */
async function runBattle(title: string, th: number | null, mode: 'prelim' | 'final' | 'last'): Promise<number> {
  bgm(mode === 'prelim' ? 'battle' : 'final');
  const gaugeMax = th ? th * 1.4 : 190;
  const st = renderBattle(title, th ? `目標 ${th}点` : mode === 'last' ? '最終決戦' : '決勝 1stラウンド', gaugeMax, th);
  const gaugeEl = app.querySelector<HTMLElement>('.gauge i')!;
  const curEl = app.querySelector<HTMLElement>('.gnum .cur')!;
  const hand = app.querySelector<HTMLElement>('.hand')!;
  const react = st.querySelector<HTMLElement>('.react')!;
  let total = 0;
  const setGauge = (v: number) => {
    gaugeEl.style.width = `${Math.min(100, (v / gaugeMax) * 100)}%`;
    curEl.textContent = v.toFixed(1);
    if (th && v >= th) gaugeEl.classList.add('pass');
  };

  const combo = comboById(S.comboId);
  say(st, 'B', fill(combo.open[0]));
  await sleep(600);
  say(st, 'T', fill(combo.open[1]));
  total = netaBonus(S);
  await sleep(300);
  setGauge(total);
  hand.innerHTML = `<div class="info">ネタの完成度ボーナス +${total.toFixed(1)}</div>`;
  await sleep(700);
  // メンタル：大舞台ほど緊張する
  const ri = ROUNDS.findIndex((r) => r.name === title);
  const pressure = mode === 'prelim' ? PRESSURE.prelim[Math.max(0, ri)] : PRESSURE[mode];
  const nv = nerves(S.stats.mental, pressure);
  if (nv.calm || nv.miss > 0) {
    hand.innerHTML = `<div class="info">緊張度：<b class="${nv.calm ? 'calm' : 'nerve'}">${nv.label}</b>${nv.miss > 0 ? `<br><small>噛む確率 ${nv.miss}%（メンタルで下がる）</small>` : ''}</div>`;
    await sleep(1300);
  }

  const ctx: BattleCtx = { phase: 0, bokeCount: 0, tame: false, gauge: total };
  const deck = [...S.deck];
  for (let ph = 0; ph < 4; ph++) {
    ctx.phase = ph;
    ctx.gauge = total;
    app.querySelectorAll('.phases span').forEach((e, i) => e.classList.toggle('on', i === ph));
    const cards = drawHand(deck);
    const chosen = await chooseCard(hand, cards, ctx);
    const { score, tags } = cardScore(chosen, ctx, S);
    const nr = applyNerves(score, nv);
    if (nr.tag) tags.push(nr.tag);
    const final = nr.score * rand(0.88, 1.12);
    hand.innerHTML = `<div class="info">「${chosen.name}」${tags.map((t) => `<span class="tg ${t === '噛んだ…' ? 'bad' : ''}">${t}</span>`).join('')}</div>`;
    for (const [sp, tx] of pick(cardLines(chosen.id, S.comboId))) {
      say(st, sp, tx);
      await sleep(Math.min(1500, 650 + tx.length * 25));
    }
    const r = reaction(final);
    react.hidden = false;
    react.className = `react ${r.cls}`;
    react.textContent = r.text;
    se(r.cls === 'r4' ? 'sparkle' : r.cls === 'r3' ? 'pop' : r.cls === 'r1' ? 'oops' : 'click');
    total += final;
    setGauge(total);
    hand.innerHTML = `<div class="info">+${final.toFixed(1)}点</div>`;
    await sleep(900);
    react.hidden = true;
    // 状態更新
    ctx.tame = chosen.effect === 'tame';
    if (chosen.type === 'boke') ctx.bokeCount++;
    ctx.prevType = chosen.type as CardType;
  }
  say(st, 'T', combo.close);
  await sleep(1000);
  return total;
}

function chooseCard(hand: HTMLElement, cards: Card[], ctx: BattleCtx): Promise<Card> {
  return new Promise((res) => {
    hand.innerHTML = cards.map((cd, i) => {
      const { score, tags } = cardScore(cd, ctx, S);
      return `<button class="card t-${cd.type}" data-i="${i}">
        <span class="ctype">${TYPE_LABEL[cd.type]}</span>
        <span class="cname">${cd.name}</span>
        <span class="cstar">${stars(score)}</span>
        <span class="ctags">${tags.map((t) => `<em>${t}</em>`).join('')}</span>
        <span class="cdesc">${cd.desc}</span></button>`;
    }).join('');
    hand.querySelectorAll<HTMLButtonElement>('.card').forEach((b) =>
      b.addEventListener('click', () => res(cards[Number(b.dataset.i)]), { once: true }),
    );
  });
}

async function runFinal() {
  const c = comboById(S.comboId);
  await modal('🏆 12月 笑王グランプリ決勝', `ついに決勝の舞台へ――！<br><br>ライバル9組と得点を競い、<b>上位3組</b>が最終決戦に進める。`, ['いくぞ！']);
  const mine = await runBattle('決勝', null, 'final');
  const entries = [
    ...RIVALS.map((r) => ({ name: r.name, total: rivalScore(r.power), me: false })),
    { name: c.name, total: mine, me: true },
  ].map((e) => ({ ...e, judges: judgeScores(e.total) }));
  entries.forEach((e) => (e.total = e.judges.reduce((a, b) => a + b, 0)));
  entries.sort((a, b) => b.total - a.total);
  const myRank = entries.findIndex((e) => e.me) + 1;
  const me = entries.find((e) => e.me)!;
  const table = entries.map((e, i) => `<li class="${e.me ? 'me' : ''} ${i < 3 ? 'top' : ''}"><span>${i + 1}位</span><span>${e.name}</span><b>${e.total}</b></li>`).join('');
  await modal('審査結果', `<div class="judges">${JUDGES.map((j, i) => `<div><small>${j}</small><b>${me.judges[i]}</b></div>`).join('')}</div><ol class="rank">${table}</ol>`, ['…結果は？'], 'tall');
  S.finalInfo = { year: S.year, score: me.total, rank: myRank, rivals: entries.filter((e) => !e.me).slice(0, 2).map((e) => e.name) };
  if (myRank > 3) {
    await modal('決勝 ' + myRank + '位', `あと一歩、最終決戦に届かなかった…<br><br>${c.tsukkomi.name}「${kv('……来年や', '……来年だ')}」`, ['来年こそ']);
    return;
  }
  S.flags['finalist_' + S.year] = 1;
  const rivals = entries.filter((e) => !e.me).slice(0, 2);
  await modal('最終決戦進出！', `最終決戦に残ったのは――<br><br><b>${rivals[0].name}</b><br><b>${rivals[1].name}</b><br><b>${c.name}</b><br><br>泣いても笑っても、これが最後のネタ！`, ['勝負！']);
  if (rivals.some((r) => r.name === RIVAL_NAME)) {
    await playLines('最終決戦　舞台袖', [
      ['jin', 'やっと、ここで会えたな'],
      ['T', '……待たせたな'],
      ['jin', '結成1年目に言うたやろ。決勝で会おか、って'],
      ['B', '覚えてたんかい', '覚えてたのかよ'],
      ['jin', '忘れるかい。……手加減せえへんで'],
    ]);
  } else {
    await playLines('最終決戦　舞台袖', [
      ['N', '出番直前。舞台袖で、{B}と{T}は目を合わせた。'],
      ['B', '……{T}、手ぇ震えてるで', '……{T}、手、震えてるぞ'],
      ['T', 'お前もやろ', 'お前もだろ'],
      ['B', 'ほな、いつも通りいこか', 'じゃあ、いつも通りいこう'],
    ]);
  }
  const last = await runBattle('最終決戦', null, 'last');
  const finals = [
    { name: c.name, t: last, me: true },
    ...rivals.map((r) => ({ name: r.name, t: rivalScore(RIVALS.find((x) => x.name === r.name)!.power), me: false })),
  ];
  const votes = finals.map(() => 0);
  const voteBy: string[] = [];
  for (let j = 0; j < JUDGES.length; j++) {
    const scores = finals.map((f) => f.t + rand(-12, 12));
    const w = scores.indexOf(Math.max(...scores));
    votes[w]++;
    voteBy.push(finals[w].name);
  }
  const win = votes.indexOf(Math.max(...votes));
  S.finalInfo.votes = votes[0];
  await revealFinal(finals, voteBy, win);
  if (finals[win].me) {
    S.champion = true;
  } else {
    const jinWon = finals[win].name === RIVAL_NAME;
    await playLines('準優勝', [
      ['N', `優勝は、${finals[win].name}。`],
      ['B', '……あかんかったか', '……ダメだったか'],
      ['T', '……'],
      jinWon ? ['jin', '……悪いな。でも、お前らがおったから、ここまで来れたんや'] : ['minami', 'ええ漫才やったで。胸張り'],
      ['T', '……来年や。来年、絶対獲る', '……来年だ。来年、絶対獲る'],
    ]);
  }
}

const RIVAL_NAME = '令和モンスター';

function playLines(title: string, lines: SceneLine[], music: BgmName = 'story') {
  return playScene({ id: 'tmp', title, trigger: 'yearStart', cond: () => true, lines }, music);
}

/** 最終決戦の審査：1人ずつ票を開けて「優勝は……」で溜める */
function revealFinal(finals: { name: string; me: boolean }[], voteBy: string[], win: number): Promise<void> {
  stopBgm();
  return new Promise((res) => {
    const el = document.createElement('div');
    el.className = 'reveal';
    el.innerHTML = `<div class="reveal-inner">
      <div class="rv-title">最終決戦 審査</div>
      <div class="rv-judges">${JUDGES.map((j, i) => `<div class="rv-j" data-i="${i}"><small>${j}</small><b>？？？</b></div>`).join('')}</div>
      <div class="rv-tally">${finals.map((f, i) => `<div class="${f.me ? 'me' : ''}"><span>${f.name}</span><b data-i="${i}">0</b><small>票</small></div>`).join('')}</div>
      <div class="rv-msg"></div>
      <button class="btn big rv-next" hidden>つぎへ</button>
    </div>`;
    document.body.append(el);
    const msg = el.querySelector<HTMLElement>('.rv-msg')!;
    (async () => {
      await sleep(1400);
      const tally = finals.map(() => 0);
      for (let j = 0; j < JUDGES.length; j++) {
        const row = el.querySelector<HTMLElement>(`.rv-j[data-i="${j}"]`)!;
        const b = row.querySelector('b')!;
        row.classList.add('focus');
        b.textContent = '……';
        await sleep(j === JUDGES.length - 1 ? 1800 : 900);
        const wi = finals.findIndex((f) => f.name === voteBy[j]);
        b.textContent = voteBy[j];
        row.classList.remove('focus');
        row.classList.add('open', finals[wi].me ? 'mine' : 'other');
        tally[wi]++;
        el.querySelector(`.rv-tally b[data-i="${wi}"]`)!.textContent = String(tally[wi]);
        se(finals[wi].me ? 'pop' : 'click');
        await sleep(800);
      }
      msg.textContent = '笑王グランプリ、優勝は……';
      await sleep(2600);
      msg.innerHTML = `<span class="rv-winner ${finals[win].me ? 'me' : ''}">${finals[win].name}！！</span>`;
      if (finals[win].me) { se('sparkle'); confetti(); bgm('ending'); } else se('miss');
      await sleep(1200);
      const nx = el.querySelector<HTMLButtonElement>('.rv-next')!;
      nx.hidden = false;
      nx.addEventListener('click', () => { el.remove(); res(); }, { once: true });
    })();
  });
}

function endingLines(win: boolean): SceneLine[] {
  const metFinal = S.finalInfo?.rivals.includes(RIVAL_NAME);
  const minamiGone = !!S.flags.story_minami_bye;
  if (win) {
    return [
      ['N', '紙吹雪が舞うステージの真ん中で、{B}と{T}は、しばらく動けなかった。'],
      ['B', '……え？ 獲った……？ 俺ら、獲ったん？', '……え？ 獲った……？ 俺ら、獲ったの？'],
      ['T', '獲ったんや……{B}、獲ったんや！！', '獲ったんだよ……{B}、獲ったんだよ！！'],
      ['N', '楽屋に戻ると、見慣れた男が待っていた。'],
      ['jin', metFinal ? '最終決戦で当たって、負けた。……文句なしや' : '……おめでとう。悔しいけど、今年はお前らの年や'],
      ['jin', '結成1年目のあの日から、ずっとお前らを意識してた。……次はテレビで会おな'],
      ['N', 'スマホの通知が、鳴り止まない。'],
      ['shihainin', '劇場の看板、今日から一番上や。……ほんま、よう頑張ったな'],
      ['minami', minamiGone ? '（メッセージ）テレビの前で泣いてもうた。約束、守ってくれてありがとう' : 'おめでとう！ あんたら、私の自慢の後輩や'],
      ['haha', 'テレビ見たよ。……ようがんばったね。お父さんも泣いとったよ'],
      ['B', '{T}。……ありがとうな'],
      ['T', '礼なんか言うな。……まだ、ここからやろ', '礼なんか言うな。……まだ、ここからだろ'],
      ['N', '結成{Y}年目の冬。{C}は、笑王になった。'],
    ];
  }
  return [
    ['N', '結成15年目の冬。最後の笑王グランプリが終わった。'],
    ['T', '……終わったな'],
    ['B', '終わったなあ'],
    ['jin', '15年、同じ時代にお前らがおってよかったわ。……ほんまやで'],
    ['minami', '15年、おつかれさま。あんたらの漫才、ずっと好きやったで'],
    ['shihainin', '来月も出番入れとくで。笑王がなくても、漫才は続くやろ'],
    ['B', '{T}。明日もネタ合わせな', '{T}。明日もネタ合わせ、やるぞ'],
    ['T', '……当たり前や', '……当たり前だろ'],
    ['N', '{C}の漫才は、これからも続いていく。'],
  ];
}

/** 戦績画像を作って、プレビュー → シェア／保存 */
async function showRecordCard(rec: GameState, win: boolean) {
  const url = location.href.split('#')[0].split('?')[0];
  const c = comboById(rec.comboId);
  let blob: Blob;
  try {
    blob = await makeRecordCard(rec, c, win, url);
  } catch {
    await modal('', '画像を作れませんでした…', ['OK']);
    return;
  }
  const file = new File([blob], `shouou-${c.name}.png`, { type: 'image/png' });
  const src = URL.createObjectURL(blob);
  const canShare = !!navigator.canShare?.({ files: [file] });
  const i = await modal('📸 戦績画像', `<img class="card-preview" src="${src}" alt="戦績画像"><p class="note">画像を長押しでも保存できます</p>`,
    [canShare ? '📤 シェア・画像を保存' : '⬇ 画像をダウンロード', 'とじる'], 'tall');
  if (i === 0) {
    if (canShare) {
      try {
        await navigator.share({ files: [file], title: 'ドット漫才 戦績', text: `${c.name}で${win ? '笑王グランプリ優勝！' : '15年走りきった！'} #ドット漫才\n${url}` });
      } catch { /* キャンセル */ }
    } else {
      const a = document.createElement('a');
      a.href = src;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
    }
  }
  setTimeout(() => URL.revokeObjectURL(src), 60000);
}

// ---------------- エンディング ----------------
function renderEnding(win: boolean) {
  bgm('ending');
  se(win ? 'sparkle' : 'correct');
  const c = comboById(S.comboId);
  app.innerHTML = `<div class="screen ending ${win ? 'win' : ''}">
    <div class="logo"><h1>${win ? '🏆 笑王 🏆' : 'ラストイヤー終了'}</h1></div>
    <div class="stage-wrap"></div>
    <div class="win msg">${win
      ? `<b>${c.name}</b>、結成${S.year}年目にして<br>笑王グランプリ優勝！！<br><br>${c.boke.name}「${kv('獲った……ほんまに獲った！', '獲った……本当に獲った！')}」<br>${c.tsukkomi.name}「${kv('……泣くな、アホ', '……泣くなよ、バカ')}」`
      : `結成15年目、最後の笑王グランプリが終わった。<br>最高成績：<b>${S.bestLabel}</b><br><br>${c.tsukkomi.name}「……でも、楽しかったな」<br>${c.boke.name}「${kv('まだ漫才は続くで', 'まだ漫才は続くよ')}」`}
      <ul class="hist">${S.history.map((h) => `<li>結成${h.year}年目：${h.result}</li>`).join('')}</ul>
    </div>
    <button class="btn big gold" id="card">📸 戦績を画像で保存・シェア</button>
    <button class="btn big" id="again">タイトルへ</button>
  </div>`;
  const st = stage(S.comboId, { mic: true, scale: 4 });
  app.querySelector('.stage-wrap')!.append(st);
  say(st, 'B', win ? 'ありがとうございましたー！！' : 'ありがとうございました');
  if (win) confetti();
  deleteSlot(slot);
  const done = { ...S };
  app.querySelector('#card')!.addEventListener('click', () => showRecordCard(done, win));
  app.querySelector('#again')!.addEventListener('click', async () => {
    if ((await modal('', 'タイトルに戻りますか？<br><small>戦績画像はこのあと作れなくなります</small>', ['タイトルへ', 'やめる'])) === 0) renderTitle();
  });
}

function confetti() {
  const colors = ['#ffd84a', '#ff6b8b', '#6bd3ff', '#9cff8a', '#ffffff'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 2}s`;
    p.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    document.body.append(p);
    setTimeout(() => p.remove(), 9000);
  }
}

// ---------------- PWA ----------------
let installPrompt: (Event & { prompt: () => Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as typeof installPrompt;
});
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function showInstall() {
  if (installPrompt) {
    await installPrompt.prompt();
    installPrompt = null;
    return;
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  await modal('📱 ホーム画面に追加', ios
    ? 'Safariの下にある<br><b>共有ボタン（□に↑）</b>→<br><b>「ホーム画面に追加」</b><br>をタップしてください。<br><br><small>※Safariで開いている必要があります</small>'
    : 'ブラウザのメニュー（︙）から<br><b>「ホーム画面に追加」</b>または<br><b>「アプリをインストール」</b><br>を選んでください。', ['OK']);
}

async function share() {
  const url = location.href.split('#')[0];
  const data = { title: 'ドット漫才 〜目指せ笑王グランプリ〜', text: '漫才コンビを育てて笑王グランプリ優勝を目指すゲーム！', url };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(url);
    await modal('', `URLをコピーしました！<br><small>${url}</small>`, ['OK']);
  } catch { /* キャンセル */ }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ---------------- サウンド切り替え ----------------
const soundBtn = document.createElement('button');
soundBtn.className = 'sound-toggle';
const paintSound = () => { soundBtn.textContent = isSoundOn() ? '🔊' : '🔇'; soundBtn.setAttribute('aria-label', isSoundOn() ? '音をOFFにする' : '音をONにする'); };
soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setSound(!isSoundOn());
  paintSound();
  if (isSoundOn()) { se('click'); toast('🔊 サウンド ON'); } else toast('🔇 サウンド OFF');
});
paintSound();
document.body.append(soundBtn);
unlockOnFirstTouch();
// ボタン・カードを押したときの決定音
document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('.btn, .card, .combo-card');
  if (t && !(t as HTMLButtonElement).disabled) se('click');
}, true);

migrateOldSave();
renderTitle();

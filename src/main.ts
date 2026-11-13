import './style.css';
import type { ActionId, Card, CardType, GameState } from './types';
import { STAT_KEYS, STAT_LABEL } from './types';
import { COMBOS, JUDGES, RIVALS, comboById } from './data/combos';
import { CARDS, TYPE_LABEL } from './data/cards';
import { EVENTS, KAISAN, type GameEvent } from './data/events';
import {
  ACTIONS, LAST_YEAR, ROUNDS, TURNS_PER_YEAR, actionLevel, currentRound, SLOTS, saveSlot, loadSlot, deleteSlot, migrateOldSave, doAction, failRate,
  newGame, nextRoundInfo, payLiving, pick, rand, rank, recordResult, turnLabel, yearResultLabel, yen,
  addCard,
} from './logic';
import { PHASES, cardScore, drawHand, judgeScores, netaBonus, reaction, rivalScore, stars, type BattleCtx } from './battle';
import { drawMic, drawPerson } from './sprites';
import { NPC, SCENES, type Scene, type Speaker } from './data/story';

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

// ---------------- ストーリー ----------------
function fill(t: string): string {
  const c = comboById(S.comboId);
  return t.replace(/\{B\}/g, c.boke.name).replace(/\{T\}/g, c.tsukkomi.name).replace(/\{C\}/g, c.name);
}
function speakerInfo(sp: Speaker): { name: string; look?: import('./types').Look } {
  const c = comboById(S.comboId);
  if (sp === 'B') return { name: c.boke.name, look: c.boke.look };
  if (sp === 'T') return { name: c.tsukkomi.name, look: c.tsukkomi.look };
  if (sp === 'N') return { name: '' };
  return NPC[sp];
}

function playScene(sc: Scene): Promise<void> {
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
    const end = () => { el.remove(); res(); };
    const next = () => {
      if (i >= sc.lines.length) return end();
      const [sp, raw] = sc.lines[i++];
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
    el.addEventListener('click', next);
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
    <p class="note">※登場するコンビ・大会はすべて架空です</p>
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
        <div class="cmeta"><span class="diff">${c.difficulty}</span> 結成1〜15年目の15回挑戦</div>
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
  const c = comboById(S.comboId);
  app.innerHTML = `<div class="screen home">
    <div class="win hud">
      <div><b>${c.name}</b></div>
      <div class="row"><span>結成<b>${S.year}</b>年目</span><span class="when">${turnLabel(S.turn)}</span></div>
      <div class="row"><span class="${S.money < 0 ? 'neg' : ''}">💴 ${yen(S.money)}</span><span>⭐ 人気 ${S.popularity}</span></div>
    </div>
    <div class="stage-wrap"></div>
    <div class="win next">${nextRoundInfo(S)}</div>
    <div class="win stats">
      ${STAT_KEYS.map((k) => `<div class="stat"><span class="lb">${STAT_LABEL[k]}</span>
        <span class="bar"><i style="width:${S.stats[k]}%"></i></span>
        <span class="rk r-${rank(S.stats[k])}">${rank(S.stats[k])}</span><span class="v">${S.stats[k]}</span></div>`).join('')}
      <div class="stat stamina"><span class="lb">体力</span>
        <span class="bar hp ${S.stamina < 30 ? 'low' : ''}"><i style="width:${S.stamina}%"></i></span>
        <span class="v">${S.stamina}</span></div>
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
  app.querySelector('#title')!.addEventListener('click', async () => {
    if ((await modal('', 'タイトルに戻りますか？<br><small>（今の状態は自動でセーブされています）</small>', ['タイトルへ', 'やめる'])) !== 0) return;
    save(S);
    migrateOldSave();
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
    await modal(res.title, resultList(lines), ['OK']);

    const round = currentRound(S);
    if (!round) await maybeEvent();

    if (round) {
      const total = await runBattle(`${round.name}`, round.th, 'prelim');
      if (total >= round.th) {
        S.round++;
        await modal('🎉 通過！', `${round.name}を <b>${total.toFixed(1)}点</b> で突破！<br>（目標 ${round.th}点）`, ['よっしゃ！']);
        await checkStory('afterRound');
      } else {
        S.alive = false;
        await modal('😢 敗退…', `${round.name}で敗退…<br><b>${total.toFixed(1)}点</b>（目標 ${round.th}点）<br><br>今年は残りの時間で力を蓄えよう。`, ['来年こそ…']);
      }
    }

    S.turn++;
    if (S.turn >= TURNS_PER_YEAR) {
      if (S.alive && S.round >= ROUNDS.length) await runFinal();
      if (S.champion) { recordResult(S, '優勝'); save(S); renderEnding(true); return; }
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
    renderEnding(false);
    return true;
  }
  await modal('🎍 年末', `結成${S.year}年目が終わった。<br><br>今年の笑王グランプリ：<b>${label}</b><br><br>${c.boke.name}「来年こそ、獲ったろな」<br>${c.tsukkomi.name}「せやな」<br><br><small>体力が全回復した。出場できるのはあと${LAST_YEAR - S.year}回。</small>`, ['結成' + (S.year + 1) + '年目へ']);
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

  say(st, 'B', 'どうもー！');
  await sleep(500);
  say(st, 'T', `${comboById(S.comboId).name}です！ お願いしますー！`);
  total = netaBonus(S);
  await sleep(300);
  setGauge(total);
  hand.innerHTML = `<div class="info">ネタの完成度ボーナス +${total.toFixed(1)}</div>`;
  await sleep(700);

  const ctx: BattleCtx = { phase: 0, bokeCount: 0, tame: false, gauge: total };
  const deck = [...S.deck];
  for (let ph = 0; ph < 4; ph++) {
    ctx.phase = ph;
    ctx.gauge = total;
    app.querySelectorAll('.phases span').forEach((e, i) => e.classList.toggle('on', i === ph));
    const cards = drawHand(deck);
    const chosen = await chooseCard(hand, cards, ctx);
    const { score, tags } = cardScore(chosen, ctx, S);
    const final = score * rand(0.88, 1.12);
    hand.innerHTML = `<div class="info">「${chosen.name}」${tags.map((t) => `<span class="tg">${t}</span>`).join('')}</div>`;
    for (const [sp, tx] of pick(chosen.lines)) {
      say(st, sp, tx);
      await sleep(Math.min(1500, 650 + tx.length * 25));
    }
    const r = reaction(final);
    react.hidden = false;
    react.className = `react ${r.cls}`;
    react.textContent = r.text;
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
  say(st, 'T', 'もうええわ！ どうも、ありがとうございましたー！');
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
  if (myRank > 3) {
    await modal('決勝 ' + myRank + '位', `あと一歩、最終決戦に届かなかった…<br><br>${c.tsukkomi.name}「……来年や」`, ['来年こそ']);
    return;
  }
  S.flags['finalist_' + S.year] = 1;
  const rivals = entries.filter((e) => !e.me).slice(0, 2);
  await modal('最終決戦進出！', `最終決戦に残ったのは――<br><br><b>${rivals[0].name}</b><br><b>${rivals[1].name}</b><br><b>${c.name}</b><br><br>泣いても笑っても、これが最後のネタ！`, ['勝負！']);
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
  const body = `<div class="votes">${JUDGES.map((j, i) => `<div><small>${j}</small><b>${voteBy[i]}</b></div>`).join('')}</div>
    <p>${finals.map((f, i) => `${f.name}：${votes[i]}票`).join('<br>')}</p>`;
  await modal('最終決戦 審査', body, ['優勝は……']);
  if (finals[win].me) {
    S.champion = true;
  } else {
    await modal('準優勝', `優勝は <b>${finals[win].name}</b>！<br><br>あと少しだった…。<br>${c.boke.name}「……悔しいなあ」`, ['来年こそ']);
  }
}

// ---------------- エンディング ----------------
function renderEnding(win: boolean) {
  const c = comboById(S.comboId);
  app.innerHTML = `<div class="screen ending ${win ? 'win' : ''}">
    <div class="logo"><h1>${win ? '🏆 笑王 🏆' : 'ラストイヤー終了'}</h1></div>
    <div class="stage-wrap"></div>
    <div class="win msg">${win
      ? `<b>${c.name}</b>、結成${S.year}年目にして<br>笑王グランプリ優勝！！<br><br>${c.boke.name}「獲った……ほんまに獲った！」<br>${c.tsukkomi.name}「……泣くな、アホ」`
      : `結成15年目、最後の笑王グランプリが終わった。<br>最高成績：<b>${S.bestLabel}</b><br><br>${c.tsukkomi.name}「……でも、楽しかったな」<br>${c.boke.name}「まだ漫才は続くで」`}
      <ul class="hist">${S.history.map((h) => `<li>結成${h.year}年目：${h.result}</li>`).join('')}</ul>
    </div>
    <button class="btn big" id="again">タイトルへ</button>
  </div>`;
  const st = stage(S.comboId, { mic: true, scale: 4 });
  app.querySelector('.stage-wrap')!.append(st);
  say(st, 'B', win ? 'ありがとうございましたー！！' : 'ありがとうございました');
  if (win) confetti();
  deleteSlot(slot);
  app.querySelector('#again')!.addEventListener('click', renderTitle);
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

renderTitle();

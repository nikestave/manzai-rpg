// BGM・効果音（音楽：魔王魂 https://maou.audio/ ）
// BGM は <audio> でストリーミング再生（長い曲でもメモリを食わない）、効果音は Web Audio API。
// どちらも Web Audio のゲインを通すので iPhone でも音量調整が効く。ファイルが無い場合は何もしない。

export type BgmName = 'title' | 'home' | 'battle' | 'final' | 'story' | 'ending';
export type SeName = 'click' | 'pop' | 'sparkle' | 'oops' | 'correct' | 'miss' | 'hatena' | 'piro' | 'menu';

const BGM_FILE: Record<BgmName, string> = {
  title: 'bgm-title.mp3',   // 8bit29 子猫のもんたのクッキー屋さん
  home: 'bgm-home.mp3',     // 8bit01 たびだちのむら
  battle: 'bgm-battle.mp3', // 8bit14 サターンエビマン
  final: 'bgm-final.mp3',   // 8bit18 しゅくめいのたたかい
  story: 'bgm-story.mp3',   // 8bit03 くじけぬもの
  ending: 'bgm-ending.mp3', // 8bit16 せいぎのおしろ
};
const SE_FILE: Record<SeName, string> = {
  click: 'se-click.mp3',     // システム48 決定音
  pop: 'se-pop.mp3',         // レトロ16 ポンッ
  sparkle: 'se-sparkle.mp3', // レトロ25 キラーン
  oops: 'se-oops.mp3',       // ワンポイント31 オマヌケ
  correct: 'se-correct.mp3', // ワンポイント15 正解
  miss: 'se-miss.mp3',       // ワンポイント33 ハズレ
  hatena: 'se-hatena.mp3',   // ワンポイント28 ハテナ？
  piro: 'se-piro.mp3',       // ワンポイント20 ぴろりろ
  menu: 'se-menu.mp3',       // レトロ04 メニュー音
};

const BGM_VOL = 0.25;
const SE_VOL = 0.5;
const KEY = 'manzai-rpg-sound';

let ctx: AudioContext | null = null;
let master: GainNode;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let enabled = false;
let wanted: BgmName | null = null;
interface Track { el: HTMLAudioElement; gain: GainNode }
const tracks = new Map<BgmName, Track>();
let current: { name: BgmName; track: Track } | null = null;

try { enabled = localStorage.getItem(KEY) === 'on'; } catch { /* ignore */ }

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  return ctx;
}

function load(file: string): Promise<AudioBuffer | null> {
  let p = buffers.get(file);
  if (!p) {
    p = fetch(`./audio/${file}`)
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('audio') ? r.arrayBuffer() : Promise.reject()))
      .then((ab) => ensureCtx()!.decodeAudioData(ab))
      .catch(() => null);
    buffers.set(file, p);
  }
  return p;
}

function track(name: BgmName): Track | null {
  const c = ensureCtx();
  if (!c) return null;
  let t = tracks.get(name);
  if (!t) {
    const el = new Audio(`./audio/${BGM_FILE[name]}`);
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    const gain = c.createGain();
    gain.gain.value = 0;
    c.createMediaElementSource(el).connect(gain).connect(master);
    t = { el, gain };
    tracks.set(name, t);
  }
  return t;
}

function fadeTo(g: GainNode, v: number, sec: number) {
  const t = ctx!.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(v, t + sec);
}

function stopCurrent(fade = 0.4) {
  if (!current || !ctx) return;
  const { track: t } = current;
  fadeTo(t.gain, 0, fade);
  setTimeout(() => { if (current?.track !== t) t.el.pause(); }, fade * 1000 + 60);
  current = null;
}

async function startWanted() {
  if (!enabled || !wanted || current?.name === wanted) return;
  const name = wanted;
  const t = track(name);
  if (!t) return;
  stopCurrent();
  current = { name, track: t };
  if (name !== 'home') t.el.currentTime = 0; // 育成画面の曲は続きから
  try {
    await t.el.play();
  } catch {
    if (current?.track === t) current = null; // ファイルが無い・再生不可
    return;
  }
  fadeTo(t.gain, BGM_VOL, 0.5);
}

/** 画面ごとのBGMを指定（OFFのときは覚えておくだけ） */
export function bgm(name: BgmName) {
  wanted = name;
  void startWanted();
}
export const currentBgm = () => wanted;
/** BGMを止める（溜めの演出用） */
export function stopBgm() {
  wanted = null;
  stopCurrent(0.8);
}

export function se(name: SeName) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  void load(SE_FILE[name]).then((buf) => {
    if (!buf || !enabled) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = SE_VOL;
    src.connect(g).connect(master);
    src.start();
  });
}

export const isSoundOn = () => enabled;

/** 🔇/🔊 切り替え（タップ操作の中で呼ぶこと：スマホの自動再生制限のため） */
export function setSound(on: boolean) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  const c = ensureCtx();
  if (on) {
    void c?.resume();
    void startWanted();
  } else {
    stopCurrent(0.2);
  }
}

/** 最初のタップで AudioContext を起こす（iOS対策） */
export function unlockOnFirstTouch() {
  const h = () => {
    if (enabled) {
      void ensureCtx()?.resume();
      void startWanted();
    }
  };
  window.addEventListener('pointerdown', h, { passive: true });
}

// 画面がバックグラウンドに回ったら止める
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend();
  else if (enabled) void ctx.resume();
});

// UI strings for every language. Traditional Chinese is the default; the choice is
// remembered, and ?lang=xx in a link overrides it (handy for sharing per-market links).

import { load, save } from "./core/share";
import type { WeaponKind } from "./game/sim";

export interface Dict {
  name: string; // shown in the language picker
  htmlLang: string;
  random: string;
  whoWins: string;
  vs: string;
  commentPick: string;
  wins: (weapon: string) => string;
  hpLeft: (hp: number, level: number) => string;
  draw: string;
  myPick: (ok: boolean) => string;
  playToday: string;
  suddenDeath: (x: number) => string;
  todayPrompt: string;
  pickPrompt: string;
  alreadyPicked: (weapon: string, ok: boolean) => string;
  randomDuel: string;
  todaysDuel: string;
  saveClip: string;
  shareResult: string;
  copied: string;
  shared: string;
  shareFailed: string;
  watchAgain: string;
  calledIt: string;
  notThisTime: string;
  noRecord: string;
  sharePick: string;
  shareWon: (weapon: string, hp: number, secs: number) => string;
  streak: (days: number) => string;
  weapons: Record<WeaponKind, [label: string, grow: string]>;
}

const ok = (b: boolean) => (b ? "✅" : "❌");

const DICTS = {
  "zh-TW": {
    name: "繁體中文", htmlLang: "zh-Hant", random: "隨機",
    whoWins: "誰會贏？", vs: "vs", commentPick: "留言你押誰 👇",
    wins: (w) => `${w} 獲勝`, hpLeft: (hp, lv) => `剩 ${hp} HP · 等級 ${lv}`, draw: "平手",
    myPick: (b) => (b ? "我押中了 ✅" : "沒押中 ❌"), playToday: "來玩今天的對決 ↓",
    suddenDeath: (x) => `⚡ 驟死：傷害 x${x}`,
    todayPrompt: "今日對決：誰會贏？", pickPrompt: "誰會贏？選一邊：",
    alreadyPicked: (w, b) => `你今天押了${w} ${ok(b)}，重看不計分。`,
    randomDuel: "🎲 隨機對決", todaysDuel: "📅 今日對決", saveClip: "🎬 儲存 9:16 短片", shareResult: "📋 分享結果",
    copied: "已複製！", shared: "已分享！", shareFailed: "無法分享", watchAgain: "▶ 再看一次",
    calledIt: "猜中了 ✅", notThisTime: "這次沒猜中 ❌",
    noRecord: "這個瀏覽器無法錄影，請改用 Chrome 或 Safari。",
    sharePick: "我押：", shareWon: (w, hp, s) => `${w} 剩 ${hp} HP、${s} 秒獲勝`, streak: (n) => `🔥 連續猜中 ${n} 天`,
    weapons: {
      sword: ["劍", "+1 傷害"], spear: ["長矛", "+12 攻擊距離"], dagger: ["匕首", "+20% 轉速"],
      hammer: ["戰鎚", "+2 傷害"], bow: ["弓", "+1 支箭"], axe: ["斧頭", "+1 傷害、轉更快"],
      scythe: ["鐮刀", "+1 傷害、吸血"], shuriken: ["飛鏢", "+1 次反彈"], shield: ["盾牌", "+1 傷害、變寬"],
    },
  },
  "zh-CN": {
    name: "简体中文", htmlLang: "zh-Hans", random: "随机",
    whoWins: "谁会赢？", vs: "vs", commentPick: "评论你押谁 👇",
    wins: (w) => `${w} 获胜`, hpLeft: (hp, lv) => `剩 ${hp} HP · 等级 ${lv}`, draw: "平局",
    myPick: (b) => (b ? "我押中了 ✅" : "没押中 ❌"), playToday: "来玩今天的对决 ↓",
    suddenDeath: (x) => `⚡ 骤死：伤害 x${x}`,
    todayPrompt: "今日对决：谁会赢？", pickPrompt: "谁会赢？选一边：",
    alreadyPicked: (w, b) => `你今天押了${w} ${ok(b)}，重看不计分。`,
    randomDuel: "🎲 随机对决", todaysDuel: "📅 今日对决", saveClip: "🎬 保存 9:16 短视频", shareResult: "📋 分享结果",
    copied: "已复制！", shared: "已分享！", shareFailed: "无法分享", watchAgain: "▶ 再看一次",
    calledIt: "猜中了 ✅", notThisTime: "这次没猜中 ❌",
    noRecord: "这个浏览器无法录制，请改用 Chrome 或 Safari。",
    sharePick: "我押：", shareWon: (w, hp, s) => `${w} 剩 ${hp} HP、${s} 秒获胜`, streak: (n) => `🔥 连续猜中 ${n} 天`,
    weapons: {
      sword: ["剑", "+1 伤害"], spear: ["长矛", "+12 攻击距离"], dagger: ["匕首", "+20% 转速"],
      hammer: ["战锤", "+2 伤害"], bow: ["弓", "+1 支箭"], axe: ["斧头", "+1 伤害、转更快"],
      scythe: ["镰刀", "+1 伤害、吸血"], shuriken: ["飞镖", "+1 次反弹"], shield: ["盾牌", "+1 伤害、变宽"],
    },
  },
  en: {
    name: "English", htmlLang: "en", random: "Random",
    whoWins: "WHO WINS?", vs: "vs", commentPick: "comment your pick 👇",
    wins: (w) => `${w.toUpperCase()} WINS`, hpLeft: (hp, lv) => `${hp} HP left · level ${lv}`, draw: "DRAW",
    myPick: (b) => `My pick ${ok(b)}`, playToday: "play today's duel ↓",
    suddenDeath: (x) => `⚡ SUDDEN DEATH: x${x} damage`,
    todayPrompt: "Today's duel. Who wins?", pickPrompt: "Who wins? Pick one:",
    alreadyPicked: (w, b) => `You picked ${w} today ${ok(b)}. Replays don't count.`,
    randomDuel: "🎲 Random duel", todaysDuel: "📅 Today's duel", saveClip: "🎬 Save 9:16 clip", shareResult: "📋 Share result",
    copied: "Copied!", shared: "Shared!", shareFailed: "Couldn't share", watchAgain: "▶ Watch again",
    calledIt: "You called it ✅", notThisTime: "Not this time ❌",
    noRecord: "This browser can't record clips. Try Chrome or Safari.",
    sharePick: "My pick: ", shareWon: (w, hp, s) => `${w} won with ${hp} HP in ${s}s`, streak: (n) => `🔥 ${n}-day streak`,
    weapons: {
      sword: ["Sword", "+1 dmg"], spear: ["Spear", "+12 reach"], dagger: ["Dagger", "+20% spin"],
      hammer: ["Hammer", "+2 dmg"], bow: ["Bow", "+1 arrow"], axe: ["Axe", "+1 dmg, +spin"],
      scythe: ["Scythe", "+1 dmg, lifesteal"], shuriken: ["Shuriken", "+1 bounce"], shield: ["Shield", "+1 dmg, wider"],
    },
  },
  ja: {
    name: "日本語", htmlLang: "ja", random: "ランダム",
    whoWins: "どっちが勝つ？", vs: "vs", commentPick: "コメントで予想してね 👇",
    wins: (w) => `${w}の勝ち！`, hpLeft: (hp, lv) => `残りHP ${hp} · Lv ${lv}`, draw: "引き分け",
    myPick: (b) => (b ? "予想的中 ✅" : "予想ハズレ ❌"), playToday: "今日の対決をプレイ ↓",
    suddenDeath: (x) => `⚡ サドンデス：ダメージ x${x}`,
    todayPrompt: "今日の対決。どっちが勝つ？", pickPrompt: "どっちが勝つ？選んでね：",
    alreadyPicked: (w, b) => `今日は${w}を選択済み ${ok(b)}。リプレイは記録されません。`,
    randomDuel: "🎲 ランダム対決", todaysDuel: "📅 今日の対決", saveClip: "🎬 9:16動画を保存", shareResult: "📋 結果をシェア",
    copied: "コピーしました！", shared: "シェアしました！", shareFailed: "シェアできません", watchAgain: "▶ もう一度見る",
    calledIt: "的中！ ✅", notThisTime: "ハズレ ❌",
    noRecord: "このブラウザは録画できません。ChromeかSafariでお試しください。",
    sharePick: "予想：", shareWon: (w, hp, s) => `${w}が残りHP ${hp}・${s}秒で勝利`, streak: (n) => `🔥 ${n}日連続的中`,
    weapons: {
      sword: ["剣", "ダメージ+1"], spear: ["槍", "リーチ+12"], dagger: ["短剣", "回転+20%"],
      hammer: ["ハンマー", "ダメージ+2"], bow: ["弓", "矢+1"], axe: ["斧", "ダメージ+1・回転UP"],
      scythe: ["鎌", "ダメージ+1・吸収"], shuriken: ["手裏剣", "反射+1"], shield: ["盾", "ダメージ+1・拡大"],
    },
  },
  ko: {
    name: "한국어", htmlLang: "ko", random: "랜덤",
    whoWins: "누가 이길까?", vs: "vs", commentPick: "댓글로 예측해 줘 👇",
    wins: (w) => `${w} 승리!`, hpLeft: (hp, lv) => `남은 HP ${hp} · Lv ${lv}`, draw: "무승부",
    myPick: (b) => (b ? "예측 성공 ✅" : "예측 실패 ❌"), playToday: "오늘의 대결 하러 가기 ↓",
    suddenDeath: (x) => `⚡ 서든데스: 피해 x${x}`,
    todayPrompt: "오늘의 대결. 누가 이길까?", pickPrompt: "누가 이길까? 골라 봐:",
    alreadyPicked: (w, b) => `오늘은 ${w}을(를) 골랐어요 ${ok(b)}. 다시 보기는 기록되지 않아요.`,
    randomDuel: "🎲 랜덤 대결", todaysDuel: "📅 오늘의 대결", saveClip: "🎬 9:16 영상 저장", shareResult: "📋 결과 공유",
    copied: "복사됨!", shared: "공유됨!", shareFailed: "공유할 수 없어요", watchAgain: "▶ 다시 보기",
    calledIt: "맞췄어요 ✅", notThisTime: "아쉽게 틀렸어요 ❌",
    noRecord: "이 브라우저는 녹화를 지원하지 않아요. Chrome이나 Safari를 사용해 주세요.",
    sharePick: "내 예측: ", shareWon: (w, hp, s) => `${w} 승리 · 남은 HP ${hp} · ${s}초`, streak: (n) => `🔥 ${n}일 연속 적중`,
    weapons: {
      sword: ["검", "피해 +1"], spear: ["창", "사거리 +12"], dagger: ["단검", "회전 +20%"],
      hammer: ["망치", "피해 +2"], bow: ["활", "화살 +1"], axe: ["도끼", "피해 +1·회전 증가"],
      scythe: ["낫", "피해 +1·흡혈"], shuriken: ["수리검", "반사 +1"], shield: ["방패", "피해 +1·확장"],
    },
  },
  es: {
    name: "Español", htmlLang: "es", random: "Aleatorio",
    whoWins: "¿QUIÉN GANA?", vs: "vs", commentPick: "comenta tu elección 👇",
    wins: (w) => `¡GANA ${w.toUpperCase()}!`, hpLeft: (hp, lv) => `Quedan ${hp} PV · nivel ${lv}`, draw: "EMPATE",
    myPick: (b) => `Mi elección ${ok(b)}`, playToday: "juega el duelo de hoy ↓",
    suddenDeath: (x) => `⚡ MUERTE SÚBITA: daño x${x}`,
    todayPrompt: "Duelo de hoy. ¿Quién gana?", pickPrompt: "¿Quién gana? Elige uno:",
    alreadyPicked: (w, b) => `Hoy elegiste ${w} ${ok(b)}. Las repeticiones no cuentan.`,
    randomDuel: "🎲 Duelo aleatorio", todaysDuel: "📅 Duelo de hoy", saveClip: "🎬 Guardar clip 9:16", shareResult: "📋 Compartir resultado",
    copied: "¡Copiado!", shared: "¡Compartido!", shareFailed: "No se pudo compartir", watchAgain: "▶ Ver otra vez",
    calledIt: "¡Acertaste! ✅", notThisTime: "Esta vez no ❌",
    noRecord: "Este navegador no puede grabar clips. Prueba con Chrome o Safari.",
    sharePick: "Mi elección: ", shareWon: (w, hp, s) => `${w} ganó con ${hp} PV en ${s} s`, streak: (n) => `🔥 Racha de ${n} días`,
    weapons: {
      sword: ["Espada", "+1 daño"], spear: ["Lanza", "+12 alcance"], dagger: ["Daga", "+20% giro"],
      hammer: ["Martillo", "+2 daño"], bow: ["Arco", "+1 flecha"], axe: ["Hacha", "+1 daño, +giro"],
      scythe: ["Guadaña", "+1 daño, robo de vida"], shuriken: ["Shuriken", "+1 rebote"], shield: ["Escudo", "+1 daño, más ancho"],
    },
  },
  pt: {
    name: "Português", htmlLang: "pt-BR", random: "Aleatório",
    whoWins: "QUEM VENCE?", vs: "vs", commentPick: "comente seu palpite 👇",
    wins: (w) => `${w.toUpperCase()} VENCE`, hpLeft: (hp, lv) => `${hp} de vida · nível ${lv}`, draw: "EMPATE",
    myPick: (b) => `Meu palpite ${ok(b)}`, playToday: "jogue o duelo de hoje ↓",
    suddenDeath: (x) => `⚡ MORTE SÚBITA: dano x${x}`,
    todayPrompt: "Duelo de hoje. Quem vence?", pickPrompt: "Quem vence? Escolha um:",
    alreadyPicked: (w, b) => `Você escolheu ${w} hoje ${ok(b)}. Replays não contam.`,
    randomDuel: "🎲 Duelo aleatório", todaysDuel: "📅 Duelo de hoje", saveClip: "🎬 Salvar clipe 9:16", shareResult: "📋 Compartilhar",
    copied: "Copiado!", shared: "Compartilhado!", shareFailed: "Não foi possível compartilhar", watchAgain: "▶ Ver de novo",
    calledIt: "Acertou! ✅", notThisTime: "Não foi dessa vez ❌",
    noRecord: "Este navegador não grava clipes. Tente o Chrome ou o Safari.",
    sharePick: "Meu palpite: ", shareWon: (w, hp, s) => `${w} venceu com ${hp} de vida em ${s}s`, streak: (n) => `🔥 ${n} dias seguidos`,
    weapons: {
      sword: ["Espada", "+1 dano"], spear: ["Lança", "+12 alcance"], dagger: ["Adaga", "+20% giro"],
      hammer: ["Martelo", "+2 dano"], bow: ["Arco", "+1 flecha"], axe: ["Machado", "+1 dano, +giro"],
      scythe: ["Foice", "+1 dano, roubo de vida"], shuriken: ["Shuriken", "+1 ricochete"], shield: ["Escudo", "+1 dano, mais largo"],
    },
  },
  fr: {
    name: "Français", htmlLang: "fr", random: "Aléatoire",
    whoWins: "QUI VA GAGNER ?", vs: "vs", commentPick: "commente ton choix 👇",
    wins: (w) => `${w.toUpperCase()} GAGNE`, hpLeft: (hp, lv) => `${hp} PV restants · niveau ${lv}`, draw: "ÉGALITÉ",
    myPick: (b) => `Mon choix ${ok(b)}`, playToday: "joue au duel du jour ↓",
    suddenDeath: (x) => `⚡ MORT SUBITE : dégâts x${x}`,
    todayPrompt: "Duel du jour. Qui va gagner ?", pickPrompt: "Qui va gagner ? Choisis :",
    alreadyPicked: (w, b) => `Tu as choisi ${w} aujourd'hui ${ok(b)}. Les revisionnages ne comptent pas.`,
    randomDuel: "🎲 Duel aléatoire", todaysDuel: "📅 Duel du jour", saveClip: "🎬 Enregistrer le clip 9:16", shareResult: "📋 Partager",
    copied: "Copié !", shared: "Partagé !", shareFailed: "Partage impossible", watchAgain: "▶ Revoir",
    calledIt: "Bien vu ✅", notThisTime: "Raté cette fois ❌",
    noRecord: "Ce navigateur ne peut pas enregistrer de clip. Essaie Chrome ou Safari.",
    sharePick: "Mon choix : ", shareWon: (w, hp, s) => `${w} gagne avec ${hp} PV en ${s} s`, streak: (n) => `🔥 ${n} jours d'affilée`,
    weapons: {
      sword: ["Épée", "+1 dégât"], spear: ["Lance", "+12 portée"], dagger: ["Dague", "+20 % rotation"],
      hammer: ["Marteau", "+2 dégâts"], bow: ["Arc", "+1 flèche"], axe: ["Hache", "+1 dégât, +rotation"],
      scythe: ["Faux", "+1 dégât, vol de vie"], shuriken: ["Shuriken", "+1 rebond"], shield: ["Bouclier", "+1 dégât, plus large"],
    },
  },
  de: {
    name: "Deutsch", htmlLang: "de", random: "Zufall",
    whoWins: "WER GEWINNT?", vs: "vs", commentPick: "tippe in den Kommentaren 👇",
    wins: (w) => `${w.toUpperCase()} GEWINNT`, hpLeft: (hp, lv) => `${hp} LP übrig · Stufe ${lv}`, draw: "UNENTSCHIEDEN",
    myPick: (b) => `Mein Tipp ${ok(b)}`, playToday: "spiel das Duell des Tages ↓",
    suddenDeath: (x) => `⚡ SUDDEN DEATH: Schaden x${x}`,
    todayPrompt: "Duell des Tages. Wer gewinnt?", pickPrompt: "Wer gewinnt? Wähle:",
    alreadyPicked: (w, b) => `Du hast heute ${w} gewählt ${ok(b)}. Wiederholungen zählen nicht.`,
    randomDuel: "🎲 Zufallsduell", todaysDuel: "📅 Duell des Tages", saveClip: "🎬 9:16-Clip speichern", shareResult: "📋 Ergebnis teilen",
    copied: "Kopiert!", shared: "Geteilt!", shareFailed: "Teilen nicht möglich", watchAgain: "▶ Nochmal ansehen",
    calledIt: "Richtig getippt ✅", notThisTime: "Diesmal nicht ❌",
    noRecord: "Dieser Browser kann keine Clips aufnehmen. Versuch es mit Chrome oder Safari.",
    sharePick: "Mein Tipp: ", shareWon: (w, hp, s) => `${w} gewinnt mit ${hp} LP in ${s} s`, streak: (n) => `🔥 ${n} Tage in Folge`,
    weapons: {
      sword: ["Schwert", "+1 Schaden"], spear: ["Speer", "+12 Reichweite"], dagger: ["Dolch", "+20 % Drehung"],
      hammer: ["Hammer", "+2 Schaden"], bow: ["Bogen", "+1 Pfeil"], axe: ["Axt", "+1 Schaden, +Drehung"],
      scythe: ["Sense", "+1 Schaden, Lebensraub"], shuriken: ["Shuriken", "+1 Abpraller"], shield: ["Schild", "+1 Schaden, breiter"],
    },
  },
  id: {
    name: "Bahasa Indonesia", htmlLang: "id", random: "Acak",
    whoWins: "SIAPA MENANG?", vs: "vs", commentPick: "tulis tebakanmu di komentar 👇",
    wins: (w) => `${w.toUpperCase()} MENANG`, hpLeft: (hp, lv) => `Sisa ${hp} HP · level ${lv}`, draw: "SERI",
    myPick: (b) => `Tebakanku ${ok(b)}`, playToday: "main duel hari ini ↓",
    suddenDeath: (x) => `⚡ SUDDEN DEATH: damage x${x}`,
    todayPrompt: "Duel hari ini. Siapa menang?", pickPrompt: "Siapa menang? Pilih satu:",
    alreadyPicked: (w, b) => `Hari ini kamu memilih ${w} ${ok(b)}. Tayangan ulang tidak dihitung.`,
    randomDuel: "🎲 Duel acak", todaysDuel: "📅 Duel hari ini", saveClip: "🎬 Simpan klip 9:16", shareResult: "📋 Bagikan hasil",
    copied: "Disalin!", shared: "Dibagikan!", shareFailed: "Gagal membagikan", watchAgain: "▶ Tonton lagi",
    calledIt: "Tebakanmu benar ✅", notThisTime: "Belum beruntung ❌",
    noRecord: "Browser ini tidak bisa merekam klip. Coba Chrome atau Safari.",
    sharePick: "Tebakanku: ", shareWon: (w, hp, s) => `${w} menang dengan sisa ${hp} HP dalam ${s} dtk`, streak: (n) => `🔥 ${n} hari beruntun`,
    weapons: {
      sword: ["Pedang", "+1 damage"], spear: ["Tombak", "+12 jangkauan"], dagger: ["Belati", "+20% putaran"],
      hammer: ["Palu", "+2 damage"], bow: ["Busur", "+1 panah"], axe: ["Kapak", "+1 damage, +putaran"],
      scythe: ["Sabit", "+1 damage, serap nyawa"], shuriken: ["Shuriken", "+1 pantulan"], shield: ["Perisai", "+1 damage, lebih lebar"],
    },
  },
} satisfies Record<string, Dict>;

export type Lang = keyof typeof DICTS;
export const LANGS = Object.keys(DICTS) as Lang[];
export const DEFAULT_LANG: Lang = "zh-TW";

const isLang = (s: string | null): s is Lang => !!s && s in DICTS;

let current: Lang = (() => {
  const q = new URLSearchParams(location.search).get("lang");
  if (isLang(q)) return q;
  const saved = load<string | null>("ballduel.lang", null);
  return isLang(saved) ? saved : DEFAULT_LANG;
})();

export function lang(): Lang {
  return current;
}

export function setLang(l: Lang): void {
  current = l;
  save("ballduel.lang", l);
}

export function t(): Dict {
  return DICTS[current];
}

export function langName(l: Lang): string {
  return DICTS[l].name;
}

export const weaponLabel = (k: WeaponKind) => t().weapons[k][0];
export const weaponGrow = (k: WeaponKind) => t().weapons[k][1];

// Draws everything onto one 720x1280 canvas so the recorded clip is a finished 9:16 short.

import { t as tr, weaponGrow, weaponLabel } from "../i18n";
import type { Ball, Sim, SimEvent } from "./sim";

export const W = 720;
export const H = 1280;
export const ARENA = { x: 60, y: 360, w: 600, h: 600 };
const FULL = W - 60; // max width for centred text, so long translations shrink instead of clipping

interface Floater { x: number; y: number; text: string; life: number; color: string }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }

export interface Caption {
  title: () => string; // e.g. "Ball Duel #12"; re-read every frame so a language switch applies
  url: string;
}

export class Renderer {
  private floaters: Floater[] = [];
  private sparks: Spark[] = [];
  private shake = 0;

  private ctx: CanvasRenderingContext2D;
  private caption: Caption;

  constructor(ctx: CanvasRenderingContext2D, caption: Caption) {
    this.ctx = ctx;
    this.caption = caption;
  }

  consume(events: SimEvent[], sim: Sim): void {
    for (const e of events) {
      if (e.type === "hit") {
        this.floaters.push({ x: e.x, y: e.y, text: `-${e.damage}`, life: 0.8, color: "#fff" });
        this.burst(e.x, e.y, sim.balls[e.by].color, 10);
        this.shake = Math.min(14, this.shake + 4 + e.damage * 0.3);
      } else if (e.type === "parry") {
        this.burst(e.x, e.y, "#ffe27a", 6);
      } else if (e.type === "reflect") {
        this.burst(e.x, e.y, "#8fe9ff", 10);
      } else if (e.type === "heal") {
        this.floaters.push({ x: e.x, y: e.y, text: `+${e.amount}`, life: 0.8, color: "#7dffa1" });
      } else if (e.type === "ko") {
        const b = sim.balls[e.target];
        this.burst(b.x, b.y, b.color, 40);
        this.shake = 22;
      }
    }
    events.length = 0;
  }

  update(dt: number): void {
    for (const f of this.floaters) { f.y -= 50 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.92; s.vy *= 0.92; s.life -= dt; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    this.shake = Math.max(0, this.shake - 60 * dt);
  }

  draw(sim: Sim): void {
    const c = this.ctx;
    this.background();
    this.hud(sim);
    c.save();
    if (this.shake > 0) c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.arena(sim);
    for (const sh of sim.shots) {
      const owner = sim.balls[sh.owner];
      if (sh.kind === "arrow") {
        const s = Math.hypot(sh.vx, sh.vy);
        c.strokeStyle = "#f4f4f4";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(sh.x, sh.y);
        c.lineTo(sh.x - (sh.vx / s) * 24, sh.y - (sh.vy / s) * 24);
        c.stroke();
      } else {
        star(c, sh.x, sh.y, 13, sim.time * 18, owner.color);
      }
    }
    for (const b of sim.balls) if (!b.dead) this.ball(sim, b);
    for (const s of this.sparks) {
      c.globalAlpha = Math.max(0, s.life / 0.5);
      c.fillStyle = s.color;
      c.fillRect(s.x - 3, s.y - 3, 6, 6);
    }
    c.globalAlpha = 1;
    for (const f of this.floaters) {
      c.globalAlpha = Math.min(1, f.life * 2);
      text(c, f.text, f.x, f.y, 34, f.color, "center", true);
    }
    c.globalAlpha = 1;
    c.restore();
    this.footer(sim);
  }

  // big "who wins?" card at the start of the clip
  intro(sim: Sim, t: number): void {
    this.draw(sim);
    const c = this.ctx;
    c.fillStyle = `rgba(10,10,20,${0.75 * Math.min(1, 1.6 - t)})`;
    c.fillRect(0, 0, W, H);
    const [a, b] = sim.balls;
    const pop = 1 + Math.max(0, 0.3 - t) * 2;
    const s = tr();
    text(c, s.whoWins, W / 2, 470, 96 * pop, "#fff", "center", true, FULL);
    if (a && b) {
      text(c, `${a.weapon.def.emoji} ${weaponLabel(a.weapon.def.kind)}`, W / 2, 600, 64, a.color, "center", true, FULL);
      text(c, s.vs, W / 2, 680, 44, "#bbb", "center", true);
      text(c, `${b.weapon.def.emoji} ${weaponLabel(b.weapon.def.kind)}`, W / 2, 760, 64, b.color, "center", true, FULL);
    }
    text(c, s.commentPick, W / 2, 900, 36, "#ddd", "center", true, FULL);
  }

  outro(sim: Sim, pickedId: number | null, t: number): void {
    this.draw(sim);
    const c = this.ctx;
    c.fillStyle = `rgba(10,10,20,${Math.min(0.8, t * 2)})`;
    c.fillRect(0, 0, W, H);
    const w = sim.winner;
    const s = tr();
    if (w) {
      text(c, "🏆", W / 2, 470, 120, "#fff", "center");
      text(c, s.wins(weaponLabel(w.weapon.def.kind)), W / 2, 610, 84, w.color, "center", true, FULL);
      text(c, s.hpLeft(Math.ceil(w.hp), w.weapon.level), W / 2, 690, 36, "#ddd", "center", true, FULL);
    } else {
      text(c, s.draw, W / 2, 610, 96, "#fff", "center", true, FULL);
    }
    if (pickedId !== null) {
      const ok = w?.id === pickedId;
      text(c, s.myPick(ok), W / 2, 800, 52, ok ? "#7dffa1" : "#ff7d7d", "center", true, FULL);
    }
    text(c, s.playToday, W / 2, 960, 36, "#ddd", "center", true, FULL);
  }

  private background(): void {
    const c = this.ctx;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1b1530");
    g.addColorStop(1, "#0b0b14");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  private hud(sim: Sim): void {
    const c = this.ctx;
    text(c, this.caption.title(), W / 2, 70, 40, "#fff", "center", true, FULL);
    const n = sim.balls.length;
    const bw = (W - 80 - (n - 1) * 20) / n;
    sim.balls.forEach((b, i) => {
      const x = 40 + i * (bw + 20), y = 120;
      text(c, `${b.weapon.def.emoji} ${weaponLabel(b.weapon.def.kind)}`, x, y + 30, 34, b.color, "left", true, bw);
      c.fillStyle = "#2a2540";
      roundRect(c, x, y + 50, bw, 30, 15);
      c.fill();
      c.fillStyle = b.color;
      roundRect(c, x, y + 50, Math.max(0, bw * (b.hp / b.maxHp)), 30, 15);
      c.fill();
      text(c, `${Math.ceil(b.hp)}`, x + bw - 10, y + 74, 24, "#fff", "right", true);
      text(c, `Lv ${b.weapon.level} · ${weaponGrow(b.weapon.def.kind)}`, x, y + 118, 24, "#aaa", "left", false, bw);
    });
    if (sim.suddenDeath) text(c, tr().suddenDeath(sim.damageScale), W / 2, 320, 30, "#ffd34d", "center", true, FULL);
  }

  private arena(sim: Sim): void {
    const c = this.ctx;
    const { x, y, w, h } = sim.arena;
    c.fillStyle = "#14121f";
    roundRect(c, x, y, w, h, 24);
    c.fill();
    c.strokeStyle = sim.suddenDeath ? "#ffd34d" : "#3b3460";
    c.lineWidth = 6;
    roundRect(c, x, y, w, h, 24);
    c.stroke();
  }

  private ball(sim: Sim, b: Ball): void {
    const c = this.ctx;
    // weapon
    const seg = sim.segment(b);
    const kind = b.weapon.def.kind;
    c.lineCap = "round";
    if (kind === "bow") {
      c.strokeStyle = "#c58b4a";
      c.lineWidth = 8;
      c.beginPath();
      c.arc(b.x, b.y, b.r + 14, b.angle - 0.7, b.angle + 0.7);
      c.stroke();
    } else if (kind === "shuriken") {
      star(c, b.x + Math.cos(b.angle) * (b.r + 16), b.y + Math.sin(b.angle) * (b.r + 16), 14, b.angle * 3, "#d8dbe8");
    } else if (seg) {
      const width = { hammer: 16, dagger: 7, shield: 14, axe: 9 }[kind as string] ?? 10;
      c.strokeStyle = kind === "shield" ? "#8fe9ff" : kind === "scythe" ? "#b9a6ff" : "#e8e8f0";
      c.lineWidth = width;
      c.beginPath();
      c.moveTo(seg.x1, seg.y1);
      c.lineTo(seg.x2, seg.y2);
      c.stroke();
      if (kind === "hammer") {
        c.fillStyle = "#9aa0b5";
        c.beginPath();
        c.arc(seg.x2, seg.y2, 18, 0, Math.PI * 2);
        c.fill();
      } else if (kind === "axe" || kind === "scythe") {
        // blade at the tip, curving the way the weapon spins
        const a = b.angle + (Math.PI / 2) * b.dir;
        c.fillStyle = kind === "axe" ? "#cfd3e0" : "#b9a6ff";
        c.beginPath();
        c.moveTo(seg.x2, seg.y2);
        c.quadraticCurveTo(
          seg.x2 + Math.cos(a) * 26 - Math.cos(b.angle) * 6, seg.y2 + Math.sin(a) * 26 - Math.sin(b.angle) * 6,
          seg.x2 + Math.cos(a) * 30 - Math.cos(b.angle) * (kind === "axe" ? 26 : 40),
          seg.y2 + Math.sin(a) * 30 - Math.sin(b.angle) * (kind === "axe" ? 26 : 40),
        );
        c.lineTo(seg.x2 - Math.cos(b.angle) * 22, seg.y2 - Math.sin(b.angle) * 22);
        c.closePath();
        c.fill();
      }
    }
    // body
    c.fillStyle = b.flash > 0 ? "#fff" : b.color;
    c.beginPath();
    c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.35)";
    c.lineWidth = 4;
    c.stroke();
    text(c, `${Math.ceil(b.hp)}`, b.x, b.y + 12, 34, "#111", "center");
  }

  private footer(sim: Sim): void {
    const c = this.ctx;
    const secs = Math.floor(sim.time);
    text(c, `${secs}s`, W / 2, 1030, 32, "#888", "center");
    text(c, this.caption.url, W / 2, 1200, 34, "#9f8cff", "center", true, FULL);
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 360;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, color });
    }
  }
}

function text(
  c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string,
  align: CanvasTextAlign, bold = false, maxWidth?: number,
): void {
  c.font = `${bold ? "800 " : "600 "}${size}px system-ui, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Hiragino Sans", "Malgun Gothic", "Noto Sans CJK TC", sans-serif`;
  c.textAlign = align;
  c.lineWidth = Math.max(4, size / 8);
  c.strokeStyle = "rgba(0,0,0,.6)";
  c.strokeText(s, x, y, maxWidth);
  c.fillStyle = color;
  c.fillText(s, x, y, maxWidth);
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string): void {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4, d = i % 2 ? r * 0.4 : r;
    c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  c.closePath();
  c.fill();
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
}

// Presentation coordinates never change the deterministic physics arena.
import { t as tr, weaponLabel } from "../i18n";
import type { Ball, Sim, SimEvent } from "./sim";

export const W = 720;
export const H = 1280;
export const ARENA = { x: 60, y: 360, w: 600, h: 600 };
export const VIEW = { x: 70, y: 350, size: 580, cx: W / 2, cy: H / 2 };
const FULL = 540;
type Cue = "fight" | "clutch" | "leadChange" | "knockout" | "suddenDeath";
interface Floater { x: number; y: number; text: string; life: number; color: string; large: boolean }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Ring { x: number; y: number; life: number; color: string; size: number }
interface Trail { x: number; y: number; angle: number }
export interface Caption { title: () => string; url: string; shorts?: boolean; reducedMotion?: boolean }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private caption: Caption;
  private clock = 0;
  private impact = 0;
  private floaters: Floater[] = [];
  private sparks: Spark[] = [];
  private rings: Ring[] = [];
  private trails = new Map<number, Trail[]>();
  private ghostHp = new Map<number, number>();
  private cue: { key: Cue; life: number; color: string } | null = null;
  private leader: number | null = null;
  private largestGap = 0;
  private lastLeadCue = -10;
  private clutchShown = false;
  private damageScale = 1;
  private picked: number | null = null;
  private backdrop?: HTMLCanvasElement;
  private arenaLayer?: HTMLCanvasElement;
  private arenaKey = "";

  constructor(ctx: CanvasRenderingContext2D, caption: Caption) { this.ctx = ctx; this.caption = caption; }
  select(id: number): void { this.picked = id; }
  begin(): void { this.announce("fight", "#c0ff79", .7); }

  consume(events: SimEvent[], sim: Sim): void {
    for (const e of events) {
      if (e.type === "hit") {
        const color = sim.balls[e.by].color;
        this.floaters.push({ x: e.x, y: e.y, text: `−${e.damage}`, life: .7, color: "#fff", large: e.damage >= 10 });
        this.rings.push({ x: e.x, y: e.y, color, life: .5, size: 35 + Math.min(30, e.damage) });
        this.burst(e.x, e.y, color, e.damage >= 10 ? 22 : 10);
        this.impact = Math.min(1, .35 + e.damage / 30);
      } else if (e.type === "parry" || e.type === "reflect") {
        const color = e.type === "parry" ? "#ffe27a" : "#8fe9ff";
        this.rings.push({ x: e.x, y: e.y, color, life: .45, size: 55 });
        this.burst(e.x, e.y, color, 12);
      } else if (e.type === "heal") {
        this.floaters.push({ x: e.x, y: e.y, text: `+${e.amount}`, life: .65, color: "#7dffa1", large: false });
      } else if (e.type === "ko") {
        const b = sim.balls[e.target];
        this.burst(b.x, b.y, b.color, 65);
        this.rings.push({ x: b.x, y: b.y, color: b.color, life: .9, size: 180 });
        this.impact = 1;
        this.announce("knockout", "#fff", .8);
      }
    }
    this.sparks = this.sparks.slice(-180);
    this.rings = this.rings.slice(-14);
    this.floaters = this.floaters.slice(-12);
    events.length = 0;
  }

  update(dt: number): void {
    this.clock += dt;
    this.impact = Math.max(0, this.impact - dt * 4);
    for (const f of this.floaters) { f.y -= 45 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .93; s.vy *= .93; s.life -= dt; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    if (this.cue) { this.cue.life -= dt; if (this.cue.life <= 0) this.cue = null; }
  }

  menu(sim: Sim): void {
    this.draw(sim, false); this.scrim(.72); this.badge(tr().whoWins, 470, "#fff", 48);
    text(this.ctx, tr().vs.toUpperCase(), W / 2, 590, 58, "#c0ff79", "center", 100);
    sim.balls.forEach((b, i) => this.emblem(b, i ? 485 : 235, 570, 55));
  }

  intro(sim: Sim, t: number): void {
    this.draw(sim, false); this.scrim(Math.max(0, .85 - t * .45));
    const c = this.ctx;
    const enter = this.caption.reducedMotion ? 1 : 1 - (1 - Math.min(1, t / .45)) ** 3;
    sim.balls.forEach((b, i) => {
      const x = (i ? 500 : 220) + (i ? 1 : -1) * (1 - enter) * 350;
      this.emblem(b, x, 620, 75);
      text(c, weaponLabel(b.weapon.def.kind), x, 745, 36, b.color, "center", 220);
    });
    text(c, tr().whoWins, W / 2, 455, 64, "#fff", "center", FULL);
    text(c, tr().vs.toUpperCase(), W / 2, 640, 46, "#c0ff79", "center", 100);
    text(c, tr().commentPick, W / 2, 830, 27, "#c5c6dd", "center", FULL);
  }

  outro(sim: Sim, pickedId: number | null, t: number): void {
    this.draw(sim);
    const c = this.ctx, w = sim.winner;
    this.scrim(.88);
    if (w && !this.caption.reducedMotion) {
      for (let i = 0; i < 40; i++) {
        const x = VIEW.cx + Math.sin(i * 2.4) * (90 + (t * 90 + i * 11) % 210);
        const y = 450 + ((i * 97 + t * (80 + i % 5 * 15)) % 430);
        c.fillStyle = i % 3 ? w.color : "#c0ff79"; c.globalAlpha = .65; c.fillRect(x, y, 4, 9);
      }
      c.globalAlpha = 1;
    }
    const pop = this.caption.reducedMotion ? 1 : 1 + Math.sin(Math.min(1, t / .4) * Math.PI) * .1;
    c.save(); c.translate(W / 2, 530); c.scale(pop, pop);
    text(c, "🏆", 0, 0, 96, "#fff", "center"); c.restore();
    text(c, w ? tr().wins(weaponLabel(w.weapon.def.kind)) : tr().draw, W / 2, 650, 62, w?.color ?? "#fff", "center", FULL);
    if (w) text(c, `♥ ${Math.ceil(w.hp)}`, W / 2, 750, 56, "#fff", "center");
    if (!this.caption.shorts && pickedId !== null) text(c, sim.winner?.id === pickedId ? tr().calledIt : tr().notThisTime,
      W / 2, 835, 30, "#c0ff79", "center", FULL);
  }

  draw(sim: Sim, actors = true): void {
    this.observe(sim); this.background(sim); this.hud(sim);
    const c = this.ctx;
    c.save();
    const shake = this.caption.reducedMotion ? 0 : this.impact * 4;
    c.translate(VIEW.x + Math.sin(this.clock * 73) * shake, VIEW.y + Math.cos(this.clock * 61) * shake);
    c.scale(VIEW.size / ARENA.w, VIEW.size / ARENA.h); c.translate(-ARENA.x, -ARENA.y);
    this.arena(sim);
    for (const sh of actors ? sim.shots : []) {
      c.save(); c.shadowColor = sim.balls[sh.owner].color; c.shadowBlur = 12;
      if (sh.kind === "arrow") {
        const speed = Math.hypot(sh.vx, sh.vy); c.strokeStyle = "#f6f8ff"; c.lineWidth = 4;
        c.beginPath(); c.moveTo(sh.x, sh.y); c.lineTo(sh.x - sh.vx / speed * 30, sh.y - sh.vy / speed * 30); c.stroke();
      } else star(c, sh.x, sh.y, 13, sim.time * 18, "#eef6ff");
      c.restore();
    }
    if (actors) for (const b of sim.balls) if (!b.dead) this.ball(sim, b);
    for (const r of this.rings) {
      c.globalAlpha = Math.min(.8, r.life * 1.5); c.strokeStyle = r.color; c.lineWidth = 2 + r.life * 4;
      c.beginPath(); c.arc(r.x, r.y, 8 + (1 - r.life) * r.size, 0, Math.PI * 2); c.stroke();
    }
    for (const s of this.sparks) {
      c.globalAlpha = Math.max(0, Math.min(1, s.life * 2)); c.strokeStyle = s.color; c.lineWidth = 3;
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * .025, s.y - s.vy * .025); c.stroke();
    }
    for (const f of this.floaters) {
      c.globalAlpha = Math.min(1, f.life * 3); text(c, f.text, f.x, f.y, f.large ? 44 : 30, f.color, "center");
    }
    c.globalAlpha = 1; c.restore();
    if (this.cue) {
      const s = tr();
      const label = this.cue.key === "suddenDeath" ? s.suddenDeath(sim.damageScale) : s[this.cue.key];
      this.badge(label, 1008, this.cue.color, 33);
    } else text(c, `${Math.floor(sim.time)}s`, W / 2, 1008, 24, "#797d9c", "center");
  }

  private observe(sim: Sim): void {
    const [a, b] = sim.balls;
    if (!a || !b || sim.winner) return;
    const gap = Math.abs(a.hp - b.hp), leader = a.hp === b.hp ? this.leader : a.hp > b.hp ? a.id : b.id;
    this.largestGap = Math.max(this.largestGap, gap);
    if (this.leader !== null && leader !== this.leader && this.largestGap > 25 && this.clock - this.lastLeadCue > 3) {
      this.announce("leadChange", "#c0ff79", 1.5); this.lastLeadCue = this.clock;
    }
    this.leader = leader;
    if (!this.clutchShown && Math.min(a.hp, b.hp) <= 20 && gap > 20) {
      this.clutchShown = true; this.announce("clutch", "#ffbc6e", 1.8);
    }
    if (sim.damageScale !== this.damageScale) { this.damageScale = sim.damageScale; this.announce("suddenDeath", "#ffd34d", 1.6); }
  }

  private background(sim: Sim): void {
    const c = this.ctx;
    // Cache at the backing canvas resolution: capture remains native 1080p.
    if (!this.backdrop || this.backdrop.width !== c.canvas.width) {
      this.backdrop = document.createElement("canvas");
      this.backdrop.width = c.canvas.width; this.backdrop.height = c.canvas.height;
      const b = this.backdrop.getContext("2d")!;
      b.scale(this.backdrop.width / W, this.backdrop.height / H);
      const g = b.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 770);
      g.addColorStop(0, "#1b2440"); g.addColorStop(.6, "#0d1122"); g.addColorStop(1, "#060911");
      b.fillStyle = g; b.fillRect(0, 0, W, H); b.globalAlpha = .16;
      for (const side of [0, 1]) {
        const light = b.createRadialGradient(side ? W : 0, 620, 0, side ? W : 0, 620, 410);
        light.addColorStop(0, sim.balls[side]?.color ?? "#8c9fff"); light.addColorStop(1, "transparent");
        b.fillStyle = light; b.fillRect(0, 200, W, 900);
      }
    }
    c.drawImage(this.backdrop, 0, 0, W, H); c.save();
    const motion = this.caption.reducedMotion ? 0 : this.clock;
    for (let i = 0; i < 30; i++) {
      const x = (i * 127 + Math.sin(motion * .12 + i) * 24 + W) % W;
      const y = (i * 179 - motion * (3 + i % 4) + H * 100) % H;
      c.globalAlpha = .08 + .07 * Math.sin(i + motion); c.fillStyle = "#b5c9ff";
      c.fillRect(x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 12 : 3);
    }
    c.restore();
    if (!this.caption.shorts) text(c, "BALL DUEL", W / 2, 140, 22, "#c0ff79", "center");
  }

  private hud(sim: Sim): void {
    const c = this.ctx;
    sim.balls.forEach((b, i) => {
      const x = i ? 390 : 70;
      c.fillStyle = "#10182a"; rounded(c, x - 12, 170, 284, 128, 18); c.fill();
      c.strokeStyle = `${b.color}55`; c.lineWidth = 1; c.stroke();
      text(c, `${b.weapon.def.emoji} ${weaponLabel(b.weapon.def.kind)}`, x + 130, 215, 31, b.color, "center", 250);
      c.fillStyle = "#262b41"; rounded(c, x, 245, 260, 20, 10); c.fill();
      const previous = this.ghostHp.get(b.id) ?? b.hp, ghost = Math.max(b.hp, previous - .7);
      this.ghostHp.set(b.id, ghost);
      if (ghost > 0) { c.fillStyle = "#f5e7d3"; rounded(c, x, 245, Math.max(2, ghost / b.maxHp * 260), 20, 10); c.fill(); }
      if (b.hp > 0) {
        const bar = c.createLinearGradient(x, 0, x + 260, 0); bar.addColorStop(0, b.color); bar.addColorStop(1, tint(b.color, .4));
        c.fillStyle = bar; rounded(c, x, 245, Math.max(2, b.hp / b.maxHp * 260), 20, 10); c.fill();
      }
      if (this.picked === b.id && !this.caption.shorts) text(c, "▼", x + 130, 290, 17, "#c0ff79", "center");
    });
    text(c, tr().vs.toUpperCase(), W / 2, 235, 19, "#8994b7", "center");
  }

  private arena(sim: Sim): void {
    const c = this.ctx, { x, y, w, h } = sim.arena;
    const danger = sim.balls.some((b) => b.hp > 0 && b.hp <= 20);
    const key = `${c.canvas.width}:${danger}:${sim.suddenDeath}`;
    const pad = 32;
    if (!this.arenaLayer || key !== this.arenaKey) {
      this.arenaKey = key;
      const scale = c.canvas.width / W * VIEW.size / ARENA.w;
      this.arenaLayer = document.createElement("canvas");
      this.arenaLayer.width = Math.ceil((w + pad * 2) * scale);
      this.arenaLayer.height = Math.ceil((h + pad * 2) * scale);
      const layer = this.arenaLayer.getContext("2d")!;
      layer.scale(scale, scale); layer.translate(pad - x, pad - y);
      this.paintArena(layer, sim);
    }
    c.drawImage(this.arenaLayer, x - pad, y - pad, w + pad * 2, h + pad * 2);
    if (danger) {
      const pulse = this.caption.reducedMotion ? .5 : .5 + Math.sin(this.clock * 6) * .5;
      c.save(); c.strokeStyle = "#ff647c"; c.globalAlpha = .35 + pulse * .35; c.lineWidth = 2 + pulse * 2;
      rounded(c, x, y, w, h, 28); c.stroke(); c.restore();
    }
  }

  private paintArena(c: CanvasRenderingContext2D, sim: Sim): void {
    const { x, y, w, h } = sim.arena;
    const danger = sim.balls.some((b) => b.hp > 0 && b.hp <= 20);
    const pulse = .5;
    c.save(); c.shadowColor = danger ? "#ff647c" : sim.suddenDeath ? "#ffd34d" : "#759eff"; c.shadowBlur = 16 + pulse * 10;
    c.fillStyle = "#0b1222"; rounded(c, x, y, w, h, 28); c.fill();
    c.shadowBlur = 0; c.strokeStyle = danger ? "#ff647c" : sim.suddenDeath ? "#f9cd68" : "#455b86";
    c.lineWidth = danger ? 3 + pulse * 2 : 3; c.stroke(); c.save(); c.clip();
    c.strokeStyle = "#1b2943"; c.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
      c.beginPath(); c.moveTo(x + i * 50, y); c.lineTo(x + i * 50, y + h); c.stroke();
      c.beginPath(); c.moveTo(x, y + i * 50); c.lineTo(x + w, y + i * 50); c.stroke();
    }
    c.strokeStyle = "#233450";
    for (const radius of [115, 120]) { c.beginPath(); c.arc(x + w / 2, y + h / 2, radius, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(x + w / 2 - 12, y + h / 2); c.lineTo(x + w / 2 + 12, y + h / 2);
    c.moveTo(x + w / 2, y + h / 2 - 12); c.lineTo(x + w / 2, y + h / 2 + 12); c.stroke(); c.restore();
    c.strokeStyle = sim.suddenDeath ? "#ffd34d" : "#87aaff"; c.lineWidth = 4;
    for (const [dx, dy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      const sx = dx ? -1 : 1, sy = dy ? -1 : 1;
      c.beginPath(); c.moveTo(x + dx + sx * 8, y + dy + sy * 34); c.lineTo(x + dx + sx * 8, y + dy + sy * 18);
      c.quadraticCurveTo(x + dx + sx * 8, y + dy + sy * 8, x + dx + sx * 18, y + dy + sy * 8);
      c.lineTo(x + dx + sx * 34, y + dy + sy * 8); c.stroke();
    }
    c.restore();
  }

  private ball(sim: Sim, b: Ball): void {
    const c = this.ctx, trail = this.trails.get(b.id) ?? [];
    if (!this.caption.reducedMotion) {
      trail.push({ x: b.x, y: b.y, angle: b.angle }); if (trail.length > 7) trail.shift(); this.trails.set(b.id, trail); c.save();
      trail.forEach((p, i) => {
        c.globalAlpha = i / trail.length * .2; c.strokeStyle = b.color; c.lineWidth = 5;
        c.beginPath(); c.arc(p.x, p.y, b.r + Math.min(65, b.weapon.length) * .75, p.angle - .3, p.angle); c.stroke();
      }); c.restore();
    }
    const seg = sim.segment(b), kind = b.weapon.def.kind;
    c.save(); c.lineCap = "round"; c.shadowColor = b.color; c.shadowBlur = 10;
    if (kind === "bow") {
      c.strokeStyle = "#ffd199"; c.lineWidth = 7; c.beginPath(); c.arc(b.x, b.y, b.r + 14, b.angle - .7, b.angle + .7); c.stroke();
    } else if (kind === "shuriken") {
      star(c, b.x + Math.cos(b.angle) * (b.r + 16), b.y + Math.sin(b.angle) * (b.r + 16), 16, b.angle * 3, "#e2ecff");
    } else if (seg) {
      c.strokeStyle = kind === "shield" ? "#8fe9ff" : kind === "scythe" ? "#c2adff" : "#f1f5ff";
      c.lineWidth = ({ hammer: 13, dagger: 6, shield: 13, axe: 8 } as Record<string, number>)[kind] ?? 8;
      c.beginPath(); c.moveTo(seg.x1, seg.y1); c.lineTo(seg.x2, seg.y2); c.stroke();
      if (kind === "hammer") {
        c.save(); c.translate(seg.x2, seg.y2); c.rotate(b.angle); c.fillStyle = "#b7c8e1"; rounded(c, -12, -23, 24, 46, 5); c.fill(); c.restore();
      } else if (kind === "axe" || kind === "scythe") {
        const a = b.angle + Math.PI / 2 * b.dir; c.fillStyle = kind === "axe" ? "#e2e9f7" : "#c2adff";
        c.beginPath(); c.moveTo(seg.x2, seg.y2); c.quadraticCurveTo(seg.x2 + Math.cos(a) * 26, seg.y2 + Math.sin(a) * 26,
          seg.x2 + Math.cos(a) * 30 - Math.cos(b.angle) * 40, seg.y2 + Math.sin(a) * 30 - Math.sin(b.angle) * 40);
        c.lineTo(seg.x2 - Math.cos(b.angle) * 18, seg.y2 - Math.sin(b.angle) * 18); c.fill();
      } else if (kind === "sword" || kind === "dagger" || kind === "spear") {
        const nx = -Math.sin(b.angle) * 5, ny = Math.cos(b.angle) * 5;
        c.fillStyle = "#fff"; c.beginPath(); c.moveTo(seg.x1 + nx, seg.y1 + ny);
        c.lineTo(seg.x2 + Math.cos(b.angle) * 5, seg.y2 + Math.sin(b.angle) * 5); c.lineTo(seg.x1 - nx, seg.y1 - ny); c.fill();
      }
    }
    c.restore();
    const sphere = c.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, 1, b.x, b.y, b.r);
    sphere.addColorStop(0, tint(b.color, .7)); sphere.addColorStop(.45, b.color); sphere.addColorStop(1, tint(b.color, -.45));
    c.save(); c.shadowColor = b.color; c.shadowBlur = b.hp <= 20 ? 22 : 12;
    c.fillStyle = b.flash > 0 ? "#fff" : sphere; c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0; c.strokeStyle = tint(b.color, .6); c.lineWidth = 2; c.stroke(); c.strokeStyle = "#ffffff66"; c.lineWidth = 2;
    c.beginPath(); c.arc(b.x, b.y, b.r - 5, -Math.PI * .9, -Math.PI * .25); c.stroke();
    if (this.picked === b.id && !this.caption.shorts) { c.strokeStyle = "#c0ff79"; c.setLineDash([6, 7]); c.beginPath(); c.arc(b.x, b.y, b.r + 8, 0, Math.PI * 2); c.stroke(); }
    c.restore(); text(c, `${Math.ceil(b.hp)}`, b.x, b.y + 11, 32, "#fff", "center");
  }

  private emblem(b: Ball, x: number, y: number, radius: number): void {
    const c = this.ctx; c.save(); c.shadowColor = b.color; c.shadowBlur = 28;
    const g = c.createRadialGradient(x - radius / 3, y - radius / 3, 1, x, y, radius);
    g.addColorStop(0, tint(b.color, .7)); g.addColorStop(1, tint(b.color, -.4)); c.fillStyle = g;
    c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; c.strokeStyle = tint(b.color, .7); c.lineWidth = 2; c.stroke();
    text(c, b.weapon.def.emoji, x, y + radius * .34, radius * 1.05, "#fff", "center"); c.restore();
  }
  private scrim(alpha: number): void {
    const c = this.ctx; c.fillStyle = `rgba(7,11,22,${alpha})`; rounded(c, VIEW.x + 4, VIEW.y + 4, VIEW.size - 8, VIEW.size - 8, 25); c.fill();
  }
  private badge(label: string, y: number, color: string, size: number): void {
    const c = this.ctx; c.fillStyle = "#101729e8"; rounded(c, 92, y - size - 10, 536, size + 30, 12); c.fill();
    c.strokeStyle = color; c.globalAlpha = .4; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
    text(c, label, W / 2, y, size, color, "center", 510);
  }
  private announce(key: Cue, color: string, life: number): void { this.cue = { key, color, life }; }
  private burst(x: number, y: number, color: string, n: number): void {
    const count = this.caption.reducedMotion ? Math.min(4, n) : n;
    for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, s = 90 + Math.random() * 300;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .35 + Math.random() * .3, color }); }
  }
}

function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign, maxWidth?: number): void {
  c.font = `800 ${size}px system-ui, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  c.textAlign = align; c.lineJoin = "round"; c.lineWidth = Math.max(3, size / 10); c.strokeStyle = "#060a16cc";
  c.strokeText(value, x, y, maxWidth); c.fillStyle = color; c.fillText(value, x, y, maxWidth);
}
function rounded(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath(); c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}
function tint(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => { const v = n >> shift & 255; return Math.round(amount > 0 ? v + (255 - v) * amount : v * (1 + amount)); };
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string): void {
  c.fillStyle = color; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, d = i % 2 ? r * .4 : r; c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
  c.closePath(); c.fill();
}

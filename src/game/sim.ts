// Deterministic 2D arena: balls bounce at constant speed, each carries a spinning
// weapon that gets stronger every time it lands a hit.

import { rng } from "../core/daily";

export type WeaponKind =
  | "sword" | "spear" | "dagger" | "hammer" | "bow"
  | "axe" | "scythe" | "shuriken" | "shield";

export interface WeaponDef {
  kind: WeaponKind;
  label: string;
  emoji: string;
  length: number; // reach beyond the ball edge (shield: half its width)
  damage: number;
  spin: number; // rad/s
  ranged?: { shot: "arrow" | "star"; every: number; speed: number };
  // what grows on every successful hit, shown in the HUD
  growLabel: string;
  grow(w: Weapon): void;
}

export interface Weapon {
  def: WeaponDef;
  length: number;
  damage: number;
  spin: number;
  shots: number; // bow: arrows per volley
  bounces: number; // shuriken: wall bounces per star
  level: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  color: string;
  weapon: Weapon;
  angle: number;
  dir: 1 | -1;
  flash: number;
  fireTimer: number;
  dead: boolean;
}

export interface Shot {
  kind: "arrow" | "star";
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
  damage: number;
  bounces: number;
  alive: boolean;
}

export interface Segment { x1: number; y1: number; x2: number; y2: number }

export type SimEvent =
  | { type: "hit"; x: number; y: number; damage: number; target: number; by: number }
  | { type: "parry"; x: number; y: number }
  | { type: "reflect"; x: number; y: number }
  | { type: "heal"; x: number; y: number; amount: number }
  | { type: "shoot"; x: number; y: number; shot: "arrow" | "star" }
  | { type: "ko"; target: number; by: number }
  | { type: "bounce"; x: number; y: number };

export const WEAPONS: Record<WeaponKind, WeaponDef> = {
  sword: {
    kind: "sword", label: "Sword", emoji: "🗡️", length: 70, damage: 8, spin: 3.2,
    growLabel: "+1 dmg", grow: (w) => { w.damage += 1; },
  },
  spear: {
    kind: "spear", label: "Spear", emoji: "🔱", length: 95, damage: 6, spin: 2.6,
    growLabel: "+12 reach", grow: (w) => { w.length += 12; },
  },
  dagger: {
    kind: "dagger", label: "Dagger", emoji: "🔪", length: 46, damage: 4, spin: 6.5,
    growLabel: "+20% spin", grow: (w) => { w.spin *= 1.2; },
  },
  hammer: {
    kind: "hammer", label: "Hammer", emoji: "🔨", length: 60, damage: 11, spin: 2.1,
    growLabel: "+2 dmg", grow: (w) => { w.damage += 2; },
  },
  bow: {
    kind: "bow", label: "Bow", emoji: "🏹", length: 26, damage: 8, spin: 1.6,
    ranged: { shot: "arrow", every: 1.1, speed: 620 },
    growLabel: "+1 arrow", grow: (w) => { w.shots += 1; },
  },
  axe: {
    kind: "axe", label: "Axe", emoji: "🪓", length: 64, damage: 8, spin: 3,
    growLabel: "+1 dmg, +spin", grow: (w) => { w.damage += 1; w.spin *= 1.08; },
  },
  scythe: {
    kind: "scythe", label: "Scythe", emoji: "💀", length: 85, damage: 5, spin: 2.4,
    growLabel: "+1 dmg, lifesteal", grow: (w) => { w.damage += 1; },
  },
  shuriken: {
    kind: "shuriken", label: "Shuriken", emoji: "⭐", length: 20, damage: 5, spin: 2.2,
    ranged: { shot: "star", every: 1.4, speed: 520 },
    growLabel: "+1 bounce", grow: (w) => { w.bounces += 1; },
  },
  shield: {
    kind: "shield", label: "Shield", emoji: "🛡️", length: 30, damage: 4, spin: 2.6,
    growLabel: "+1 dmg, wider", grow: (w) => { w.damage += 1; w.length += 5; },
  },
};

export const WEAPON_KINDS = Object.keys(WEAPONS) as WeaponKind[];

export interface Arena {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Fighter {
  kind: WeaponKind;
  color: string;
}

const SPEED = 340;
const HIT_COOLDOWN = 0.35;
const SUDDEN_DEATH_AT = 25;

export class Sim {
  balls: Ball[] = [];
  shots: Shot[] = [];
  events: SimEvent[] = [];
  time = 0;
  winner: Ball | null = null;
  arena: Arena;
  private cooldown = new Map<string, number>();

  constructor(arena: Arena, fighters: Fighter[], seed: number) {
    this.arena = arena;
    const rand = rng(seed);
    const n = fighters.length;
    fighters.forEach((f, i) => {
      const def = WEAPONS[f.kind];
      const r = 46;
      // spread starting spots around the centre so nobody spawns overlapping
      const a = (i / n) * Math.PI * 2 + rand() * 0.6;
      const cx = arena.x + arena.w / 2 + dcos(a) * arena.w * 0.28;
      const cy = arena.y + arena.h / 2 + dsin(a) * arena.h * 0.28;
      const va = rand() * Math.PI * 2;
      this.balls.push({
        id: i, x: cx, y: cy, vx: dcos(va) * SPEED, vy: dsin(va) * SPEED, r,
        hp: 100, maxHp: 100, color: f.color,
        weapon: { def, length: def.length, damage: def.damage, spin: def.spin, shots: 1, bounces: 1, level: 1 },
        angle: rand() * Math.PI * 2, dir: rand() < 0.5 ? 1 : -1, flash: 0, fireTimer: 1, dead: false,
      });
    });
  }

  get suddenDeath(): boolean {
    return this.time >= SUDDEN_DEATH_AT;
  }

  // x2 at 25s, x4 at 40s so every duel ends inside a short clip
  get damageScale(): number {
    return this.time >= SUDDEN_DEATH_AT + 15 ? 4 : this.suddenDeath ? 2 : 1;
  }

  step(dt: number): void {
    if (this.winner) return;
    this.time += dt;
    const alive = this.balls.filter((b) => !b.dead);

    for (const b of alive) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.weapon.spin * b.dir * dt;
      b.flash = Math.max(0, b.flash - dt);
      this.bounceWalls(b);
    }

    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++) this.collide(alive[i], alive[j]);

    for (const [k, v] of this.cooldown) this.cooldown.set(k, v - dt);

    this.weaponClashes(alive);
    for (const a of alive) for (const b of alive) if (a !== b) this.weaponHit(a, b);
    for (const b of alive) if (b.weapon.def.ranged) this.fire(b, dt);
    this.moveShots(alive, dt);

    const left = this.balls.filter((b) => !b.dead);
    if (left.length <= 1) this.winner = left[0] ?? null;
  }

  // the weapon's hit line; ranged weapons have none
  segment(b: Ball): Segment | null {
    if (b.weapon.def.ranged) return null;
    const c = dcos(b.angle), s = dsin(b.angle);
    if (b.weapon.def.kind === "shield") {
      // a flat plate held in front of the ball, across the facing direction
      const d = b.r + 14, half = b.weapon.length;
      const mx = b.x + c * d, my = b.y + s * d;
      return { x1: mx - s * half, y1: my + c * half, x2: mx + s * half, y2: my - c * half };
    }
    return {
      x1: b.x + c * b.r * 0.6, y1: b.y + s * b.r * 0.6,
      x2: b.x + c * (b.r + b.weapon.length), y2: b.y + s * (b.r + b.weapon.length),
    };
  }

  private bounceWalls(b: Ball): void {
    const { x, y, w, h } = this.arena;
    let hit = false;
    if (b.x - b.r < x) { b.x = x + b.r; b.vx = Math.abs(b.vx); hit = true; }
    if (b.x + b.r > x + w) { b.x = x + w - b.r; b.vx = -Math.abs(b.vx); hit = true; }
    if (b.y - b.r < y) { b.y = y + b.r; b.vy = Math.abs(b.vy); hit = true; }
    if (b.y + b.r > y + h) { b.y = y + h - b.r; b.vy = -Math.abs(b.vy); hit = true; }
    if (hit) this.events.push({ type: "bounce", x: b.x, y: b.y });
  }

  private collide(a: Ball, b: Ball): void {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = dhypot(dx, dy), min = a.r + b.r;
    if (d === 0 || d >= min) return;
    const nx = dx / d, ny = dy / d, push = (min - d) / 2;
    a.x -= nx * push; a.y -= ny * push;
    b.x += nx * push; b.y += ny * push;
    // equal masses: swap the velocity components along the normal
    const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
    if (va - vb <= 0) return;
    a.vx += (vb - va) * nx; a.vy += (vb - va) * ny;
    b.vx += (va - vb) * nx; b.vy += (va - vb) * ny;
    normalize(a); normalize(b);
  }

  private weaponClashes(alive: Ball[]): void {
    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        const sa = this.segment(a), sb = this.segment(b);
        if (!sa || !sb) continue;
        const key = `p${a.id}-${b.id}`;
        if ((this.cooldown.get(key) ?? 0) > 0) continue;
        const p = segIntersect(sa, sb);
        if (!p) continue;
        a.dir = (a.dir * -1) as 1 | -1;
        b.dir = (b.dir * -1) as 1 | -1;
        this.cooldown.set(key, 0.25);
        this.events.push({ type: "parry", x: p.x, y: p.y });
      }
  }

  private weaponHit(a: Ball, b: Ball): void {
    const s = this.segment(a);
    if (!s || b.dead) return;
    const key = `h${a.id}-${b.id}`;
    if ((this.cooldown.get(key) ?? 0) > 0) return;
    if (distToSeg(b.x, b.y, s) > b.r) return;
    this.cooldown.set(key, HIT_COOLDOWN);
    this.damage(a, b, a.weapon.damage, (s.x2 + b.x) / 2, (s.y2 + b.y) / 2);
    // knock the target away from the attacker
    const dx = b.x - a.x, dy = b.y - a.y, d = dhypot(dx, dy) || 1;
    b.vx = (dx / d) * SPEED; b.vy = (dy / d) * SPEED;
  }

  private fire(b: Ball, dt: number): void {
    const r = b.weapon.def.ranged!;
    b.fireTimer -= dt;
    if (b.fireTimer > 0) return;
    b.fireTimer = r.every;
    const n = b.weapon.shots;
    for (let k = 0; k < n; k++) {
      const spread = n === 1 ? 0 : (k / (n - 1) - 0.5) * 0.5;
      const a = b.angle + spread;
      this.shots.push({
        kind: r.shot,
        x: b.x + dcos(a) * (b.r + 10), y: b.y + dsin(a) * (b.r + 10),
        vx: dcos(a) * r.speed, vy: dsin(a) * r.speed,
        owner: b.id, damage: b.weapon.damage, bounces: r.shot === "star" ? b.weapon.bounces : 0, alive: true,
      });
    }
    this.events.push({ type: "shoot", x: b.x, y: b.y, shot: r.shot });
  }

  private moveShots(alive: Ball[], dt: number): void {
    const { x, y, w, h } = this.arena;
    for (const sh of this.shots) {
      if (!sh.alive) continue;
      sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      if (sh.x < x || sh.x > x + w || sh.y < y || sh.y > y + h) {
        if (sh.bounces <= 0) { sh.alive = false; continue; }
        sh.bounces -= 1;
        if (sh.x < x || sh.x > x + w) sh.vx = -sh.vx;
        if (sh.y < y || sh.y > y + h) sh.vy = -sh.vy;
        sh.x = Math.min(x + w, Math.max(x, sh.x));
        sh.y = Math.min(y + h, Math.max(y, sh.y));
      }
      for (const b of alive) {
        if (b.id === sh.owner || b.dead) continue;
        const s = this.segment(b);
        if (s && distToSeg(sh.x, sh.y, s) < 8) {
          if (b.weapon.def.kind === "shield") {
            // shields send the shot straight back at whoever fired it
            sh.owner = b.id;
            sh.vx = -sh.vx; sh.vy = -sh.vy;
            this.events.push({ type: "reflect", x: sh.x, y: sh.y });
          } else {
            sh.alive = false;
            this.events.push({ type: "parry", x: sh.x, y: sh.y });
          }
          break;
        }
        if (dhypot(sh.x - b.x, sh.y - b.y) < b.r) {
          sh.alive = false;
          this.damage(this.balls[sh.owner], b, sh.damage, sh.x, sh.y);
          break;
        }
      }
    }
    this.shots = this.shots.filter((s) => s.alive);
  }

  private damage(by: Ball, target: Ball, amount: number, x: number, y: number): void {
    const dmg = amount * this.damageScale;
    target.hp = Math.max(0, target.hp - dmg);
    target.flash = 0.15;
    by.weapon.def.grow(by.weapon);
    by.weapon.level += 1;
    this.events.push({ type: "hit", x, y, damage: dmg, target: target.id, by: by.id });
    if (by.weapon.def.kind === "scythe" && !by.dead) {
      const heal = Math.min(by.maxHp - by.hp, Math.round(dmg * 0.5));
      if (heal > 0) {
        by.hp += heal;
        this.events.push({ type: "heal", x: by.x, y: by.y - by.r, amount: heal });
      }
    }
    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      this.events.push({ type: "ko", target: target.id, by: by.id });
    }
  }
}

// Cross-browser determinism: Math.sin/cos/hypot may differ in the last bit between JS engines
// (V8 vs JavaScriptCore), and the physics amplifies that, so a shared link could replay a
// different fight on an iPhone. These use only + - * / and sqrt, which IEEE 754 makes exact.
const TAU = Math.PI * 2;

function dsin(x: number): number {
  x -= TAU * Math.round(x / TAU); // [-pi, pi]
  if (x > Math.PI / 2) x = Math.PI - x;
  else if (x < -Math.PI / 2) x = -Math.PI - x; // [-pi/2, pi/2]
  const x2 = x * x;
  // Taylor series to x^15: error < 1e-9 on this range, plenty for a game
  let term = x, sum = x;
  for (let n = 1; n <= 7; n++) {
    term *= -x2 / ((2 * n) * (2 * n + 1));
    sum += term;
  }
  return sum;
}

function dcos(x: number): number {
  return dsin(x + Math.PI / 2);
}

function dhypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function normalize(b: Ball): void {
  const s = dhypot(b.vx, b.vy) || 1;
  b.vx = (b.vx / s) * SPEED;
  b.vy = (b.vy / s) * SPEED;
}

function distToSeg(px: number, py: number, s: Segment): number {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / (dx * dx + dy * dy || 1)));
  return dhypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy));
}

function segIntersect(a: Segment, b: Segment): { x: number; y: number } | null {
  const d = (a.x2 - a.x1) * (b.y2 - b.y1) - (a.y2 - a.y1) * (b.x2 - b.x1);
  if (d === 0) return null;
  const t = ((b.x1 - a.x1) * (b.y2 - b.y1) - (b.y1 - a.y1) * (b.x2 - b.x1)) / d;
  const u = ((b.x1 - a.x1) * (a.y2 - a.y1) - (b.y1 - a.y1) * (a.x2 - a.x1)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x1 + t * (a.x2 - a.x1), y: a.y1 + t * (a.y2 - a.y1) };
}

import type { Sim } from "../game/sim";

// Editing pace only: the caller still runs every fixed physics step in order.
export function playbackRate(sim: Sim, editedClip: boolean): number {
  if (!editedClip || sim.winner) return 1;
  const [a, b] = sim.balls;
  if (Math.min(a.hp, b.hp) <= 20) return 1;
  const near = Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + Math.max(a.weapon.length, b.weapon.length) + 65;
  return near ? 1.25 : 2.6;
}

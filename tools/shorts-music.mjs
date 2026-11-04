// Original instrumental: 132 BPM, A minor, synthesised drums, bass and arpeggios.
// No samples, third-party recordings or network services. Returns a stereo PCM WAV.
import { writeFileSync } from "node:fs";

export function writeShortsMusic(file, duration) {
  const rate = 48_000;
  const count = Math.ceil(duration * rate);
  const left = new Float32Array(count);
  const right = new Float32Array(count);
  const beat = 60 / 132;
  const ending = Math.max(0, duration - 2.3);
  let seed = 91837;
  const noise = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 2147483648 - 1;
  };
  const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
  function event(start, length, pan, sample) {
    const offset = Math.round(start * rate);
    const n = Math.min(Math.ceil(length * rate), count - offset);
    const l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2);
    for (let i = 0; i < n; i++) {
      const value = sample(i / rate, i);
      left[offset + i] += value * l;
      right[offset + i] += value * r;
    }
  }
  function note(start, midi, length, level, pan = 0, bright = false) {
    const f = hz(midi);
    event(start, length, pan, (t) => {
      const envelope = Math.min(1, t / .008) * Math.exp(-t * (bright ? 9 : 6)) * Math.min(1, (length - t) / .03);
      const phase = 2 * Math.PI * f * t;
      return level * envelope * (Math.sin(phase) + .24 * Math.sin(phase * 2) + .08 * Math.sin(phase * 3));
    });
  }
  const roots = [45, 41, 48, 43];
  const chords = [[69, 72, 76, 79], [65, 69, 72, 76], [67, 72, 76, 79], [67, 71, 74, 79]];
  for (let b = 0; b * beat < ending; b++) {
    const start = b * beat;
    const bar = Math.floor(b / 4);
    const chord = Math.floor(bar / 2) % 4;
    const lift = start > ending - 12 ? 1.15 : 1;
    // Four-on-the-floor kick with a quick pitch drop, then a warm sub tail.
    event(start, .26, 0, (t) => .55 * Math.exp(-t * 20)
      * Math.sin(2 * Math.PI * (48 * t + 130 * .018 * (1 - Math.exp(-t / .018)))));
    if (b % 2 === 1) {
      event(start, .12, 0, (t) => .14 * noise() * Math.exp(-t * 32)
        + .05 * Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 35));
    }
    for (let half = 0; half < 2; half++) {
      event(start + half * beat / 2, .045, half ? .35 : -.35,
        (t) => .055 * lift * noise() * Math.exp(-t * 100));
    }
    note(start + beat / 2, roots[chord], beat * .43, .23);
    if (bar >= 2) {
      const sequence = [0, 2, 1, 3, 2, 1, 3, 2];
      for (let half = 0; half < 2; half++) {
        const step = (b * 2 + half) % sequence.length;
        note(start + half * beat / 2, chords[chord][sequence[step]], .28,
          .07 * lift, half ? .3 : -.3, true);
      }
    }
    // A little extra motion in the final bars; keep impacts in front of the music.
    if (start > ending - 7 && b % 4 === 3) {
      for (let q = 1; q < 4; q++) {
        event(start + q * beat / 4, .06, q % 2 ? -.2 : .2,
          (t) => .045 * noise() * Math.exp(-t * 65));
      }
    }
  }
  [69, 72, 76, 81].forEach((midi, i) => note(ending + i * .09, midi, 1.4, .13, (i - 1.5) * .15));
  const wav = Buffer.alloc(44 + count * 4);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(count * 4, 40);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const fade = Math.min(1, t / .08, (duration - t) / .4);
    wav.writeInt16LE(Math.round(Math.tanh(left[i]) * .65 * fade * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.tanh(right[i]) * .65 * fade * 32767), 46 + i * 4);
  }
  writeFileSync(file, wav);
  return { composition: "Duel Pulse v1", bpm: 132, key: "A minor", source: "original procedural synthesis", duration };
}

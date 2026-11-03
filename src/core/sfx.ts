// Synthesised sound effects (no audio files to license). Everything goes to two outputs:
// the speakers (mutable) and a MediaStream track that the clip recorder mixes in,
// so saved clips keep their sound even when the player has muted the page.

export class Sfx {
  private ctx?: AudioContext;
  private bus?: GainNode;
  private speakers?: GainNode;
  private stream?: MediaStreamAudioDestinationNode;
  private noiseBuf?: AudioBuffer;
  private lastBounce = 0;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  set muted(m: boolean) {
    this._muted = m;
    if (this.speakers) this.speakers.gain.value = m ? 0 : 1;
  }

  get track(): MediaStreamTrack | undefined {
    return this.stream?.stream.getAudioTracks()[0];
  }

  // must run inside a user gesture (browsers block audio until then)
  unlock(): void {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.bus = ctx.createGain();
      this.bus.gain.value = 0.6;
      this.speakers = ctx.createGain();
      this.speakers.gain.value = this._muted ? 0 : 1;
      this.stream = ctx.createMediaStreamDestination();
      // limiter: overlapping hits would otherwise clip in the recorded clip
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.1;
      this.bus.connect(limiter);
      limiter.connect(this.speakers).connect(ctx.destination);
      limiter.connect(this.stream);
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
  }

  hit(damage: number): void {
    const v = Math.min(1, 0.35 + damage / 30);
    this.noise(0.09, 1800, v * 0.8, "bandpass");
    this.tone("sine", 160, 55, 0.14, v);
  }

  parry(): void {
    this.tone("triangle", 1400, 1300, 0.12, 0.35);
    this.tone("square", 2100, 2000, 0.06, 0.12);
  }

  reflect(): void {
    this.tone("triangle", 900, 1900, 0.15, 0.35);
  }

  shoot(kind: "arrow" | "star"): void {
    if (kind === "arrow") this.noise(0.08, 3200, 0.25, "highpass");
    else this.tone("square", 1200, 600, 0.07, 0.12);
  }

  bounce(): void {
    const now = this.ctx?.currentTime ?? 0;
    if (now - this.lastBounce < 0.08) return;
    this.lastBounce = now;
    this.tone("sine", 320, 260, 0.05, 0.12);
  }

  heal(): void {
    this.tone("sine", 660, 990, 0.18, 0.25);
  }

  ko(): void {
    this.noise(0.6, 400, 0.9, "lowpass");
    this.tone("sine", 110, 30, 0.7, 0.9);
  }

  intro(): void {
    [0, 0.28, 0.56].forEach((t, i) => {
      this.tone("sine", i === 2 ? 90 : 140, 45, 0.25, i === 2 ? 0.9 : 0.6, t);
      this.noise(0.05, 2500, 0.3, "highpass", t);
    });
  }

  suddenDeath(): void {
    [0, 0.18, 0.36, 0.54].forEach((t, i) => this.tone("square", i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.15, 0.18, t));
  }

  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone("triangle", f, f, 0.22, 0.4, i * 0.11));
  }

  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, freq: number, vol: number, filter: BiquadFilterType, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus || !this.noiseBuf) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}

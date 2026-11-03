// Records a canvas to a video clip so players can post their run as a 9:16 short.

// audio-capable containers first, so the synthesised sound effects end up in the clip
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm",
];

export function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

export class ClipRecorder {
  private rec?: MediaRecorder;
  private chunks: Blob[] = [];
  readonly mime = pickMime();

  private canvas: HTMLCanvasElement;
  private fps: number;

  constructor(canvas: HTMLCanvasElement, fps = 30) {
    this.canvas = canvas;
    this.fps = fps;
  }

  get supported(): boolean {
    return !!this.mime && typeof this.canvas.captureStream === "function";
  }

  start(audio?: MediaStreamTrack): void {
    if (!this.supported) return;
    this.chunks = [];
    const stream = this.canvas.captureStream(this.fps);
    if (audio) stream.addTrack(audio);
    this.rec = new MediaRecorder(stream, { mimeType: this.mime, videoBitsPerSecond: 4_000_000 });
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(250);
  }

  stop(): Promise<Blob | null> {
    const rec = this.rec;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(this.chunks, { type: this.mime }));
      rec.stop();
      // stop only the canvas track: the audio track is shared and reused for the next clip
      rec.stream.getVideoTracks().forEach((t) => t.stop());
    });
  }
}

export async function shareOrDownload(blob: Blob, name: string, text: string): Promise<void> {
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const file = new File([blob], `${name}.${ext}`, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return;
    } catch {
      // user cancelled or share failed: fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

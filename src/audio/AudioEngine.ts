// AETHER Particle Lab — audio analysis engine
// Sources: microphone (explicit permission), user-supplied audio file,
// or a built-in synthesized demo beat so the effect works out of the box.

export type AudioSourceMode = 'none' | 'microphone' | 'file' | 'demo';
export interface AudioLevelsSnapshot {
  bass: number; mid: number; treble: number; energy: number; beat: boolean; source: AudioSourceMode;
}

const BAND_BASS: readonly [number, number] = [1, 12];
const BAND_MID: readonly [number, number] = [13, 120];
const BAND_TREBLE: readonly [number, number] = [121, 640];

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private mediaEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  private mode: AudioSourceMode = 'demo';
  private smoothed = { bass: 0, mid: 0, treble: 0, energy: 0 };
  private prevBass = 0;
  private beatRefractory = 0;
  private demoLastBeatIndex = -1;
  private startedAt = 0;

  constructor() {
    this.startedAt = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
  }

  getMode(): AudioSourceMode {
    return this.mode;
  }

  /** Request microphone access. Throws with a friendly message on denial. */
  async enableMicrophone(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is not available in this browser.');
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false }, video: false });
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new Error('Microphone permission was denied. Allow mic access in the browser address bar, or load an audio file instead.');
      }
      if (name === 'NotFoundError') {
        throw new Error('No microphone was found on this device.');
      }
      throw new Error(`Could not open the microphone: ${(err as Error).message ?? String(err)}`);
    }
    this.teardownSource();
    this.micStream = stream;
    const ctx = this.ensureContext();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(this.analyser!);
    this.mode = 'microphone';
  }

  /** Load a user-selected audio file and route it through the analyser. */
  async loadFile(file: File): Promise<void> {
    if (!/audio|mpeg|ogg|wav|flac|mp4|aac/i.test(file.type) && !/\.(mp3|ogg|wav|flac|m4a|aac)$/i.test(file.name)) {
      throw new Error('Unsupported audio file. Use MP3, WAV, OGG, FLAC or M4A.');
    }
    this.teardownSource();
    const url = URL.createObjectURL(file);
    const el = new Audio(url);
    el.loop = true;
    el.crossOrigin = 'anonymous';
    const ctx = this.ensureContext();
    this.mediaSource = ctx.createMediaElementSource(el);
    this.mediaSource.connect(this.analyser!);
    this.mediaSource.connect(ctx.destination); // keep it audible
    try {
      await el.play();
    } catch {
      // Autoplay policies: the source graph is live; user pressing play on the
      // (looped) element later still works since it's wired to destination.
    }
    this.mediaEl = el;
    this.mode = 'file';
  }

  /** Fall back to the built-in demo beat (no hardware required). */
  useDemo(): void {
    this.teardownSource();
    this.mode = 'demo';
  }

  getLevels(): AudioLevelsSnapshot {
    if (this.mode === 'demo') return this.demoLevels();
    if (!this.analyser || !this.freqData) {
      return { bass: 0, mid: 0, treble: 0, energy: 0, beat: false, source: this.mode };
    }
    this.analyser.getByteFrequencyData(this.freqData);
    const bass = this.bandAverage(BAND_BASS) / 255;
    const mid = this.bandAverage(BAND_MID) / 255;
    const treble = this.bandAverage(BAND_TREBLE) / 255;

    // Attack fast, release slow
    const s = this.smoothed;
    const follow = (cur: number, target: number) => cur + (target - cur) * (target > cur ? 0.5 : 0.16);
    s.bass = follow(s.bass, bass);
    s.mid = follow(s.mid, mid);
    s.treble = follow(s.treble, treble);
    s.energy = clamp01(s.bass * 0.55 + s.mid * 0.3 + s.treble * 0.15);

    // Beat detection with refractory window
    this.beatRefractory = Math.max(0, this.beatRefractory - 1 / 60);
    const beat = this.beatRefractory === 0 && s.bass > 0.52 && s.bass > this.prevBass + 0.13;
    if (beat) this.beatRefractory = 0.3;
    this.prevBass = s.bass;

    return {
      bass: clamp01(s.bass * 1.35),
      mid: clamp01(s.mid * 1.5),
      treble: clamp01(s.treble * 1.8),
      energy: clamp01(s.energy * 1.4),
      beat,
      source: this.mode,
    };
  }

  private ensureContext(): AudioContext {
    if (this.audioCtx && this.analyser) return this.audioCtx;
    const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AC();
    void this.audioCtx.resume?.();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.72;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    return this.audioCtx;
  }

  private bandAverage([lo, hi]: readonly [number, number]): number {
    if (!this.freqData) return 0;
    let sum = 0;
    const n = Math.min(hi, this.freqData.length - 1) - lo + 1;
    for (let i = lo; i <= Math.min(hi, this.freqData.length - 1); i++) sum += this.freqData[i];
    return n > 0 ? sum / n : 0;
  }

  /** Synthetic 116 BPM-ish groove with kick, offbeat hats, bassline movement. */
  private demoLevels(): AudioLevelsSnapshot {
    const t = (typeof performance !== 'undefined' ? performance.now() / 1000 : 0) - this.startedAt;
    const beatPeriod = 60 / 116;
    const phase = t / beatPeriod;
    const beatIndex = Math.floor(phase);
    const frac = phase - beatIndex;

    // Kick drum: sharp decaying pulse on each beat
    const kick = Math.exp(-frac * 5.2);
    // Offbeat hat: short tick at the half-beat
    const hatPhase = (frac + 0.5) % 1;
    const hat = Math.exp(-hatPhase * 22) * 0.8;
    // Bassline: darker movement every 2 beats
    const bassline = 0.55 + 0.45 * Math.sin(Math.floor(beatIndex / 2) * 1.7 + 0.8);
    // Sparkle: pseudo-random arpeggio from a hashed sine lattice
    const sparkle = Math.abs(Math.sin(t * 5.3) * Math.sin(t * 2.17 + 1.4) * Math.sin(t * 8.9 + 0.6));

    const bass = clamp01(kick * 0.75 * bassline + 0.12);
    const mid = clamp01(hat * 0.72 + 0.10 + 0.08 * Math.sin(t * 1.9));
    const treble = clamp01(sparkle * 0.5 * (0.5 + 0.5 * Math.sin(t * 0.37 + 2.2)) + 0.06);
    const energy = clamp01(bass * 0.52 + mid * 0.26 + treble * 0.22);

    const beat = beatIndex !== this.demoLastBeatIndex;
    this.demoLastBeatIndex = beatIndex;

    return { bass: clamp01(bass * 1.25), mid: clamp01(mid * 1.3), treble: clamp01(treble * 1.5), energy: clamp01(energy * 1.35), beat, source: 'demo' };
  }

  private teardownSource(): void {
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) track.stop();
      this.micStream = null;
    }
    if (this.mediaEl) {
      this.mediaEl.pause();
      this.mediaEl.src = '';
      this.mediaEl = null;
    }
    if (this.mediaSource) {
      try { this.mediaSource.disconnect(); } catch { /* already gone */ }
      this.mediaSource = null;
    }
    // Keep the analyser/context alive for reuse; mic source nodes are GC'd.
  }

  dispose(): void {
    this.teardownSource();
    this.analyser?.disconnect();
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
    this.analyser = null;
    this.mode = 'none';
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

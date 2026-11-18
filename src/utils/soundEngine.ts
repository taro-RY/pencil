/**
 * Procedural Web Audio API synthesizer for the M-01 Ti-6Al-4V dual-stage ratchet clicker.
 * Zero external audio files — 100% physically modeled transient + metallic barrel resonance.
 */
class MechanicalSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Ignore autoplay resume rejection before user gesture
      });
    }
    if (!this.noiseBuffer && this.ctx) {
      const length = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        // Exponentially decaying micro-noise for crisp metal contact
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.14));
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Triggers a crisp two-phase mechanical ratchet click:
   * - extended = true: deep authoritative downward latch ("ka-da")
   * - extended = false: lighter spring-assisted upward release ("tik-clack")
   */
  public playRatchetClick(extended: boolean) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    // 1. Primary metallic striker impulse (high-Q bandpass noise)
    this.triggerTransient(ctx, now, extended ? 3400 : 4100, extended ? 0.42 : 0.34, 4.5);

    // 2. Titanium barrel hollow cavity ring (dual inharmonic partials)
    this.triggerResonance(ctx, now, extended ? 880 : 1040, extended ? 0.16 : 0.12, 0.042);
    this.triggerResonance(ctx, now, extended ? 1560 : 1820, extended ? 0.1 : 0.08, 0.03);

    // 3. Secondary ratchet cam tooth snap (~22ms later)
    const camDelay = extended ? 0.022 : 0.017;
    this.triggerTransient(ctx, now + camDelay, extended ? 4600 : 5100, extended ? 0.3 : 0.25, 6.0);
    this.triggerResonance(ctx, now + camDelay, extended ? 1240 : 1480, 0.11, 0.032);
  }

  private triggerTransient(
    ctx: AudioContext,
    startTime: number,
    centerFreq: number,
    gainLevel: number,
    qFactor: number,
  ) {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(qFactor, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.0012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.024);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(startTime);
    src.stop(startTime + 0.035);
  }

  private triggerResonance(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    gainLevel: number,
    decaySec: number,
  ) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.86, startTime + decaySec);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decaySec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + decaySec + 0.005);
  }
}

export const soundEngine = new MechanicalSoundEngine();

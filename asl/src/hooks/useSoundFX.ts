"use client";

import { useCallback, useEffect, useState } from "react";

class SoundFXService {
  private static instance: SoundFXService;
  private isMuted: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();
  private ctx: AudioContext | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("signhero_sfx_muted");
      this.isMuted = stored === "true";
    }
  }

  public static getInstance(): SoundFXService {
    if (!SoundFXService.instance) {
      SoundFXService.instance = new SoundFXService();
    }
    return SoundFXService.instance;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx?.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMuted(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("signhero_sfx_muted", String(this.isMuted));
    }
    this.listeners.forEach(l => l(this.isMuted));
    return this.isMuted;
  }

  public subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isMuted);
    return () => this.listeners.delete(listener);
  }

  public playHover(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {
      // Ignore audio errors
    }
  }

  public playClick(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // Two rapid oscillators for a high-tech confirm chord
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(440, t);   // A4
      osc1.frequency.setValueAtTime(880, t + 0.05); // A5 jump

      osc2.frequency.setValueAtTime(554.37, t); // C#5
      osc2.frequency.setValueAtTime(1108.73, t + 0.05);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.15);
      osc2.stop(t + 0.15);
    } catch (e) {}
  }

  public playWarp(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      // Lowpass filter to make it sound like a smooth sci-fi whoosh
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1500, t);
      filter.frequency.linearRampToValueAtTime(3000, t + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    } catch (e) {}
  }

  public playBloop(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {}
  }

  public playSuccess(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(523.25, t); // C5
      osc1.frequency.setValueAtTime(659.25, t + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, t + 0.16); // G5
      osc1.frequency.setValueAtTime(1046.50, t + 0.24); // C6

      osc2.frequency.setValueAtTime(261.63, t); // C4
      osc2.frequency.setValueAtTime(523.25, t + 0.24); // C5

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.5);
      osc2.stop(t + 0.5);
    } catch (e) {}
  }
}

export function useSoundFX() {
  const service = SoundFXService.getInstance();
  const [isMuted, setIsMuted] = useState(service.getMuted());

  useEffect(() => {
    return service.subscribe((muted) => {
      setIsMuted(muted);
    });
  }, []);

  const toggleSfxMute = useCallback(() => {
    return service.toggleMuted();
  }, []);

  return {
    isSfxMuted: isMuted,
    toggleSfxMute,
    playHover: useCallback(() => service.playHover(), []),
    playClick: useCallback(() => service.playClick(), []),
    playWarp: useCallback(() => service.playWarp(), []),
    playBloop: useCallback(() => service.playBloop(), []),
    playSuccess: useCallback(() => service.playSuccess(), []),
  };
}

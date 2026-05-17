"use client";

import { useCallback, useEffect, useState } from "react";

class MusicService {
  private static instance: MusicService;
  private isMuted: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();

  private constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("signhero_music_muted");
      this.isMuted = stored === "true";
    }
  }

  public static getInstance(): MusicService {
    if (!MusicService.instance) {
      MusicService.instance = new MusicService();
    }
    return MusicService.instance;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMuted(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("signhero_music_muted", String(this.isMuted));
      window.dispatchEvent(new CustomEvent("signhero-music-mute", { detail: this.isMuted }));
    }
    this.listeners.forEach(l => l(this.isMuted));
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    if (this.isMuted !== muted) {
      this.isMuted = muted;
      if (typeof window !== "undefined") {
        localStorage.setItem("signhero_music_muted", String(this.isMuted));
        window.dispatchEvent(new CustomEvent("signhero-music-mute", { detail: this.isMuted }));
      }
      this.listeners.forEach(l => l(this.isMuted));
    }
  }

  public subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isMuted);
    return () => this.listeners.delete(listener);
  }
}

export function useMusic() {
  const service = MusicService.getInstance();
  const [isMusicMuted, setIsMusicMuted] = useState(service.getMuted());

  useEffect(() => {
    return service.subscribe(muted => setIsMusicMuted(muted));
  }, []);

  return {
    isMusicMuted,
    toggleMusicMute: useCallback(() => service.toggleMuted(), []),
    setMusicMute: useCallback((muted: boolean) => service.setMuted(muted), [])
  };
}

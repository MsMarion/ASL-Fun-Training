"use client";

import { useEffect, useRef, useCallback } from "react";

export function useSoundEffects() {
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize AudioContext on first user interaction if needed
    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume();
        }
    }, []);

    // Music state
    const isPlayingMusicRef = useRef(false);
    const nextNoteTimeRef = useRef(0);
    const rhythmIndexRef = useRef(0);
    const schedulerTimerRef = useRef<number | null>(null);

    // Synthwave scale (C Minor Pentatonic/Dorian feel): C, Eb, F, G, Bb
    const BASS_FREQS = [65.41, 77.78, 87.31, 98.00, 116.54]; // C2 scale

    const scheduleNote = (beatNumber: number, time: number) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        // DRUMS
        // Kick: Beats 0, 4, 8, 12 (4/4 timing, 16th notes)
        if (beatNumber % 4 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.5);
        }

        // Snare: Beats 4, 12 (Backbeat) -> actually typical is 4 and 12 in 16-step seq (beats 2 & 4)
        if (beatNumber % 8 === 4) {
            const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseBuffer.length; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 1000;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.15, time); // Lower volume to be chill
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(time);
        }

        // Hi-hat: Every odd 16th note (off-beats)
        if (beatNumber % 2 !== 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(8000, time);

            // High-pass filter for hiss
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 7000;

            gain.gain.setValueAtTime(0.03, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.05);
        }

        // BASS - Driving 8th notes (0, 2, 4, 6...)
        if (beatNumber % 2 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            // Simple progression based on 16-bar loop
            // Bars 1-4: Root (C)
            // Bars 5-6: b3 (Eb)
            // Bars 7-8: b7 (Bb)
            const bar = Math.floor(beatNumber / 16) % 8;
            let freq = BASS_FREQS[0]; // C2
            if (bar >= 4 && bar < 6) freq = BASS_FREQS[1]; // Eb2
            if (bar >= 6) freq = BASS_FREQS[4]; // Bb2 -> changed to Bb offset

            if (freq) {
                osc.frequency.setValueAtTime(freq, time);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(400, time);
                filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

                gain.gain.setValueAtTime(0.15, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(time);
                osc.stop(time + 0.3);
            }
        }

        // PAD - Every 16 beats (Start of bar)
        if (beatNumber % 16 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';

            const bar = Math.floor(beatNumber / 16) % 8;
            let freq = 261.63; // C4
            if (bar >= 4 && bar < 6) freq = 311.13; // Eb4
            if (bar >= 6) freq = 233.08; // Bb3

            osc.frequency.setValueAtTime(freq, time);

            // Slow attack and release
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.05, time + 1);
            gain.gain.linearRampToValueAtTime(0, time + 4); // 4 second swell

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 4);

            // Add a harmony osc
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 1.5, time); // 5th
            gain2.gain.setValueAtTime(0, time);
            gain2.gain.linearRampToValueAtTime(0.03, time + 1);
            gain2.gain.linearRampToValueAtTime(0, time + 4);

            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(time);
            osc2.stop(time + 4);
        }
    };

    const scheduler = useCallback(() => {
        if (!audioContextRef.current || !isPlayingMusicRef.current) return;

        // Lookahead: 100ms
        while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
            scheduleNote(rhythmIndexRef.current, nextNoteTimeRef.current);
            // Advance time: 16th note at 110 BPM
            // 110 BPM = 1.833 beats per second
            // 16th note = 0.25 beats = 0.136 seconds
            const secondsPerBeat = 60.0 / 110.0;
            nextNoteTimeRef.current += 0.25 * secondsPerBeat;
            rhythmIndexRef.current++;
        }
        schedulerTimerRef.current = window.setTimeout(scheduler, 25);
    }, []);

    const playBackgroundMusic = useCallback(() => {
        initAudio();
        if (isPlayingMusicRef.current) return;

        isPlayingMusicRef.current = true;
        if (audioContextRef.current) {
            nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.1;
            scheduler();
        }
    }, [initAudio, scheduler]);

    const stopBackgroundMusic = useCallback(() => {
        isPlayingMusicRef.current = false;
        if (schedulerTimerRef.current) {
            clearTimeout(schedulerTimerRef.current);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isPlayingMusicRef.current = false;
            if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current);
        }
    }, []);

    const playNote = (freq: number, type: OscillatorType = "sine", duration = 0.5, delay = 0, volume = 0.1) => {
        if (!audioContextRef.current) initAudio();
        const ctx = audioContextRef.current!;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

        // Envelope
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
    };

    const playSuccessSound = useCallback(() => {
        initAudio();
        // Play a shiny C Major 7 arpeggio/chord
        playNote(523.25, "sine", 0.8, 0.0, 0.1); // C5
        playNote(659.25, "sine", 0.8, 0.05, 0.1); // E5
        playNote(783.99, "sine", 0.8, 0.10, 0.1); // G5
        playNote(987.77, "sine", 1.0, 0.15, 0.08); // B5
        playNote(1046.50, "sine", 1.2, 0.20, 0.08); // C6
    }, [initAudio]);

    const playStreakSound = useCallback(() => {
        initAudio();
        // Faster, higher pitched energetic sound for streaks
        playNote(783.99, "triangle", 0.4, 0.0, 0.08); // G5
        playNote(987.77, "triangle", 0.4, 0.1, 0.08); // B5
        playNote(1318.51, "sine", 0.6, 0.2, 0.1); // E6
    }, [initAudio]);

    const playMissSound = useCallback(() => {
        initAudio();
        // Discordant / Failure sound
        playNote(155.56, "sawtooth", 0.4, 0.0, 0.15); // Eb3
        playNote(146.83, "sawtooth", 0.4, 0.1, 0.15); // D3 (clash)
        playNote(98.00, "square", 0.6, 0.2, 0.2); // G2 (low punch)
    }, [initAudio]);

    const playGameFinishedSound = useCallback(() => {
        initAudio();
        // Fanfare
        playNote(523.25, "square", 0.4, 0.0, 0.2); // C5
        playNote(659.25, "square", 0.4, 0.15, 0.2); // E5
        playNote(783.99, "square", 0.4, 0.3, 0.2); // G5
        playNote(1046.50, "square", 2.0, 0.45, 0.3); // C6 (Long)
        
        // Bass Thump
        playNote(130.81, "sine", 1.5, 0.0, 0.5); // C3
    }, [initAudio]);

    return {
        playSuccessSound,
        playStreakSound,
        playMissSound,
        playGameFinishedSound,
        playBackgroundMusic,
        stopBackgroundMusic,
        initAudio
    };
}

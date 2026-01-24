"use client";

import { useState } from "react";
import { SignSymbolHighway } from "~/components/SignSymbolHighway";
import { SignSymbolPrimary, type SignState } from "~/components/SignSymbolPrimary";
import { AVAILABLE_LETTERS } from "~/lib/svgLoader";

export default function PreviewPage() {
  const [selectedLetter, setSelectedLetter] = useState("D");
  const [primaryState, setPrimaryState] = useState<SignState>("idle");

  return (
    <div className="min-h-screen bg-[#0f0a1e] p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">ASL Symbol Preview</h1>

      {/* Letter selector */}
      <div className="mb-8 flex flex-wrap gap-2">
        {AVAILABLE_LETTERS.map((letter) => (
          <button
            key={letter}
            onClick={() => setSelectedLetter(letter)}
            className={`rounded px-3 py-1 text-sm font-mono transition ${
              selectedLetter === letter
                ? "bg-fuchsia-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Highway Style */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-fuchsia-300">
            Highway Style (Neon Outline)
          </h2>
          <div className="flex items-end gap-4 rounded-xl border border-fuchsia-900/50 bg-[#1a0e2e] p-6">
            {/* Simulated highway queue */}
            {["V", "B", selectedLetter, "A"].map((letter, i) => (
              <div
                key={`${letter}-${i}`}
                className="highway-note"
                style={{
                  width: i === 0 ? "60px" : `${60 + i * 10}px`,
                  opacity: 0.4 + i * 0.2,
                }}
              >
                <SignSymbolHighway letter={letter} />
              </div>
            ))}
          </div>
        </section>

        {/* Primary Style */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-fuchsia-300">
            Primary Style (Center Symbol)
          </h2>
          {/* State buttons */}
          <div className="mb-4 flex gap-2">
            {(["idle", "success", "miss"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPrimaryState(s)}
                className={`rounded px-3 py-1 text-sm capitalize transition ${
                  primaryState === s
                    ? "bg-fuchsia-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center rounded-xl border border-fuchsia-900/50 bg-[#1a0e2e] p-8">
            <div className="w-64">
              <SignSymbolPrimary
                key={`${selectedLetter}-${primaryState}`}
                letter={selectedLetter}
                state={primaryState}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Full mock layout */}
      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-fuchsia-300">
          Game Layout Mock
        </h2>
        <div className="game-screen relative overflow-hidden rounded-2xl border-2 border-fuchsia-500/60 bg-[#0d0820]">
          {/* Grid background */}
          <div className="game-grid absolute inset-0" />

          <div className="relative flex h-[500px] items-center justify-center p-8">
            {/* Webcam placeholder */}
            <div className="absolute left-6 top-6 flex h-32 w-44 items-center justify-center rounded-lg border border-cyan-400/60 bg-black/40">
              <span className="text-sm text-cyan-300">WebCam</span>
            </div>

            {/* Score */}
            <div className="absolute right-6 top-6 font-mono text-lg text-fuchsia-300">
              SCORE: 1005
            </div>

            {/* Center symbol */}
            <div className="w-72">
              <SignSymbolPrimary
                key={`mock-${selectedLetter}-${primaryState}`}
                letter={selectedLetter}
                state={primaryState}
              />
            </div>

            {/* Feedback text */}
            {primaryState === "success" && (
              <div className="absolute right-24 top-1/2 -translate-y-1/2 text-3xl font-black text-green-400 sign-feedback-text">
                PERFECT!
              </div>
            )}
            {primaryState === "miss" && (
              <div className="absolute right-24 top-1/2 -translate-y-1/2 text-3xl font-black text-red-400 sign-feedback-text">
                MISS!
              </div>
            )}

            {/* Highway at bottom */}
            <div className="absolute bottom-6 right-6 left-6 flex items-end justify-center gap-6 rounded-lg border border-fuchsia-800/50 bg-black/30 px-6 py-4">
              {["A", "V", "B", "D", "F"].map((letter, i) => (
                <div
                  key={`mock-hw-${letter}-${i}`}
                  className="w-16"
                  style={{ opacity: i === 0 ? 1 : 0.5 + i * 0.1 }}
                >
                  <SignSymbolHighway
                    letter={letter}
                    color={i === 0 ? "#f0abfc" : "#d946ef"}
                  />
                  {i === 0 && (
                    <div className="mt-1 h-0.5 w-full bg-fuchsia-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

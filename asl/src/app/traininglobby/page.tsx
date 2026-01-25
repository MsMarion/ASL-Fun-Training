"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/app/_components/navbar";
import { SynthwaveBackground } from "~/components/game/SynthwaveBackground";

export default function TrainingLobby() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    // Navigate to training mode
    router.push("/game/training");
  };

  return (
    <div className="min-h-screen overflow-hidden relative">
      <SynthwaveBackground />

      <div className="relative z-10 flex flex-col items-center justify-start p-8 min-h-screen">
        <Navbar />

        <div 
          className="z-100 relative w-3/4 h-fit border-b-1 border-r-1 border-l-1 border-white z-20 px-12 py-16 -translate-y-20 mt-8 rounded-3xl shadow-2xl flex flex-col"
          style={{
            background: "linear-gradient(to bottom, rgba(58,0,102,0.8), rgba(146,0,117,0.8), rgba(58,0,102,0.8))"
          }}
        >
          <div className="text-center mb-12">
            <h1 
              className="text-6xl font-[display-font] text-white mb-4 animate-pulse"
              style={{
                textShadow: "0 0 20px rgba(45,226,230,0.5), 0 0 40px rgba(146,0,117,0.3)",
                animationDuration: '3s'
              }}
            >
              LEARN
            </h1>
            <p className="text-purple-200 text-xl font-[subheading-font] mb-6 max-w-3xl mx-auto leading-relaxed">
              Learn ASL through an interactive whack-a-mole style game! 
              You'll have 1 minute to practice signing letters and improve your skills.
            </p>
            <p className="text-cyan-400 text-sm font-mono">
              1 minute timer • Interactive learning • Build muscle memory
            </p>
          </div>

          {/* Start Button */}
          <div className="flex justify-center">
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="cursor-pointer hover:scale-110 transition-all duration-300 px-16 py-6 rounded-2xl font-mono font-bold text-2xl tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(to right, #2de2e6, #920075)",
                color: "#0d0221",
                boxShadow: "0 0 40px rgba(45,226,230,0.6), 0 0 80px rgba(146,0,117,0.4)",
              }}
            >
              {isStarting ? "LOADING..." : "▶ START TRAINING"}
            </button>
          </div>

         
        </div>
      </div>
    </div>
  );
}
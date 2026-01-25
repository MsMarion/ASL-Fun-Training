"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SynthwaveBackground } from "~/components/game/SynthwaveBackground";

export default function Home() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0d0221]">
      <SynthwaveBackground />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Title Container with Glow */}
        <div className="relative mb-12 group cursor-default">
            <h1
            className="text-8xl md:text-9xl font-[display-font] font-black text-white text-center tracking-wider relative z-10"
            style={{
                textShadow: "0 0 10px #2de2e6, 0 0 20px #2de2e6, 0 0 40px #d946ef, 0 0 80px #d946ef",
            }}
            >
            SignHero
            </h1>
            <div className="absolute inset-0 blur-3xl opacity-50 bg-gradient-to-r from-cyan-400 to-fuchsia-600 -z-10 rounded-full scale-110" />
        </div>

        <p className="text-xl md:text-2xl text-cyan-100 mb-16 text-center max-w-2xl font-light tracking-wide bg-black/30 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
          Master American Sign Language through interactive rhythm games
        </p>

        <Link href="/songselection" passHref>
          <button
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="group relative px-16 py-6 text-3xl font-bold text-white transition-all duration-300 transform hover:scale-105"
          >
            {/* Button Background & Border */}
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl transform skew-x-[-10deg] border border-white/20 shadow-[0_0_20px_rgba(232,121,249,0.5)] group-hover:shadow-[0_0_40px_rgba(45,226,230,0.6)] transition-all duration-300" />
            
            {/* Shine Effect */}
            <div className="absolute inset-0 rounded-xl transform skew-x-[-10deg] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </div>

            {/* Text */}
            <span className="relative z-10 font-bold tracking-widest drop-shadow-md">
                START GAME
            </span>
          </button>
        </Link>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-white/20 font-mono text-sm pointer-events-none">
        PRESS START TO BEGIN
      </div>
    </div>
  );
}
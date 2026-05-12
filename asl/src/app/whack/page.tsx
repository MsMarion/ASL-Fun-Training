"use client";

import { useState } from "react";
import { WhackAMoleCanvas } from "~/components/game/WhackAMoleCanvas";
import { Navbar } from "~/app/_components/navbar";
import { motion } from "framer-motion";

export default function WhackPage() {
  const [gameState, setGameState] = useState("idle");
  const isIdle = gameState === "idle";

  return (
    <div className="min-h-full overflow-hidden relative bg-transparent">
      <div className={`relative z-10 flex flex-col items-center justify-start min-h-full ${isIdle ? "p-8" : "p-0"}`}>
        {/* Navbar stays mounted to prevent route transition flash, slides up during gameplay */}
        <div className={`w-full z-50 ${isIdle ? "relative" : "absolute top-0 pointer-events-none"}`}>
          <motion.div 
            animate={isIdle ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className={isIdle ? "pointer-events-auto" : "pointer-events-none"}
          >
            <Navbar />
          </motion.div>
        </div>

        {/* Dynamic Container: Lobby vs Fullscreen */}
        <motion.div 
          layout
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={`z-100 flex flex-col mx-auto overflow-hidden ${
            isIdle 
              ? "relative w-3/4 h-[800px] border border-white z-20 px-12 py-16 -translate-y-20 mt-8 mb-8 rounded-3xl shadow-2xl" 
              : "absolute inset-0 w-full h-screen z-50 rounded-none border-none mt-0"
          }`}
          style={isIdle ? {
            background: "linear-gradient(to bottom, rgba(58,0,102,0.8), rgba(146,0,117,0.8), rgba(58,0,102,0.8))"
          } : {}}
        >
          <WhackAMoleCanvas onStateChange={setGameState} />
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

type Route = {
  readonly title: string;
  readonly href: `/${string}`;
};

const routes: readonly Route[] = [
  { title: "COMMUNITY SONGS", href: "/community" },
  { title: "OFFICIAL SONGS", href: "/songselection" },
  { title: "DEV MODE", href: "/devmode" },
] as const;

const getRoute = (index: number): Route => {
  // Handle negative indices correctly in JS/TS
  const wrappedIndex = ((index % routes.length) + routes.length) % routes.length;
  const route = routes[wrappedIndex];
  if (!route) return routes[0]; // Fallback safety
  return route;
};

const Navbar: React.FC = () => {
  const pathname = usePathname();

  // derived state based on pathname is safer than local storage sync
  const initialIndex = routes.findIndex(r => r.href === pathname);
  const [activeIndex, setActiveIndex] = useState<number>(initialIndex !== -1 ? initialIndex : 0);

  // Sync activeIndex if pathname changes externally (e.g. browser back button)
  useEffect(() => {
    const idx = routes.findIndex(r => r.href === pathname);
    if (idx !== -1) {
      setActiveIndex(idx);
    }
  }, [pathname]);

  // Check if current route matches the active tab
  const isCurrentRoute = useMemo(() => {
    const currentRoute = getRoute(activeIndex);
    return pathname === currentRoute.href;
  }, [pathname, activeIndex]);

  const { currentRoute, prevRoute, nextRoute } = useMemo(() => ({
    currentRoute: getRoute(activeIndex),
    prevRoute: getRoute(activeIndex - 1),
    nextRoute: getRoute(activeIndex + 1),
  }), [activeIndex]);

  // Audio Context for "Bubbly" Navigation Sound
  const playBubbleSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // rapid pitch drop from high to low simulates a bubble "bloop"
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {
      console.error("Audio generation failed", e);
    }
  };

  const handlePrevious = (): void => {
    playBubbleSound();
    setActiveIndex((i) => {
      const newIndex = ((i - 1) % routes.length + routes.length) % routes.length;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("navbarActiveIndex", String(newIndex));
      }
      return newIndex;
    });
  };

  const handleNext = (): void => {
    playBubbleSound();
    setActiveIndex((i) => {
      const newIndex = ((i + 1) % routes.length + routes.length) % routes.length;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("navbarActiveIndex", String(newIndex));
      }
      return newIndex;
    });
  };

  const glowButton =
    "z-100 w-30 h-30 cursor-pointer rounded-t-4xl flex items-center justify-center mb-2 transition-all duration-300 " +
    "bg-[var(--purple)] hover:scale-105 " +
    "hover:ring-1 hover:ring-[var(--cyan)] " +
    "hover:shadow-[0_0_25px_var(--cyan)]";

  return (
    <div className="flex items-end justify-center gap-4 p-8">
      <Link href={prevRoute.href} onClick={handlePrevious} className="z-100">
        <button
          type="button"
          className={`${glowButton} translate-x-67 z-100 border-l-1 border-t-1 border-b-1 border-white`}
          aria-label="Previous route"
        >
          <div className="bg-[var(--magenta)] rounded-t-full p-4 border-1 border-white/30 transition-all duration-300 hover:scale-107">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
      </Link>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ delay: 0.1 }}
        className="-translate-x-15 transition-all duration-200 border-l-1 border-t-1 border-b-1 border-white"
        style={{
          width: "200px",
          height: "100px",
          backgroundColor: "var(--magenta)",
          borderRadius: "50px 50px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cyan)",
          marginBottom: "8px",
          boxShadow: "0 0 40px rgba(45,226,230,0.4), 0 0 80px rgba(146,0,117,0.3)",
        }}
      >
        <span className="font-[subheading-font] text-xl text-center text-white">{prevRoute.title}</span>
      </motion.div>

      {/* Main Center Tab with Bounce Animation */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={`relative -translate-y-2 z-1`}
      >
        {/* Outer semicircle with white border */}
        <div
          className="border-1 border-white"
          style={{
            width: "300px",
            height: "200px",
            backgroundColor: "var(--purple)",
            borderRadius: "200px 200px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            boxShadow: isCurrentRoute
              ? "0 0 60px rgba(45,226,230,0.8), 0 0 120px rgba(146,0,117,0.6)"
              : "0 0 40px rgba(45,226,230,0.4), 0 0 80px rgba(146,0,117,0.3)",
            transition: "box-shadow 0.3s ease-in-out",
          }}
        >
          {/* Inner semicircle with grid pattern */}
          <div
            className="absolute bottom-5"
            style={{
              width: "220px",
              height: "140px",
              backgroundColor: "transparent",
              borderRadius: "180px 180px 0 0",
              border: "1px solid white",
              backgroundImage: `
                linear-gradient(0deg, white 1px, transparent 1px),
                linear-gradient(90deg, white 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0",
              opacity: 0.3,
            }}
          />
          <span className="relative z-10 p-20 font-[subheading-font] flex-wrap text-4xl text-center text-white">
            {currentRoute.title}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ delay: 0.1 }}
        className="translate-x-15 transition-all duration-200 border-r-1 border-t-1 border-b-1 border-white"
        style={{
          width: "200px",
          height: "100px",
          backgroundColor: "var(--magenta)",
          borderRadius: "50px 50px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cyan)",
          marginBottom: "8px",
          boxShadow: "0 0 40px rgba(45,226,230,0.4), 0 0 80px rgba(146,0,117,0.3)",
        }}
      >
        <span className="font-[subheading-font] text-xl text-center text-white">{nextRoute.title}</span>
      </motion.div>

      <Link href={nextRoute.href} onClick={handleNext} className="z-100">
        <button
          type="button"
          className={`${glowButton} -translate-x-67 z-100 border-r-1 border-t-1 border-b-1 border-white`}
          aria-label="Next route"
        >
          <div className="bg-[var(--magenta)] rounded-t-full p-4 border-1 border-white/30 transition-all duration-300 hover:scale-107">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </Link>
    </div>
  );
};

export { Navbar };
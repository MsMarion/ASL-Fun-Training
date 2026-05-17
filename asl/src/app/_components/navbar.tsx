"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundFX } from "~/hooks/useSoundFX";

type Route = {
  readonly title: string;
  readonly href: `/${string}`;
};

const routes: readonly Route[] = [
  { title: "WHACK-A-SIGN", href: "/whack" },
  { title: "OFFICIAL SONGS", href: "/songselection" },
  { title: "COMMUNITY", href: "/community" },
  { title: "DEV MODE", href: "/devmode" },
] as const;

const getRoute = (index: number): Route => {
  const wrappedIndex = ((index % routes.length) + routes.length) % routes.length;
  const route = routes[wrappedIndex];
  if (!route) return routes[0]; 
  return route;
};

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { playBloop } = useSoundFX();

  const isMenuRoute = ["/whack", "/songselection", "/community", "/devmode"].includes(pathname ?? "");

  const initialIndex = routes.findIndex(r => r.href === pathname);
  const [activeIndex, setActiveIndex] = useState<number>(initialIndex !== -1 ? initialIndex : 1);
  const [isHidden, setIsHidden] = useState<boolean>(false);

  useEffect(() => {
    const idx = routes.findIndex(r => r.href === pathname);
    if (idx !== -1) {
      setActiveIndex(idx);
    }
  }, [pathname]);

  useEffect(() => {
    const handleWhack = (e: CustomEvent<boolean>) => {
      setIsHidden(e.detail);
    };
    window.addEventListener("whack-game-state" as any, handleWhack as EventListener);
    return () => {
      window.removeEventListener("whack-game-state" as any, handleWhack as EventListener);
    };
  }, []);

  const isCurrentRoute = useMemo(() => {
    const currentRoute = getRoute(activeIndex);
    return pathname === currentRoute.href;
  }, [pathname, activeIndex]);

  const { currentRoute, prevRoute, nextRoute } = useMemo(() => ({
    currentRoute: getRoute(activeIndex),
    prevRoute: getRoute(activeIndex - 1),
    nextRoute: getRoute(activeIndex + 1),
  }), [activeIndex]);

  const handlePrevious = (): void => {
    playBloop();
    setActiveIndex((i) => {
      const newIndex = ((i - 1) % routes.length + routes.length) % routes.length;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("navbarActiveIndex", String(newIndex));
      }
      return newIndex;
    });
  };

  const handleNext = (): void => {
    playBloop();
    setActiveIndex((i) => {
      const newIndex = ((i + 1) % routes.length + routes.length) % routes.length;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("navbarActiveIndex", String(newIndex));
      }
      return newIndex;
    });
  };

  if (!isMenuRoute) return null;

  const glowButton =
    "z-100 cursor-pointer rounded-t-full flex items-center justify-center transition-all duration-300 pointer-events-auto border-l border-t border-r border-white/40 " +
    "bg-[var(--purple)] hover:scale-105 " +
    "hover:ring-1 hover:ring-[var(--cyan)] " +
    "hover:shadow-[0_0_20px_var(--cyan)] active:scale-95";

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: isHidden ? -250 : 0, opacity: isHidden ? 0 : 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="absolute top-[80px] h-[120px] left-0 right-0 z-40 pointer-events-none flex items-end justify-center gap-3.5"
    >
      <Link href={prevRoute.href} onClick={handlePrevious} className="z-100 pointer-events-auto">
        <button
          type="button"
          className={`${glowButton}`}
          style={{ width: "110px", height: "65px", borderRadius: "65px 65px 0 0" }}
          aria-label="Previous route"
        >
          <div className="bg-[var(--magenta)] rounded-t-full p-2.5 border border-white/30 transition-all duration-300 hover:scale-107 flex items-center justify-center shadow-md">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
      </Link>

      <div
        className="transition-all duration-200 border-l border-t border-r border-white/40 pointer-events-auto flex items-center justify-center overflow-hidden"
        style={{
          width: "170px",
          height: "65px",
          backgroundColor: "var(--magenta)",
          borderRadius: "65px 65px 0 0",
          color: "var(--cyan)",
          boxShadow: "0 0 30px rgba(45,226,230,0.3), 0 0 60px rgba(146,0,117,0.2)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={prevRoute.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="font-[subheading-font] tracking-wide text-sm text-center text-white/90 whitespace-nowrap px-3"
          >
            {prevRoute.title}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Main Center Tab */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`relative z-1 pointer-events-auto`}
      >
        <div
          className="border-l border-t border-r border-white/40 overflow-hidden"
          style={{
            width: "260px",
            height: "120px",
            backgroundColor: "var(--purple)",
            borderRadius: "120px 120px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            boxShadow: isCurrentRoute
              ? "0 0 50px rgba(45,226,230,0.7), 0 0 100px rgba(146,0,117,0.5)"
              : "0 0 30px rgba(45,226,230,0.3), 0 0 60px rgba(146,0,117,0.2)",
            transition: "box-shadow 0.3s ease-in-out",
          }}
        >
          <div
            className="absolute bottom-0"
            style={{
              width: "180px",
              height: "80px",
              backgroundColor: "transparent",
              borderRadius: "90px 90px 0 0",
              border: "1px solid white",
              backgroundImage: `
                linear-gradient(0deg, white 1px, transparent 1px),
                linear-gradient(90deg, white 1px, transparent 1px)
              `,
              backgroundSize: "15px 15px",
              backgroundPosition: "0 0",
              opacity: 0.3,
            }}
          />
          <AnimatePresence mode="wait">
            <motion.span
              key={currentRoute.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 px-6 font-[subheading-font] tracking-wider text-2xl text-center text-white pb-3 drop-shadow-[0_2px_10px_rgba(255,255,255,0.5)]"
            >
              {currentRoute.title}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      <div
        className="transition-all duration-200 border-l border-t border-r border-white/40 pointer-events-auto flex items-center justify-center overflow-hidden"
        style={{
          width: "170px",
          height: "65px",
          backgroundColor: "var(--magenta)",
          borderRadius: "65px 65px 0 0",
          color: "var(--cyan)",
          boxShadow: "0 0 30px rgba(45,226,230,0.3), 0 0 60px rgba(146,0,117,0.2)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={nextRoute.title}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="font-[subheading-font] tracking-wide text-sm text-center text-white/90 whitespace-nowrap px-3"
          >
            {nextRoute.title}
          </motion.span>
        </AnimatePresence>
      </div>

      <Link href={nextRoute.href} onClick={handleNext} className="z-100 pointer-events-auto">
        <button
          type="button"
          className={`${glowButton}`}
          style={{ width: "110px", height: "65px", borderRadius: "65px 65px 0 0" }}
          aria-label="Next route"
        >
          <div className="bg-[var(--magenta)] rounded-t-full p-2.5 border border-white/30 transition-all duration-300 hover:scale-107 flex items-center justify-center shadow-md">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </Link>
    </motion.div>
  );
};

export { Navbar };
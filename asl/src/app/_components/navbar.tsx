"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type Route = {
  readonly title: string;
  readonly href: `/${string}`;
};

const routes: readonly Route[] = [
  { title: "Dev Mode", href: "/devmode" },
  { title: "Song Selection", href: "/songselection" },
  { title: "Generate", href: "/generate" },
] as const;

/* ---------- Helpers ---------- */

const getRoute = (index: number): Route => {
  const route = routes[(index + routes.length) % routes.length];
  if (!route) throw new Error("Invalid route index");
  return route;
};

/* ---------- Component ---------- */

const Navbar: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("navbarActiveIndex");
      return stored ? Number(stored) : 0;
    }
    return 0;
  });

  // Calculate all routes once using useMemo
  const { currentRoute, prevRoute, nextRoute } = useMemo(() => ({
    currentRoute: getRoute(activeIndex),
    prevRoute: getRoute(activeIndex - 1),
    nextRoute: getRoute(activeIndex + 1),
  }), [activeIndex]);

  /* ---------- Handlers ---------- */

  const handlePrevious = (): void => {
    setActiveIndex((i) => {
      const newIndex = i - 1;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("navbarActiveIndex", String(newIndex));
      }
      return newIndex;
    });
  };

  const handleNext = (): void => {
    setActiveIndex((i) => {
      const newIndex = i + 1;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("navbarActiveIndex", String(newIndex));
      }
      return newIndex;
    });
  };

  /* ---------- Styles ---------- */

  const glowButton =
    "z-100 w-30 h-30 rounded-t-4xl flex items-center justify-center mb-2 transition-all duration-150 " +
    "bg-[var(--purple)] hover:scale-110 " +
    "hover:ring-4 hover:ring-[var(--cyan)] " +
    "hover:shadow-[0_0_25px_var(--cyan)]";

  return (
    <div className="flex items-end justify-center gap-4 p-8">
      {/* LEFT BUTTON */}
      <Link href={prevRoute.href} onClick={handlePrevious}>
        <button
          type="button"
          className={`${glowButton} translate-x-60 z-100`}
          aria-label="Previous route"
        >
          <div className="bg-[var(--magenta)] rounded-full p-5">
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

      {/* PREVIOUS TAB */}
      <div
        className="-translate-x-15 transition-all duration-200"
        style={{
          width: "200px",
          height: "100px",
          backgroundColor: "var(--darkpurple)",
          borderRadius: "50px 50px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cyan)",
          opacity: 0.6,
          marginBottom: "8px",
        }}
      >
        {prevRoute.title}
      </div>

      {/* ACTIVE TAB */}
      <div
        className="cursor-pointer -translate-y-2"
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
          boxShadow: "0 0 40px rgba(45,226,230,0.25)",
        }}
      >
        {currentRoute.title}
      </div>

      {/* NEXT TAB */}
      <div
        className="translate-x-15 transition-all duration-200"
        style={{
          width: "200px",
          height: "100px",
          backgroundColor: "var(--darkpurple)",
          borderRadius: "50px 50px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cyan)",
          opacity: 0.6,
          marginBottom: "8px",
        }}
      >
        {nextRoute.title}
      </div>

      {/* RIGHT BUTTON */}
      <Link href={nextRoute.href} onClick={handleNext}>
        <button
          type="button"
          className={`${glowButton} -translate-x-60 z-100`}
          aria-label="Next route"
        >
          <div className="bg-[var(--magenta)] rounded-full p-5">
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
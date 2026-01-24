"use client";

import { useEffect, useRef } from "react"; // Added for particles
import { Navbar } from "@/app/_components/navbar";
import { trpc } from "@/trpc/client";
import { SongCarousel } from "@/app/_components/song-carousel";
import { WavyBackground } from "@/app/_components/wavybackground";

// --- Particle Component ---
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Array<{ x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }> = [];
    const particleCount = 60;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 1,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          opacity: Math.random(),
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.fillStyle = `rgba(45, 226, 230, ${p.opacity})`; // Cyan glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    resize();
    createParticles();
    animate();

    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
    />
  );
};

// --- Main Component ---
export default function SongSelection() {
  const { data: curatedSongs, isLoading, error } = trpc.song.getOfficialSongs.useQuery();

  return (
    <div className="min-h-screen bg-[#0f0a1e] overflow-hidden relative">
      {/* 1. Particles on top of everything */}
      <ParticleField />

      {/* Wavy Background */}
      <WavyBackground
        containerClassName="absolute inset-0"
        colors={["#2de2e6", "#9200ff", "#ff006e", "#8b5cf6", "#06b6d4"]}
        waveWidth={30}
        backgroundFill="#0f0a1e"
        blur={15}
        speed="slow"
        waveOpacity={0.3}
        className="absolute inset-0"
      >
        <></>
      </WavyBackground>

      {/* Animated grid background */}
      <div 
        className="absolute inset-0 opacity-30 z-0"
        style={{
          backgroundImage: `
            linear-gradient(0deg, rgba(45,226,230,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45,226,230,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "gridMove 20s linear infinite",
        }}
      />
      
      {/* Synth wave animated circles */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse z-0" 
           style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse z-0" 
           style={{ animationDuration: '6s', animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col items-center justify-start p-8 min-h-screen">
        <Navbar />
        
        <div className="z-100 relative w-3/4 border-b-1 border-r-1 border-l-1 border-white z-20 px-12 py-16 -translate-y-20 bg-gradient-to-b from-[var(--purple)] via-[var(--magenta)] to-[var(--purple)] mt-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-[display-font] text-white mb-4 animate-pulse" 
                style={{ 
                  textShadow: "0 0 20px rgba(45,226,230,0.5), 0 0 40px rgba(146,0,117,0.3)",
                  animationDuration: '3s'
                }}>
              CURATED SONGS
            </h1>
            <p className="text-purple-200 text-lg font-[subheading-font]">
              From the curated library, select a song to play
            </p>
          </div>

          {isLoading && (
            <div className="text-center text-white text-xl animate-bounce py-20">
              Loading songs...
            </div>
          )}

          {error && (
            <div className="text-center text-red-300 text-xl py-20">
              Error: {error.message}
            </div>
          )}

          {curatedSongs && curatedSongs.length > 0 && (
            <SongCarousel songs={curatedSongs} />
          )}

          {!isLoading && (!curatedSongs || curatedSongs.length === 0) && (
            <div className="text-center text-white text-xl py-20">
              No curated songs found in database
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
      `}</style>
    </div>
  );
}
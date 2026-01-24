"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const particleArray = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
    }));
    setParticles(particleArray);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0f0a1e]">
      {/* Wavy Background */}
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pinkGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#ff1493", stopOpacity: 0.8 }} />
              <stop offset="50%" style={{ stopColor: "#ff69b4", stopOpacity: 0.6 }} />
              <stop offset="100%" style={{ stopColor: "#ff1493", stopOpacity: 0.8 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Multiple wavy layers with pink glow */}
          <path
            d="M0,160 Q250,100 500,160 T1000,160 T1500,160 T2000,160 L2000,800 L0,800 Z"
            fill="url(#pinkGlow)"
            opacity="0.3"
            filter="url(#glow)"
            className="wave-animation"
          />
          <path
            d="M0,200 Q250,150 500,200 T1000,200 T1500,200 T2000,200 L2000,800 L0,800 Z"
            fill="url(#pinkGlow)"
            opacity="0.2"
            filter="url(#glow)"
            className="wave-animation-slow"
          />
          <path
            d="M0,240 Q250,180 500,240 T1000,240 T1500,240 T2000,240 L2000,800 L0,800 Z"
            fill="url(#pinkGlow)"
            opacity="0.15"
            filter="url(#glow)"
            className="wave-animation-slower"
          />
        </svg>
      </div>

      {/* Animated grid background */}
      <div 
        className="absolute inset-0 opacity-20"
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
      <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '6s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '5s', animationDelay: '2s' }} />

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-pink-400 rounded-full opacity-60"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            boxShadow: "0 0 10px rgba(255,105,180,0.8)",
          }}
        />
      ))}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        <h1 
          className="text-9xl font-[display-font] text-white mb-12 text-center tracking-wider"
          style={{
            textShadow: "0 0 30px rgba(255,20,147,0.8), 0 0 60px rgba(255,105,180,0.6), 0 0 90px rgba(138,43,226,0.4)",
            animation: "titlePulse 3s ease-in-out infinite",
          }}
        >
          LEARN ASL
        </h1>

        <p className="text-2xl text-purple-200 mb-16 text-center max-w-2xl">
          Master American Sign Language through interactive rhythm games
        </p>

        <Link href="/songselection">
          <button
            className="cursor-pointer group relative px-12 py-6 text-3xl font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-full border-2 border-white overflow-hidden transition-all duration-300 hover:scale-110"
            style={{
              boxShadow: "0 0 20px rgba(255,105,180,0.5), 0 0 40px rgba(138,43,226,0.3)",
            }}
          >
            <span className="relative z-10">START LEARNING</span>
            
            {/* Animated glow effect on hover */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "radial-gradient(circle, rgba(255,105,180,0.4) 0%, transparent 70%)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </button>
        </Link>

       
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 40px 40px;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-40px) translateX(-10px);
          }
          75% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes titlePulse {
          0%, 100% {
            transform: scale(1);
            text-shadow: 0 0 30px rgba(255,20,147,0.8), 0 0 60px rgba(255,105,180,0.6), 0 0 90px rgba(138,43,226,0.4);
          }
          50% {
            transform: scale(1.05);
            text-shadow: 0 0 40px rgba(255,20,147,1), 0 0 80px rgba(255,105,180,0.8), 0 0 120px rgba(138,43,226,0.6);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        .wave-animation {
          animation: waveMove 8s ease-in-out infinite;
        }

        .wave-animation-slow {
          animation: waveMove 12s ease-in-out infinite;
          animation-delay: -2s;
        }

        .wave-animation-slower {
          animation: waveMove 16s ease-in-out infinite;
          animation-delay: -4s;
        }

        @keyframes waveMove {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-100px);
          }
        }
      `}</style>
    </div>
  );
}
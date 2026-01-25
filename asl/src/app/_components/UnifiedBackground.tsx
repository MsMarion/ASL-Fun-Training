"use client";

import { useEffect, useRef } from "react";
import { WavyBackground } from "@/app/_components/wavybackground";
import { SynthwaveBackground } from "@/components/game/SynthwaveBackground";

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

export function UnifiedBackground() {
    return (
        <>
            {/* 1. Underlying Synthwave Background */}
            <SynthwaveBackground />

            {/* 2. Waves on top (transparent) */}
            <WavyBackground
                containerClassName="absolute inset-0 pointer-events-none"
                colors={["#2de2e6", "#9200ff", "#ff006e", "#8b5cf6", "#06b6d4"]}
                waveWidth={30}
                blur={15}
                speed="slow"
                waveOpacity={0.3}
                className="absolute inset-0 pointer-events-none"
                shouldClearCanvas={true}
                yOffset={0.2}
            >
                <></>
            </WavyBackground>

            {/* 3. Particles on top of everything */}
            <ParticleField />
        </>
    );
}

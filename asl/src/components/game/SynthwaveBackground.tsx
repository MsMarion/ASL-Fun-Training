"use client";

import React from "react";

export function SynthwaveBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-[#0d0221]">
            {/* Sky Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d0221] via-[#1a0b2e] to-[#2d1b4e] h-full" />

            {/* Stars */}
            <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(white 1px, transparent 1px) 0 0 / 50px 50px, radial-gradient(white 1px, transparent 1px) 25px 25px / 100px 100px" }} />

            {/* Sun */}
            <div
                className="absolute left-1/2 -translate-x-1/2 bottom-[35vh] w-96 h-96 rounded-full overflow-hidden"
                style={{
                    backgroundImage: "linear-gradient(to bottom, #f5d300, #ff0055)",
                    boxShadow: "0 0 60px #ff0055, 0 0 100px #ff0055",
                    zIndex: 1
                }}
            >
                {/* Sun stripes - now clipped by overflow-hidden on parent */}
                <div className="absolute inset-0 flex flex-col justify-end pb-8 gap-2 w-full h-full">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="w-full bg-[#0d0221]"
                            style={{ height: `${(i + 1) * 6}px`, opacity: 0.6 }}
                        />
                    ))}
                </div>
            </div>

            {/* Mountains */}
            <div className="absolute bottom-[35vh] left-0 right-0 h-48 z-[2] flex items-end justify-center pointer-events-none">
                {/* Back range */}
                <svg className="w-full h-full absolute bottom-0 opacity-60" preserveAspectRatio="none" viewBox="0 0 1200 120">
                    <path d="M0,120 L0,100 L150,20 L300,120 L450,40 L600,120 L750,50 L900,120 L1050,30 L1200,120 Z" fill="#180426" />
                </svg>
                {/* Front range */}
                <svg className="w-full h-32 absolute bottom-0 z-[3]" preserveAspectRatio="none" viewBox="0 0 1200 100">
                    <path d="M0,100 L0,80 L200,10 L400,100 L600,30 L800,100 L1000,20 L1200,100 Z" fill="#0d0221" />
                </svg>
            </div>

            {/* Palm Trees - Left */}
            <div className="absolute bottom-[35vh] left-[5vw] w-24 h-48 z-[4] opacity-80 rotate-3 origin-bottom">
                <svg viewBox="0 0 100 200" className="w-full h-full fill-[#05010a]">
                    {/* Trunk */}
                    <path d="M45,200 C45,200 50,150 48,100 C46,50 40,20 40,20 L50,20 C50,20 54,50 56,100 C58,150 65,200 65,200 Z" />
                    {/* Leaves */}
                    <path d="M45,20 C45,20 20,30 10,50 M45,20 C45,20 25,10 5,20 M45,20 C45,20 40,0 20,-10 M45,20 C45,20 60,0 80,-5 M45,20 C45,20 80,20 95,30 M45,20 C45,20 70,40 80,60" stroke="#05010a" strokeWidth="4" fill="none" />
                </svg>
            </div>

            {/* Palm Trees - Right */}
            <div className="absolute bottom-[35vh] right-[5vw] w-32 h-64 z-[4] opacity-80 -rotate-3 origin-bottom">
                <svg viewBox="0 0 100 200" className="w-full h-full fill-[#05010a]">
                    {/* Trunk */}
                    <path d="M45,200 C45,200 50,150 48,100 C46,50 40,20 40,20 L50,20 C50,20 54,50 56,100 C58,150 65,200 65,200 Z" />
                    {/* Leaves */}
                    <path d="M45,20 C45,20 20,30 10,50 M45,20 C45,20 25,10 5,20 M45,20 C45,20 40,0 20,-10 M45,20 C45,20 60,0 80,-5 M45,20 C45,20 80,20 95,30 M45,20 C45,20 70,40 80,60" stroke="#05010a" strokeWidth="4" fill="none" />
                </svg>
            </div>


            {/* Horizon Glow Line */}
            <div
                className="absolute bottom-[35vh] left-0 right-0 h-1 bg-white shadow-[0_0_20px_#fff,0_0_40px_#ff00ff]"
                style={{ zIndex: 4 }}
            />

            {/* Horizon Fade */}
            <div
                className="absolute bottom-[35vh] left-0 right-0 h-48 bg-gradient-to-t from-[#ff00ff] to-transparent opacity-30"
                style={{ zIndex: 3 }}
            />

            {/* 3D Grid container */}
            <div
                className="absolute inset-0 w-full h-[150vh] -top-[15vh] origin-bottom pointer-events-none"
                style={{
                    perspective: "200px", /* Lower perspective for flatter horizon look */
                    transformStyle: "preserve-3d",
                    zIndex: 0
                }}
            >
                {/* The moving floor */}
                <div
                    className="absolute inset-0 w-[200%] -left-1/2 h-full synthwave-grid-animate"
                    style={{
                        top: "50%",
                        transform: "rotateX(75deg) translateY(0)",
                        transformOrigin: "center top",
                        backgroundImage: `
                        linear-gradient(transparent 95%, #ff00ff 95%, #ff60ff 100%),
                        linear-gradient(90deg, transparent 95%, #ff00ff 95%, #ff60ff 100%)
                    `,
                        backgroundSize: "30px 30px",
                        backgroundRepeat: "repeat",
                        boxShadow: "0 -20px 60px #ff00ff inset",
                        maskImage: "linear-gradient(to bottom, transparent, black 15%)",
                        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%)"
                    }}
                />
            </div>

            {/* Overall Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-30 z-10" />
        </div>
    );
}

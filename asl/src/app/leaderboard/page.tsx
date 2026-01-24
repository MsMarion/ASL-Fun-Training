'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '~/trpc/react';

const RankBadge = ({ rank }: { rank: number }) => {
    if (rank === 1) {
        return <span className="text-yellow-400 font-bold">🥇</span>;
    }
    if (rank === 2) {
        return <span className="text-gray-300 font-bold">🥈</span>;
    }
    if (rank === 3) {
        return <span className="text-amber-600 font-bold">🥉</span>;
    }
    return <span className="text-cyan-300 font-mono">{String(rank).padStart(2, '0')}</span>;
};

const getNameColor = (index: number) => {
    const colors = [
        'text-cyan-400',
        'text-orange-400',
        'text-yellow-400',
        'text-pink-400',
        'text-purple-400',
        'text-green-400',
        'text-red-400',
        'text-blue-400',
    ];
    return colors[index % colors.length];
};

const LeaderboardPage = () => {
    const searchParams = useSearchParams();
    const scoreFromGame = searchParams.get('score');

    const [smoothPos, setSmoothPos] = useState({ x: 0, y: 0 });
    const [currentTime, setCurrentTime] = useState('');
    const [showNameModal, setShowNameModal] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [submittedScore, setSubmittedScore] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const targetPos = useRef({ x: 0, y: 0 });
    const animationRef = useRef<number | undefined>(undefined);

    // Fetch leaderboard data
    const { data: leaderboardData, refetch } = api.leaderboard.getTop.useQuery(
        { limit: 10 },
        { refetchOnWindowFocus: false }
    );

    // Mutation to create new entry
    const createEntry = api.leaderboard.create.useMutation({
        onSuccess: async () => {
            setShowNameModal(false);
            setSubmittedScore(true);
            await refetch();
        },
    });

    // Generate stable star positions once
    const stars = useMemo(() => {
        return [...Array(100)].map((_, i) => ({
            id: i,
            width: Math.random() * 3 + 1,
            left: Math.random() * 100,
            top: Math.random() * 100,
            delay: Math.random() * 3,
            opacity: Math.random() * 0.8 + 0.2,
        }));
    }, []);

    const lerp = (start: number, end: number, factor: number) => {
        return start + (end - start) * factor;
    };

    const animate = useCallback(() => {
        setSmoothPos(prev => ({
            x: lerp(prev.x, targetPos.current.x, 0.08),
            y: lerp(prev.y, targetPos.current.y, 0.08)
        }));
        animationRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        // Show name modal if there's a score from the game
        if (scoreFromGame && !submittedScore) {
            setShowNameModal(true);
        }
    }, [scoreFromGame, submittedScore]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
                const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
                targetPos.current = { x, y };
            }
        };

        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).replace(',', '');
            setCurrentTime(formatted + ' EST');
        };

        window.addEventListener('mousemove', handleMouseMove);
        updateTime();
        const timeInterval = setInterval(updateTime, 1000);
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearInterval(timeInterval);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animate]);

    const handleSubmitScore = (e: React.FormEvent) => {
        e.preventDefault();
        if (playerName.trim() && scoreFromGame) {
            createEntry.mutate({
                name: playerName.trim(),
                score: parseInt(scoreFromGame, 10),
            });
        }
    };

    const handleSkip = () => {
        setShowNameModal(false);
        setSubmittedScore(true);
    };

    return (
        <div
            ref={containerRef}
            className="h-screen w-screen relative overflow-hidden bg-[#0d0221]"
        >
            {/* Stars Background - Slowest parallax */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    transform: `translate(${smoothPos.x * -0.5}px, ${smoothPos.y * -0.5}px)`,
                }}
            >
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full bg-white animate-twinkle"
                        style={{
                            width: star.width + 'px',
                            height: star.width + 'px',
                            left: star.left + '%',
                            top: star.top + '%',
                            animationDelay: star.delay + 's',
                            opacity: star.opacity,
                        }}
                    />
                ))}
                {/* Larger decorative stars */}
                <div className="absolute top-[15%] left-[10%] text-2xl text-fuchsia-400 animate-pulse">✦</div>
                <div className="absolute top-[25%] right-[15%] text-xl text-fuchsia-500 animate-pulse" style={{ animationDelay: '0.5s' }}>✦</div>
                <div className="absolute bottom-[30%] right-[10%] text-3xl text-cyan-400 animate-pulse" style={{ animationDelay: '1s' }}>✦</div>
                <div className="absolute top-[60%] left-[5%] text-xl text-pink-400 animate-pulse" style={{ animationDelay: '1.5s' }}>✦</div>
            </div>

            {/* Sun - Medium parallax */}
            <div
                className="absolute left-1/2 z-10"
                style={{
                    top: '45%',
                    transform: `translate(calc(-50% + ${smoothPos.x * -40}px), calc(-50% + ${smoothPos.y * -40}px))`,
                }}
            >
                <div className="relative">
                    {/* Sun glow */}
                    <div className="absolute inset-0 w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-b from-yellow-400 via-orange-500 to-fuchsia-600 blur-3xl opacity-60" />
                    {/* Main sun */}
                    <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-b from-yellow-300 via-orange-400 to-fuchsia-500 overflow-hidden">
                        {/* Sun horizontal lines */}
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-full bg-[#0d0221]"
                                style={{
                                    height: '4px',
                                    bottom: `${(i + 1) * 6}%`,
                                    opacity: 0.8 - i * 0.05,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Wireframe Mountains - Medium-fast parallax */}
            <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{
                    top: '40%',
                    transform: `translate(${smoothPos.x * -60}px, ${smoothPos.y * -30}px)`,
                }}
            >
                <svg viewBox="0 0 1200 300" className="w-full h-auto" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#2de2e6" stopOpacity="1" />
                            <stop offset="100%" stopColor="#2de2e6" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>
                    {/* Mountain wireframe lines */}
                    <g stroke="url(#mountainGradient)" strokeWidth="1.5" fill="none" opacity="0.8">
                        {/* Mountain range 1 */}
                        <polyline points="0,300 150,180 250,220 400,120 500,200 600,100 700,180 850,140 950,200 1100,160 1200,300" />
                        {/* Mountain range 2 (background) */}
                        <polyline points="0,300 100,200 200,240 350,160 450,220 550,140 650,200 750,160 900,180 1000,140 1150,200 1200,300" opacity="0.5" />
                        {/* Horizontal grid lines on mountains */}
                        {[...Array(8)].map((_, i) => (
                            <line key={i} x1="0" y1={180 + i * 15} x2="1200" y2={180 + i * 15} opacity={0.3 - i * 0.03} />
                        ))}
                    </g>
                </svg>
            </div>

            {/* Perspective Grid Floor - Fastest parallax */}
            <div
                className="absolute bottom-0 z-15 h-[60vh] overflow-hidden"
                style={{
                    left: '-50%',
                    right: '-50%',
                    width: '200%',
                    transform: `translate(${smoothPos.x * -80}px, ${smoothPos.y * -40}px)`,
                    perspective: '500px',
                }}
            >
                <div
                    className="absolute inset-0 origin-bottom"
                    style={{
                        transform: 'rotateX(60deg)',
                        background: `
              repeating-linear-gradient(
                to right,
                transparent,
                transparent 49px,
                #2de2e6 49px,
                #2de2e6 51px,
                transparent 51px
              ),
              repeating-linear-gradient(
                to bottom,
                transparent,
                transparent 49px,
                #2de2e6 49px,
                #2de2e6 51px,
                transparent 51px
              )
            `,
                        backgroundSize: '100px 100px',
                        animation: 'gridMove 2s linear infinite',
                    }}
                />
            </div>

            {/* Name Entry Modal */}
            {showNameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="relative rounded-2xl p-1 bg-gradient-to-b from-cyan-500/50 via-fuchsia-500/30 to-purple-500/50">
                        <div className="rounded-xl bg-[#1a0a2e] p-6 md:p-8 max-w-md w-full mx-4">
                            <h2
                                className="text-xl md:text-2xl font-bold text-fuchsia-400 mb-2 text-center"
                                style={{
                                    textShadow: '0 0 10px #d946ef, 0 0 20px #d946ef',
                                    fontFamily: 'var(--font-monoton), monospace',
                                }}
                            >
                                NEW HIGH SCORE!
                            </h2>
                            <p
                                className="text-3xl md:text-4xl font-bold text-cyan-400 mb-6 text-center"
                                style={{ textShadow: '0 0 15px #2de2e6' }}
                            >
                                {parseInt(scoreFromGame || '0', 10).toLocaleString()}
                            </p>
                            <form onSubmit={handleSubmitScore}>
                                <label className="block text-fuchsia-300 text-sm mb-2 font-mono">
                                    ENTER YOUR NAME:
                                </label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                                    maxLength={20}
                                    className="w-full px-4 py-3 bg-[#0d0221] border-2 border-fuchsia-500/50 rounded-lg text-cyan-400 font-mono text-lg focus:outline-none focus:border-cyan-400 uppercase"
                                    style={{ textShadow: '0 0 8px #2de2e6' }}
                                    placeholder="YOUR NAME"
                                    autoFocus
                                />
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={handleSkip}
                                        className="flex-1 px-4 py-3 rounded-lg font-mono text-fuchsia-300 border-2 border-fuchsia-500/30 hover:bg-fuchsia-500/10 transition-colors"
                                    >
                                        SKIP
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!playerName.trim() || createEntry.isPending}
                                        className="flex-1 px-4 py-3 rounded-lg font-mono text-[#0d0221] bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {createEntry.isPending ? 'SAVING...' : 'SUBMIT'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* CRT Monitor Frame with Leaderboard */}
            <div
                className="absolute inset-0 z-30 flex justify-center items-center p-4"
                style={{
                    transform: `translate(${smoothPos.x * -25}px, ${smoothPos.y * -25}px)`,
                }}
            >
                <div className="relative max-w-xl w-full">
                    {/* CRT Monitor outer frame */}
                    <div className="relative rounded-3xl p-2 bg-gradient-to-b from-purple-900 via-fuchsia-900 to-purple-950 shadow-2xl shadow-fuchsia-500/30">
                        {/* Monitor bezel */}
                        <div className="rounded-2xl p-1 bg-gradient-to-b from-cyan-500/30 via-fuchsia-500/20 to-purple-500/30">
                            {/* Screen area */}
                            <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#1a0a2e] to-[#0d0221]">
                                {/* Scanlines overlay */}
                                <div
                                    className="absolute inset-0 z-50 pointer-events-none opacity-30"
                                    style={{
                                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                                    }}
                                />

                                {/* Screen glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

                                {/* Content */}
                                <div className="relative p-4 md:p-6">
                                    {/* Title */}
                                    <h1 className="text-center text-lg md:text-2xl font-bold text-fuchsia-400 mb-4 tracking-wider"
                                        style={{
                                            textShadow: '0 0 10px #d946ef, 0 0 20px #d946ef, 0 0 40px #d946ef',
                                            fontFamily: 'var(--font-monoton), monospace',
                                        }}
                                    >
                                        LEADERBOARD
                                    </h1>

                                    {/* Table Header */}
                                    <div className="grid grid-cols-3 gap-4 mb-3 text-xs md:text-sm font-mono border-b border-fuchsia-500/30 pb-2">
                                        <span className="text-fuchsia-300 tracking-wider" style={{ textShadow: '0 0 5px #d946ef' }}>RANK</span>
                                        <span className="text-fuchsia-300 tracking-wider" style={{ textShadow: '0 0 5px #d946ef' }}>PLAYER</span>
                                        <span className="text-fuchsia-300 tracking-wider text-right" style={{ textShadow: '0 0 5px #d946ef' }}>SCORE</span>
                                    </div>

                                    {/* Table Rows */}
                                    <div className="space-y-2">
                                        {leaderboardData && leaderboardData.length > 0 ? (
                                            leaderboardData.map((entry, index) => (
                                                <div
                                                    key={entry.id}
                                                    className="grid grid-cols-3 gap-4 items-center text-xs md:text-sm font-mono py-1 hover:bg-fuchsia-500/10 transition-colors rounded"
                                                    style={{
                                                        animation: `fadeSlideIn 0.5s ease-out ${index * 0.1}s both`,
                                                    }}
                                                >
                                                    <div className="flex items-center">
                                                        <RankBadge rank={entry.rank} />
                                                    </div>
                                                    <div
                                                        className={`${getNameColor(index)} font-bold tracking-wide truncate`}
                                                        style={{ textShadow: '0 0 8px currentColor' }}
                                                    >
                                                        {entry.name}
                                                    </div>
                                                    <div
                                                        className="text-right text-cyan-300"
                                                        style={{ textShadow: '0 0 8px #2de2e6' }}
                                                    >
                                                        {entry.score.toLocaleString()}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-fuchsia-300/50 font-mono py-8">
                                                {leaderboardData === undefined ? 'LOADING...' : 'NO SCORES YET'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Current Time */}
                                    <div className="mt-4 pt-3 border-t border-fuchsia-500/30 text-center">
                                        <span
                                            className="text-xs md:text-sm font-mono text-cyan-400 tracking-widest"
                                            style={{ textShadow: '0 0 10px #2de2e6' }}
                                        >
                                            CURRENT TIME: {currentTime}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Monitor reflection/glare */}
                    <div className="absolute top-4 left-8 right-8 h-16 bg-gradient-to-b from-white/5 to-transparent rounded-xl pointer-events-none" />
                </div>
            </div>

            {/* Global Styles */}
            <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }

        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }

        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

export default LeaderboardPage;

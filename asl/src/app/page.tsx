import Link from "next/link";

import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#0d0820] text-white">
      <h1 className="mb-8 text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
        ASL FUN TRAINING
      </h1>
      
      <div className="flex gap-4">
        <Link 
          href="/game/1"
          className="rounded-xl bg-cyan-600 px-8 py-4 font-bold transition hover:bg-cyan-500 hover:scale-105"
        >
          PLAY BEATMAP MODE
        </Link>
        
        <Link 
          href="/game/training"
          className="rounded-xl bg-fuchsia-600 px-8 py-4 font-bold transition hover:bg-fuchsia-500 hover:scale-105"
        >
          WHACK-A-SIGN MODE
        </Link>
      </div>
    </div>
  );
}

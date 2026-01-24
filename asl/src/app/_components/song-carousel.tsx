"use client";

import { useRouter } from "next/navigation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import type { Song } from "@/types/song";

interface SongCarouselProps {
  songs: Song[];
}

export function SongCarousel({ songs }: SongCarouselProps) {
  const router = useRouter();

  const handleSongSelect = (songId: string) => {
    router.push(`/game?songId=${songId}`);
  };

  return (
    <div className="relative p-20">
      {/* Light purple background screen */}
      <div className="absolute inset-0 bg-purple-500/10 rounded-3xl blur-xl" 
           style={{ transform: 'scale(1.1)' }} />
      
      <Carousel
        opts={{
          align: "center",
          loop: true,
        }}
        className="w-full max-w-6xl mx-auto relative z-10"
      >
        <CarouselContent className="px-10 py-5">
          {songs.map((song) => (
            <CarouselItem key={song.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-4">
                <Card 
                  className="group border-1 border-white bg-gradient-to-br from-purple-600 to-pink-600 
                             transition-all duration-300 cursor-pointer shadow-2xl
                             hover:scale-110 hover:shadow-[0_0_40px_rgba(45,226,230,0.8),0_0_80px_rgba(146,0,117,0.6)]
                             hover:border-cyan-400 hover:-translate-y-2"
                  onClick={() => handleSongSelect(song.id)}
                >
                  <CardContent className="p-6">
                    <div className="aspect-square relative mb-4 rounded-lg overflow-hidden bg-white/10 
                                    border-1 border-white/50 group-hover:border-cyan-400 
                                    transition-all duration-300">
                      {song.thumbnailName ? (
                        <Image
                          src={`/thumbnails/${song.thumbnailName}`}
                          alt={song.songName}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50">
                          No Image
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 
                                     group-hover:text-cyan-200 transition-colors duration-300">
                        {song.songName}
                      </h3>
                      <p className="text-purple-200 text-sm line-clamp-1 
                                    group-hover:text-white transition-colors duration-300">
                        {song.albumName}
                      </p>
                    </div>

                    <div className="mt-4 bg-white/20 rounded-full py-2 px-4 text-center border-1 border-white
                                    transition-all duration-300
                                    group-hover:bg-cyan-400 group-hover:border-cyan-300 
                                    group-hover:shadow-[0_0_20px_rgba(45,226,230,0.8)]
                                    group-hover:scale-105">
                      <span className="text-white font-semibold text-sm group-hover:text-purple-900 
                                       transition-colors duration-300">
                        PLAY
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Custom styled carousel arrows with bigger circles */}
        <CarouselPrevious className="bg-purple-600 hover:bg-purple-700 text-white border-1 border-white 
                                     w-20 h-20 -left-10 transition-all duration-300
                                     hover:scale-110 hover:shadow-[0_0_30px_rgba(45,226,230,0.8)]
                                     hover:border-cyan-400" />
        <CarouselNext className="bg-purple-600 hover:bg-purple-700 text-white border-1 border-white 
                                w-20 h-20 -right-10 transition-all duration-300
                                hover:scale-110 hover:shadow-[0_0_30px_rgba(45,226,230,0.8)]
                                hover:border-cyan-400" />
      </Carousel>
    </div>
  );
}
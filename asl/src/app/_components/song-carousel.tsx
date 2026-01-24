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
    // Navigate to game page with song ID
    router.push(`/game?songId=${songId}`);
  };

  return (
    <Carousel
      opts={{
        align: "center",
        loop: true,
      }}
      className="w-full max-w-5xl mx-auto"
    >
      <CarouselContent>
        {songs.map((song) => (
          <CarouselItem key={song.id} className="md:basis-1/2 lg:basis-1/3">
            <div className="p-4">
              <Card 
                className="border-4 border-purple-400 bg-gradient-to-br from-purple-600 to-pink-600 hover:scale-105 transition-transform cursor-pointer shadow-2xl"
                onClick={() => handleSongSelect(song.id)}
              >
                <CardContent className="p-6">
                  <div className="aspect-square relative mb-4 rounded-lg overflow-hidden bg-white/10">
                    {song.thumbnailName ? (
                      <Image
                        src={`/thumbnails/${song.thumbnailName}`}
                        alt={song.songName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        No Image
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                      {song.songName}
                    </h3>
                    <p className="text-purple-200 text-sm line-clamp-1">
                      {song.albumName}
                    </p>
                  </div>

                  <div className="mt-4 bg-white/20 rounded-full py-2 px-4 text-center">
                    <span className="text-white font-semibold text-sm">
                      PLAY
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="bg-purple-500 hover:bg-purple-600 text-white border-none" />
      <CarouselNext className="bg-purple-500 hover:bg-purple-600 text-white border-none" />
    </Carousel>
  );
}
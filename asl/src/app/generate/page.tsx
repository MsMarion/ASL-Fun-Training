"use client";

import { Navbar } from "@/app/_components/navbar";
import { useState } from "react";
import { trpc } from "@/trpc/client";

export default function Generate() {
  const [lyrics, setLyrics] = useState("");
  const [songName, setSongName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [thumbnailName, setThumbnailName] = useState("");
  const [songDuration, setSongDuration] = useState("180");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createSongMutation = trpc.song.create.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setLyrics("");
      setSongName("");
      setAlbumName("");
      setThumbnailName("");
      setSongDuration("180");
      setIsProcessing(false);
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: (error) => {
      setError(error.message);
      setIsProcessing(false);
    },
  });

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    setIsProcessing(true);

    if (!lyrics || !songName || !albumName) {
      setError("Please fill in all required fields");
      setIsProcessing(false);
      return;
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      
      if (!apiKey) {
        throw new Error("Google API key not configured. Please set NEXT_PUBLIC_GOOGLE_API_KEY");
      }

      const duration = parseInt(songDuration) || 180;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Given these song lyrics and a total song duration of ${duration} seconds, generate timing data for when each word is sung.

LYRICS:
${lyrics}

For the first letter of each word in the lyrics, create a JSON array with objects containing:
- "key": The first letter of the word (uppercase)
- "timeElapsed": The approximate time in seconds when that word is sung

Distribute the words evenly across the ${duration} second duration, with realistic timing that accounts for natural singing pace. Words should be spread throughout the song duration.

Return ONLY a valid JSON array with no markdown formatting, no code blocks, no explanations:
[{"key": "T", "timeElapsed": 0.5}, {"key": "W", "timeElapsed": 1.2}, ...]`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8000,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!textContent) {
        throw new Error("No response from Gemini API");
      }

      let cleanedText = textContent.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, "");
      cleanedText = cleanedText.replace(/```\n?/g, "");
      cleanedText = cleanedText.trim();

      let interactions;
      try {
        interactions = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Failed to parse JSON:", cleanedText);
        throw new Error("Failed to parse AI response. The AI may have returned invalid JSON.");
      }

      if (!Array.isArray(interactions)) {
        throw new Error("AI response was not an array");
      }

      if (interactions.length === 0) {
        throw new Error("No interactions found in lyrics");
      }

      for (const interaction of interactions) {
        if (!interaction.key || typeof interaction.timeElapsed !== "number") {
          throw new Error("Invalid interaction format in AI response");
        }
      }

      await createSongMutation.mutateAsync({
        songName,
        albumName,
        thumbnailName: thumbnailName || undefined,
        interactions,
      });

    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to process lyrics");
      setIsProcessing(false);
    }
  };

  const isFormValid = lyrics && songName && albumName;

  return (
    <div className="min-h-screen bg-[#0f0a1e] relative overflow-hidden">
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
      
      <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '6s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-magenta-500/10 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '5s', animationDelay: '2s' }} />

      <Navbar />
      
      <div className="relative border-t-1 border-b-1 border-white z-100 mx-auto px-4 py-12 bg-gradient-to-b from-[var(--purple)] via-[var(--magenta)] to-[var(--purple)] -translate-y-12 rounded-b-3xl shadow-2xl max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 animate-pulse" 
              style={{ 
                textShadow: "0 0 20px rgba(45,226,230,0.5), 0 0 40px rgba(146,0,117,0.3)",
                animationDuration: '3s'
              }}>
            GENERATE SONG
          </h1>
          <p className="text-purple-200 text-lg">
            Create a new song with AI-generated timing
          </p>
        </div>

        <div className="w-full max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Song Lyrics *
              </label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Paste the full song lyrics here..."
                rows={8}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border-1 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all resize-y"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Song Name *
              </label>
              <input
                type="text"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                placeholder="Enter song name"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border-1 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Album Name *
              </label>
              <input
                type="text"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder="Enter album name"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border-1 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Song Duration (seconds)
              </label>
              <input
                type="number"
                value={songDuration}
                onChange={(e) => setSongDuration(e.target.value)}
                placeholder="180"
                min="30"
                max="600"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border-1 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Thumbnail Filename (Optional)
              </label>
              <input
                type="text"
                value={thumbnailName}
                onChange={(e) => setThumbnailName(e.target.value)}
                placeholder="thumbnail.jpg"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border-1 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/20 border-1 border-red-500 text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-lg bg-green-500/20 border-1 border-green-500 text-green-200">
                Song created successfully!
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isProcessing || !isFormValid}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg border-1 border-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(45,226,230,0.8),0_0_80px_rgba(146,0,117,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                "GENERATE SONG"
              )}
            </button>
          </div>

          <div className="mt-8 p-6 rounded-lg bg-white/5 border-1 border-white/20">
            <h3 className="text-white font-semibold mb-3">How it works:</h3>
            <ol className="text-purple-200 text-sm space-y-2 list-decimal list-inside">
              <li>Paste the full song lyrics in the text area</li>
              <li>Enter song metadata (name, album, duration)</li>
              <li>Click "Generate Song" to process with AI</li>
              <li>Gemini AI analyzes lyrics and generates realistic timing</li>
              <li>Song is saved with all letter timing interactions</li>
            </ol>
            <div className="mt-4 p-3 rounded bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-cyan-200 text-xs">
                <strong>Tip:</strong> The AI will distribute words evenly across the song duration. For best results, provide accurate song length in seconds.
              </p>
            </div>
          </div>
        </div>
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
      `}</style>
    </div>
  );
}
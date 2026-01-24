"use client";

import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/app/_components/navbar";
import { trpc } from "@/trpc/client";
import { WavyBackground } from "@/app/_components/wavybackground";


interface KeyPress {
    key: string;
    timeElapsed: number;
}

type AudioTab = "youtube" | "upload";

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


export default function DevModePage() {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [keyPresses, setKeyPresses] = useState<KeyPress[]>([]);

    // Tab state
    const [activeTab, setActiveTab] = useState<AudioTab>("youtube");

    // YouTube
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [videoId, setVideoId] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadError, setDownloadError] = useState("");
    const [videoTitle, setVideoTitle] = useState("");
    const [isTranscribing, setIsTranscribing] = useState(false);

    // File upload
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [songName, setSongName] = useState("");
    const [albumName, setAlbumName] = useState("");
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

    // S3 URLs
    const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
    const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [audioDuration, setAudioDuration] = useState(0);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editKey, setEditKey] = useState("");
    const [editTime, setEditTime] = useState("");

    const audioRef = useRef<HTMLAudioElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    const createSong = trpc.song.create.useMutation();

    // Key press listener while recording
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (isRecording && audioRef.current) {
                const keyLog: KeyPress = {
                    key: e.key,
                    timeElapsed: audioRef.current.currentTime,
                };
                setKeyPresses((prev) => [...prev, keyLog]);
                console.log(JSON.stringify(keyLog));
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [isRecording]);

    const handleYoutubeDownload = async () => {
        if (!youtubeUrl.trim()) {
            setDownloadError("Please enter a YouTube URL");
            return;
        }

        setIsDownloading(true);
        setDownloadProgress(0);
        setDownloadError("");
        setVideoTitle("");
        setUploadedAudioUrl(null);

        try {
            const progressInterval = setInterval(() => {
                setDownloadProgress((prev) => {
                    if (prev >= 25) {
                        clearInterval(progressInterval);
                        return 25;
                    }
                    return prev + 5;
                });
            }, 200);

            const response = await fetch("/api/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: youtubeUrl }),
            });

            const data = await response.json();

            clearInterval(progressInterval);

            if (data.success && data.videoId) {
                setDownloadProgress(30);

                const streamResponse = await fetch(`/api/youtube?videoId=${data.videoId}`);
                if (!streamResponse.ok) {
                    const errorData = await streamResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || "Failed to stream audio");
                }

                setDownloadProgress(60);
                const audioBlob = await streamResponse.blob();
                const audioBlobUrl = URL.createObjectURL(audioBlob);

                // Upload to DigitalOcean Spaces
                setDownloadProgress(70);
                const formData = new FormData();
                const filename = `${data.title || data.videoId}.mp3`.replace(/[^a-zA-Z0-9.-]/g, '_');
                formData.append('file', new File([audioBlob], filename, { type: 'audio/mpeg' }));
                formData.append('folder', 'audio');

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await uploadResponse.json();

                setDownloadProgress(100);

                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }

                setAudioUrl(audioBlobUrl);
                setVideoTitle(data.title || "YouTube Audio");
                setVideoId(data.videoId);
                setIsPlaying(false);
                setIsRecording(false);
                setKeyPresses([]);

                if (uploadData.success && uploadData.url) {
                    setUploadedAudioUrl(uploadData.url);
                    console.log("Audio uploaded to S3:", uploadData.url);
                } else {
                    console.warn("Failed to upload to S3, but local playback available");
                }

                if (!songName && data.title) {
                    setSongName(data.title);
                }
            } else {
                throw new Error(data.error || "Failed to get video info");
            }
        } catch (error) {
            console.error("Download error:", error);
            setDownloadError(error instanceof Error ? error.message : "Failed to download audio");
            setDownloadProgress(0);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("audio/")) {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            setAudioFile(file);
            setAudioUrl(URL.createObjectURL(file));
            setIsPlaying(false);
            setIsRecording(false);
            setKeyPresses([]);
            setUploadedAudioUrl(null);

            if (!songName) {
                setSongName(file.name.replace(/\.[^/.]+$/, ""));
            }

            // Upload to DigitalOcean Spaces
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'audio');

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await uploadResponse.json();

                if (uploadData.success && uploadData.url) {
                    setUploadedAudioUrl(uploadData.url);
                    console.log("Audio uploaded to S3:", uploadData.url);
                } else {
                    console.warn("Failed to upload to S3:", uploadData.error);
                }
            } catch (error) {
                console.error("Upload error:", error);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setThumbnailFile(file);
            setUploadedThumbnailUrl(null);

            // Upload to DigitalOcean Spaces
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'thumbnails');

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await uploadResponse.json();

                if (uploadData.success && uploadData.url) {
                    setUploadedThumbnailUrl(uploadData.url);
                    console.log("Thumbnail uploaded to S3:", uploadData.url);
                } else {
                    console.warn("Failed to upload thumbnail to S3:", uploadData.error);
                }
            } catch (error) {
                console.error("Thumbnail upload error:", error);
            }
        }
    };

    const handleThumbnailClick = () => {
        thumbnailInputRef.current?.click();
    };

    const startRecording = () => {
        if (!audioRef.current) return;
        setKeyPresses([]);
        setIsRecording(true);
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlaying(true);
    };

    const stopRecording = () => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        setIsPlaying(false);
        setIsRecording(false);
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setIsRecording(false);
    };

    const handleRemoveAudio = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setAudioFile(null);
        setUploadedAudioUrl(null);
        setIsPlaying(false);
        setIsRecording(false);
        setKeyPresses([]);
        setYoutubeUrl("");
        setVideoId("");
        setVideoTitle("");
        setDownloadProgress(0);
        setDownloadError("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const deleteKeyPress = (index: number) => {
        setKeyPresses((prev) => prev.filter((_, i) => i !== index));
    };

    const startEditing = (index: number) => {
        const kp = keyPresses[index];
        if (kp) {
            setEditingIndex(index);
            setEditKey(kp.key);
            setEditTime(kp.timeElapsed.toString());
        }
    };

    const saveEdit = () => {
        if (editingIndex === null) return;
        const newTime = parseFloat(editTime);
        if (isNaN(newTime) || newTime < 0) return;

        setKeyPresses((prev) =>
            prev.map((kp, i) =>
                i === editingIndex
                    ? { key: editKey || kp.key, timeElapsed: newTime }
                    : kp
            )
        );
        setEditingIndex(null);
        setEditKey("");
        setEditTime("");
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditKey("");
        setEditTime("");
    };

    const handleAutoGenerate = async () => {
        if (!audioFile && !videoId) return;

        setIsTranscribing(true);
        try {
            const formData = new FormData();
            if (activeTab === "upload" && audioFile) {
                formData.append("file", audioFile);
            } else if (activeTab === "youtube" && videoId) {
                formData.append("videoId", videoId);
            }

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success && data.interactions) {
                setKeyPresses(data.interactions);
                // Switch to timeline view if not already visible by virtue of having key presses
            } else {
                console.error("Transcription failed:", data.error);
                alert(`Transcription failed: ${data.error}`);
            }
        } catch (error) {
            console.error("Transcription error:", error);
            alert("Failed to auto-generate timestamps");
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleSave = async () => {
        if (!songName) {
            setSaveMessage("Please enter a song title");
            return;
        }

        if (!albumName) {
            setSaveMessage("Please enter an album name");
            return;
        }

        setIsSaving(true);
        setSaveMessage("");

        try {
            const result = await createSong.mutateAsync({
                songName,
                albumName,
                isCommunity: true,
                ...(thumbnailFile && { thumbnailName: thumbnailFile.name }),
                ...(uploadedThumbnailUrl && { thumbnailUrl: uploadedThumbnailUrl }),
                ...(uploadedAudioUrl && { audioUrl: uploadedAudioUrl }),
                ...(keyPresses.length > 0 && { interactions: keyPresses }),
            });

            console.log("Song created:", result);
            setSaveMessage("Song saved successfully to community!");

            // Reset form
            setSongName("");
            setAlbumName("");
            setThumbnailFile(null);
            setKeyPresses([]);
            setUploadedAudioUrl(null);
            setUploadedThumbnailUrl(null);
            if (thumbnailInputRef.current) {
                thumbnailInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Error saving song:", error);
            setSaveMessage(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

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

            <div className="relative z-10 flex flex-col items-center justify-start p-8 min-h-screen ">
            <Navbar></Navbar>

             <div className="z-100 relative w-3/4 border-b-1 border-r-1 border-l-1 border-white z-20 px-12 py-16 -translate-y-20 bg-gradient-to-b from-[var(--purple)] via-[var(--magenta)] to-[var(--purple)] mt-8 rounded-3xl shadow-2xl gap-10 justify-center align-middle place-self-center self-center content-center">
                <div className="text-center w-full mb-8 justify-center align-middle place-self-center self-center content-center gap-10">
                    <h1
                        className="text-5xl tracking-widest font-[family-name:var(--font-monoton)]"
                        style={{
                            color: "#d8b4fe",
                            textShadow: "0 0 30px rgba(216, 180, 254, 0.6), 0 0 60px rgba(216, 180, 254, 0.4)",
                        }}
                    >
                        DEV MODE
                    </h1>

                    {/* Song Details Section */}
                    <div
                        className=" flex justify-center align-middle place-self-center self-center content-center w-full max-w-md flex-col gap-4 my-5 rounded-2xl border-2 p-8"
                        style={{
                            backgroundColor: "rgba(13, 13, 26, 0.8)",
                            borderColor: "#d8b4fe",
                            boxShadow: "0 0 30px rgba(216, 180, 254, 0.4), inset 0 0 20px rgba(216, 180, 254, 0.05)",
                        }}
                    >
                        <h2
                            className="text-2xl font-[family-name:var(--font-monoton)]"
                            style={{ color: "#d8b4fe", textShadow: "0 0 15px rgba(216, 180, 254, 0.5)" }}
                        >
                            Song Details
                        </h2>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium" style={{ color: "#d8b4fe" }}>
                                Song Title
                            </label>
                            <input
                                type="text"
                                value={songName}
                                onChange={(e) => setSongName(e.target.value)}
                                placeholder="Enter song title"
                                className="rounded-lg border-2 px-4 py-3 transition-all focus:outline-none"
                                style={{
                                    backgroundColor: "rgba(20, 20, 40, 0.8)",
                                    borderColor: "#d8b4fe",
                                    color: "#ffffff",
                                    boxShadow: "0 0 20px rgba(216, 180, 254, 0.3)",
                                }}
                            />                </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium" style={{ color: "#d8b4fe" }}>
                                Album Title
                            </label>
                            <input
                                type="text"
                                value={albumName}
                                onChange={(e) => setAlbumName(e.target.value)}
                                placeholder="Enter album title"
                                className="rounded-lg border-2 px-4 py-3 transition-all focus:outline-none"
                                style={{
                                    backgroundColor: "rgba(20, 20, 40, 0.8)",
                                    borderColor: "#d8b4fe",
                                    color: "#ffffff",
                                    boxShadow: "0 0 20px rgba(216, 180, 254, 0.3)",
                                }}
                            />                </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium" style={{ color: "#d8b4fe" }}>
                                Thumbnail
                            </label>
                            <input
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailUpload}
                                className="hidden"
                            />
                            <button
                                onClick={handleThumbnailClick}
                                className="rounded-lg border-2 border-dashed px-4 py-3 text-sm font-medium transition-all hover:bg-purple-500/10"
                                style={{
                                    borderColor: "#d8b4fe",
                                    color: "#d8b4fe",
                                }}
                            >
                                {thumbnailFile ? "Change Thumbnail" : "Upload Thumbnail"}
                            </button>
                            {thumbnailFile && (
                                <div>
                                    <p className="text-sm" style={{ color: "#d8b4fe" }}>
                                        Selected: {thumbnailFile.name}
                                    </p>
                                    {uploadedThumbnailUrl && (
                                        <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
                                            Uploaded to cloud storage
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audio Source Section with Tabs */}
                    <div
                        className="justify-center align-middle place-self-center self-center content-center flex w-full max-w-md flex-col gap-4 rounded-2xl border-2 p-8"
                        style={{
                            backgroundColor: "rgba(13, 13, 26, 0.8)",
                            borderColor: "#d8b4fe",
                            boxShadow: "0 0 30px rgba(216, 180, 254, 0.4), inset 0 0 20px rgba(216, 180, 254, 0.05)",
                            transition: "all 0.3s ease",
                        }}
                    >
                        <h2
                            className="text-2xl font-[family-name:var(--font-monoton)]"
                            style={{
                                color: "#d8b4fe",
                                textShadow: "0 0 15px rgba(216, 180, 254, 0.5)",
                            }}
                        >
                            Audio Source
                        </h2>

                        {/* Tabs */}
                        <div className="flex rounded-lg overflow-hidden" style={{ border: "2px solid rgba(255,255,255,0.1)" }}>
                            <button
                                onClick={() => setActiveTab("youtube")}
                                className="flex-1 px-4 py-3 font-semibold transition-all"
                                style={{
                                    backgroundColor: activeTab === "youtube" ? "#d8b4fe" : "transparent",
                                    color: activeTab === "youtube" ? "#ffffff" : "#d8b4fe",
                                    boxShadow: activeTab === "youtube" ? "0 0 15px rgba(216, 180, 254, 0.5)" : "none",
                                }}
                            >
                                YouTube
                            </button>
                            <button
                                onClick={() => setActiveTab("upload")}
                                className="flex-1 px-4 py-3 font-semibold transition-all"
                                style={{
                                    backgroundColor: activeTab === "upload" ? "#d8b4fe" : "transparent",
                                    color: activeTab === "upload" ? "#ffffff" : "#d8b4fe",
                                    boxShadow: activeTab === "upload" ? "0 0 15px rgba(216, 180, 254, 0.5)" : "none",
                                }}
                            >
                                Upload
                            </button>
                        </div>

                        {/* YouTube Tab Content */}
                        {activeTab === "youtube" && (
                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        placeholder="Paste YouTube URL here..."
                                        disabled={isDownloading}
                                        className="w-full rounded-lg border-2 px-4 py-4 pr-12 transition-all focus:outline-none disabled:opacity-50"
                                        style={{
                                            backgroundColor: "rgba(20, 20, 40, 0.8)",
                                            borderColor: "#d8b4fe",
                                            color: "#ffffff",
                                            boxShadow: "0 0 25px rgba(216, 180, 254, 0.3)",
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !isDownloading) {
                                                handleYoutubeDownload();
                                            }
                                        }}
                                    />
                                    <div
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl"
                                        style={{ color: "#d8b4fe" }}
                                    >
                                        ▶
                                    </div>
                                </div>

                                <button
                                    onClick={handleYoutubeDownload}
                                    disabled={isDownloading || !youtubeUrl.trim()}
                                    className="w-full rounded-lg px-6 py-3 text-lg font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                                    style={{
                                        background: isDownloading
                                            ? "linear-gradient(135deg, #d8b4fe, #d8b4fe)"
                                            : "#d8b4fe",
                                        color: "#ffffff",
                                        boxShadow: "0 0 20px rgba(216, 180, 254, 0.4)",
                                    }}
                                >
                                    {isDownloading ? "Downloading..." : "Download Audio"}
                                </button>

                                {isDownloading && (
                                    <div className="relative">
                                        <div
                                            className="h-3 w-full rounded-full overflow-hidden"
                                            style={{
                                                backgroundColor: "rgba(20, 20, 40, 0.8)",
                                                border: "1px solid rgba(216, 180, 254, 0.3)",
                                            }}
                                        >
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${downloadProgress}%`,
                                                    background: "linear-gradient(90deg, #d8b4fe, #d8b4fe)",
                                                    boxShadow: "0 0 20px rgba(216, 180, 254, 0.8)",
                                                }}
                                            />
                                        </div>
                                        <p className="text-center text-xs mt-2" style={{ color: "#d8b4fe" }}>
                                            {downloadProgress}% complete
                                        </p>
                                    </div>
                                )}

                                {videoTitle && !isDownloading && (
                                    <div className="text-center">
                                        <p
                                            className="text-sm"
                                            style={{ color: "#d8b4fe", textShadow: "0 0 15px rgba(216, 180, 254, 0.7)" }}
                                        >
                                            Ready: {videoTitle}
                                        </p>
                                        {uploadedAudioUrl && (
                                            <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
                                                Uploaded to cloud storage
                                            </p>
                                        )}
                                    </div>
                                )}

                                {downloadError && (
                                    <p className="text-sm text-center" style={{ color: "#d8b4fe" }}>
                                        {downloadError}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Upload Tab Content */}
                        {activeTab === "upload" && (
                            <div className="flex flex-col gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />

                                <button
                                    onClick={handleUploadClick}
                                    className="w-full rounded-lg border-2 border-dashed px-6 py-8 text-lg font-semibold transition-all hover:scale-[1.02] hover:bg-green-500/10"
                                    style={{
                                        borderColor: "#d8b4fe",
                                        color: "#d8b4fe",
                                        backgroundColor: "rgba(20, 20, 40, 0.8)",
                                    }}
                                >
                                    {audioFile ? "Change Audio File" : "Click to Upload Audio"}
                                </button>

                                {audioFile && (
                                    <div className="text-center">
                                        <p
                                            className="text-sm"
                                            style={{ color: "#d8b4fe", textShadow: "0 0 15px rgba(216, 180, 254, 0.7)" }}
                                        >
                                            Ready: {audioFile.name}
                                        </p>
                                        {isUploading && (
                                            <p className="text-xs mt-1 animate-pulse" style={{ color: "#fbbf24" }}>
                                                Uploading to cloud storage...
                                            </p>
                                        )}
                                        {uploadedAudioUrl && !isUploading && (
                                            <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
                                                Uploaded to cloud storage
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Player Section */}
                    {audioUrl && (
                        <div
                            className="flex flex-col items-center gap-4 rounded-2xl border-2 p-8"
                            style={{
                                backgroundColor: "rgba(13, 13, 26, 0.8)",
                                borderColor: "#d8b4fe",
                                boxShadow: "0 0 40px rgba(216, 180, 254, 0.5)", transition: "all 0.3s ease",
                            }}
                        >
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onEnded={handleAudioEnded}
                                onLoadedMetadata={() => {
                                    if (audioRef.current) {
                                        setAudioDuration(audioRef.current.duration);
                                    }
                                }}
                                className="hidden"
                            />

                            <div className="flex items-center gap-4">
                                {!isRecording ? (
                                    <button
                                        onClick={startRecording}
                                        className="rounded-lg px-6 py-3 text-lg font-bold transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: "#d8b4fe",
                                            color: "#ffffff",
                                            boxShadow: "0 0 30px rgba(216, 180, 254, 0.6)",
                                        }}
                                    >
                                        Start Recording
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopRecording}
                                        className="animate-pulse rounded-lg px-6 py-3 text-lg font-bold transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: "#d8b4fe",
                                            color: "#ffffff",
                                            boxShadow: "0 0 30px rgba(216, 180, 254, 0.6)",
                                        }}
                                    >
                                        Stop Recording
                                    </button>
                                )}

                                <button
                                    onClick={handleAutoGenerate}
                                    disabled={isTranscribing}
                                    className="rounded-lg px-6 py-3 text-lg font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                                    style={{
                                        backgroundColor: "#d8b4fe",
                                        color: "#ffffff",
                                        boxShadow: "0 0 30px rgba(216, 180, 254, 0.6)",
                                    }}
                                >
                                    {isTranscribing ? "Generating..." : "Auto-Generate AI"}
                                </button>

                                <button
                                    onClick={handleRemoveAudio}
                                    className="rounded-lg border-2 px-6 py-3 text-lg font-semibold transition-all hover:bg-red-500/20"
                                    style={{
                                        borderColor: "#d8b4fe",
                                        color: "#d8b4fe",
                                    }}
                                >
                                    Remove
                                </button>
                            </div>

                            {isRecording && (
                                <p className="animate-pulse text-sm font-medium" style={{ color: "#d8b4fe" }}>
                                    Recording... Press keys to log timestamps
                                </p>
                            )}

                            {keyPresses.length > 0 && (
                                <p className="text-sm" style={{ color: "#d8b4fe" }}>
                                    Recorded {keyPresses.length} keystrokes
                                </p>
                            )}
                        </div>
                    )}

                    {/* Timeline Section */}
                    {keyPresses.length > 0 && (
                        <div
                            className="flex w-full max-w-4xl flex-col gap-4 rounded-2xl border-2 p-8"
                            style={{
                                backgroundColor: "rgba(13, 13, 26, 0.8)",
                                borderColor: "#d8b4fe",
                                boxShadow: "0 0 30px rgba(216, 180, 254, 0.4)",
                            }}
                        >
                            <h2
                                className="text-2xl font-[family-name:var(--font-monoton)]"
                                style={{ color: "#d8b4fe", textShadow: "0 0 15px rgba(216, 180, 254, 0.5)" }}
                            >
                                Timeline
                            </h2>

                            <div className="relative">
                                <div
                                    className="h-16 w-full rounded-lg relative overflow-hidden"
                                    style={{
                                        backgroundColor: "rgba(20, 20, 40, 0.8)",
                                        border: "1px solid rgba(216, 180, 254, 0.3)",
                                    }}
                                >
                                    {keyPresses.map((kp, index) => {
                                        const position = audioDuration > 0
                                            ? (kp.timeElapsed / audioDuration) * 100
                                            : 0;

                                        const formatTime = (seconds: number) => {
                                            const mins = Math.floor(seconds / 60);
                                            const secs = Math.floor(seconds % 60);
                                            return `${mins}:${secs.toString().padStart(2, '0')}`;
                                        };

                                        return (
                                            <div
                                                key={index}
                                                className="absolute top-0 h-full flex flex-col items-center justify-center group"
                                                style={{
                                                    left: `${position}%`,
                                                    transform: "translateX(-50%)",
                                                }}
                                            >
                                                <div
                                                    className="w-1 h-full"
                                                    style={{
                                                        backgroundColor: "#d8b4fe",
                                                        boxShadow: "0 0 20px rgba(216, 180, 254, 0.8)",
                                                    }}
                                                />
                                                <div
                                                    className="absolute -top-8 px-2 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                                                    style={{
                                                        backgroundColor: "#d8b4fe",
                                                        color: "#fff",
                                                    }}
                                                >
                                                    {kp.key} @ {formatTime(kp.timeElapsed)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                                    <span>0:00</span>
                                    <span>{audioDuration > 0 ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, '0')}` : '--:--'}</span>
                                </div>
                            </div>

                            <div
                                className="max-h-64 overflow-y-auto rounded-lg p-4"
                                style={{
                                    backgroundColor: "rgba(20, 20, 40, 0.8)",
                                    border: "1px solid rgba(216, 180, 254, 0.3)",
                                }}
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {keyPresses.map((kp, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                                            style={{
                                                backgroundColor: editingIndex === index
                                                    ? "rgba(0, 212, 212, 0.1)"
                                                    : "rgba(216, 180, 254, 0.1)",
                                                border: editingIndex === index
                                                    ? "1px solid rgba(0, 212, 212, 0.5)"
                                                    : "1px solid rgba(216, 180, 254, 0.3)",
                                            }}
                                        >
                                            {editingIndex === index ? (
                                                <>
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="text"
                                                            value={editKey}
                                                            onChange={(e) => setEditKey(e.target.value)}
                                                            className="w-12 px-2 py-1 rounded text-center font-mono font-bold"
                                                            style={{
                                                                backgroundColor: "rgba(20, 20, 40, 0.8)",
                                                                border: "1px solid #00d4d4",
                                                                color: "#00d4d4",
                                                            }}
                                                            maxLength={1}
                                                        />
                                                        <input
                                                            type="number"
                                                            value={editTime}
                                                            onChange={(e) => setEditTime(e.target.value)}
                                                            className="w-20 px-2 py-1 rounded text-xs"
                                                            style={{
                                                                backgroundColor: "rgba(20, 20, 40, 0.8)",
                                                                border: "1px solid #00d4d4",
                                                                color: "#fff",
                                                            }}
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={saveEdit}
                                                            className="px-2 py-1 rounded text-xs font-bold transition-all hover:scale-105"
                                                            style={{
                                                                backgroundColor: "#00d4d4",
                                                                color: "#0d0d1a",
                                                            }}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="px-2 py-1 rounded text-xs font-bold transition-all hover:scale-105"
                                                            style={{
                                                                backgroundColor: "rgba(255,255,255,0.2)",
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="font-mono font-bold text-lg"
                                                            style={{ color: "#00d4d4" }}
                                                        >
                                                            {kp.key === " " ? "␣" : kp.key}
                                                        </span>
                                                        <span
                                                            className="text-xs"
                                                            style={{ color: "rgba(255,255,255,0.6)" }}
                                                        >
                                                            {Math.floor(kp.timeElapsed / 60)}:{Math.floor(kp.timeElapsed % 60).toString().padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => startEditing(index)}
                                                            className="px-2 py-1 rounded text-xs transition-all hover:bg-cyan-500/20"
                                                            style={{ color: "#00d4d4" }}
                                                            title="Edit"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deleteKeyPress(index)}
                                                            className="px-2 py-1 rounded text-xs transition-all hover:bg-red-500/20"
                                                            style={{ color: "#ef4444" }}
                                                            title="Delete"
                                                        >
                                                            X
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Save Section */}
                    {keyPresses.length > 0 && !isRecording && (
                        <div
                            className="flex flex-col items-center gap-4 rounded-2xl border-2 p-8"
                            style={{
                                backgroundColor: "rgba(13, 13, 26, 0.8)",
                                borderColor: "#d8b4fe",
                                boxShadow: "0 0 30px rgba(216, 180, 254, 0.4)",
                            }}
                        >
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="rounded-lg px-8 py-4 text-lg font-bold transition-all hover:scale-105 disabled:opacity-50"
                                style={{
                                    background: "linear-gradient(135deg, #d8b4fe, #d8b4fe)",
                                    color: "#ffffff",
                                    boxShadow: "0 0 35px rgba(216, 180, 254, 0.6)",
                                }}
                            >
                                {isSaving ? "Saving..." : "Save to Database"}
                            </button>

                            {saveMessage && (
                                <p
                                    className="text-sm font-medium"
                                    style={{
                                        color: saveMessage.includes("success") ? "#d8b4fe" : "#d8b4fe",
                                        textShadow: saveMessage.includes("success")
                                            ? "0 0 15px rgba(216, 180, 254, 0.7)"
                                            : "0 0 15px rgba(216, 180, 254, 0.7)",
                                    }}
                                >
                                    {saveMessage}
                                </p>
                            )}
                        </div>
                    )}
                    
                </div>
                    
            </div>
            </div>
        
        </div>
    );
}

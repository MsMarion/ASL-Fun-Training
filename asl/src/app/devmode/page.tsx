"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";

interface KeyPress {
    key: string;
    timeElapsed: number;
}

export default function DevModePage() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [keyPresses, setKeyPresses] = useState<KeyPress[]>([]);

    // Form fields
    const [songName, setSongName] = useState("");
    const [albumName, setAlbumName] = useState("");
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        }
    };

    const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setThumbnailFile(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
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
        setAudioFile(null);
        setAudioUrl(null);
        setIsPlaying(false);
        setIsRecording(false);
        setKeyPresses([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        if (!songName) {
            setSaveMessage("Please enter a song title");
            return;
        }

        setIsSaving(true);
        setSaveMessage("");

        try {
            const response = await fetch("/api/songs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    songName,
                    ...(albumName && { albumName }),
                    ...(thumbnailFile && { thumbnailName: thumbnailFile.name }),
                    ...(keyPresses.length > 0 && { interactions: keyPresses }),
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSaveMessage("Song saved successfully!");
                setSongName("");
                setAlbumName("");
                setThumbnailFile(null);
                setKeyPresses([]);
                if (thumbnailInputRef.current) {
                    thumbnailInputRef.current.value = "";
                }
            } else {
                setSaveMessage("Failed to save song");
            }
        } catch (error) {
            console.error("Error saving:", error);
            setSaveMessage("Error saving song");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-8"
            style={{
                backgroundColor: "#0d0d1a",
                backgroundImage: `
                    linear-gradient(rgba(50, 50, 80, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(50, 50, 80, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: "50px 50px",
            }}
        >
            <h1
                className="text-4xl font-bold tracking-widest"
                style={{
                    color: "#00d4d4",
                    textShadow: "0 0 20px rgba(0, 212, 212, 0.5)",
                }}
            >
                DEV MODE
            </h1>

            {/* Song Details Section */}
            <div
                className="flex w-full max-w-md flex-col gap-4 rounded-2xl border-2 p-8"
                style={{
                    backgroundColor: "rgba(13, 13, 26, 0.8)",
                    borderColor: "#00d4d4",
                    boxShadow: "0 0 20px rgba(0, 212, 212, 0.2), inset 0 0 20px rgba(0, 212, 212, 0.05)",
                }}
            >
                <h2
                    className="text-xl font-semibold"
                    style={{ color: "#00d4d4" }}
                >
                    Song Details
                </h2>

                <div className="flex flex-col gap-2">
                    <label
                        className="text-sm font-medium"
                        style={{ color: "#a855f7" }}
                    >
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
                            borderColor: "#a855f7",
                            color: "#ffffff",
                            boxShadow: "0 0 10px rgba(168, 85, 247, 0.2)",
                        }}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label
                        className="text-sm font-medium"
                        style={{ color: "#a855f7" }}
                    >
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
                            borderColor: "#a855f7",
                            color: "#ffffff",
                            boxShadow: "0 0 10px rgba(168, 85, 247, 0.2)",
                        }}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label
                        className="text-sm font-medium"
                        style={{ color: "#a855f7" }}
                    >
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
                            borderColor: "#a855f7",
                            color: "#a855f7",
                        }}
                    >
                        {thumbnailFile ? "Change Thumbnail" : "Upload Thumbnail"}
                    </button>
                    {thumbnailFile && (
                        <p className="text-sm" style={{ color: "#00d4d4" }}>
                            Selected: {thumbnailFile.name}
                        </p>
                    )}
                </div>
            </div>

            {/* Audio Upload Section */}
            <div
                className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8"
                style={{
                    backgroundColor: "rgba(13, 13, 26, 0.8)",
                    borderColor: "#00d4d4",
                    boxShadow: "0 0 20px rgba(0, 212, 212, 0.2)",
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                <button
                    onClick={handleUploadClick}
                    className="rounded-lg border-2 px-6 py-3 text-lg font-semibold transition-all hover:scale-105"
                    style={{
                        borderColor: "#00d4d4",
                        color: "#00d4d4",
                        backgroundColor: "transparent",
                        boxShadow: "0 0 15px rgba(0, 212, 212, 0.3)",
                    }}
                >
                    {audioFile ? "Change Audio File" : "Upload Audio File"}
                </button>

                {audioFile && (
                    <p className="text-sm" style={{ color: "#a855f7" }}>
                        Selected: {audioFile.name}
                    </p>
                )}
            </div>

            {/* Player Section */}
            {audioUrl && (
                <div
                    className="flex flex-col items-center gap-4 rounded-2xl border-2 p-8"
                    style={{
                        backgroundColor: "rgba(13, 13, 26, 0.8)",
                        borderColor: isRecording ? "#a855f7" : "#00d4d4",
                        boxShadow: isRecording
                            ? "0 0 30px rgba(168, 85, 247, 0.4)"
                            : "0 0 20px rgba(0, 212, 212, 0.2)",
                        transition: "all 0.3s ease",
                    }}
                >
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={handleAudioEnded}
                        className="hidden"
                    />

                    <div className="flex items-center gap-4">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                className="rounded-lg px-6 py-3 text-lg font-bold transition-all hover:scale-105"
                                style={{
                                    backgroundColor: "#a855f7",
                                    color: "#ffffff",
                                    boxShadow: "0 0 20px rgba(168, 85, 247, 0.5)",
                                }}
                            >
                                Start Recording
                            </button>
                        ) : (
                            <button
                                onClick={stopRecording}
                                className="animate-pulse rounded-lg px-6 py-3 text-lg font-bold transition-all hover:scale-105"
                                style={{
                                    backgroundColor: "#ef4444",
                                    color: "#ffffff",
                                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)",
                                }}
                            >
                                Stop Recording
                            </button>
                        )}

                        <button
                            onClick={handleRemoveAudio}
                            className="rounded-lg border-2 px-6 py-3 text-lg font-semibold transition-all hover:bg-red-500/20"
                            style={{
                                borderColor: "#ef4444",
                                color: "#ef4444",
                            }}
                        >
                            Remove
                        </button>
                    </div>

                    {isRecording && (
                        <p
                            className="animate-pulse text-sm font-medium"
                            style={{ color: "#a855f7" }}
                        >
                            Recording... Press keys to log timestamps
                        </p>
                    )}

                    {keyPresses.length > 0 && (
                        <p className="text-sm" style={{ color: "#00d4d4" }}>
                            Recorded {keyPresses.length} keystrokes
                        </p>
                    )}
                </div>
            )}

            {/* Save Section */}
            {keyPresses.length > 0 && !isRecording && (
                <div
                    className="flex flex-col items-center gap-4 rounded-2xl border-2 p-8"
                    style={{
                        backgroundColor: "rgba(13, 13, 26, 0.8)",
                        borderColor: "#00d4d4",
                        boxShadow: "0 0 20px rgba(0, 212, 212, 0.2)",
                    }}
                >
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-lg px-8 py-4 text-lg font-bold transition-all hover:scale-105 disabled:opacity-50"
                        style={{
                            background: "linear-gradient(135deg, #00d4d4, #a855f7)",
                            color: "#ffffff",
                            boxShadow: "0 0 25px rgba(0, 212, 212, 0.4), 0 0 25px rgba(168, 85, 247, 0.4)",
                        }}
                    >
                        {isSaving ? "Saving..." : "Save to Database"}
                    </button>

                    {saveMessage && (
                        <p
                            className="text-sm font-medium"
                            style={{
                                color: saveMessage.includes("success")
                                    ? "#00d4d4"
                                    : "#ef4444",
                                textShadow: saveMessage.includes("success")
                                    ? "0 0 10px rgba(0, 212, 212, 0.5)"
                                    : "0 0 10px rgba(239, 68, 68, 0.5)",
                            }}
                        >
                            {saveMessage}
                        </p>
                    )}
                </div>
            )}


        </div>
    );
}

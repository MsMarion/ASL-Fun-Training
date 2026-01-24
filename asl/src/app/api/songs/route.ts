import { NextResponse } from "next/server";
import connectDB from "~/lib/mongodb";
import Song from "~/models/Song";

export async function POST(request: Request) {
    try {
        await connectDB();

        const { albumName, songName, thumbnailName, interactions } =
            await request.json();

        const song = await Song.create({
            albumName,
            songName,
            thumbnailName,
            interactions,
        });

        return NextResponse.json({ success: true, song }, { status: 201 });
    } catch (error) {
        console.error("Error saving song:", error);
        return NextResponse.json(
            { success: false, error: "Failed to save song" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        await connectDB();
        const songs = await Song.find().sort({ createdAt: -1 });
        return NextResponse.json({ success: true, songs });
    } catch (error) {
        console.error("Error fetching songs:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch songs" },
            { status: 500 }
        );
    }
}

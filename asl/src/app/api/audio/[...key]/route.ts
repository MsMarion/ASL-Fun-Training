import { NextRequest, NextResponse } from "next/server";
import { getFile, getFileInfo } from "~/lib/s3";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    const { key } = await params;
    const fileKey = key.join("/");

    if (!fileKey) {
        return NextResponse.json({ error: "Missing file key" }, { status: 400 });
    }

    const [fileBuffer, fileInfo] = await Promise.all([
        getFile(fileKey),
        getFileInfo(fileKey),
    ]);

    if (!fileBuffer) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const contentType = fileInfo?.contentType ?? "audio/mpeg";

    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Type": contentType,
            "Content-Length": fileBuffer.length.toString(),
            "Cache-Control": "public, max-age=31536000",
        },
    });
}

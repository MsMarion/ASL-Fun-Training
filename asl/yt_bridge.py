import yt_dlp
import json
import sys
import os

def download_youtube(url, output_path):
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path + '.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'noprogress': True,
        'logger': None,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        # Find the downloaded file to get its extension
        # yt-dlp might append an extension
        actual_filename = ydl.prepare_filename(info)
        return {
            "title": info.get("title", "Unknown"),
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail", ""),
            "id": info.get("id", ""),
            "filename": actual_filename
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python yt_bridge.py <url> <output_path>"}))
        sys.exit(1)
        
    url = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        metadata = download_youtube(url, output_path)
        print(json.dumps(metadata))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

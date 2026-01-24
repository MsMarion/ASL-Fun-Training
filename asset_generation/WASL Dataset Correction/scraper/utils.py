"""
Utility functions for ASL Video Scraper
"""
import re
import logging
from pathlib import Path
from urllib.parse import urlparse, unquote

from config import LOGS_DIR


def setup_logging(name: str = "asl_scraper", level: int = logging.INFO) -> logging.Logger:
    """Setup logging with file and console handlers"""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler with colors
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # File handler
    log_file = LOGS_DIR / "scraper.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )
    file_handler.setFormatter(file_format)
    logger.addHandler(file_handler)
    
    return logger


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a string to be used as a filename.
    Removes/replaces characters that are invalid in filenames.
    """
    # Remove/replace invalid characters
    invalid_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(invalid_chars, "_", filename)
    
    # Remove leading/trailing whitespace and dots
    sanitized = sanitized.strip(". ")
    
    # Limit length
    if len(sanitized) > 200:
        sanitized = sanitized[:200]
    
    return sanitized


def extract_filename_from_url(url: str) -> str:
    """
    Extract the filename from a URL.
    Returns the original source filename (what they want saved in DB).
    """
    parsed = urlparse(url)
    path = unquote(parsed.path)
    filename = Path(path).name
    return filename if filename else "unknown"


def extract_phrase_from_url(url: str) -> str:
    """
    Extract the phrase/slug from a sign page URL.
    Example: https://www.signasl.org/sign/abdominal-delivery -> abdominal-delivery
    """
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    parts = path.split("/")
    
    if len(parts) >= 2 and parts[0] == "sign":
        return parts[1]
    return path.split("/")[-1]


def create_video_filename(phrase: str, index: int, extension: str = "mp4") -> str:
    """
    Create a standardized video filename.
    Example: video_001.mp4
    """
    return f"video_{index:03d}.{extension}"


def get_local_path(letter: str, phrase: str, filename: str) -> str:
    """
    Get the relative path for storing a video.
    Example: A/abandon/video_001.mp4
    """
    return f"{letter.upper()}/{phrase}/{filename}"


def format_bytes(size: int) -> str:
    """Format bytes to human readable string"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{size:.2f} PB"


def parse_page_links(html_content: str, base_url: str = "https://www.signasl.org") -> list:
    """
    Parse pagination links from dictionary page.
    Returns list of page URLs.
    """
    from bs4 import BeautifulSoup
    
    soup = BeautifulSoup(html_content, "lxml")
    links = []
    
    # Find pagination links
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/dictionary/" in href and href.count("/") >= 3:
            # Check if it's a page number link
            parts = href.strip("/").split("/")
            if len(parts) >= 3:
                try:
                    int(parts[-1])  # Last part should be page number
                    full_url = base_url + href if not href.startswith("http") else href
                    if full_url not in links:
                        links.append(full_url)
                except ValueError:
                    pass
    
    return links


def parse_sign_links(html_content: str, base_url: str = "https://www.signasl.org") -> list:
    """
    Parse sign/phrase links from dictionary page.
    Returns list of tuples: (phrase_slug, full_url, display_name)
    """
    from bs4 import BeautifulSoup
    
    soup = BeautifulSoup(html_content, "lxml")
    signs = []
    
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/sign/" in href:
            phrase = extract_phrase_from_url(href)
            full_url = base_url + href if not href.startswith("http") else href
            display_name = a.get_text(strip=True)
            
            if phrase and (phrase, full_url, display_name) not in signs:
                signs.append((phrase, full_url, display_name))
    
    return signs

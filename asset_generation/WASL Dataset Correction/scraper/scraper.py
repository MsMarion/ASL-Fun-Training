"""
Visual Web Scraper using Playwright

Provides a visible browser window so you can watch the scraping process!
"""
import asyncio
import time
from typing import List, Tuple, Optional
from pathlib import Path
from playwright.async_api import async_playwright, Browser, Page, BrowserContext

from config import ScraperConfig, DEFAULT_CONFIG, BASE_URL, DOWNLOADS_DIR, LETTERS
from database import db_manager
from models import Letter, Phrase, Video
from utils import (
    setup_logging, 
    extract_phrase_from_url, 
    extract_filename_from_url,
    create_video_filename,
    get_local_path
)

logger = setup_logging("scraper")


class VisualScraper:
    """
    Visual web scraper that opens a browser window you can watch.
    Uses Playwright for reliable automation.
    """
    
    def __init__(self, config: ScraperConfig = None):
        self.config = config or DEFAULT_CONFIG
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.last_request_time = 0
    
    async def _rate_limit(self):
        """Enforce rate limiting between requests"""
        elapsed = time.time() - self.last_request_time
        delay = self.config.delay_between_requests
        
        if elapsed < delay:
            await asyncio.sleep(delay - elapsed)
        
        self.last_request_time = time.time()
    
    async def start_browser(self):
        """Start the browser in visible mode"""
        logger.info("🚀 Starting browser (visible mode)...")
        
        playwright = await async_playwright().start()
        
        # Launch browser with visible window
        self.browser = await playwright.chromium.launch(
            headless=self.config.headless,  # False = visible!
            slow_mo=100,  # Slow down actions so you can see them
        )
        
        # Create context with reasonable viewport
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 800}
        )
        
        self.page = await self.context.new_page()
        logger.info("✅ Browser started!")
        
        return self.page
    
    async def close_browser(self):
        """Close the browser"""
        if self.browser:
            await self.browser.close()
            logger.info("🔒 Browser closed")
    
    async def navigate(self, url: str) -> str:
        """Navigate to a URL and return page content"""
        await self._rate_limit()
        
        logger.info(f"📍 Navigating to: {url}")
        await self.page.goto(url, wait_until="domcontentloaded", timeout=self.config.browser_timeout)
        
        # Wait a moment for any dynamic content
        await asyncio.sleep(0.5)
        
        return await self.page.content()
    
    async def get_dictionary_page_count(self, letter: str) -> int:
        """Get the number of pages for a letter in the dictionary"""
        url = f"{BASE_URL}/dictionary/{letter.lower()}/1"
        content = await self.navigate(url)
        
        # Find pagination links
        page_links = await self.page.query_selector_all("a[href*='/dictionary/']")
        max_page = 1
        
        for link in page_links:
            href = await link.get_attribute("href")
            if href:
                parts = href.strip("/").split("/")
                if len(parts) >= 3:
                    try:
                        page_num = int(parts[-1])
                        max_page = max(max_page, page_num)
                    except ValueError:
                        pass
        
        logger.info(f"📄 Letter '{letter}' has {max_page} pages")
        return max_page
    
    async def get_sign_links_from_page(self, letter: str, page_num: int) -> List[Tuple[str, str, str]]:
        """
        Get all sign links from a dictionary page.
        Returns list of (phrase_slug, url, display_name)
        """
        url = f"{BASE_URL}/dictionary/{letter.lower()}/{page_num}"
        content = await self.navigate(url)
        
        # Find all sign links
        sign_links = await self.page.query_selector_all("a[href^='/sign/']")
        signs = []
        
        for link in sign_links:
            href = await link.get_attribute("href")
            text = await link.inner_text()
            
            if href and "/sign/" in href:
                phrase = extract_phrase_from_url(href)
                full_url = BASE_URL + href if not href.startswith("http") else href
                
                # Avoid duplicates
                if phrase and not any(s[0] == phrase for s in signs):
                    signs.append((phrase, full_url, text.strip()))
        
        logger.info(f"📝 Found {len(signs)} signs on page {page_num}")
        return signs
    
    async def get_video_urls_from_sign_page(self, url: str) -> List[Tuple[str, str]]:
        """
        Get all video URLs from a sign page.
        Returns list of (video_url, source_filename)
        """
        content = await self.navigate(url)
        
        videos = []
        
        # Method 1: Find <video> elements directly
        video_elements = await self.page.query_selector_all("video")
        
        for video in video_elements:
            # Check for src attribute
            src = await video.get_attribute("src")
            if src:
                filename = extract_filename_from_url(src)
                videos.append((src, filename))
            
            # Check for <source> children
            sources = await video.query_selector_all("source")
            for source in sources:
                src = await source.get_attribute("src")
                if src:
                    filename = extract_filename_from_url(src)
                    videos.append((src, filename))
        
        # Method 2: Find all elements with video file extensions in href/src
        all_links = await self.page.query_selector_all("[src*='.mp4'], [src*='.webm'], [href*='.mp4'], [href*='.webm']")
        
        for link in all_links:
            src = await link.get_attribute("src") or await link.get_attribute("href")
            if src and src not in [v[0] for v in videos]:
                filename = extract_filename_from_url(src)
                videos.append((src, filename))
        
        # Method 3: Look in page source for video URLs (sometimes embedded in JavaScript)
        page_source = await self.page.content()
        
        import re
        video_patterns = [
            r'https?://[^\s"\']+\.mp4[^\s"\']*',
            r'https?://[^\s"\']+\.webm[^\s"\']*',
            r'//[^\s"\']+\.mp4[^\s"\']*',
        ]
        
        for pattern in video_patterns:
            matches = re.findall(pattern, page_source)
            for match in matches:
                # Clean up the URL
                video_url = match.split('"')[0].split("'")[0]
                if video_url.startswith("//"):
                    video_url = "https:" + video_url
                
                if video_url not in [v[0] for v in videos]:
                    filename = extract_filename_from_url(video_url)
                    videos.append((video_url, filename))
        
        # Remove duplicates while preserving order
        seen = set()
        unique_videos = []
        for video_url, filename in videos:
            if video_url not in seen:
                seen.add(video_url)
                unique_videos.append((video_url, filename))
        
        logger.info(f"🎬 Found {len(unique_videos)} videos")
        return unique_videos
    
    async def download_video(self, video_url: str, save_path: Path) -> Tuple[bool, int, str]:
        """
        Download a video file.
        Returns (success, file_size, error_message)
        """
        import aiohttp
        import aiofiles
        
        # Ensure parent directory exists
        save_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            await self._rate_limit()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(video_url, timeout=aiohttp.ClientTimeout(total=60)) as response:
                    if response.status == 200:
                        content = await response.read()
                        
                        async with aiofiles.open(save_path, 'wb') as f:
                            await f.write(content)
                        
                        file_size = len(content)
                        logger.info(f"✅ Downloaded: {save_path.name} ({file_size / 1024:.1f} KB)")
                        return True, file_size, None
                    else:
                        error = f"HTTP {response.status}"
                        logger.error(f"❌ Failed to download: {error}")
                        return False, 0, error
                        
        except Exception as e:
            error = str(e)
            logger.error(f"❌ Download error: {error}")
            return False, 0, error
    
    async def scrape_letter(self, letter: str, phrases_limit: int = None) -> dict:
        """
        Scrape all phrases for a letter.
        
        Args:
            letter: Single letter A-Z
            phrases_limit: Max phrases to scrape (for testing)
        
        Returns:
            Statistics dict
        """
        letter = letter.upper()
        logger.info(f"\n{'='*50}")
        logger.info(f"🔤 Starting scrape for letter: {letter}")
        logger.info(f"{'='*50}\n")
        
        session = db_manager.get_session()
        letter_obj = db_manager.get_or_create_letter(session, letter)
        db_manager.set_letter_status(session, letter_obj, "scanning")
        
        stats = {"phrases_found": 0, "videos_found": 0, "videos_downloaded": 0}
        
        try:
            # Get page count
            page_count = await self.get_dictionary_page_count(letter)
            letter_obj.page_count = page_count
            session.commit()
            
            # Collect phrases from all pages
            all_phrases = []
            for page_num in range(1, page_count + 1):
                signs = await self.get_sign_links_from_page(letter, page_num)
                all_phrases.extend(signs)
                
                # Apply limit if testing
                if phrases_limit and len(all_phrases) >= phrases_limit:
                    all_phrases = all_phrases[:phrases_limit]
                    break
            
            logger.info(f"📚 Found {len(all_phrases)} phrases for letter {letter}")
            stats["phrases_found"] = len(all_phrases)
            
            db_manager.set_letter_status(session, letter_obj, "in_progress")
            
            # Process each phrase
            for i, (phrase_slug, phrase_url, display_name) in enumerate(all_phrases, 1):
                logger.info(f"\n[{i}/{len(all_phrases)}] Processing: {display_name}")
                
                # Create phrase record
                phrase_obj = db_manager.get_or_create_phrase(
                    session, letter_obj, phrase_slug, phrase_url, display_name
                )
                db_manager.set_phrase_status(session, phrase_obj, "in_progress")
                
                try:
                    # Get video URLs
                    videos = await self.get_video_urls_from_sign_page(phrase_url)
                    stats["videos_found"] += len(videos)
                    
                    # Download each video
                    for idx, (video_url, source_filename) in enumerate(videos, 1):
                        # Create video record
                        video_obj = db_manager.create_video(
                            session, phrase_obj, video_url, source_filename, idx
                        )
                        
                        # Skip if already downloaded
                        if video_obj.status == "completed":
                            logger.info(f"⏭️ Skipping (already downloaded): {video_obj.filename}")
                            stats["videos_downloaded"] += 1
                            continue
                        
                        # Determine save path
                        our_filename = create_video_filename(phrase_slug, idx)
                        relative_path = get_local_path(letter, phrase_slug, our_filename)
                        save_path = DOWNLOADS_DIR / relative_path
                        
                        # Download
                        success, file_size, error = await self.download_video(video_url, save_path)
                        
                        if success:
                            db_manager.mark_video_downloaded(
                                session, video_obj, relative_path, our_filename, file_size
                            )
                            stats["videos_downloaded"] += 1
                        else:
                            db_manager.mark_video_failed(session, video_obj, error)
                    
                    # Update phrase stats
                    db_manager.update_phrase_stats(session, phrase_obj)
                    db_manager.set_phrase_status(session, phrase_obj, "completed")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing phrase {phrase_slug}: {e}")
                    db_manager.set_phrase_status(session, phrase_obj, "failed", str(e))
            
            # Update letter stats
            db_manager.update_letter_stats(session, letter_obj)
            db_manager.set_letter_status(session, letter_obj, "completed")
            
        except Exception as e:
            logger.error(f"❌ Error scraping letter {letter}: {e}")
            db_manager.set_letter_status(session, letter_obj, "failed", str(e))
        
        finally:
            session.close()
        
        logger.info(f"\n📊 Letter {letter} complete: {stats}")
        return stats
    
    async def run_test_scrape(self, phrases_per_letter: int = 3):
        """
        Run a test scrape with limited phrases per letter.
        Perfect for verifying everything works!
        """
        logger.info("🧪 Starting test scrape...")
        logger.info(f"   Phrases per letter: {phrases_per_letter}")
        
        await self.start_browser()
        
        total_stats = {
            "letters": 0,
            "phrases_found": 0, 
            "videos_found": 0, 
            "videos_downloaded": 0
        }
        
        try:
            for letter in self.config.get_letters_to_scrape():
                stats = await self.scrape_letter(letter, phrases_limit=phrases_per_letter)
                
                total_stats["letters"] += 1
                total_stats["phrases_found"] += stats["phrases_found"]
                total_stats["videos_found"] += stats["videos_found"]
                total_stats["videos_downloaded"] += stats["videos_downloaded"]
        
        finally:
            await self.close_browser()
        
        logger.info("\n" + "=" * 50)
        logger.info("🎉 Test scrape complete!")
        logger.info(f"   Letters:    {total_stats['letters']}")
        logger.info(f"   Phrases:    {total_stats['phrases_found']}")
        logger.info(f"   Videos:     {total_stats['videos_downloaded']}/{total_stats['videos_found']}")
        logger.info("=" * 50)
        
        # Show database summary
        db_manager.print_summary()
        
        return total_stats
    
    async def run_full_scrape(self):
        """
        Run a full scrape of all letters.
        """
        logger.info("🚀 Starting FULL scrape...")
        
        await self.start_browser()
        
        try:
            for letter in self.config.get_letters_to_scrape():
                await self.scrape_letter(letter)
        
        finally:
            await self.close_browser()
        
        db_manager.print_summary()


async def main():
    """Main entry point for testing"""
    config = ScraperConfig(
        phrases_per_letter=3,  # Start with 3 for testing
        headless=False,  # Watch it work!
    )
    
    scraper = VisualScraper(config)
    await scraper.run_test_scrape(phrases_per_letter=3)


if __name__ == "__main__":
    asyncio.run(main())

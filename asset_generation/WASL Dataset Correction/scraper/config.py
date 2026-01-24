"""
Configuration for ASL Video Scraper
"""
from pathlib import Path
from dataclasses import dataclass, field
from typing import List

# Base paths
PROJECT_ROOT = Path(__file__).parent.parent
DOWNLOADS_DIR = PROJECT_ROOT / "downloads"
DATABASE_DIR = PROJECT_ROOT / "database"
LOGS_DIR = PROJECT_ROOT / "logs"

# Ensure directories exist
DOWNLOADS_DIR.mkdir(exist_ok=True)
DATABASE_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Database
DATABASE_PATH = DATABASE_DIR / "asl_scraper.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Website URLs
BASE_URL = "https://www.signasl.org"
DICTIONARY_URL = f"{BASE_URL}/dictionary"
SIGN_URL = f"{BASE_URL}/sign"

# All letters A-Z
LETTERS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


@dataclass
class ScraperConfig:
    """Configuration for scraper behavior"""
    
    # Rate limiting
    requests_per_second: float = 3.0  # 3 req/sec as requested
    
    # Concurrency
    max_concurrent_downloads: int = 3
    
    # Scraping limits (for testing)
    phrases_per_letter: int = 3  # Start with 2-3 for testing
    
    # Browser settings
    headless: bool = False  # Visual mode - watch the scraper work!
    browser_timeout: int = 30000  # 30 seconds
    
    # Retry settings
    max_retries: int = 3
    retry_delay: float = 2.0
    
    # Which letters to scrape (empty = all)
    target_letters: List[str] = field(default_factory=list)
    
    @property
    def delay_between_requests(self) -> float:
        """Delay in seconds between requests"""
        return 1.0 / self.requests_per_second
    
    def get_letters_to_scrape(self) -> List[str]:
        """Get list of letters to process"""
        if self.target_letters:
            return [l.upper() for l in self.target_letters]
        return LETTERS


# Default configuration
DEFAULT_CONFIG = ScraperConfig()

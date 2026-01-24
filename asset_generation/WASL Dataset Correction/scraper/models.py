"""
Database Models for ASL Video Scraper

Designed for SQLite with easy migration path to MongoDB:
- Uses UUIDs as string IDs (MongoDB-compatible)
- Stores JSON-serializable metadata
- Timestamps for all records
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func

from config import DATABASE_URL

Base = declarative_base()


class Letter(Base):
    """
    Tracks each letter (A-Z) in the dictionary.
    Maps to a MongoDB collection: letters
    """
    __tablename__ = "letters"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    letter = Column(String(1), unique=True, nullable=False, index=True)
    
    # Statistics
    page_count = Column(Integer, default=0)  # Number of dictionary pages found
    phrase_count = Column(Integer, default=0)  # Total phrases discovered
    video_count = Column(Integer, default=0)  # Total videos downloaded
    
    # Status tracking: pending, scanning, in_progress, completed, failed
    status = Column(String(20), default="pending", index=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    phrases = relationship("Phrase", back_populates="letter", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Letter('{self.letter}', phrases={self.phrase_count}, videos={self.video_count}, status='{self.status}')>"
    
    def to_dict(self):
        """Convert to dictionary (MongoDB-compatible)"""
        return {
            "id": self.id,
            "letter": self.letter,
            "page_count": self.page_count,
            "phrase_count": self.phrase_count,
            "video_count": self.video_count,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Phrase(Base):
    """
    Tracks each sign/phrase scraped from the dictionary.
    Maps to a MongoDB collection: phrases
    """
    __tablename__ = "phrases"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    letter_id = Column(Integer, ForeignKey("letters.id"), nullable=False, index=True)
    
    # Phrase information
    phrase = Column(String(255), unique=True, nullable=False, index=True)  # URL slug: "abdominal-delivery"
    display_name = Column(String(255), nullable=True)  # Human readable: "abdominal delivery"
    url = Column(Text, nullable=False)  # Full URL to sign page
    definition = Column(Text, nullable=True)  # Sign definition if available
    
    # Statistics
    video_count = Column(Integer, default=0)  # Number of videos found
    
    # Status tracking
    status = Column(String(20), default="pending", index=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    letter = relationship("Letter", back_populates="phrases")
    videos = relationship("Video", back_populates="phrase", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Phrase('{self.phrase}', videos={self.video_count}, status='{self.status}')>"
    
    def to_dict(self):
        """Convert to dictionary (MongoDB-compatible)"""
        return {
            "id": self.id,
            "letter_id": self.letter_id,
            "phrase": self.phrase,
            "display_name": self.display_name,
            "url": self.url,
            "definition": self.definition,
            "video_count": self.video_count,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Video(Base):
    """
    Tracks each video file downloaded.
    Maps to a MongoDB collection: videos
    """
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    phrase_id = Column(Integer, ForeignKey("phrases.id"), nullable=False, index=True)
    
    # Source information (original name saved here!)
    source_url = Column(Text, nullable=False)  # Original video URL
    source_filename = Column(String(255), nullable=True)  # Original filename from URL
    
    # Local storage
    local_path = Column(Text, nullable=True)  # Relative path to saved file
    filename = Column(String(255), nullable=True)  # Our filename: video_001.mp4
    
    # Video metadata
    file_size = Column(BigInteger, nullable=True)  # Size in bytes
    video_index = Column(Integer, default=1)  # 1, 2, 3... for this phrase
    
    # Status tracking
    status = Column(String(20), default="pending", index=True)  # pending, downloading, completed, failed
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    downloaded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    phrase = relationship("Phrase", back_populates="videos")
    
    def __repr__(self):
        return f"<Video('{self.filename}', source='{self.source_filename}', status='{self.status}')>"
    
    def to_dict(self):
        """Convert to dictionary (MongoDB-compatible)"""
        return {
            "id": self.id,
            "phrase_id": self.phrase_id,
            "source_url": self.source_url,
            "source_filename": self.source_filename,
            "local_path": self.local_path,
            "filename": self.filename,
            "file_size": self.file_size,
            "video_index": self.video_index,
            "status": self.status,
            "error_message": self.error_message,
            "downloaded_at": self.downloaded_at.isoformat() if self.downloaded_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Database engine and session
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(engine)
    print(f"Database initialized at: {DATABASE_URL}")


def get_session():
    """Get a new database session"""
    return SessionLocal()


if __name__ == "__main__":
    # Create tables when run directly
    init_db()

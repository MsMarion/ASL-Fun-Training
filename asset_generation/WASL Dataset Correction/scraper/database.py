"""
Database Operations for ASL Video Scraper

Provides high-level database operations with statistics and resume support.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Letter, Phrase, Video, get_session, init_db


class DatabaseManager:
    """Manages all database operations"""
    
    def __init__(self):
        init_db()  # Ensure tables exist
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return get_session()
    
    # ==================== LETTER OPERATIONS ====================
    
    def get_or_create_letter(self, session: Session, letter: str) -> Letter:
        """Get existing letter or create new one"""
        letter = letter.upper()
        existing = session.query(Letter).filter(Letter.letter == letter).first()
        if existing:
            return existing
        
        new_letter = Letter(letter=letter)
        session.add(new_letter)
        session.commit()
        return new_letter
    
    def get_letter(self, session: Session, letter: str) -> Optional[Letter]:
        """Get letter by character"""
        return session.query(Letter).filter(Letter.letter == letter.upper()).first()
    
    def update_letter_stats(self, session: Session, letter: Letter):
        """Recalculate and update letter statistics"""
        phrase_count = session.query(func.count(Phrase.id)).filter(
            Phrase.letter_id == letter.id
        ).scalar()
        
        video_count = session.query(func.count(Video.id)).join(Phrase).filter(
            Phrase.letter_id == letter.id
        ).scalar()
        
        letter.phrase_count = phrase_count
        letter.video_count = video_count
        session.commit()
    
    def set_letter_status(self, session: Session, letter: Letter, status: str, error: str = None):
        """Update letter status"""
        letter.status = status
        letter.error_message = error
        session.commit()
    
    # ==================== PHRASE OPERATIONS ====================
    
    def get_or_create_phrase(
        self, 
        session: Session, 
        letter: Letter, 
        phrase: str, 
        url: str,
        display_name: str = None,
        definition: str = None
    ) -> Phrase:
        """Get existing phrase or create new one"""
        existing = session.query(Phrase).filter(Phrase.phrase == phrase).first()
        if existing:
            return existing
        
        new_phrase = Phrase(
            letter_id=letter.id,
            phrase=phrase,
            display_name=display_name or phrase.replace("-", " "),
            url=url,
            definition=definition
        )
        session.add(new_phrase)
        session.commit()
        return new_phrase
    
    def get_phrases_by_letter(self, session: Session, letter: Letter) -> List[Phrase]:
        """Get all phrases for a letter"""
        return session.query(Phrase).filter(Phrase.letter_id == letter.id).all()
    
    def get_pending_phrases(self, session: Session, limit: int = None) -> List[Phrase]:
        """Get phrases that haven't been fully processed"""
        query = session.query(Phrase).filter(
            Phrase.status.in_(["pending", "in_progress"])
        )
        if limit:
            query = query.limit(limit)
        return query.all()
    
    def update_phrase_stats(self, session: Session, phrase: Phrase):
        """Recalculate and update phrase statistics"""
        video_count = session.query(func.count(Video.id)).filter(
            Video.phrase_id == phrase.id
        ).scalar()
        phrase.video_count = video_count
        session.commit()
    
    def set_phrase_status(self, session: Session, phrase: Phrase, status: str, error: str = None):
        """Update phrase status"""
        phrase.status = status
        phrase.error_message = error
        session.commit()
    
    # ==================== VIDEO OPERATIONS ====================
    
    def create_video(
        self,
        session: Session,
        phrase: Phrase,
        source_url: str,
        source_filename: str,
        video_index: int
    ) -> Video:
        """Create a new video record"""
        # Check if already exists
        existing = session.query(Video).filter(
            Video.phrase_id == phrase.id,
            Video.source_url == source_url
        ).first()
        if existing:
            return existing
        
        video = Video(
            phrase_id=phrase.id,
            source_url=source_url,
            source_filename=source_filename,
            video_index=video_index
        )
        session.add(video)
        session.commit()
        return video
    
    def get_pending_videos(self, session: Session, limit: int = None) -> List[Video]:
        """Get videos that need downloading"""
        query = session.query(Video).filter(
            Video.status.in_(["pending", "failed"])
        )
        if limit:
            query = query.limit(limit)
        return query.all()
    
    def mark_video_downloaded(
        self,
        session: Session,
        video: Video,
        local_path: str,
        filename: str,
        file_size: int
    ):
        """Mark video as successfully downloaded"""
        from datetime import datetime
        video.status = "completed"
        video.local_path = local_path
        video.filename = filename
        video.file_size = file_size
        video.downloaded_at = datetime.now()
        session.commit()
    
    def mark_video_failed(self, session: Session, video: Video, error: str):
        """Mark video download as failed"""
        video.status = "failed"
        video.error_message = error
        session.commit()
    
    # ==================== STATISTICS ====================
    
    def get_overall_stats(self, session: Session) -> Dict[str, Any]:
        """Get overall scraping statistics"""
        total_letters = session.query(func.count(Letter.id)).scalar()
        completed_letters = session.query(func.count(Letter.id)).filter(
            Letter.status == "completed"
        ).scalar()
        
        total_phrases = session.query(func.count(Phrase.id)).scalar()
        completed_phrases = session.query(func.count(Phrase.id)).filter(
            Phrase.status == "completed"
        ).scalar()
        
        total_videos = session.query(func.count(Video.id)).scalar()
        completed_videos = session.query(func.count(Video.id)).filter(
            Video.status == "completed"
        ).scalar()
        
        total_size = session.query(func.sum(Video.file_size)).filter(
            Video.status == "completed"
        ).scalar() or 0
        
        return {
            "letters": {"total": total_letters, "completed": completed_letters},
            "phrases": {"total": total_phrases, "completed": completed_phrases},
            "videos": {"total": total_videos, "completed": completed_videos},
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
        }
    
    def get_letter_stats(self, session: Session, letter: str) -> Dict[str, Any]:
        """Get statistics for a specific letter"""
        letter_obj = self.get_letter(session, letter)
        if not letter_obj:
            return None
        
        phrases = self.get_phrases_by_letter(session, letter_obj)
        videos = session.query(Video).join(Phrase).filter(
            Phrase.letter_id == letter_obj.id
        ).all()
        
        return {
            "letter": letter.upper(),
            "status": letter_obj.status,
            "phrase_count": len(phrases),
            "video_count": len(videos),
            "completed_videos": sum(1 for v in videos if v.status == "completed"),
            "phrases": [p.to_dict() for p in phrases],
        }
    
    def print_summary(self):
        """Print a summary of the database"""
        session = self.get_session()
        stats = self.get_overall_stats(session)
        
        print("\n" + "=" * 50)
        print("📊 ASL Scraper Database Summary")
        print("=" * 50)
        print(f"Letters:  {stats['letters']['completed']}/{stats['letters']['total']} completed")
        print(f"Phrases:  {stats['phrases']['completed']}/{stats['phrases']['total']} completed")
        print(f"Videos:   {stats['videos']['completed']}/{stats['videos']['total']} downloaded")
        print(f"Size:     {stats['total_size_mb']} MB")
        print("=" * 50 + "\n")
        
        session.close()


# Singleton instance
db_manager = DatabaseManager()


if __name__ == "__main__":
    # Test database operations
    db_manager.print_summary()

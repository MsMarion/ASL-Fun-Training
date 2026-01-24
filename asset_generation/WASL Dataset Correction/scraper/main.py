"""
ASL Video Scraper - CLI Entry Point

Commands:
    test    - Run test scrape (2-3 phrases per letter)
    full    - Run full scrape (all phrases)
    status  - Show database statistics
    resume  - Resume interrupted scrape
"""
import asyncio
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from config import ScraperConfig, LETTERS
from database import db_manager
from scraper import VisualScraper

console = Console()


@click.group()
def cli():
    """ASL Video Scraper - Download ASL sign videos from signasl.org"""
    pass


@cli.command()
@click.option("--phrases", "-p", default=3, help="Phrases per letter (default: 3)")
@click.option("--letters", "-l", default="", help="Specific letters to scrape (e.g., 'ABC')")
@click.option("--headless", is_flag=True, help="Run in headless mode (no visible browser)")
def test(phrases: int, letters: str, headless: bool):
    """Run a test scrape with limited phrases per letter"""
    console.print(Panel.fit(
        f"[bold green]🧪 Test Scrape[/bold green]\n"
        f"Phrases per letter: {phrases}\n"
        f"Letters: {letters if letters else 'All A-Z'}\n"
        f"Headless: {headless}",
        title="Configuration"
    ))
    
    config = ScraperConfig(
        phrases_per_letter=phrases,
        headless=headless,
        target_letters=list(letters.upper()) if letters else [],
    )
    
    scraper = VisualScraper(config)
    
    async def run():
        await scraper.run_test_scrape(phrases_per_letter=phrases)
    
    asyncio.run(run())


@cli.command()
@click.option("--letters", "-l", default="", help="Specific letters to scrape (e.g., 'ABC')")
@click.option("--headless", is_flag=True, help="Run in headless mode (no visible browser)")
def full(letters: str, headless: bool):
    """Run a full scrape of all phrases"""
    console.print(Panel.fit(
        f"[bold red]🚀 Full Scrape[/bold red]\n"
        f"Letters: {letters if letters else 'All A-Z'}\n"
        f"Headless: {headless}\n\n"
        f"[yellow]⚠️ This will download ALL videos![/yellow]",
        title="Configuration"
    ))
    
    if not click.confirm("Continue with full scrape?"):
        console.print("[yellow]Cancelled.[/yellow]")
        return
    
    config = ScraperConfig(
        headless=headless,
        target_letters=list(letters.upper()) if letters else [],
    )
    
    scraper = VisualScraper(config)
    
    async def run():
        await scraper.run_full_scrape()
    
    asyncio.run(run())


@cli.command()
def status():
    """Show database statistics"""
    session = db_manager.get_session()
    stats = db_manager.get_overall_stats(session)
    
    # Overall stats table
    overall_table = Table(title="📊 Overall Statistics")
    overall_table.add_column("Metric", style="cyan")
    overall_table.add_column("Count", style="green")
    overall_table.add_column("Completed", style="yellow")
    
    overall_table.add_row(
        "Letters", 
        str(stats["letters"]["total"]), 
        str(stats["letters"]["completed"])
    )
    overall_table.add_row(
        "Phrases", 
        str(stats["phrases"]["total"]), 
        str(stats["phrases"]["completed"])
    )
    overall_table.add_row(
        "Videos", 
        str(stats["videos"]["total"]), 
        str(stats["videos"]["completed"])
    )
    overall_table.add_row(
        "Total Size", 
        f"{stats['total_size_mb']} MB", 
        ""
    )
    
    console.print(overall_table)
    
    # Letter breakdown
    from models import Letter
    letters = session.query(Letter).order_by(Letter.letter).all()
    
    if letters:
        letter_table = Table(title="\n🔤 Letter Breakdown")
        letter_table.add_column("Letter", style="cyan")
        letter_table.add_column("Phrases", style="green")
        letter_table.add_column("Videos", style="blue")
        letter_table.add_column("Status", style="yellow")
        
        for letter in letters:
            status_emoji = {
                "pending": "⏳",
                "scanning": "🔍",
                "in_progress": "🔄",
                "completed": "✅",
                "failed": "❌"
            }.get(letter.status, "❓")
            
            letter_table.add_row(
                letter.letter,
                str(letter.phrase_count),
                str(letter.video_count),
                f"{status_emoji} {letter.status}"
            )
        
        console.print(letter_table)
    
    session.close()


@cli.command()
@click.option("--headless", is_flag=True, help="Run in headless mode")
def resume(headless: bool):
    """Resume an interrupted scrape (continues pending items)"""
    console.print("[bold cyan]🔄 Resuming scrape...[/bold cyan]")
    
    session = db_manager.get_session()
    from models import Letter
    
    # Find letters that aren't completed
    pending_letters = session.query(Letter).filter(
        Letter.status.in_(["pending", "scanning", "in_progress"])
    ).all()
    
    if not pending_letters:
        console.print("[green]✅ All letters are completed! Nothing to resume.[/green]")
        session.close()
        return
    
    letter_chars = [l.letter for l in pending_letters]
    console.print(f"[yellow]Found {len(pending_letters)} pending letters: {', '.join(letter_chars)}[/yellow]")
    
    session.close()
    
    config = ScraperConfig(
        headless=headless,
        target_letters=letter_chars,
    )
    
    scraper = VisualScraper(config)
    
    async def run():
        await scraper.run_full_scrape()
    
    asyncio.run(run())


@cli.command()
@click.argument("letter")
def letter_status(letter: str):
    """Show detailed status for a specific letter"""
    session = db_manager.get_session()
    stats = db_manager.get_letter_stats(session, letter)
    
    if not stats:
        console.print(f"[red]Letter '{letter.upper()}' not found in database.[/red]")
        session.close()
        return
    
    console.print(Panel.fit(
        f"[bold]Letter: {stats['letter']}[/bold]\n"
        f"Status: {stats['status']}\n"
        f"Phrases: {stats['phrase_count']}\n"
        f"Videos: {stats['completed_videos']}/{stats['video_count']}",
        title=f"📊 Status for Letter {stats['letter']}"
    ))
    
    # Show phrases
    if stats["phrases"]:
        phrase_table = Table(title="Phrases")
        phrase_table.add_column("Phrase", style="cyan")
        phrase_table.add_column("Videos", style="green")
        phrase_table.add_column("Status", style="yellow")
        
        for phrase in stats["phrases"]:
            phrase_table.add_row(
                phrase["display_name"],
                str(phrase["video_count"]),
                phrase["status"]
            )
        
        console.print(phrase_table)
    
    session.close()


if __name__ == "__main__":
    cli()

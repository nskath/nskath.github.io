import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "clublocker.json"
URL = "https://clublocker.com/divisions/5933/players"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto(URL, wait_until="networkidle", timeout=60_000)
    row = page.locator("tr").filter(has_text=re.compile(r"Kathuria,\s*Navtej", re.I)).first
    if row.count() == 0:
        raise RuntimeError("Could not find Kathuria, Navtej on the Club Locker division page")
    row_text = row.inner_text()
    rating = re.search(r"\b(\d\.\d{2})\b", row_text)
    rank = re.search(r"\b(\d+)\b", row_text)
    if not rating:
        raise RuntimeError(f"Could not find a rating in Club Locker row: {row_text}")
    payload = {
        "rating": rating.group(1),
        "rank": int(rank.group(1)) if rank else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": URL,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n")
    browser.close()

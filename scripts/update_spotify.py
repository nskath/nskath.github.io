import json
import os
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "spotify.json"
CLIENT_ID = os.environ["SPOTIFY_CLIENT_ID"]
REFRESH_TOKEN = os.environ["SPOTIFY_REFRESH_TOKEN"]


def post_token():
    body = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
    }).encode()
    request = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)["access_token"]


def get_json(token, url):
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


token = post_token()
artists = get_json(token, "https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term").get("items", [])
recent_items = get_json(token, "https://api.spotify.com/v1/me/player/recently-played?limit=50").get("items", [])
cutoff = datetime.now(timezone.utc) - timedelta(days=7)
recent_tracks = []
listening_ms = 0
play_counts = Counter()
for item in recent_items:
    played_at = datetime.fromisoformat(item["played_at"].replace("Z", "+00:00"))
    if played_at >= cutoff:
        track = item["track"]
        recent_tracks.append(track)
        listening_ms += track.get("duration_ms", 0)
        play_counts[track.get("id")] += 1
genre_values = [genre for artist in artists for genre in artist.get("genres", [])]
if not genre_values:
    for artist in artists:
        if artist.get("id"):
            detail = get_json(token, f"https://api.spotify.com/v1/artists/{artist['id']}")
            genre_values.extend(detail.get("genres", []))
genres = Counter(genre_values)
top_track = max(recent_tracks, key=lambda track: play_counts[track.get("id")], default=None)
payload = {
    "genres": [{"name": genre, "count": count} for genre, count in genres.most_common(3)],
    "listening_minutes": round(listening_ms / 60000),
    "top_track": {
        "name": top_track["name"],
        "artist": ", ".join(artist["name"] for artist in top_track.get("artists", [])),
        "album": top_track.get("album", {}).get("name"),
        "album_art": (top_track.get("album", {}).get("images") or [{}])[0].get("url"),
        "url": top_track.get("external_urls", {}).get("spotify"),
    } if top_track else None,
    "updated_at": datetime.now(timezone.utc).isoformat(),
}
OUTPUT.write_text(json.dumps(payload, indent=2) + "\n")

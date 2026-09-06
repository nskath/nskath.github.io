const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');

if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      navLinks.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
    }
  });
}

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const clubLockerRating = document.querySelector('[data-clublocker-rating]');
if (clubLockerRating) {
  fetch('/data/clublocker.json').then((response) => response.json()).then((data) => {
    if (data.rating) clubLockerRating.textContent = data.rating;
  }).catch(() => {});
}

const spotify = document.querySelector('[data-spotify]');

if (spotify) {
  const clientId = spotify.dataset.clientId;
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const status = spotify.querySelector('[data-spotify-status]');
  const results = spotify.querySelector('[data-spotify-results]');
  const connect = spotify.querySelector('[data-spotify-connect]');
  const tokenKey = 'navtej-spotify-token';
  const verifierKey = 'navtej-spotify-verifier';
  const stateKey = 'navtej-spotify-state';

  const toBase64Url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sha256 = async (value) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (!hours) return `${remaining} minute${remaining === 1 ? '' : 's'}`;
    if (!remaining) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${hours} hour${hours === 1 ? '' : 's'} ${remaining} minute${remaining === 1 ? '' : 's'}`;
  };

  const renderSnapshot = (data) => {
    results.hidden = false;
    const genreItems = (data.genres || []).map((genre) => `<li>${genre.name}</li>`).join('');
    const track = data.top_track;
    const trackMarkup = track ? `<a class="spotify-track" href="${track.url || '#'}" target="_blank" rel="noreferrer"><img class="spotify-track-art" src="${track.album_art || ''}" alt=""><span><strong>${track.name}</strong><small>${track.artist}${track.album ? ` · ${track.album}` : ''}</small></span></a>` : '<span class="spotify-empty">No recent track data.</span>';
    results.innerHTML = `<div class="spotify-snapshot"><div><span class="spotify-label">Top genres</span><ol>${genreItems || '<li>No genre data.</li>'}</ol></div><div><span class="spotify-label">Last 7 days</span><span class="spotify-time">${formatDuration(data.listening_minutes ?? 0)}</span></div><div><span class="spotify-label">#1 song</span>${trackMarkup}</div></div>`;
  };

  fetch('/data/spotify.json').then((response) => response.json()).then((data) => {
    if (data.genres?.length || data.top_track) renderSnapshot(data);
    if (data.updated_at) status.textContent = `Top genres · updated ${new Date(data.updated_at).toLocaleDateString()}`;
  }).catch(() => {});

  const getSnapshot = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [artistsResponse, recentResponse] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term', { headers }),
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers })
    ]);
    if (recentResponse.status === 401 || recentResponse.status === 403) {
      const scopeError = new Error('Spotify recent listening permission required');
      scopeError.requiresAuth = true;
      throw scopeError;
    }
    if (!artistsResponse.ok || !recentResponse.ok) throw new Error('Spotify request failed');
    const artists = (await artistsResponse.json()).items || [];
    const recentItems = (await recentResponse.json()).items || [];
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentTracks = recentItems.filter((item) => Date.parse(item.played_at) >= cutoff);
    const counts = new Map();
    recentTracks.forEach((item) => counts.set(item.track.id, (counts.get(item.track.id) || 0) + 1));
    const topTrack = recentTracks.map((item) => item.track).sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0))[0];
    const genreCounts = new Map();
    artists.forEach((artist) => (artist.genres || []).forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)));
    return {
      genres: [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
      listening_minutes: Math.round(recentTracks.reduce((total, item) => total + (item.track.duration_ms || 0), 0) / 60000),
      top_track: topTrack ? { name: topTrack.name, artist: topTrack.artists.map((artist) => artist.name).join(', '), album: topTrack.album.name, album_art: topTrack.album.images?.[0]?.url, url: topTrack.external_urls?.spotify } : null
    };
  };

  const loadSnapshot = async (token) => {
    const data = await getSnapshot(token);
    renderSnapshot(data);
    status.textContent = 'Top genres · last-week listening · #1 song';
    connect.textContent = 'Refresh snapshot';
  };

  const refreshAccessToken = async (refreshToken) => {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken })
    });
    if (!response.ok) throw new Error('Spotify refresh failed');
    const data = await response.json();
    const saved = { token: data.access_token, refreshToken: data.refresh_token || refreshToken, expires: Date.now() + (data.expires_in * 1000) };
    localStorage.setItem(tokenKey, JSON.stringify(saved));
    return saved.token;
  };

  const startAuth = async () => {
    const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(64)));
    const challenge = toBase64Url(await sha256(verifier));
    const state = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
    sessionStorage.setItem(verifierKey, verifier);
    sessionStorage.setItem(stateKey, state);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'user-top-read user-read-recently-played',
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state
    });
    window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
  };

  const finishAuth = async () => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    if (!code) return;
    const state = query.get('state');
    if (!state || state !== sessionStorage.getItem(stateKey)) throw new Error('Spotify state mismatch');
    const verifier = sessionStorage.getItem(verifierKey);
    if (!verifier) return;
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier })
    });
    if (!response.ok) throw new Error('Spotify authorization failed');
    const data = await response.json();
    localStorage.setItem(tokenKey, JSON.stringify({ token: data.access_token, refreshToken: data.refresh_token, expires: Date.now() + (data.expires_in * 1000) }));
    sessionStorage.removeItem(verifierKey);
    sessionStorage.removeItem(stateKey);
    window.history.replaceState({}, document.title, window.location.pathname);
    await loadSnapshot(data.access_token);
  };

  connect.addEventListener('click', async () => {
    try {
      connect.disabled = true;
      const saved = JSON.parse(localStorage.getItem(tokenKey) || 'null');
      if (saved && saved.expires > Date.now() + 30000) await loadSnapshot(saved.token);
      else if (saved?.refreshToken) await loadSnapshot(await refreshAccessToken(saved.refreshToken));
      else await startAuth();
    } catch (error) {
      if (error.requiresAuth) {
        localStorage.removeItem(tokenKey);
        await startAuth();
        return;
      }
      status.textContent = 'Spotify connection unavailable · try again';
      connect.disabled = false;
    }
  });

  finishAuth().catch(() => {
    status.textContent = 'Spotify authorization unavailable · try again';
    connect.disabled = false;
  });
}

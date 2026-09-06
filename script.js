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
  const status = spotify.querySelector('[data-spotify-status]');
  const results = spotify.querySelector('[data-spotify-results]');

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (!hours) return `${remaining} minute${remaining === 1 ? '' : 's'}`;
    if (!remaining) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${hours} hour${hours === 1 ? '' : 's'} ${remaining} minute${remaining === 1 ? '' : 's'}`;
  };

  const renderSnapshot = (data) => {
    results.hidden = false;
    const artistItems = (data.artists || []).map((artist) => `<li>${artist.name}</li>`).join('');
    const track = data.top_track;
    const trackMarkup = track ? `<a class="spotify-track" href="${track.url || '#'}" target="_blank" rel="noreferrer"><img class="spotify-track-art" src="${track.album_art || ''}" alt=""><span><strong>${track.name}</strong><small>${track.artist}${track.album ? ` · ${track.album}` : ''}</small></span></a>` : '<span class="spotify-empty">No recent track data.</span>';
    results.innerHTML = `<div class="spotify-snapshot"><div><span class="spotify-label">Top artists</span><ol>${artistItems || '<li>No artist data.</li>'}</ol></div><div><span class="spotify-label">Last 7 days</span><span class="spotify-time">${formatDuration(data.listening_minutes ?? 0)}</span></div><div><span class="spotify-label">#1 song</span>${trackMarkup}</div></div>`;
  };

  fetch('/data/spotify.json').then((response) => response.json()).then((data) => {
    if (data.artists?.length || data.top_track || data.listening_minutes !== undefined) renderSnapshot(data);
    if (data.updated_at) status.textContent = `Top artists · updated ${new Date(data.updated_at).toLocaleDateString()}`;
  }).catch(() => {});
}

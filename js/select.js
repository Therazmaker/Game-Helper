// ─── GAME SELECT SCREEN ───────────────────────────────────────────────────────
let gamesData = [];

const GAMES_FALLBACK = [
  {
    "id": "tlou1",
    "title": "The Last of Us Part I",
    "platform": "PS5",
    "file": "data/tlou1.json",
    "coverColor": "#1a8a35",
    "coverUrl": "https://image.api.playstation.com/vulcan/ap/rnd/202206/0720/eEczyEMDd2BLa3dtkGJVE9Id.png",
    "totalEstMin": 900
  }
];

async function initSelectScreen() {
  log('initSelectScreen() llamado', 'info');

  // Force screen visible
  const sel = document.getElementById('screen-select');
  if (sel) {
    sel.style.setProperty('display', 'block', 'important');
    log('screen-select forzado a block', 'ok');
  } else {
    log('screen-select NO ENCONTRADO en DOM', 'error');
  }

  try {
    log('fetching games.json...', 'info');
    let res;
    try {
      res = await fetch('./data/games.json');
      if (!res.ok) throw new Error('status ' + res.status);
    } catch(e1) {
      log('fetch ./data/ falló: ' + e1.message + ' — reintentando', 'warn');
      res = await fetch('data/games.json');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    gamesData = await res.json();
    log('games.json OK — ' + gamesData.length + ' juego(s)', 'ok');
  } catch (e) {
    log('games.json FAIL: ' + e.message + ' — usando fallback', 'warn');
    gamesData = GAMES_FALLBACK;
  }

  log('renderizando cards...', 'info');
  renderGameCards(gamesData);
  log('cards renderizadas', 'ok');
}

function renderGameCards(games) {
  const grid = document.getElementById('game-grid');
  if (!grid) { log('game-grid NO ENCONTRADO', 'error'); return; }
  grid.innerHTML = '';
  log('game-grid encontrado, construyendo ' + games.length + ' card(s)', 'info');

  games.forEach(g => {
    const savedCover = localStorage.getItem('cover_' + g.id);
    const coverUrl   = savedCover || g.coverUrl || null;
    const pct        = getSavedPct(g.id);

    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div class="game-card-cover" style="background:${g.coverColor||'#1a2a1a'}">
        ${coverUrl
          ? `<img src="${coverUrl}" alt="${g.title}" onerror="this.style.display='none'">`
          : `<div class="cover-placeholder">NO IMG</div>`}
        <button class="cover-edit-btn" title="Cambiar portada">🖼</button>
      </div>
      <div class="game-card-body">
        <div class="game-card-title">${g.title}</div>
        <div class="game-card-platform">${g.platform}</div>
        <div class="game-card-meta">
          ${g.type === 'propass'
            ? `<span style="color:var(--amber)">// PRO PASS TRACKER</span>`
            : `<span>~${fmtMinSelect(g.totalEstMin)}</span>${pct > 0 ? ` · <span style="color:var(--green)">${pct}% completado</span>` : ''}`
          }
        </div>
      </div>`;

    card.querySelector('.game-card-body').addEventListener('click', () => {
      log('card clickeada: ' + g.id, 'info');
      if (g.type === 'propass') { openProPass(); return; }
      loadGame(g.id, g.file);
    });
    card.querySelector('.game-card-cover').addEventListener('click', (e) => {
      if (!e.target.classList.contains('cover-edit-btn')) {
        log('cover clickeada: ' + g.id, 'info');
        if (g.type === 'propass') { openProPass(); return; }
        loadGame(g.id, g.file);
      }
    });
    card.querySelector('.cover-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openCoverModal(g.id);
    });

    grid.appendChild(card);
    log('card añadida: ' + g.title, 'ok');
  });

  const add = document.createElement('div');
  add.className = 'add-game-card';
  add.innerHTML = `<div class="add-icon">+</div><div>AGREGAR JUEGO</div>`;
  grid.appendChild(add);
}

// ─── COVER MODAL ─────────────────────────────────────────────────────────────
function openCoverModal(gameId) {
  document.getElementById('cover-modal')?.remove();
  const current = localStorage.getItem('cover_' + gameId) ||
    gamesData.find(g => g.id === gameId)?.coverUrl || '';

  const modal = document.createElement('div');
  modal.id = 'cover-modal';
  modal.innerHTML = `
    <div class="cover-modal-backdrop"></div>
    <div class="cover-modal-box">
      <div class="cover-modal-title">// PORTADA — URL DE IMAGEN</div>
      <div class="cover-modal-hint">Pega la URL de cualquier imagen (JPG, PNG, WEBP)</div>
      <div class="cover-preview-wrap" id="cover-preview-wrap">
        ${current ? `<img src="${current}" alt="preview">` : `<div class="cover-no-preview">Sin imagen</div>`}
      </div>
      <input class="cover-url-input" id="cover-url-input" type="text"
        placeholder="https://example.com/portada.jpg" value="${current}">
      <div class="cover-modal-actions">
        <button class="btn active" id="cover-save-btn">✓ GUARDAR</button>
        ${current ? `<button class="btn danger" id="cover-remove-btn">✕ QUITAR</button>` : ''}
        <button class="btn" id="cover-cancel-btn">CANCELAR</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelector('.cover-modal-backdrop').addEventListener('click', closeCoverModal);
  modal.querySelector('#cover-cancel-btn').addEventListener('click', closeCoverModal);
  modal.querySelector('#cover-save-btn').addEventListener('click', () => saveCover(gameId));
  modal.querySelector('#cover-remove-btn')?.addEventListener('click', () => removeCover(gameId));
  modal.querySelector('#cover-url-input').addEventListener('input', (e) => previewCover(e.target.value));
  setTimeout(() => document.getElementById('cover-url-input')?.focus(), 50);
}

function previewCover(url) {
  const wrap = document.getElementById('cover-preview-wrap');
  if (!wrap) return;
  wrap.innerHTML = url.trim()
    ? `<img src="${url}" alt="preview" onerror="this.style.opacity='.25'">`
    : `<div class="cover-no-preview">Sin imagen</div>`;
}

function saveCover(gameId) {
  const url = document.getElementById('cover-url-input')?.value.trim();
  if (url) localStorage.setItem('cover_' + gameId, url);
  closeCoverModal();
  renderGameCards(gamesData);
}

function removeCover(gameId) {
  localStorage.removeItem('cover_' + gameId);
  closeCoverModal();
  renderGameCards(gamesData);
}

function closeCoverModal() {
  document.getElementById('cover-modal')?.remove();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getSavedPct(gameId) {
  try {
    const s = JSON.parse(localStorage.getItem('tracker_' + gameId));
    if (!s) return 0;
    return Object.values(s.completedSegs || {}).filter(v => v.done).length > 0 ? 1 : 0;
  } catch (e) { return 0; }
}

function fmtMinSelect(m) {
  if (m >= 60) return Math.floor(m / 60) + 'h' + (m % 60 ? (m % 60) + 'm' : '');
  return m + 'min';
}

window.addEventListener('DOMContentLoaded', () => {
  log('DOMContentLoaded fired', 'ok');
  initSelectScreen();
});

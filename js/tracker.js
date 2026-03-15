// ─── STATE ───────────────────────────────────────────────────────────────────
let gameData = null;
let state = null;

let timerInterval = null;
let sessionRunning = false;
let sessionElapsed = 0;
let sessionTarget = 45;

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function loadGame(gameId, filePath) {
  log('loadGame: ' + gameId + ' from ' + filePath, 'info');
  try {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    gameData = await res.json();
    log('game JSON cargado: ' + gameData.title, 'ok');
    state = loadState(gameId);
    log('state cargado, capítulos: ' + gameData.chapters.length, 'ok');
    showScreen('tracker');
    log('screen-tracker visible', 'ok');
    updateTimerDisplay();
    renderAll();
    log('render completo', 'ok');
  } catch (e) {
    log('loadGame ERROR: ' + e.message, 'error');
    alert('Error cargando el juego: ' + e.message);
  }
}

function loadState(gameId) {
  try {
    const saved = localStorage.getItem('tracker_' + gameId);
    return saved ? JSON.parse(saved) : freshState();
  } catch (e) { return freshState(); }
}

function freshState() {
  return { completedSegs: {}, totalPlayedSec: 0, sessionLog: [], currentChapter: 0 };
}

function save() {
  if (!gameData) return;
  try { localStorage.setItem('tracker_' + gameData.id, JSON.stringify(state)); } catch(e) {}
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────
function showScreen(name) {
  log('showScreen: ' + name, 'info');
  const sel = document.getElementById('screen-select');
  const trk = document.getElementById('screen-tracker');
  if (!sel || !trk) { log('showScreen: elementos no encontrados!', 'error'); return; }
  sel.style.setProperty('display', name === 'select' ? 'block' : 'none', 'important');
  trk.style.setProperty('display', name === 'tracker' ? 'block' : 'none', 'important');
  log('screens actualizados', 'ok');
}

function goHome() {
  log('goHome()', 'info');
  stopTimer();
  gameData = null;
  state = null;
  showScreen('select');
}

// ─── TIMER ────────────────────────────────────────────────────────────────────
function toggleTimer() {
  if (sessionRunning) stopTimer();
  else startTimer();
}

function startTimer() {
  sessionRunning = true;
  timerInterval = setInterval(tick, 1000);
  document.getElementById('timer-btn').textContent = '⏸ PAUSAR';
  document.getElementById('timer-btn').classList.add('active');
}

function stopTimer() {
  sessionRunning = false;
  clearInterval(timerInterval);
  const btn = document.getElementById('timer-btn');
  if (btn) { btn.textContent = '▶ INICIAR'; btn.classList.remove('active'); }
}

function tick() {
  sessionElapsed++;
  state.totalPlayedSec++;
  updateTimerDisplay();
  updateGlobalStats();
  save();
}

function resetTimer() {
  stopTimer();
  sessionElapsed = 0;
  updateTimerDisplay();
}

function updateSessionTarget() {
  sessionTarget = parseInt(document.getElementById('session-target-select').value);
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const min = Math.floor(sessionElapsed / 60);
  const sec = sessionElapsed % 60;
  const display = document.getElementById('session-display');
  const bar     = document.getElementById('session-progress');
  if (!display || !bar) return;
  const pct = Math.min(100, (sessionElapsed / (sessionTarget * 60)) * 100);
  display.textContent = pad(min) + ':' + pad(sec);
  bar.style.width = pct + '%';
  const cls = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : '';
  display.className = 'session-timer-display ' + cls;
  bar.className     = 'session-progress-fill ' + cls;
}

// ─── GLOBAL STATS ─────────────────────────────────────────────────────────────
function updateGlobalStats() {
  if (!gameData) return;
  const allSegs   = gameData.chapters.flatMap(c => c.segments);
  const doneCount = allSegs.filter(s => state.completedSegs[s.id]?.done).length;
  const pct       = Math.round((doneCount / allSegs.length) * 100);
  const playedMin = Math.floor(state.totalPlayedSec / 60);
  const doneMins  = allSegs.filter(s => state.completedSegs[s.id]?.done)
                           .reduce((a, s) => a + (state.completedSegs[s.id]?.actual || s.est), 0);
  const grandTotal = gameData.chapters.reduce((a, c) => a + c.segments.reduce((b, s) => b + s.est, 0), 0);
  const remaining  = Math.max(0, grandTotal - doneMins);
  setText('pct-done',        pct + '%');
  setText('total-played',    fmtMin(playedMin));
  setText('total-remaining', '~' + fmtMin(remaining));
}

// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
function renderNav() {
  const nav = document.getElementById('chapter-nav');
  if (!nav) { log('chapter-nav no encontrado', 'error'); return; }
  nav.innerHTML = '';
  gameData.chapters.forEach(ch => {
    const done    = ch.segments.filter(s => state.completedSegs[s.id]?.done).length;
    const allDone = done === ch.segments.length;
    const el = document.createElement('div');
    el.className = 'chapter-nav-item'
      + (state.currentChapter === ch.id ? ' active' : '')
      + (allDone ? ' completed' : '');
    el.innerHTML = `
      <span class="chapter-check ${allDone ? 'done' : ''}">${allDone ? '✓' : ''}</span>
      <span class="chapter-nav-name">${ch.name}</span>
      <span class="chapter-nav-meta">
        <div class="chapter-nav-time">${fmtMin(chapterTotal(ch))}</div>
        <div class="chapter-nav-progress">${done}/${ch.segments.length}</div>
      </span>`;
    el.onclick = () => { state.currentChapter = ch.id; save(); renderAll(); closeSidebar(); };
    nav.appendChild(el);
  });
}

// ─── CONTENT ──────────────────────────────────────────────────────────────────
function renderContent() {
  const ch       = gameData.chapters[state.currentChapter];
  const doneSegs = ch.segments.filter(s => state.completedSegs[s.id]?.done).length;
  const totalMins = chapterTotal(ch);
  const doneMins  = ch.segments.filter(s => state.completedSegs[s.id]?.done)
                               .reduce((a, s) => a + (state.completedSegs[s.id]?.actual || s.est), 0);
  const pct        = Math.round((doneSegs / ch.segments.length) * 100);
  const sesNeeded  = Math.ceil(totalMins / sessionTarget);

  let html = `
    <div class="chapter-header">
      <div class="chapter-title">${ch.name}</div>
      <div class="chapter-subtitle">${ch.subtitle}</div>
    </div>
    <div class="chapter-meta-row">
      <div class="meta-pill">SEGS <span>${doneSegs}/${ch.segments.length}</span></div>
      <div class="meta-pill">EST. <span>${fmtMin(totalMins)}</span></div>
      <div class="meta-pill">~<span>${sesNeeded}</span> ses. de ${sessionTarget}min</div>
      ${doneMins > 0 ? `<div class="meta-pill">REAL <span>${fmtMin(doneMins)}</span></div>` : ''}
    </div>
    <div class="chapter-progress-wrap">
      <div class="chapter-progress-label"><span>PROGRESO</span><span>${pct}%</span></div>
      <div class="chapter-progress-bar"><div class="chapter-progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="segment-grid">`;

  ch.segments.forEach((seg, idx) => {
    const sd     = state.completedSegs[seg.id] || {};
    const isDone = !!sd.done;
    const actual = sd.actual;
    const hasNote = !!sd.note;
    html += `
      <div class="segment-card ${isDone ? 'completed' : ''}" id="seg-${seg.id}">
        <div class="segment-top">
          <div class="segment-left">
            <span class="seg-num">${String(idx + 1).padStart(2, '0')}</span>
            <span class="seg-name">${seg.name}</span>
          </div>
          <div class="segment-right">
            <span class="seg-time">${fmtMin(seg.est)}</span>
            ${actual ? `<span class="seg-actual">→ ${fmtMin(actual)}</span>` : ''}
            <div class="seg-actions">
              ${isDone
                ? `<button class="seg-btn undo-btn" onclick="undoSeg('${seg.id}')">↺</button>`
                : `<button class="seg-btn done-btn" onclick="openAdjust('${seg.id}',${seg.est})">✓ LISTO</button>`}
              <button class="seg-btn note-btn" onclick="toggleNote('${seg.id}')">${hasNote ? '📝*' : '📝'}</button>
            </div>
          </div>
        </div>
        <div class="adjust-row" id="adj-${seg.id}" style="display:none">
          <label>TIEMPO REAL (min)</label>
          <input type="number" id="adj-input-${seg.id}" value="${actual || seg.est}" min="1" max="240">
          <button class="seg-btn done-btn" onclick="confirmDone('${seg.id}')">CONFIRMAR</button>
          <button class="seg-btn" onclick="document.getElementById('adj-${seg.id}').style.display='none'">✕</button>
        </div>
        <div class="note-area ${hasNote ? 'open' : ''}" id="note-${seg.id}">
          <textarea class="note-input" placeholder="Notas: tips, ubicaciones, boss fights..."
            onchange="saveNote('${seg.id}', this.value)">${sd.note || ''}</textarea>
          ${hasNote ? `<div class="note-saved">// guardado</div>` : ''}
        </div>
      </div>`;
  });

  html += `</div>`;

  const chIds = new Set(ch.segments.map(s => s.id));
  const logs  = state.sessionLog.filter(l => chIds.has(l.seg)).slice().reverse().slice(0, 8);
  html += `<div class="session-log"><div class="log-title">// REGISTRO DE SESIONES</div>`;
  if (!logs.length) {
    html += `<div class="empty-log">Sin registros aún...</div>`;
  } else {
    logs.forEach(l => {
      const seg = ch.segments.find(s => s.id === l.seg);
      html += `<div class="log-entry">
        <span class="log-time">${l.ts}</span>
        <span class="log-seg">${seg?.name || l.seg}</span>
        <span class="log-duration">${fmtMin(l.dur)} reales</span>
      </div>`;
    });
  }
  html += `</div>`;
  document.getElementById('main-content').innerHTML = html;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
function openAdjust(segId, est) {
  document.querySelectorAll('[id^="adj-"]').forEach(el => el.style.display = 'none');
  const row = document.getElementById('adj-' + segId);
  if (row) row.style.display = 'flex';
}

function confirmDone(segId) {
  const input  = document.getElementById('adj-input-' + segId);
  const actual = parseInt(input?.value) || 0;
  if (!state.completedSegs[segId]) state.completedSegs[segId] = {};
  state.completedSegs[segId].done   = true;
  state.completedSegs[segId].actual = actual;
  if (!state.completedSegs[segId].note) state.completedSegs[segId].note = '';
  const now = new Date();
  state.sessionLog.push({ seg: segId, dur: actual, ts: pad(now.getHours()) + ':' + pad(now.getMinutes()) });
  save();
  notify('✓ COMPLETADO — ' + actual + 'min registrados');
  renderAll();
}

function undoSeg(segId) {
  if (state.completedSegs[segId]) state.completedSegs[segId].done = false;
  save(); notify('↺ MARCADO PENDIENTE'); renderAll();
}

function toggleNote(segId) {
  document.getElementById('note-' + segId)?.classList.toggle('open');
}

function saveNote(segId, val) {
  if (!state.completedSegs[segId]) state.completedSegs[segId] = { done: false, actual: null, note: '' };
  state.completedSegs[segId].note = val.trim();
  save(); notify('📝 NOTA GUARDADA');
}

// ─── NOTIFY ───────────────────────────────────────────────────────────────────
let nTimeout;
function notify(msg) {
  const el = document.getElementById('notify');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(nTimeout);
  nTimeout = setTimeout(() => el.classList.remove('show'), 2200);
}

// ─── RENDER ALL ───────────────────────────────────────────────────────────────
function renderAll() { renderNav(); renderContent(); updateGlobalStats(); }

// ─── SIDEBAR TOGGLE (MOBILE) ──────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen  = sidebar.classList.toggle('open');
  overlay.classList.toggle('open', isOpen);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtMin(m) {
  if (m >= 60) return Math.floor(m / 60) + 'h' + (m % 60 ? (m % 60) + 'm' : '');
  return m + 'min';
}
function pad(n) { return String(n).padStart(2, '0'); }
function chapterTotal(ch) { return ch.segments.reduce((a, s) => a + s.est, 0); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

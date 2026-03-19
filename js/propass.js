// ─── BRAWL STARS PRO PASS TRACKER ─────────────────────────────────────────────
// XP System:
//   - Sin Pro Pass: 25 XP/victoria, límite 1.000 XP/semana (= 40 victorias máx/semana)
//   - Con Pro Pass: 50 XP/victoria, límite 2.000 XP/semana (= 40 victorias máx/semana)
//   - Subir de rango: 200 XP por ascenso
//   - Total para completar: 100 niveles × 200 XP = 20.000 XP
//   - Temporada: ~17 semanas (nueva temporada arrancó hoy 19/03/2026)

const PP_KEY = 'brawl_propass';
const SEASON_START = new Date('2026-03-19');
const SEASON_WEEKS = 17;
const SEASON_END   = new Date(SEASON_START.getTime() + SEASON_WEEKS * 7 * 24 * 60 * 60 * 1000);
const TOTAL_LEVELS = 100;
const XP_PER_LEVEL = 200;
const TOTAL_XP     = TOTAL_LEVELS * XP_PER_LEVEL; // 20.000

function ppLoad() {
  try { return JSON.parse(localStorage.getItem(PP_KEY)) || ppDefault(); }
  catch(e) { return ppDefault(); }
}
function ppSave(d) { localStorage.setItem(PP_KEY, JSON.stringify(d)); }
function ppDefault() {
  return {
    currentLevel: 0,
    hasPremium: false,
    wins: [],          // array de {date: 'YYYY-MM-DD', count: N}
    ranks: [],         // array de {date: 'YYYY-MM-DD', count: N}
    weeklyXPUsed: {}   // {'YYYY-Www': xp usado ese semana por victorias}
  };
}

function ppTodayKey() {
  return new Date().toISOString().slice(0,10);
}
function ppWeekKey(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(week).padStart(2,'0');
}

function ppWinsToday(data) {
  const today = ppTodayKey();
  const entry = data.wins.find(w => w.date === today);
  return entry ? entry.count : 0;
}

function ppRanksToday(data) {
  const today = ppTodayKey();
  const entry = data.ranks.find(r => r.date === today);
  return entry ? entry.count : 0;
}

function ppTotalWins(data) {
  return data.wins.reduce((s, w) => s + w.count, 0);
}

function ppTotalRanks(data) {
  return data.ranks.reduce((s, r) => s + r.count, 0);
}

// XP ganado por victorias (respetando límite semanal)
function ppXPFromWins(data) {
  const xpPerWin = data.hasPremium ? 50 : 25;
  const weeklyLimit = data.hasPremium ? 2000 : 1000;
  let total = 0;
  const byWeek = {};
  for (const entry of data.wins) {
    const wk = ppWeekKey(entry.date);
    byWeek[wk] = (byWeek[wk] || 0) + entry.count;
  }
  for (const [wk, wins] of Object.entries(byWeek)) {
    const xp = Math.min(wins * xpPerWin, weeklyLimit);
    total += xp;
  }
  return total;
}

function ppXPFromRanks(data) {
  return ppTotalRanks(data) * 200;
}

function ppTotalXP(data) {
  return Math.min(ppXPFromWins(data) + ppXPFromRanks(data), TOTAL_XP);
}

function ppCurrentLevel(data) {
  return Math.min(Math.floor(ppTotalXP(data) / XP_PER_LEVEL), TOTAL_LEVELS);
}

function ppXPNeeded(data) {
  return Math.max(0, TOTAL_XP - ppTotalXP(data));
}

function ppDaysLeft() {
  const now = new Date();
  const ms = SEASON_END - now;
  return Math.max(0, Math.ceil(ms / (1000*60*60*24)));
}

function ppWeeksLeft() {
  return Math.max(0, Math.ceil(ppDaysLeft() / 7));
}

// ─── ADD WIN ──────────────────────────────────────────────────────────────────
function ppAddWin(count) {
  const data = ppLoad();
  const today = ppTodayKey();
  let entry = data.wins.find(w => w.date === today);
  if (!entry) { entry = { date: today, count: 0 }; data.wins.push(entry); }
  entry.count += count;
  ppSave(data);
  ppRender();
  showNotify(`+${count} victoria${count>1?'s':''} registrada${count>1?'s':''} // PRO PASS`);
}

function ppAddRank() {
  const data = ppLoad();
  const today = ppTodayKey();
  let entry = data.ranks.find(r => r.date === today);
  if (!entry) { entry = { date: today, count: 0 }; data.ranks.push(entry); }
  entry.count += 1;
  ppSave(data);
  ppRender();
  showNotify('// +200 XP — RANGO SUBIDO');
}

function ppUndo() {
  const data = ppLoad();
  const today = ppTodayKey();
  const entry = data.wins.find(w => w.date === today);
  if (entry && entry.count > 0) {
    entry.count--;
    ppSave(data);
    ppRender();
    showNotify('// VICTORIA DESHECHA');
  }
}

function ppTogglePremium() {
  const data = ppLoad();
  data.hasPremium = !data.hasPremium;
  ppSave(data);
  ppRender();
  showNotify(data.hasPremium ? '// PRO PASS ACTIVADO ✓' : '// PRO PASS DESACTIVADO');
}

// ─── PROYECCIÓN ───────────────────────────────────────────────────────────────
function ppProjection(data) {
  const xpPerWin = data.hasPremium ? 50 : 25;
  const weeklyLimit = data.hasPremium ? 2000 : 1000;
  const maxWinsPerWeek = Math.floor(weeklyLimit / xpPerWin); // siempre 40
  const daysLeft = ppDaysLeft();
  const weeksLeft = ppWeeksLeft();
  const xpLeft = ppXPNeeded(data);

  // XP esperado de rangos (estimamos ~2 rangos/semana = 400 XP/semana)
  const estimatedRankXP = Math.min(weeksLeft * 2 * 200, xpLeft);
  const xpNeededFromWins = Math.max(0, xpLeft - estimatedRankXP);
  const winsNeeded = Math.ceil(xpNeededFromWins / xpPerWin);
  const winsPerDay = daysLeft > 0 ? Math.ceil(winsNeeded / daysLeft) : 0;
  const winsPerWeek = Math.ceil(winsNeeded / Math.max(weeksLeft, 1));
  const feasible = winsPerWeek <= maxWinsPerWeek;

  return { xpLeft, winsNeeded, winsPerDay, winsPerWeek, maxWinsPerWeek, daysLeft, weeksLeft, feasible, xpPerWin };
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function ppRender() {
  const panel = document.getElementById('pp-panel');
  if (!panel) return;
  const data = ppLoad();
  const totalXP = ppTotalXP(data);
  const level = ppCurrentLevel(data);
  const pct = Math.round((totalXP / TOTAL_XP) * 100);
  const proj = ppProjection(data);
  const today = ppTodayKey();
  const winsToday = ppWinsToday(data);
  const ranksToday = ppRanksToday(data);
  const xpPerWin = data.hasPremium ? 50 : 25;
  const weeklyLimit = data.hasPremium ? 2000 : 1000;

  // XP esta semana
  const thisWeek = ppWeekKey();
  let xpThisWeek = 0;
  for (const entry of data.wins) {
    if (ppWeekKey(entry.date) === thisWeek) xpThisWeek += entry.count * xpPerWin;
  }
  xpThisWeek = Math.min(xpThisWeek, weeklyLimit);
  const weekPct = Math.round((xpThisWeek / weeklyLimit) * 100);
  const winsLeftWeek = Math.max(0, Math.floor((weeklyLimit - xpThisWeek) / xpPerWin));

  panel.innerHTML = `
    <div class="pp-header">
      <div class="pp-title">BRAWL STARS <span>// PRO PASS</span></div>
      <button class="btn ${data.hasPremium ? 'active' : ''}" onclick="ppTogglePremium()" title="Activar/desactivar Pro Pass de pago">
        ${data.hasPremium ? '★ PRO PASS' : '☆ F2P'}
      </button>
    </div>

    <div class="pp-stats-row">
      <div class="pp-stat">
        <div class="pp-stat-label">NIVEL</div>
        <div class="pp-stat-val green">${level}<span>/100</span></div>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">XP TOTAL</div>
        <div class="pp-stat-val">${totalXP.toLocaleString()}<span>/20.000</span></div>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">XP FALTA</div>
        <div class="pp-stat-val ${proj.xpLeft === 0 ? 'green' : 'red'}">${proj.xpLeft.toLocaleString()}</div>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">DÍAS REST.</div>
        <div class="pp-stat-val amber">${proj.daysLeft}</div>
      </div>
    </div>

    <div class="pp-bar-section">
      <div class="pp-bar-label">
        <span>PROGRESO TEMPORADA</span><span>${pct}%</span>
      </div>
      <div class="pp-bar-bg">
        <div class="pp-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>

    <div class="pp-bar-section">
      <div class="pp-bar-label">
        <span>XP SEMANA ACTUAL <span style="color:var(--muted)">(${xpThisWeek}/${weeklyLimit} — ${winsLeftWeek} victorias restantes)</span></span>
        <span>${weekPct}%</span>
      </div>
      <div class="pp-bar-bg">
        <div class="pp-bar-fill ${weekPct >= 100 ? 'maxed' : ''}" style="width:${Math.min(weekPct,100)}%"></div>
      </div>
    </div>

    <div class="pp-divider"></div>

    <div class="pp-today-section">
      <div class="pp-section-label">// HOY — ${today}</div>
      <div class="pp-today-row">
        <div class="pp-today-stat">
          <div class="pp-stat-label">VICTORIAS</div>
          <div class="pp-stat-val green">${winsToday}</div>
        </div>
        <div class="pp-today-stat">
          <div class="pp-stat-label">XP HOY</div>
          <div class="pp-stat-val">${Math.min(winsToday * xpPerWin, weeklyLimit).toLocaleString()}</div>
        </div>
        <div class="pp-today-stat">
          <div class="pp-stat-label">RANGOS</div>
          <div class="pp-stat-val amber">${ranksToday}</div>
        </div>
        <div class="pp-today-stat">
          <div class="pp-stat-label">META/DÍA</div>
          <div class="pp-stat-val ${proj.winsPerDay <= (data.hasPremium ? 6 : 6) ? 'green' : 'red'}">${proj.winsPerDay}v</div>
        </div>
      </div>
      <div class="pp-actions">
        <button class="btn active pp-big-btn" onclick="ppAddWin(1)">+1 VICTORIA</button>
        <button class="btn pp-big-btn" onclick="ppAddWin(3)">+3 VICTORIAS</button>
        <button class="btn amber-btn pp-big-btn" onclick="ppAddRank()">↑ SUBÍ DE RANGO (+200 XP)</button>
        <button class="btn danger pp-small-btn" onclick="ppUndo()">↺ DESHACER</button>
      </div>
    </div>

    <div class="pp-divider"></div>

    <div class="pp-proj-section">
      <div class="pp-section-label">// PROYECCIÓN PARA COMPLETAR</div>
      <div class="pp-proj-grid">
        <div class="pp-proj-item">
          <div class="pp-stat-label">VICTORIAS AÚN NECESARIAS</div>
          <div class="pp-stat-val ${proj.feasible ? '' : 'red'}">${proj.winsNeeded.toLocaleString()}</div>
        </div>
        <div class="pp-proj-item">
          <div class="pp-stat-label">VICTORIAS / DÍA</div>
          <div class="pp-stat-val ${proj.winsPerDay <= 6 ? 'green' : proj.winsPerDay <= 10 ? 'amber' : 'red'}">${proj.winsPerDay}</div>
        </div>
        <div class="pp-proj-item">
          <div class="pp-stat-label">VICTORIAS / SEMANA</div>
          <div class="pp-stat-val ${proj.feasible ? 'green' : 'red'}">${proj.winsPerWeek}<span>/ máx ${proj.maxWinsPerWeek}</span></div>
        </div>
        <div class="pp-proj-item">
          <div class="pp-stat-label">XP/VICTORIA</div>
          <div class="pp-stat-val amber">${proj.xpPerWin}</div>
        </div>
      </div>
      <div class="pp-feasibility ${proj.feasible ? 'ok' : 'warn'}">
        ${proj.xpLeft === 0
          ? '// PRO PASS COMPLETADO ✓'
          : proj.feasible
            ? `// ALCANZABLE — dentro del límite semanal de ${proj.maxWinsPerWeek} victorias`
            : `// ATENCIÓN — necesitás más de ${proj.maxWinsPerWeek} victorias/semana (límite). Considerá comprar niveles con gemas.`
        }
      </div>
    </div>

    <div class="pp-divider"></div>

    <div class="pp-history-section">
      <div class="pp-section-label">// HISTORIAL — ÚLTIMOS 7 DÍAS</div>
      <div class="pp-history-grid" id="pp-history"></div>
    </div>
  `;

  // Historial últimos 7 días
  const hist = document.getElementById('pp-history');
  if (hist) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dk = d.toISOString().slice(0,10);
      const wEntry = data.wins.find(w => w.date === dk);
      const rEntry = data.ranks.find(r => r.date === dk);
      const wins = wEntry ? wEntry.count : 0;
      const ranks = rEntry ? rEntry.count : 0;
      days.push({ dk, wins, ranks, isToday: i===0 });
    }
    hist.innerHTML = days.map(d => `
      <div class="pp-hist-day ${d.isToday ? 'today' : ''}">
        <div class="pp-hist-date">${d.dk.slice(5)}</div>
        <div class="pp-hist-wins ${d.wins > 0 ? 'has-wins' : ''}">${d.wins}v</div>
        ${d.ranks > 0 ? `<div class="pp-hist-rank">↑${d.ranks}r</div>` : '<div class="pp-hist-rank muted">—</div>'}
      </div>
    `).join('');
  }
}

function ppInit() {
  const container = document.getElementById('pp-panel');
  if (!container) return;
  ppRender();
}

// ─── VISUAL LOGGER ───────────────────────────────────────────────────────────
(function() {
  // Create log panel
  const panel = document.createElement('div');
  panel.id = 'hud-log';
  panel.innerHTML = `
    <div id="hud-log-title">// BOOT LOG</div>
    <div id="hud-log-entries"></div>
    <button id="hud-log-close" onclick="document.getElementById('hud-log').style.display='none'">✕ CERRAR</button>`;
  panel.style.cssText = `
    position:fixed;bottom:16px;left:16px;width:340px;max-height:280px;
    background:#0d120e;border:1px solid #3dff6e;z-index:99999;
    font-family:'Share Tech Mono',monospace;font-size:11px;
    overflow:hidden;display:flex;flex-direction:column;`;
  document.body.appendChild(panel);

  const title = panel.querySelector('#hud-log-title');
  title.style.cssText = 'color:#3dff6e;padding:8px 12px;border-bottom:1px solid #1e2e1f;letter-spacing:3px;font-size:10px;flex-shrink:0;';

  const entries = panel.querySelector('#hud-log-entries');
  entries.style.cssText = 'overflow-y:auto;flex:1;padding:6px 0;';

  const closeBtn = panel.querySelector('#hud-log-close');
  closeBtn.style.cssText = 'background:transparent;border:none;border-top:1px solid #1e2e1f;color:#4a6a4d;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:2px;flex-shrink:0;text-align:left;';

  window.log = function(msg, type='info') {
    const colors = { info:'#c8e8cc', ok:'#3dff6e', warn:'#ffb830', error:'#ff4444' };
    const icons  = { info:'·', ok:'✓', warn:'!', error:'✕' };
    const entry = document.createElement('div');
    entry.style.cssText = `padding:3px 12px;color:${colors[type]||colors.info};border-bottom:1px solid #1a2a1b;`;
    const now = new Date();
    const ts = String(now.getSeconds()).padStart(2,'0') + '.' + String(now.getMilliseconds()).slice(0,2);
    entry.textContent = `[${ts}] ${icons[type]||'·'} ${msg}`;
    entries.appendChild(entry);
    entries.scrollTop = entries.scrollHeight;
    console.log(`[LOG ${type}] ${msg}`);
  };

  log('logger iniciado', 'ok');
  log('screen-select display: ' + (document.getElementById('screen-select')?.style.display || 'none set'), 'info');
  log('screen-tracker display: ' + (document.getElementById('screen-tracker')?.style.display || 'none set'), 'info');
})();

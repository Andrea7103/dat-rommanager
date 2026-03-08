// ============================================================
// DAT DIFF — Module 05  |  v0.9.0-beta
// Compares DAT files by CRC32+SHA1+size fingerprint
// ============================================================

let diffMode         = 'ab';
let diffSlots        = [];
let diffResults      = null;
let diffTab          = 'onlya';
let diffSortDir      = 'az';
let diffFilter       = '';
let diffOutputFolder = '';

// ── SLOT LABELS ───────────────────────────────────────────
const SLOT_LABELS = {
  ab: [
    { label: 'DAT REFERENCE',  sublabel: 'the base you compare against', labelClass: 'a'         },
    { label: 'DAT TO COMPARE', sublabel: 'find what differs from the reference', labelClass: 'b'  },
  ],
  master: [
    { label: 'MASTER DAT',     sublabel: 'main reference — single file or folder', labelClass: 'master'    },
    { label: 'COMPARE DAT',    sublabel: 'what to check against master — file or folder', labelClass: 'secondary' },
  ],
};

// ── INIT ──────────────────────────────────────────────────

function initDiff() {
  setDiffMode('ab');
}

function setDiffMode(mode) {
  diffMode = mode;
  document.getElementById('difftab-ab').classList.toggle('active', mode === 'ab');
  document.getElementById('difftab-master').classList.toggle('active', mode === 'master');

  const labels = SLOT_LABELS[mode];
  if (mode === 'ab') {
    diffSlots = labels.map((l, i) => ({
      id: i, label: l.label, sublabel: l.sublabel, labelClass: l.labelClass,
      file: null, games: [], header: {}, isFolder: false, folderName: null,
    }));
  } else {
    diffSlots = [
      { id: 0, label: labels[0].label, sublabel: labels[0].sublabel, labelClass: labels[0].labelClass, file: null, games: [], header: {}, isFolder: false, folderName: null },
      { id: 1, label: labels[1].label, sublabel: labels[1].sublabel, labelClass: labels[1].labelClass, file: null, games: [], header: {}, isFolder: false, folderName: null },
    ];
  }
  diffResults = null;
  renderDiffSlots();
  resetDiffResults();
  updateDiffCompareBtn();
}

// ── SLOTS RENDERING ───────────────────────────────────────

function renderDiffSlots() {
  const container = document.getElementById('diff-slots');
  container.innerHTML = diffSlots.map(s => renderSlotHTML(s)).join('');

  diffSlots.forEach(s => {
    const drop = document.getElementById(`diff-drop-${s.id}`);
    if (!drop) return;

    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', async e => {
      e.preventDefault(); drop.classList.remove('dragover');

      const items = [...e.dataTransfer.items];
      const files = [...e.dataTransfer.files];

      // Detect if a folder was dropped via webkitGetAsEntry
      const entry = items[0]?.webkitGetAsEntry && items[0].webkitGetAsEntry();
      if (entry && entry.isDirectory) {
        // In Electron, File.path on a dragged folder = the folder's own path
        const folderPath = files[0]?.path;
        if (folderPath) {
          await loadDiffFolder(s.id, folderPath);
          return;
        }
      }

      // Single DAT file
      const datFile = files.find(f => /\.(dat|xml)$/i.test(f.name));
      if (datFile) await loadDiffSlot(s.id, datFile.path);
    });

    if (!s.file && !s.isFolder) {
      drop.addEventListener('click', () => {
        // All slots: ask file or folder
        showDiffDropChoice().then(choice => {
          if (choice === 'folder') selectDiffFolder(s.id);
          else if (choice === 'file') selectDiffSlotFile(s.id);
        });
      });
    }
  });

  // Add secondary slot button (master+N only, if last slot is filled)
  const addBtn = document.getElementById('diff-add-secondary');
  if (addBtn) {
    const lastSlot = diffSlots[diffSlots.length - 1];
    addBtn.style.display = (diffMode === 'master' && lastSlot.file) ? '' : 'none';
  }
}

function renderSlotHTML(s) {
  const hasData    = s.isFolder ? true : !!s.file;
  const isSecondary = diffMode === 'master' && s.id > 0;

  let content = '';
  if (s.isFolder) {
    content = `
      <span class="diff-slot-name">📁 ${s.folderName}</span>
      <span class="diff-slot-meta green">${s.games.length.toLocaleString()} entries total</span>
      <span class="diff-slot-meta">${s.fileCount || 0} DAT file${s.fileCount!==1?'s':''} scanned</span>`;
  } else if (s.file) {
    content = `
      <span class="diff-slot-name">${s.file.split(/[\\/]/).pop()}</span>
      <span class="diff-slot-meta green">${s.games.length.toLocaleString()} entries</span>
      <span class="diff-slot-meta">${s.header.name || ''}</span>`;
  } else {
    content = `
      <span class="diff-slot-icon">◫</span>
      <span class="diff-slot-hint">DROP FILE OR FOLDER</span>
      <span class="diff-slot-hint" style="font-size:9px">click to browse</span>`;
  }

  return `
    <div class="diff-slot" id="diff-slot-${s.id}">
      <div class="diff-slot-header">
        <div>
          <span class="diff-slot-label ${s.labelClass}">${s.label}</span>
          <span class="diff-slot-sublabel">${s.sublabel}</span>
        </div>
        ${hasData ? `<button class="diff-slot-clear" onclick="clearDiffSlot(${s.id})" title="Clear">✕</button>` : ''}
      </div>
      <div class="diff-slot-drop ${hasData ? 'has-file' : ''}" id="diff-drop-${s.id}">
        ${content}
      </div>
    </div>`;
}

// ── FILE/FOLDER CHOOSER MODAL ─────────────────────────────

function showDiffDropChoice() {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#0e0e0e;border:1px solid #2e2e2e;padding:24px 28px;min-width:290px;font-family:'Share Tech Mono',monospace;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:3px;color:#00ff41;margin-bottom:16px;">LOAD DAT SOURCE</div>
        <button id="dc-folder" style="display:block;width:100%;padding:11px 14px;margin-bottom:8px;background:transparent;border:1px solid #2e2e2e;color:#bbb;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;text-align:left;transition:border-color 0.15s;">
          📁 &nbsp;Folder — scan all DATs inside (recursive)
        </button>
        <button id="dc-file" style="display:block;width:100%;padding:11px 14px;background:transparent;border:1px solid #2e2e2e;color:#bbb;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;text-align:left;transition:border-color 0.15s;">
          ◫ &nbsp;Single DAT file
        </button>
        <div style="margin-top:12px;font-size:10px;color:#555;letter-spacing:1px;">press ESC or click outside to cancel</div>
      </div>`;
    document.body.appendChild(modal);
    const folder = modal.querySelector('#dc-folder');
    const file   = modal.querySelector('#dc-file');
    folder.onmouseenter = () => folder.style.borderColor = '#00ff41';
    folder.onmouseleave = () => folder.style.borderColor = '#2e2e2e';
    file.onmouseenter   = () => file.style.borderColor   = '#00ff41';
    file.onmouseleave   = () => file.style.borderColor   = '#2e2e2e';
    folder.onclick = () => { document.body.removeChild(modal); resolve('folder'); };
    file.onclick   = () => { document.body.removeChild(modal); resolve('file'); };
    modal.addEventListener('click', e => { if (e.target === modal) { document.body.removeChild(modal); resolve(null); } });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { document.body.removeChild(modal); document.removeEventListener('keydown', esc); resolve(null); }
    });
  });
}

// ── ADD / REMOVE SLOTS ────────────────────────────────────

function clearDiffSlot(id) {
  const s = diffSlots.find(s => s.id === id);
  if (!s) return;
  s.file = null; s.games = []; s.header = {}; s.isFolder = false; s.folderName = null; s.fileCount = 0;
  // Remove extra secondary slots beyond id=1 if empty
  if (diffMode === 'master' && id > 1) {
    diffSlots = diffSlots.filter(s => s.id !== id);
    diffSlots.forEach((s, i) => {
      s.id = i;
      if (i > 0) { s.label = SLOT_LABELS.master[1].label; s.sublabel = SLOT_LABELS.master[1].sublabel; }
    });
  }
  renderDiffSlots();
  diffResults = null;
  resetDiffResults();
  updateDiffCompareBtn();
}

// ── LOAD FILE ─────────────────────────────────────────────

async function selectDiffSlotFile(id) {
  const fp = await window.electronAPI.selectDatFile();
  if (fp) await loadDiffSlot(id, fp);
}

async function selectDiffFolder(id) {
  const fp = await window.electronAPI.selectFolder();
  if (fp) await loadDiffFolder(id, fp);
}

async function loadDiffSlot(id, filePath) {
  const s = diffSlots.find(s => s.id === id);
  if (!s) return;

  const drop = document.getElementById(`diff-drop-${id}`);
  if (drop) drop.innerHTML = `<span class="diff-slot-icon" style="font-size:22px">⟳</span><span class="diff-slot-hint">LOADING…</span>`;

  const result = await window.electronAPI.parseDatFile?.(filePath);
  if (!result || result.error) {
    if (drop) drop.innerHTML = `<span style="color:var(--red);font-size:11px">${result?.error || 'Parse error'}</span>`;
    return;
  }

  s.file = filePath; s.games = result.games || []; s.header = result.header || {};
  s.isFolder = false; s.folderName = null;

  renderDiffSlots();
  diffResults = null; resetDiffResults(); updateDiffCompareBtn();
}

async function loadDiffFolder(id, folderPath) {
  const s = diffSlots.find(s => s.id === id);
  if (!s) return;

  const drop = document.getElementById(`diff-drop-${id}`);
  const folderName = folderPath.split(/[\\/]/).pop();
  if (drop) drop.innerHTML = `<span class="diff-slot-icon" style="font-size:22px">⟳</span><span class="diff-slot-hint">SCANNING ${folderName}…</span>`;

  // Scan folder for DAT files recursively
  const filePaths = await window.electronAPI.scanFolder?.(folderPath) || [];
  if (!filePaths.length) {
    if (drop) drop.innerHTML = `<span style="color:var(--red);font-size:11px">No DAT files found in folder</span>`;
    return;
  }

  if (drop) drop.innerHTML = `<span class="diff-slot-icon" style="font-size:22px">⟳</span><span class="diff-slot-hint">PARSING ${filePaths.length} FILES…</span>`;

  // Parse all files and merge games into one pool
  let allGames = [];
  let firstHeader = {};
  for (let i = 0; i < filePaths.length; i++) {
    if (drop) drop.innerHTML = `<span class="diff-slot-icon" style="font-size:18px">⟳</span><span class="diff-slot-hint">PARSING ${i+1} / ${filePaths.length}</span>`;
    const result = await window.electronAPI.parseDatFile?.(filePaths[i]);
    if (result && !result.error) {
      allGames = allGames.concat(result.games || []);
      if (i === 0) firstHeader = result.header || {};
    }
  }

  s.file = null; s.isFolder = true; s.folderName = folderName;
  s.games = allGames; s.header = firstHeader; s.fileCount = filePaths.length;

  renderDiffSlots();
  diffResults = null; resetDiffResults(); updateDiffCompareBtn();
}

function updateDiffCompareBtn() {
  const filled = diffSlots.filter(s => s.file || s.isFolder).length;
  const ok = diffMode === 'ab' ? filled === 2 : filled >= 2;
  document.getElementById('diff-compare-btn').disabled = !ok;
}

// ── FINGERPRINT (CRC32 + SHA1 + SIZE) ────────────────────

function gameFingerprint(g) {
  return (g.rom || [])
    .map(r => `${(r.crc||'').toLowerCase()}|${(r.sha1||'').toLowerCase()}|${r.size||0}`)
    .sort()
    .join('::');
}

// ── COMPARE ───────────────────────────────────────────────

function runDiff() {
  showDiffProgress(5, 'Building fingerprints…');
  setTimeout(() => {
    if (diffMode === 'ab') {
      runDiffAB(diffSlots[0].games, diffSlots[1].games);
    } else {
      const master      = diffSlots[0].games;
      const secondaries = diffSlots.slice(1).filter(s => s.file || s.isFolder).map(s => s.games);
      runDiffMaster(master, secondaries);
    }
  }, 30);
}

function runDiffAB(gamesA, gamesB) {
  showDiffProgress(20, 'Indexing Reference DAT…');
  const fpA = new Map(); const fpB = new Map();
  for (const g of gamesA) fpA.set(gameFingerprint(g), g);
  showDiffProgress(45, 'Indexing Compare DAT…');
  for (const g of gamesB) fpB.set(gameFingerprint(g), g);
  showDiffProgress(70, 'Computing diff…');
  const onlyA = [], onlyB = [], common = [];
  for (const [fp, g] of fpA) (fpB.has(fp) ? common : onlyA).push(g);
  for (const [fp, g] of fpB) if (!fpA.has(fp)) onlyB.push(g);
  showDiffProgress(100, 'Done');
  diffResults = { onlyA, onlyB, common };
  applyDiffResults();
}

function runDiffMaster(master, secondaries) {
  showDiffProgress(20, 'Indexing master…');
  const fpSecondary = new Set();
  const step = 60 / (secondaries.length || 1);
  let pct = 20;
  for (const games of secondaries) {
    for (const g of games) fpSecondary.add(gameFingerprint(g));
    pct += step;
    showDiffProgress(Math.round(pct), 'Indexing secondaries…');
  }
  showDiffProgress(85, 'Computing diff…');
  const fpMaster = new Set();
  const onlyA = [], common = [], onlyB = [];
  for (const g of master) {
    const fp = gameFingerprint(g);
    fpMaster.add(fp);
    (fpSecondary.has(fp) ? common : onlyA).push(g);
  }
  const seen = new Set();
  for (const games of secondaries) {
    for (const g of games) {
      const fp = gameFingerprint(g);
      if (!fpMaster.has(fp) && !seen.has(fp)) { seen.add(fp); onlyB.push(g); }
    }
  }
  showDiffProgress(100, 'Done');
  diffResults = { onlyA, onlyB, common };
  applyDiffResults();
}

function applyDiffResults() {
  const { onlyA, onlyB, common } = diffResults;
  const isMaster = diffMode === 'master';

  // Badges
  document.getElementById('diff-badge-a').textContent      = onlyA.length.toLocaleString();
  document.getElementById('diff-badge-b').textContent      = onlyB.length.toLocaleString();
  document.getElementById('diff-badge-common').textContent = common.length.toLocaleString();

  // Stats
  document.getElementById('diff-stat-a').textContent      = onlyA.length.toLocaleString();
  document.getElementById('diff-stat-b').textContent      = onlyB.length.toLocaleString();
  document.getElementById('diff-stat-common').textContent = common.length.toLocaleString();
  document.getElementById('exp-count-a').textContent      = onlyA.length.toLocaleString();
  document.getElementById('exp-count-b').textContent      = onlyB.length.toLocaleString();
  document.getElementById('exp-count-common').textContent = common.length.toLocaleString();

  // Tab labels — human readable
  const lblA      = isMaster ? 'MASTER ONLY'      : 'REFERENCE ONLY';
  const lblB      = isMaster ? 'COMPARE ONLY'     : 'COMPARE ONLY';
  const lblCommon = 'IN BOTH';
  document.getElementById('difftab-onlya').innerHTML  = `${lblA} <span class="diff-tab-badge" id="diff-badge-a">${onlyA.length.toLocaleString()}</span>`;
  document.getElementById('difftab-onlyb').innerHTML  = `${lblB} <span class="diff-tab-badge" id="diff-badge-b">${onlyB.length.toLocaleString()}</span>`;
  document.getElementById('difftab-common').innerHTML = `${lblCommon} <span class="diff-tab-badge" id="diff-badge-common">${common.length.toLocaleString()}</span>`;

  // Export labels
  document.getElementById('exp-label-a').textContent = isMaster ? 'Entries only in Master'  : 'Entries only in Reference';
  document.getElementById('exp-label-b').textContent = isMaster ? 'Entries only in Compare' : 'Entries only in Compare';
  document.getElementById('exp-desc-a').textContent  = isMaster ? 'In master, missing from compare DAT'  : 'In reference, missing from compare DAT';
  document.getElementById('exp-desc-b').textContent  = isMaster ? 'In compare DAT, missing from master'  : 'In compare DAT, missing from reference';

  hideDiffProgress();
  showDiffTab(diffTab);
  document.getElementById('diff-save-btn').disabled = false;
  updateDiffSelectedCount();
}

// ── DIFF VIEWER ───────────────────────────────────────────

function showDiffTab(tab) {
  diffTab = tab;
  ['onlya','onlyb','common'].forEach(t =>
    document.getElementById(`difftab-${t}`).classList.toggle('active', t === tab)
  );
  renderDiffList();
}

function getTabGames() {
  if (!diffResults) return [];
  if (diffTab === 'onlya')  return diffResults.onlyA;
  if (diffTab === 'onlyb')  return diffResults.onlyB;
  return diffResults.common;
}

function renderDiffList() {
  const container = document.getElementById('diff-list');
  if (!diffResults) {
    container.innerHTML = `<div class="diff-empty"><span class="big">⊜</span><span>Load DAT files and click COMPARE</span></div>`;
    return;
  }
  let games = getTabGames();
  if (!games.length) {
    container.innerHTML = `<div class="diff-empty"><span class="big">⊜</span><span>No entries in this category</span></div>`;
    return;
  }
  const q = diffFilter.toLowerCase();
  if (q) games = games.filter(g => (g.name||'').toLowerCase().includes(q));
  games = [...games].sort((a,b) =>
    diffSortDir === 'az' ? (a.name||'').localeCompare(b.name||'') : (b.name||'').localeCompare(a.name||'')
  );
  const tagClass = diffTab === 'onlya' ? 'only-a' : diffTab === 'onlyb' ? 'only-b' : 'common';
  container.innerHTML = games.map((g,i) => `
    <div class="diff-entry-row" id="diffrow-${i}">
      <input type="checkbox" class="diff-entry-cb" checked onchange="updateDiffSelectedCount()">
      <span class="diff-entry-name" title="${g.name||''}">${g.name||'(no name)'}</span>
      <span class="diff-entry-roms">${(g.rom||[]).length}</span>
      <span class="diff-entry-tag ${tagClass}">${tagClass==='only-a'?'REF':'tagClass'==='only-b'?'CMP':'BOTH'}</span>
    </div>`).join('');
  updateDiffSelectedCount();
}

function filterDiffList() {
  diffFilter = document.getElementById('diff-search').value;
  renderDiffList();
}

function cycleDiffSort() {
  diffSortDir = diffSortDir === 'az' ? 'za' : 'az';
  document.getElementById('diff-sort-label').textContent = diffSortDir === 'az' ? 'A→Z' : 'Z→A';
  renderDiffList();
}

function toggleDiffSelectAll() {
  const cbs = document.querySelectorAll('#diff-list .diff-entry-cb');
  const allChecked = [...cbs].every(cb => cb.checked);
  cbs.forEach(cb => cb.checked = !allChecked);
  document.getElementById('diff-selall-btn').textContent = allChecked ? 'SELECT ALL' : 'DESELECT';
  updateDiffSelectedCount();
}

function updateDiffSelectedCount() {
  const sel = document.querySelectorAll('#diff-list .diff-entry-cb:checked').length;
  document.getElementById('diff-stat-sel').textContent = sel.toLocaleString();
}

// ── SAVE OUTPUT ───────────────────────────────────────────

async function selectDiffOutputFolder() {
  const fp = await window.electronAPI.selectOutputFolder();
  if (fp) {
    diffOutputFolder = fp;
    document.getElementById('diff-output-path').textContent = fp;
  }
}

async function saveDiffOutput() {
  if (!diffResults) return;
  if (!diffOutputFolder) { alert('Please choose an output folder first.'); return; }

  const exportOnlyA  = document.getElementById('exp-onlya').checked;
  const exportOnlyB  = document.getElementById('exp-onlyb').checked;
  const exportCommon = document.getElementById('exp-common').checked;
  const outMode      = document.querySelector('input[name="diff-out-mode"]:checked').value;
  const scope        = document.querySelector('input[name="diff-scope"]:checked').value;

  if (!exportOnlyA && !exportOnlyB && !exportCommon) {
    alert('Select at least one category to export.'); return;
  }

  showDiffProgress(10, 'Preparing…');
  document.getElementById('diff-save-btn').disabled = true;

  const getGames = (games) => {
    if (scope !== 'checked') return games;
    const rows = document.querySelectorAll('#diff-list .diff-entry-row');
    const names = new Set();
    rows.forEach(row => {
      if (row.querySelector('.diff-entry-cb')?.checked)
        names.add(row.querySelector('.diff-entry-name')?.title || '');
    });
    return games.filter(g => names.has(g.name||''));
  };

  const isMaster  = diffMode === 'master';
  const nameA     = diffSlots[0]?.header?.name || (diffSlots[0]?.folderName) || 'Reference';
  const nameB     = diffSlots[1]?.header?.name || (diffSlots[1]?.folderName) || 'Compare';

  let groups = [];
  if (exportOnlyA)  groups.push({ label: isMaster ? 'Master Only'  : 'Reference Only',  games: getGames(diffResults.onlyA),  base: nameA });
  if (exportOnlyB)  groups.push({ label: isMaster ? 'Compare Only' : 'Compare Only',     games: getGames(diffResults.onlyB),  base: nameB });
  if (exportCommon) groups.push({ label: 'In Both',                                       games: getGames(diffResults.common), base: nameA });

  if (outMode === 'merged') {
    groups = [{ label: 'Diff Result', games: groups.flatMap(g => g.games), base: nameA }];
  }

  groups = groups.filter(g => g.games.length);
  if (!groups.length) {
    hideDiffProgress(); document.getElementById('diff-save-btn').disabled = false;
    alert('No entries to export.'); return;
  }

  const saved = [];
  const step  = 80 / groups.length;
  let pct     = 10;

  for (const grp of groups) {
    const safeName = grp.label.replace(/[<>:"/\\|?*]/g, '_');
    const outPath  = `${diffOutputFolder}\\${safeName}.dat`;
    showDiffProgress(Math.round(pct), `Writing ${safeName}.dat…`);

    const lines = [
      '<?xml version="1.0"?>','<datafile>','  <header>',
      `    <n>${esc(grp.base + ' - ' + grp.label)}</n>`,
      `    <description>${esc(grp.base + ' - ' + grp.label)}</description>`,
      `    <date>${new Date().toISOString().slice(0,10)}</date>`,
      '    <author>DAT//ROMMANAGER DAT DIFF</author>',
      '  </header>',
    ];
    for (const g of grp.games) {
      lines.push(`  <game name="${esc(g.name||'')}">`,`    <description>${esc(g.description||g.name||'')}</description>`);
      for (const r of (g.rom||[])) {
        const attrs = ['name','size','crc','md5','sha1','sha256'].filter(k=>r[k]).map(k=>`${k}="${esc(String(r[k]))}"`).join(' ');
        lines.push(`    <rom ${attrs}/>`);
      }
      lines.push('  </game>');
    }
    lines.push('</datafile>');
    await window.electronAPI.saveSplit?.(outPath, lines.join('\n'));
    saved.push({ label: grp.label, count: grp.games.length });
    pct += step;
  }

  showDiffProgress(100, 'Done!');
  setTimeout(() => {
    hideDiffProgress();
    renderDiffSummary(saved);
    document.getElementById('diff-save-btn').disabled = false;
  }, 400);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderDiffSummary(saved) {
  const total = saved.reduce((s,g)=>s+g.count,0);
  document.getElementById('diff-summary').innerHTML = `
    <div class="spl-summary-box" style="margin-top:8px">
      <div class="spl-summary-title">✓ EXPORT COMPLETE</div>
      <div class="spl-summary-stats">
        <span class="green">${saved.length} file${saved.length!==1?'s':''}</span>
        <span class="sep">·</span>
        <span class="green">${total.toLocaleString()} entries</span>
      </div>
      <div class="spl-summary-folder" onclick="window.electronAPI.openExternal('file:///${diffOutputFolder.replace(/\\/g,'/')}')">
        📁 ${diffOutputFolder}
      </div>
      <div class="spl-summary-rows">
        ${saved.map(g=>`<div class="spl-sum-row"><span class="spl-sum-label">${g.label}</span><span class="spl-sum-count">${g.count}</span></div>`).join('')}
      </div>
    </div>`;
}

// ── PROGRESS ──────────────────────────────────────────────

function showDiffProgress(pct, msg) {
  const bar = document.getElementById('diff-progress');
  bar.classList.add('visible');
  document.getElementById('diff-prog-msg').textContent  = msg||'';
  document.getElementById('diff-prog-pct').textContent  = `${pct}%`;
  document.getElementById('diff-prog-fill').style.width = `${pct}%`;
}
function hideDiffProgress() { document.getElementById('diff-progress').classList.remove('visible'); }

function resetDiffResults() {
  diffResults = null;
  document.getElementById('diff-list').innerHTML = `<div class="diff-empty"><span class="big">⊜</span><span>Load DAT files and click COMPARE</span></div>`;
  document.getElementById('diff-save-btn').disabled = true;
  document.getElementById('diff-summary').innerHTML = '';
  document.getElementById('diff-stat-a').textContent = document.getElementById('diff-stat-b').textContent =
  document.getElementById('diff-stat-common').textContent = document.getElementById('diff-stat-sel').textContent = '—';
  ['a','b','common'].forEach(k => {
    const b = document.getElementById(`diff-badge-${k}`); if(b) b.textContent='0';
    const c = document.getElementById(`exp-count-${k}`);  if(c) c.textContent='0';
  });
}

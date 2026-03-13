// ============================================================
// DAT DIFF — Module 05  |  v0.9.0-beta
// Compares DAT files by CRC32+SHA1, shows diff viewer
// ============================================================

let diffMode     = 'ab';       // 'ab' | 'master'
let diffSlots    = [];         // [{ id, file, games, header, status }]
let diffResults  = null;       // { onlyA:[], onlyB:[], common:[] }
let diffTab      = 'onlya';   // current center tab
let diffSortDir  = 'az';      // 'az' | 'za'
let diffFilter   = '';
let diffOutputFolder = '';

// ── INIT ──────────────────────────────────────────────────

function initDiff() {
  setDiffMode('ab');
}

function setDiffMode(mode) {
  diffMode = mode;
  document.getElementById('difftab-ab').classList.toggle('active', mode === 'ab');
  document.getElementById('difftab-master').classList.toggle('active', mode === 'master');

  if (mode === 'ab') {
    diffSlots = [
      { id: 0, label: 'A', labelClass: 'a', file: null, games: [], header: {} },
      { id: 1, label: 'B', labelClass: 'b', file: null, games: [], header: {} },
    ];
  } else {
    diffSlots = [
      { id: 0, label: 'MASTER', labelClass: 'master', file: null, games: [], header: {} },
      { id: 1, label: 'SECONDARY 1', labelClass: 'secondary', file: null, games: [], header: {} },
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

  // Wire up drag/drop and click for each slot
  diffSlots.forEach(s => {
    const drop = document.getElementById(`diff-drop-${s.id}`);
    if (!drop) return;
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', async e => {
      e.preventDefault(); drop.classList.remove('dragover');
      const allItems = e.dataTransfer.items ? [...e.dataTransfer.items] : [];
      const isSecondary = diffMode === 'master' && s.id > 0;

      // Check if a folder was dropped
      const hasFolder = allItems.some(item => item.webkitGetAsEntry && item.webkitGetAsEntry()?.isDirectory);
      if (hasFolder && isSecondary) {
        // Get folder path via Electron path on the first file inside
        const allFiles = [...e.dataTransfer.files];
        const folderPath = require_folder_path(null, allFiles);
        if (folderPath) { await loadDiffFolder(s.id, folderPath); return; }
      }

      // Otherwise handle .dat/.xml files
      const files = [...e.dataTransfer.files].filter(f => /\.(dat|xml)$/i.test(f.name));
      if (files.length) await loadDiffSlot(s.id, files[0].path);
    });
    if (!s.file) {
      const isSecondary = diffMode === 'master' && s.id > 0;
      drop.addEventListener('click', () => isSecondary ? selectDiffSlotOrFolder(s.id) : selectDiffSlotFile(s.id));
    }
  });
}

function renderSlotHTML(s) {
  const hasFile = !!s.file;
  const isSecondary = diffMode === 'master' && s.id > 0;
  return `
    <div class="diff-slot" id="diff-slot-${s.id}">
      <div class="diff-slot-header">
        <span class="diff-slot-label ${s.labelClass}">${s.label}</span>
        ${hasFile ? `<button class="diff-slot-clear" onclick="clearDiffSlot(${s.id})" title="Clear">✕</button>` : ''}
      </div>
      <div class="diff-slot-drop ${hasFile ? 'has-file' : ''}" id="diff-drop-${s.id}">
        ${hasFile ? `
          <span class="diff-slot-name">${s.file.split(/[\\\/]/).pop()}</span>
          <span class="diff-slot-meta green">${s.games.length.toLocaleString()} entries</span>
          <span class="diff-slot-meta">${s.header.name || ''}</span>
        ` : `
          <span class="diff-slot-icon">◫</span>
          <span class="diff-slot-hint">DROP DAT FILE${isSecondary ? ' OR FOLDER' : ''}</span>
          <span class="diff-slot-hint" style="font-size:9px">${isSecondary ? 'folder = scan all DATs inside' : 'or click to browse'}</span>
        `}
      </div>
    </div>`;
}

// Helper: Electron exposes .path on File objects dragged in
function require_folder_path(folderFile, allFiles) {
  // Electron sets .path on every File — for a folder the first file inside has the folder as parent
  if (allFiles && allFiles.length) {
    const anyFile = allFiles.find(f => f.path);
    if (anyFile) {
      const parts = anyFile.path.replace(/\\/g, '/').split('/');
      parts.pop(); // remove filename
      return parts.join('/').replace(/\//g, '\\');
    }
  }
  return folderFile?.path || null;
}

async function selectDiffSlotOrFolder(id) {
  // Show a quick choice: single file or folder
  const choice = await showDiffDropChoice();
  if (choice === 'folder') await selectDiffFolder(id);
  else await selectDiffSlotFile(id);
}

function showDiffDropChoice() {
  return new Promise(resolve => {
    // Simple inline modal in the slot area
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#111;border:1px solid #2e2e2e;padding:24px 28px;min-width:280px;font-family:'Share Tech Mono',monospace;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:3px;color:#00ff41;margin-bottom:16px;">LOAD SECONDARY</div>
        <button id="dc-folder" style="display:block;width:100%;padding:10px;margin-bottom:8px;background:transparent;border:1px solid #2e2e2e;color:#aaa;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;text-align:left;">
          📁 &nbsp;Scan a folder (recursive)
        </button>
        <button id="dc-file" style="display:block;width:100%;padding:10px;background:transparent;border:1px solid #2e2e2e;color:#aaa;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;text-align:left;">
          ◫ &nbsp;Single DAT file
        </button>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#dc-folder').onclick = () => { document.body.removeChild(modal); resolve('folder'); };
    modal.querySelector('#dc-file').onclick   = () => { document.body.removeChild(modal); resolve('file'); };
    modal.addEventListener('click', e => { if (e.target === modal) { document.body.removeChild(modal); resolve(null); } });
  });
}

async function selectDiffFolder(id) {
  const folderPath = await window.electronAPI.selectFolder();
  if (!folderPath) return;
  await loadDiffFolder(id, folderPath);
}

async function loadDiffFolder(startId, folderPath) {
  // Scan recursively via main process
  const slot = diffSlots.find(s => s.id === startId);
  if (slot) {
    const drop = document.getElementById(`diff-drop-${startId}`);
    if (drop) drop.innerHTML = `<span class="diff-slot-icon">⟳</span><span class="diff-slot-hint">SCANNING…</span>`;
  }

  let filePaths = [];
  if (window.electronAPI.scanFolder) {
    filePaths = await window.electronAPI.scanFolder(folderPath);
  }

  if (!filePaths.length) {
    const drop = document.getElementById(`diff-drop-${startId}`);
    if (drop) drop.innerHTML = `<span style="color:var(--red);font-size:11px">No DAT files found in folder</span>`;
    return;
  }

  await loadDiffMultipleFiles(startId, filePaths);
}

async function loadDiffMultipleFiles(startId, filePaths) {
  // Fill startId slot and auto-create new slots for the rest
  for (let i = 0; i < filePaths.length; i++) {
    const targetId = startId + i;

    // Auto-add slot if needed
    if (!diffSlots.find(s => s.id === targetId)) {
      const n = diffSlots.length;
      diffSlots.push({ id: n, label: `SECONDARY ${n}`, labelClass: 'secondary', file: null, games: [], header: {} });
      renderDiffSlots();
    }

    // Show loading state
    const drop = document.getElementById(`diff-drop-${targetId}`);
    if (drop) drop.innerHTML = `<span class="diff-slot-icon" style="font-size:18px">⟳</span><span class="diff-slot-hint" style="font-size:10px">${filePaths[i].split(/[\\/]/).pop()}</span>`;

    // Parse file
    let result = null;
    if (window.electronAPI.parseDatFile) result = await window.electronAPI.parseDatFile(filePaths[i]);

    const s = diffSlots.find(s => s.id === targetId);
    if (s && result && !result.error) {
      s.file   = filePaths[i];
      s.games  = result.games || [];
      s.header = result.header || {};
    }

    renderDiffSlots();
  }

  // Add one empty slot at the end for further additions
  const lastId = startId + filePaths.length;
  if (!diffSlots.find(s => s.id === lastId)) {
    diffSlots.push({ id: lastId, label: `SECONDARY ${lastId}`, labelClass: 'secondary', file: null, games: [], header: {} });
    renderDiffSlots();
  }

  diffResults = null;
  resetDiffResults();
  updateDiffCompareBtn();
}

// ── ADD / REMOVE SLOTS (Master+N mode) ────────────────────

function addDiffSecondary() {
  const n = diffSlots.length; // 0=master, 1,2,3...=secondary
  diffSlots.push({
    id: n, label: `SECONDARY ${n}`, labelClass: 'secondary',
    file: null, games: [], header: {}
  });
  renderDiffSlots();
  updateDiffCompareBtn();
}

function clearDiffSlot(id) {
  const s = diffSlots.find(s => s.id === id);
  if (!s) return;
  s.file = null; s.games = []; s.header = {};
  // In master mode, remove secondary slots beyond slot 1 if empty
  if (diffMode === 'master' && id > 1) {
    diffSlots = diffSlots.filter(s => !(s.id === id));
    // re-index
    diffSlots.forEach((s, i) => {
      s.id = i;
      if (i > 0) s.label = `SECONDARY ${i}`;
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

async function loadDiffSlot(id, filePath) {
  const s = diffSlots.find(s => s.id === id);
  if (!s) return;

  // Show loading state
  const drop = document.getElementById(`diff-drop-${id}`);
  if (drop) { drop.innerHTML = `<span class="diff-slot-icon">⟳</span><span class="diff-slot-hint">LOADING…</span>`; }

  let result = null;
  if (window.electronAPI.parseDatFile) {
    result = await window.electronAPI.parseDatFile(filePath);
  }
  if (!result || result.error) {
    if (drop) drop.innerHTML = `<span style="color:var(--red);font-size:11px">${result?.error || 'Parse error'}</span>`;
    return;
  }

  s.file   = filePath;
  s.games  = result.games || [];
  s.header = result.header || {};

  renderDiffSlots();
  diffResults = null;
  resetDiffResults();
  updateDiffCompareBtn();

  // In master+N: auto-add a new empty secondary slot if last filled
  if (diffMode === 'master' && id === diffSlots.length - 1 && id > 0) {
    addDiffSecondary();
  }
}

function updateDiffCompareBtn() {
  const filled = diffSlots.filter(s => s.file).length;
  const ok = diffMode === 'ab' ? filled === 2 : filled >= 2;
  document.getElementById('diff-compare-btn').disabled = !ok;
}

// ── COMPARE LOGIC ─────────────────────────────────────────

// Build a fingerprint set for a game: use CRC32+SHA1 of its ROMs
function gameFingerprint(g) {
  const roms = g.rom || [];
  // Sort ROMs for determinism, then combine crc+sha1
  return roms
    .map(r => `${(r.crc||'').toLowerCase()}|${(r.sha1||'').toLowerCase()}`)
    .sort()
    .join('::');
}

function runDiff() {
  if (!diffResults) diffResults = {};

  showDiffProgress(5, 'Building fingerprints…');

  setTimeout(() => {
    if (diffMode === 'ab') {
      const [slotA, slotB] = diffSlots;
      runDiffAB(slotA.games, slotB.games);
    } else {
      const master     = diffSlots[0].games;
      const secondaries = diffSlots.slice(1).filter(s => s.file).map(s => s.games);
      runDiffMaster(master, secondaries);
    }
  }, 30);
}

function runDiffAB(gamesA, gamesB) {
  showDiffProgress(20, 'Indexing A…');

  const fpA = new Map(); // fingerprint → game
  const fpB = new Map();

  for (const g of gamesA) fpA.set(gameFingerprint(g), g);
  showDiffProgress(40, 'Indexing B…');
  for (const g of gamesB) fpB.set(gameFingerprint(g), g);

  showDiffProgress(65, 'Computing diff…');

  const onlyA  = [];
  const onlyB  = [];
  const common = [];

  for (const [fp, g] of fpA) {
    if (fpB.has(fp)) common.push(g);
    else onlyA.push(g);
  }
  for (const [fp, g] of fpB) {
    if (!fpA.has(fp)) onlyB.push(g);
  }

  showDiffProgress(100, 'Done');

  diffResults = { onlyA, onlyB, common };
  applyDiffResults();
}

function runDiffMaster(master, secondaries) {
  showDiffProgress(20, 'Indexing master…');

  // Build union fingerprint set of all secondaries
  const fpSecondary = new Set();
  let step = 20;
  const stepSize = 60 / (secondaries.length || 1);
  for (const games of secondaries) {
    for (const g of games) fpSecondary.add(gameFingerprint(g));
    step += stepSize;
    showDiffProgress(Math.round(step), 'Indexing secondaries…');
  }

  showDiffProgress(85, 'Computing diff…');

  const onlyA  = []; // in master, not in any secondary
  const common = []; // in master AND at least one secondary
  const onlyB  = []; // in at least one secondary, not in master

  const fpMaster = new Set();
  for (const g of master) {
    const fp = gameFingerprint(g);
    fpMaster.add(fp);
    if (fpSecondary.has(fp)) common.push(g);
    else onlyA.push(g);
  }
  // Collect entries from secondaries not in master (deduplicated)
  const seenExtra = new Set();
  for (const games of secondaries) {
    for (const g of games) {
      const fp = gameFingerprint(g);
      if (!fpMaster.has(fp) && !seenExtra.has(fp)) {
        seenExtra.add(fp);
        onlyB.push(g);
      }
    }
  }

  showDiffProgress(100, 'Done');
  diffResults = { onlyA, onlyB, common };
  applyDiffResults();
}

function applyDiffResults() {
  const { onlyA, onlyB, common } = diffResults;

  // Update badges
  document.getElementById('diff-badge-a').textContent      = onlyA.length.toLocaleString();
  document.getElementById('diff-badge-b').textContent      = onlyB.length.toLocaleString();
  document.getElementById('diff-badge-common').textContent = common.length.toLocaleString();

  // Update stats
  document.getElementById('diff-stat-a').textContent      = onlyA.length.toLocaleString();
  document.getElementById('diff-stat-b').textContent      = onlyB.length.toLocaleString();
  document.getElementById('diff-stat-common').textContent = common.length.toLocaleString();
  document.getElementById('exp-count-a').textContent      = onlyA.length.toLocaleString();
  document.getElementById('exp-count-b').textContent      = onlyB.length.toLocaleString();
  document.getElementById('exp-count-common').textContent = common.length.toLocaleString();

  // Tab labels update for master+N mode
  if (diffMode === 'master') {
    document.getElementById('difftab-onlya').childNodes[0].textContent = 'ONLY IN MASTER ';
    document.getElementById('difftab-onlyb').childNodes[0].textContent = 'ONLY IN SECONDARY ';
  } else {
    document.getElementById('difftab-onlya').childNodes[0].textContent = 'ONLY IN A ';
    document.getElementById('difftab-onlyb').childNodes[0].textContent = 'ONLY IN B ';
  }

  hideDiffProgress();
  prepareDiffArrays();    // Sort/filter all 3 arrays once
  initDiffVScroll();      // Set up virtual scroll container
  showDiffTab(diffTab);   // Point vscroll at active tab
  document.getElementById('diff-save-btn').disabled = false;
  updateDiffSelectedCount();
}

// ── DIFF VIEWER — VIRTUAL SCROLL ─────────────────────────
// One virtual scroll container, 3 sorted arrays in memory.
// Tab switch = swap array + re-render visible rows → instant.

const DIFF_ROW_H  = 34;   // px, fixed row height
const DIFF_OVERSCAN = 8;  // extra rows above/below viewport

let diffArrays    = { onlya: [], onlyb: [], common: [] };
let diffChecked   = { onlya: new Set(), onlyb: new Set(), common: new Set() };
let diffVContainer = null;

function prepareDiffArrays() {
  const q = diffFilter.toLowerCase();
  ['onlya','onlyb','common'].forEach(tab => {
    let games = tab === 'onlya' ? diffResults.onlyA
              : tab === 'onlyb' ? diffResults.onlyB
              : diffResults.common;
    if (q) games = games.filter(g => (g.name||'').toLowerCase().includes(q));
    games = [...games].sort((a,b) =>
      diffSortDir === 'az'
        ? (a.name||'').localeCompare(b.name||'')
        : (b.name||'').localeCompare(a.name||'')
    );
    diffArrays[tab]  = games;
    diffChecked[tab] = new Set(games.map((_,i) => i)); // all checked by default
  });
}

function initDiffVScroll() {
  const container = document.getElementById('diff-list');
  container.innerHTML = `
    <div class="diff-vscroll-spacer" id="diff-vs-spacer"></div>
    <div class="diff-vscroll-items" id="diff-vs-items"></div>`;
  diffVContainer = container;
  container.addEventListener('scroll', () => renderDiffVVisible(), { passive: true });
}

function showDiffTab(tab) {
  diffTab = tab;
  ['onlya','onlyb','common'].forEach(t =>
    document.getElementById(`difftab-${t}`).classList.toggle('active', t === tab)
  );
  if (!diffResults) return;
  // Resize spacer for new tab's item count
  const count = diffArrays[tab].length;
  const spacer = document.getElementById('diff-vs-spacer');
  if (spacer) spacer.style.height = (count * DIFF_ROW_H) + 'px';
  // Reset scroll and render
  if (diffVContainer) diffVContainer.scrollTop = 0;
  renderDiffVVisible();
  updateDiffSelectedCount();
}

function renderDiffVVisible() {
  if (!diffVContainer || !diffResults) return;
  const games     = diffArrays[diffTab];
  const checked   = diffChecked[diffTab];
  const scrollTop = diffVContainer.scrollTop;
  const viewH     = diffVContainer.clientHeight;

  const first = Math.max(0, Math.floor(scrollTop / DIFF_ROW_H) - DIFF_OVERSCAN);
  const last  = Math.min(games.length - 1, Math.ceil((scrollTop + viewH) / DIFF_ROW_H) + DIFF_OVERSCAN);

  const tagClass = diffTab === 'onlya' ? 'only-a' : diffTab === 'onlyb' ? 'only-b' : 'common';
  const tagLabel = diffTab === 'onlya' ? (diffMode==='master' ? 'MASTER' : 'ONLY A')
                 : diffTab === 'onlyb' ? (diffMode==='master' ? 'COMPARE' : 'ONLY B')
                 : 'COMMON';

  let html = '';
  for (let i = first; i <= last; i++) {
    const g    = games[i];
    const top  = i * DIFF_ROW_H;
    const isChecked = checked.has(i);
    html += `<div class="diff-entry-row" style="position:absolute;top:${top}px;left:0;right:0;height:${DIFF_ROW_H}px;" data-idx="${i}" data-tab="${diffTab}">
      <input type="checkbox" class="diff-entry-cb" ${isChecked?'checked':''} onchange="diffToggleCheck('${diffTab}',${i},this.checked)">
      <span class="diff-entry-name" title="${g.name||''}">${g.name||'(no name)'}</span>
      <span class="diff-entry-roms">${(g.rom||[]).length}</span>
      <span class="diff-entry-tag ${tagClass}">${tagLabel}</span>
    </div>`;
  }

  const items = document.getElementById('diff-vs-items');
  if (items) items.innerHTML = html;
}

function diffToggleCheck(tab, idx, checked) {
  if (checked) diffChecked[tab].add(idx);
  else         diffChecked[tab].delete(idx);
  updateDiffSelectedCount();
}

function renderDiffList() {
  // Called on filter/sort change — recompute arrays and re-render
  if (!diffResults) {
    const container = document.getElementById('diff-list');
    container.innerHTML = `<div class="diff-empty"><span class="big">⊜</span><span>Load DAT files and click COMPARE</span></div>`;
    return;
  }
  prepareDiffArrays();
  const spacer = document.getElementById('diff-vs-spacer');
  if (spacer) spacer.style.height = (diffArrays[diffTab].length * DIFF_ROW_H) + 'px';
  if (diffVContainer) diffVContainer.scrollTop = 0;
  renderDiffVVisible();
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
  const games   = diffArrays[diffTab];
  const checked = diffChecked[diffTab];
  const allChecked = checked.size === games.length;
  if (allChecked) checked.clear();
  else            games.forEach((_,i) => checked.add(i));
  document.getElementById('diff-selall-btn').textContent = allChecked ? 'SELECT ALL' : 'DESELECT ALL';
  renderDiffVVisible();
  updateDiffSelectedCount();
}

function updateDiffSelectedCount() {
  const sel = diffChecked[diffTab]?.size || 0;
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
  if (!diffResults || !diffOutputFolder) {
    if (!diffOutputFolder) { alert('Please choose an output folder first.'); return; }
    return;
  }

  const exportOnlyA  = document.getElementById('exp-onlya').checked;
  const exportOnlyB  = document.getElementById('exp-onlyb').checked;
  const exportCommon = document.getElementById('exp-common').checked;
  const outMode      = document.querySelector('input[name="diff-out-mode"]:checked').value;
  const scope        = document.querySelector('input[name="diff-scope"]:checked').value;

  if (!exportOnlyA && !exportOnlyB && !exportCommon) {
    alert('Select at least one category to export.');
    return;
  }

  showDiffProgress(10, 'Preparing export…');
  document.getElementById('diff-save-btn').disabled = true;

  // Build game lists for export
  let groups = [];

  // If scope=checked, use in-memory checked Sets (not DOM queries)
  const getCheckedGames = (games, tabKey) => {
    if (scope !== 'checked') return games;
    const checked = diffChecked[tabKey];
    return games.filter((_, i) => checked.has(i));
  };

  const baseNameA = diffSlots[0]?.header?.name || 'DAT-A';
  const baseNameB = diffSlots[1]?.header?.name || 'DAT-B';

  if (exportOnlyA) groups.push({ label: diffMode === 'master' ? 'Master Only' : 'Only in A', games: getCheckedGames(diffArrays.onlya, 'onlya'), headerBase: baseNameA });
  if (exportOnlyB) groups.push({ label: diffMode === 'master' ? 'Secondary Exclusive' : 'Only in B', games: getCheckedGames(diffArrays.onlyb, 'onlyb'), headerBase: baseNameB });
  if (exportCommon) groups.push({ label: 'Common', games: getCheckedGames(diffArrays.common, 'common'), headerBase: baseNameA });

  if (outMode === 'merged') {
    const merged = groups.reduce((all, g) => all.concat(g.games), []);
    groups = [{ label: 'Diff Result', games: merged, headerBase: baseNameA }];
  }

  // Filter empty groups
  groups = groups.filter(g => g.games.length > 0);

  if (!groups.length) {
    hideDiffProgress();
    document.getElementById('diff-save-btn').disabled = false;
    alert('No entries to export (all groups are empty or nothing was checked).');
    return;
  }

  // Build DAT files
  const stepSize = 80 / groups.length;
  let step = 10;
  const saved = [];

  for (const grp of groups) {
    const safeName = grp.label.replace(/[<>:"/\\|?*]/g, '_');
    const filename  = `${safeName}.dat`;
    const outPath   = `${diffOutputFolder}\\${filename}`;
    showDiffProgress(Math.round(step), `Writing ${filename}…`);

    const headerName = `${grp.headerBase} - ${grp.label}`;
    const xmlLines = [
      '<?xml version="1.0"?>',
      '<datafile>',
      '  <header>',
      `    <name>${escapeXml(headerName)}</name>`,
      `    <description>${escapeXml(headerName)}</description>`,
      `    <version>${escapeXml(diffSlots[0]?.header?.version || '')}</version>`,
      `    <date>${new Date().toISOString().slice(0,10)}</date>`,
      '    <author>DAT//ROMMANAGER DAT DIFF</author>',
      '  </header>',
    ];
    for (const g of grp.games) {
      const roms = (g.rom || []).map(r => {
        const attrs = ['name','size','crc','md5','sha1','sha256']
          .filter(k => r[k]).map(k => `${k}="${escapeXml(String(r[k]))}"`)
          .join(' ');
        return `    <rom ${attrs}/>`;
      }).join('\n');
      xmlLines.push(
        `  <game name="${escapeXml(g.name||'')}">`,
        `    <description>${escapeXml(g.description||g.name||'')}</description>`,
        roms,
        `  </game>`
      );
    }
    xmlLines.push('</datafile>');

    const content = xmlLines.join('\n');
    if (window.electronAPI.saveSplit) {
      await window.electronAPI.saveSplit(outPath, content);
    }
    saved.push({ label: grp.label, count: grp.games.length, path: outPath });
    step += stepSize;
  }

  showDiffProgress(100, 'Done!');
  setTimeout(() => {
    hideDiffProgress();
    renderDiffSummary(saved);
    document.getElementById('diff-save-btn').disabled = false;
  }, 500);
}

function escapeXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderDiffSummary(saved) {
  const totalEntries = saved.reduce((s, g) => s + g.count, 0);
  const el = document.getElementById('diff-summary');
  el.innerHTML = `
    <div class="spl-summary-box" style="margin-top:8px">
      <div class="spl-summary-title">✓ EXPORT COMPLETE</div>
      <div class="spl-summary-stats">
        <span class="green">${saved.length} file${saved.length!==1?'s':''} written</span>
        <span class="sep">·</span>
        <span class="green">${totalEntries.toLocaleString()} entries total</span>
      </div>
      <div class="spl-summary-folder" onclick="window.electronAPI.openExternal('file:///${diffOutputFolder.replace(/\\/g,'/')}')">
        📁 ${diffOutputFolder}
      </div>
      <div class="spl-summary-rows">
        ${saved.map(g => `
          <div class="spl-sum-row">
            <span class="spl-sum-label">${g.label}</span>
            <span class="spl-sum-count">${g.count}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── PROGRESS ──────────────────────────────────────────────

function showDiffProgress(pct, msg) {
  const bar = document.getElementById('diff-progress');
  bar.classList.add('visible');
  document.getElementById('diff-prog-msg').textContent  = msg || '';
  document.getElementById('diff-prog-pct').textContent  = `${pct}%`;
  document.getElementById('diff-prog-fill').style.width = `${pct}%`;
}

function hideDiffProgress() {
  document.getElementById('diff-progress').classList.remove('visible');
}

function resetDiffResults() {
  diffResults = null;
  ['a','b','common'].forEach(k => {
    const b = document.getElementById(`diff-badge-${k}`);
    if (b) b.textContent = '0';
    const s = document.getElementById(`diff-stat-${k==='a'?'a':k==='b'?'b':'common'}`);
    if (s) s.textContent = '—';
    const c = document.getElementById(`exp-count-${k}`);
    if (c) c.textContent = '0';
  });
  document.getElementById('diff-stat-sel').textContent = '—';
  document.getElementById('diff-list').innerHTML = `<div class="diff-empty"><span class="big">⊜</span><span>Load DAT files and click COMPARE</span></div>`;
  document.getElementById('diff-save-btn').disabled = true;
  document.getElementById('diff-summary').innerHTML = '';
}

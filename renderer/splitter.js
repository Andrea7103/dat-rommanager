// ============================================================
// DAT SPLITTER — Module 04  |  v0.9.0-beta
// ============================================================

let splitterGames   = [];
let splitterHeader  = {};
let splitterFile    = '';      // loaded file path (if from file)
let splitterPreview = [];      // current computed groups
let outputFolder    = '';

// ── REGION PATTERNS ────────────────────────────────────────
// Priority order: more specific first
const REGION_PATTERNS = [
  // Multi-region combos first
  { key:'World',         re:/\(World\)/i },
  { key:'USA, Europe',   re:/\(USA,\s*Europe\)/i },
  { key:'USA, Japan',    re:/\(USA,\s*Japan\)/i },
  { key:'Europe, Japan', re:/\(Europe,\s*Japan\)/i },
  // Single regions
  { key:'USA',           re:/\(USA\)/i },
  { key:'Europe',        re:/\(Europe\)/i },
  { key:'Japan',         re:/\(Japan\)/i },
  { key:'Germany',       re:/\(Germany\)/i },
  { key:'France',        re:/\(France\)/i },
  { key:'Italy',         re:/\(Italy\)/i },
  { key:'Spain',         re:/\(Spain\)/i },
  { key:'Netherlands',   re:/\(Netherlands\)/i },
  { key:'Sweden',        re:/\(Sweden\)/i },
  { key:'Australia',     re:/\(Australia\)/i },
  { key:'Canada',        re:/\(Canada\)/i },
  { key:'Brazil',        re:/\(Brazil\)/i },
  { key:'Korea',         re:/\(Korea\)/i },
  { key:'China',         re:/\(China\)/i },
  { key:'Taiwan',        re:/\(Taiwan\)/i },
  { key:'Hong Kong',     re:/\(Hong Kong\)/i },
  { key:'Asia',          re:/\(Asia\)/i },
  { key:'Scandinavia',   re:/\(Scandinavia\)/i },
  { key:'Latin America', re:/\(Latin America\)/i },
  { key:'Unknown',       re:null }, // fallback
];

// ── LANGUAGE PATTERNS ──────────────────────────────────────
const LANG_PATTERNS = [
  { key:'English (En)',  re:/\(En\b/i },
  { key:'Italian (It)',  re:/\(It\b|\bIt,/i },
  { key:'French (Fr)',   re:/\(Fr\b|\bFr,/i },
  { key:'German (De)',   re:/\(De\b|\bDe,/i },
  { key:'Spanish (Es)',  re:/\(Es\b|\bEs,/i },
  { key:'Portuguese (Pt)',re:/\(Pt\b|\bPt,/i },
  { key:'Japanese (Ja)', re:/\(Ja\b|\bJa,/i },
  { key:'Korean (Ko)',   re:/\(Ko\b|\bKo,/i },
  { key:'Chinese (Zh)',  re:/\(Zh\b|\bZh,/i },
  { key:'Dutch (Nl)',    re:/\(Nl\b|\bNl,/i },
  { key:'Swedish (Sv)',  re:/\(Sv\b|\bSv,/i },
  { key:'Russian (Ru)',  re:/\(Ru\b|\bRu,/i },
  { key:'No Language Tag',re:null },
];

// ── SPLIT ENGINES ──────────────────────────────────────────

function splitByRegion(games) {
  const groups = {};
  for (const g of games) {
    let matched = null;
    for (const p of REGION_PATTERNS) {
      if (!p.re) continue;
      if (p.re.test(g.name) || p.re.test(g.description||'')) {
        matched = p.key; break;
      }
    }
    // Also check g.rom[0].region if present
    if (!matched && g.rom && g.rom[0] && g.rom[0].region) {
      matched = g.rom[0].region;
    }
    if (!matched) matched = 'Unknown / No Region Tag';
    if (!groups[matched]) groups[matched] = [];
    groups[matched].push(g);
  }
  return sortedGroups(groups);
}

function splitByLanguage(games) {
  const groups = {};
  for (const g of games) {
    let matched = null;
    const name = g.name + ' ' + (g.description||'');
    for (const p of LANG_PATTERNS) {
      if (!p.re) continue;
      if (p.re.test(name)) { matched = p.key; break; }
    }
    if (!matched) {
      // Try to extract (En,Fr,De...) style tags
      const m = name.match(/\(([A-Z][a-z](?:,[A-Z][a-z])*)\)/);
      if (m) matched = 'Multi: ' + m[1];
    }
    if (!matched) matched = 'No Language Tag';
    if (!groups[matched]) groups[matched] = [];
    groups[matched].push(g);
  }
  return sortedGroups(groups);
}

function splitByYear(games) {
  const groups = {};
  for (const g of games) {
    let y = (g.year||'').toString().trim();
    // Extract 4-digit year from name if not in field
    if (!y) {
      const m = (g.name||'').match(/\b(1[89]\d{2}|20[012]\d)\b/);
      if (m) y = m[1];
    }
    if (!y) y = 'Unknown Year';
    if (!groups[y]) groups[y] = [];
    groups[y].push(g);
  }
  return sortedGroups(groups, true);
}

function splitByDecade(games) {
  const groups = {};
  for (const g of games) {
    let y = parseInt((g.year||'').toString().trim());
    if (isNaN(y)) {
      const m = (g.name||'').match(/\b(1[89]\d{2}|20[012]\d)\b/);
      y = m ? parseInt(m[1]) : NaN;
    }
    const label = isNaN(y) ? 'Unknown' : `${Math.floor(y/10)*10}s`;
    if (!groups[label]) groups[label] = [];
    groups[label].push(g);
  }
  return sortedGroups(groups);
}

function splitByAlpha(games) {
  const groups = {};
  for (const g of games) {
    const first = (g.name||'').trim()[0] || '?';
    const letter = /[A-Za-z]/.test(first) ? first.toUpperCase() : '#';
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(g);
  }
  // Bucket small groups: A-E, F-J, K-O, P-T, U-Z
  const BUCKETS = [
    { label:'A-E', test: l => l>='A' && l<='E' },
    { label:'F-J', test: l => l>='F' && l<='J' },
    { label:'K-O', test: l => l>='K' && l<='O' },
    { label:'P-T', test: l => l>='P' && l<='T' },
    { label:'U-Z', test: l => l>='U' && l<='Z' },
    { label:'#',   test: l => l==='#' },
  ];
  const bucketed = {};
  for (const [letter, arr] of Object.entries(groups)) {
    const b = BUCKETS.find(b => b.test(letter));
    const key = b ? b.label : letter;
    if (!bucketed[key]) bucketed[key] = [];
    bucketed[key].push(...arr);
  }
  return sortedGroups(bucketed);
}

function splitByManufacturer(games) {
  const groups = {};
  for (const g of games) {
    const key = (g.manufacturer||'').trim() || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }
  return sortedGroups(groups);
}

function splitByCategory(games) {
  const groups = {};
  for (const g of games) {
    const key = (g.category||'').trim() || 'No Category';
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }
  return sortedGroups(groups);
}

function splitByType(games) {
  const groups = { 'BIOS / System': [], 'Clones': [], 'Parents / Originals': [] };
  for (const g of games) {
    if (g.isbios === 'yes' || /\[BIOS\]/i.test(g.name)) {
      groups['BIOS / System'].push(g);
    } else if (g.cloneof || g.romof) {
      groups['Clones'].push(g);
    } else {
      groups['Parents / Originals'].push(g);
    }
  }
  // Remove empty
  for (const k of Object.keys(groups)) if (!groups[k].length) delete groups[k];
  return sortedGroups(groups);
}

function splitByStatus(games) {
  const groups = {};
  for (const g of games) {
    // Look for (Beta), (Proto), (Demo), (Sample), (Unl), etc. in name
    let tag = 'Released';
    const patterns = [
      ['Beta',     /\(Beta[^)]*\)/i],
      ['Proto',    /\(Proto[^)]*\)/i],
      ['Demo',     /\(Demo[^)]*\)/i],
      ['Sample',   /\(Sample[^)]*\)/i],
      ['Unlicensed',/\(Unl\)/i],
      ['BIOS',     /\[BIOS\]/i],
      ['Hack',     /\(Hack\)/i],
      ['Bootleg',  /\(Bootleg\)/i],
      ['Pirate',   /\(Pirate\)/i],
    ];
    for (const [label, re] of patterns) {
      if (re.test(g.name)) { tag = label; break; }
    }
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(g);
  }
  return sortedGroups(groups);
}

function splitByRomCount(games) {
  const groups = { '1 ROM': [], '2-5 ROMs': [], '6-20 ROMs': [], '21-100 ROMs': [], '100+ ROMs': [] };
  for (const g of games) {
    const n = (g.rom||[]).length;
    if (n <= 1)       groups['1 ROM'].push(g);
    else if (n <= 5)  groups['2-5 ROMs'].push(g);
    else if (n <= 20) groups['6-20 ROMs'].push(g);
    else if (n <= 100)groups['21-100 ROMs'].push(g);
    else              groups['100+ ROMs'].push(g);
  }
  for (const k of Object.keys(groups)) if (!groups[k].length) delete groups[k];
  return sortedGroups(groups);
}

// ── HELPERS ────────────────────────────────────────────────

function sortedGroups(obj, numericSort = false) {
  const keys = Object.keys(obj);
  if (numericSort) keys.sort((a,b) => {
    const na = parseInt(a), nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  else keys.sort((a,b) => a.localeCompare(b));
  return keys.map(k => ({ key: k, games: obj[k] }));
}

function safeFilename(base, label) {
  const safe = label.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g,' ').trim();
  return `${base} - ${safe}.dat`;
}

// ── SPLIT MODES CONFIG ─────────────────────────────────────
const SPLIT_MODES = [
  { id:'region',       label:'Region',        icon:'◎', desc:'Region tag in entry name  (USA, Europe, Japan, World…)',          fn: splitByRegion,       getKey: getKeyRegion },
  { id:'language',     label:'Language',      icon:'◈', desc:'Language code  (En, It, Fr, De, Ja…)',                            fn: splitByLanguage,     getKey: getKeyLanguage },
  { id:'year',         label:'Year',          icon:'◷', desc:'Release year — also extracted from entry name if field is empty', fn: splitByYear,         getKey: getKeyYear },
  { id:'decade',       label:'Decade',        icon:'◶', desc:'Decade  (1980s, 1990s, 2000s…)',                                  fn: splitByDecade,       getKey: getKeyDecade },
  { id:'alpha',        label:'Alphabetical',  icon:'⊞', desc:'Alphabetical buckets  (A-E, F-J, K-O, P-T, U-Z, #)',             fn: splitByAlpha,        getKey: getKeyAlpha },
  { id:'manufacturer', label:'Manufacturer',  icon:'◉', desc:'Manufacturer / developer field',                                  fn: splitByManufacturer, getKey: getKeyManufacturer },
  { id:'category',     label:'Category',      icon:'◫', desc:'Category field  (if present in the DAT)',                        fn: splitByCategory,     getKey: getKeyCategory },
  { id:'type',         label:'Type',          icon:'⊟', desc:'BIOS/System · Clones · Parents / Originals',                     fn: splitByType,         getKey: getKeyType },
  { id:'status',       label:'Release Status',icon:'◌', desc:'Beta · Proto · Demo · Unlicensed · Released…',                   fn: splitByStatus,       getKey: getKeyStatus },
  { id:'romcount',     label:'ROM Count',     icon:'⊡', desc:'Number of ROM files per entry',                                  fn: splitByRomCount,     getKey: getKeyRomCount },
];

// Per-entry key extractors (used for multi-mode combination)
function getKeyRegion(g) {
  for (const p of REGION_PATTERNS) {
    if (!p.re) continue;
    if (p.re.test(g.name) || p.re.test(g.description||'')) return p.key;
  }
  if (g.rom && g.rom[0] && g.rom[0].region) return g.rom[0].region;
  return 'Unknown';
}
function getKeyLanguage(g) {
  const name = g.name + ' ' + (g.description||'');
  for (const p of LANG_PATTERNS) {
    if (!p.re) continue;
    if (p.re.test(name)) return p.key;
  }
  const m = name.match(/\(([A-Z][a-z](?:,[A-Z][a-z])*)\)/);
  if (m) return 'Multi: ' + m[1];
  return 'No Language Tag';
}
function getKeyYear(g) {
  let y = (g.year||'').toString().trim();
  if (!y) { const m = (g.name||'').match(/\b(1[89]\d{2}|20[012]\d)\b/); if (m) y = m[1]; }
  return y || 'Unknown Year';
}
function getKeyDecade(g) {
  let y = parseInt((g.year||'').toString().trim());
  if (isNaN(y)) { const m = (g.name||'').match(/\b(1[89]\d{2}|20[012]\d)\b/); y = m ? parseInt(m[1]) : NaN; }
  return isNaN(y) ? 'Unknown' : `${Math.floor(y/10)*10}s`;
}
function getKeyAlpha(g) {
  const first = (g.name||'').trim()[0] || '?';
  if (!/[A-Za-z]/.test(first)) return '#';
  const l = first.toUpperCase();
  if (l<='E') return 'A-E';
  if (l<='J') return 'F-J';
  if (l<='O') return 'K-O';
  if (l<='T') return 'P-T';
  return 'U-Z';
}
function getKeyManufacturer(g) { return (g.manufacturer||'').trim() || 'Unknown'; }
function getKeyCategory(g)     { return (g.category||'').trim() || 'No Category'; }
function getKeyType(g) {
  if (g.isbios === 'yes' || /\[BIOS\]/i.test(g.name)) return 'BIOS - System';
  if (g.cloneof || g.romof) return 'Clones';
  return 'Parents - Originals';
}
function getKeyStatus(g) {
  const patterns = [
    ['Beta',/\(Beta[^)]*\)/i],['Proto',/\(Proto[^)]*\)/i],['Demo',/\(Demo[^)]*\)/i],
    ['Sample',/\(Sample[^)]*\)/i],['Unlicensed',/\(Unl\)/i],['BIOS',/\[BIOS\]/i],
    ['Hack',/\(Hack\)/i],['Bootleg',/\(Bootleg\)/i],['Pirate',/\(Pirate\)/i],
  ];
  for (const [label, re] of patterns) if (re.test(g.name)) return label;
  return 'Released';
}
function getKeyRomCount(g) {
  const n = (g.rom||[]).length;
  if (n <= 1) return '1 ROM';
  if (n <= 5) return '2-5 ROMs';
  if (n <= 20) return '6-20 ROMs';
  if (n <= 100) return '21-100 ROMs';
  return '100+ ROMs';
}

// ── INIT ───────────────────────────────────────────────────

let activeModes = new Set(['region']); // multi-select

function initSplitter() {
  renderModeButtons();

  // Drop zone
  const drop = document.getElementById('spl-drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', async e => {
    e.preventDefault(); drop.classList.remove('dragover');
    const files = [...e.dataTransfer.files].filter(f => /\.(dat|xml)$/i.test(f.name));
    if (files.length) await loadSplitterFile(files[0].path);
  });
}

function renderModeButtons() {
  const container = document.getElementById('spl-modes');
  container.innerHTML = SPLIT_MODES.map(m => `
    <div class="spl-mode-btn ${activeModes.has(m.id)?'active':''}" id="splmode-${m.id}" onclick="toggleSplitterMode('${m.id}')" title="${m.desc}">
      <span class="spl-mode-icon">${m.icon}</span>
      <span class="spl-mode-label">${m.label}</span>
      <span class="spl-mode-check">${activeModes.has(m.id)?'✓':''}</span>
    </div>`).join('');
  updateModeDesc();
}

function toggleSplitterMode(id) {
  if (activeModes.has(id)) {
    if (activeModes.size === 1) return; // keep at least one
    activeModes.delete(id);
  } else {
    activeModes.add(id);
  }
  renderModeButtons();
  if (splitterGames.length) computeAndPreview();
}

function updateModeDesc() {
  const labels = [...activeModes].map(id => SPLIT_MODES.find(m=>m.id===id)?.label).filter(Boolean);
  const el = document.getElementById('spl-mode-desc');
  if (labels.length === 1) {
    const m = SPLIT_MODES.find(m => m.id === [...activeModes][0]);
    el.textContent = m ? m.desc : '';
  } else {
    el.textContent = `Combined split: ${labels.join(' + ')} — each output file covers one unique combination`;
  }
}

function resetSplitterModes() {
  activeModes = new Set(['region']);
  renderModeButtons();
  if (splitterGames.length) computeAndPreview();
}

// ── LOAD ───────────────────────────────────────────────────

async function selectSplitterFile() {
  const fp = await window.electronAPI.selectDatFile();
  if (fp) await loadSplitterFile(fp);
}

async function loadSplitterFile(filePath) {
  splitterFile   = filePath;
  splitterGames  = [];
  splitterHeader = {};
  splitterPreview = [];
  // Reset UI
  document.getElementById('spl-summary').innerHTML = '';
  document.getElementById('spl-save-section').style.display = 'none';
  document.getElementById('spl-preview-list').innerHTML = '<div class="spl-preview-empty">No groups yet</div>';
  document.getElementById('spl-preview-header').textContent = '0 groups';
  setSplitterStatus('LOADING...');
  showSplitterProgress(5, 'Reading file...');

  if (window.electronAPI.onParseProgress) {
    window.electronAPI.offParseProgress();
    window.electronAPI.onParseProgress(({ pct, msg }) => {
      // Map parse progress to 5-70% of splitter bar
      showSplitterProgress(5 + Math.round(pct * 0.65), msg);
    });
  }

  let result = null;
  if (window.electronAPI.parseDatFile) {
    result = await window.electronAPI.parseDatFile(filePath);
  }
  if (window.electronAPI.offParseProgress) window.electronAPI.offParseProgress();

  if (!result || !result.ok || !result.games.length) {
    hideSplitterProgress();
    setSplitterStatus('ERROR');
    document.getElementById('spl-file-info').innerHTML =
      '<div class="spl-error">⚠ Could not parse DAT file</div>';
    return;
  }

  splitterGames  = result.games;
  splitterHeader = result.header;
  showSplitterProgress(75, 'Computing groups...');
  renderFileInfo(filePath, result);
  computeAndPreview();
  showSplitterProgress(100, 'Ready');
  setTimeout(hideSplitterProgress, 1000);
  setSplitterStatus('READY');
}

// Load from Explorer (shared state)
function loadFromExplorer() {
  if (!window.explorerGamesForSplitter || !window.explorerGamesForSplitter.length) {
    document.getElementById('spl-file-info').innerHTML =
      '<div class="spl-error">⚠ No DAT loaded in Explorer.<br>Open a file in DAT Explorer first.</div>';
    return;
  }
  splitterGames  = window.explorerGamesForSplitter;
  splitterHeader = window.explorerHeaderForSplitter || {};
  splitterFile   = '';
  document.getElementById('spl-summary').innerHTML = '';
  document.getElementById('spl-save-section').style.display = 'none';
  renderFileInfo('(from Explorer)', { games: splitterGames, header: splitterHeader, type: 'XML' });
  computeAndPreview();
  setSplitterStatus('READY');
}

function renderFileInfo(filePath, result) {
  const name     = filePath.split(/[/\\]/).pop();
  const datName  = result.header.name || name;
  const total    = result.games.length;
  const totalRoms= result.games.reduce((s,g) => s + (g.rom||[]).length, 0);
  document.getElementById('spl-file-info').innerHTML = `
    <div class="spl-info-row"><span class="spl-info-key">File</span><span class="spl-info-val amber">${escH(name)}</span></div>
    <div class="spl-info-row"><span class="spl-info-key">DAT Name</span><span class="spl-info-val">${escH(datName)}</span></div>
    <div class="spl-info-row"><span class="spl-info-key">Entries</span><span class="spl-info-val green">${total.toLocaleString()}</span></div>
    <div class="spl-info-row"><span class="spl-info-key">Total ROMs</span><span class="spl-info-val">${totalRoms.toLocaleString()}</span></div>
    <div class="spl-info-row"><span class="spl-info-key">Format</span><span class="spl-info-val dim">${result.type||'—'}</span></div>`;
}

// ── COMPUTE & PREVIEW ──────────────────────────────────────

function computeAndPreview() {
  if (!splitterGames.length) return;

  const modes    = [...activeModes].map(id => SPLIT_MODES.find(m => m.id === id)).filter(Boolean);
  const baseName = (splitterHeader.name || 'Output').replace(/[<>:"/\\|?*]/g,'_');

  if (modes.length === 1) {
    // Single mode — use existing split fn (handles numeric sort etc.)
    const rawGroups = modes[0].fn(splitterGames);
    splitterPreview = rawGroups.map(g => ({
      label:      g.key,
      games:      g.games,
      filename:   safeFilename(baseName, g.key),
      headerName: `${splitterHeader.name||'DAT'} - ${g.key}`,
      enabled:    true,
    }));
  } else {
    // Multi-mode — group by composite key (cartesian product per entry)
    const groups = {};
    for (const g of splitterGames) {
      const key = modes.map(m => m.getKey(g)).join(' · ');
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    }
    splitterPreview = Object.entries(groups)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key, games]) => ({
        label:      key,
        games,
        filename:   safeFilename(baseName, key),
        headerName: `${splitterHeader.name||'DAT'} - ${key}`,
        enabled:    true,
      }));
  }

  renderPreview();
  document.getElementById('spl-save-section').style.display = splitterPreview.length ? '' : 'none';
}

function renderPreview() {
  const container = document.getElementById('spl-preview-list');
  const totalGroups   = splitterPreview.length;
  const totalEnabled  = splitterPreview.filter(g => g.enabled).length;
  const modeLabels    = [...activeModes].map(id => SPLIT_MODES.find(m=>m.id===id)?.label).filter(Boolean).join(' + ');

  document.getElementById('spl-preview-header').innerHTML =
    `<span>${totalGroups} group${totalGroups!==1?'s':''}</span>` +
    `<span style="color:var(--green-dim);font-size:9px;letter-spacing:1px;margin-left:10px;padding:2px 6px;border:1px solid rgba(0,255,65,0.2);border-radius:2px">${modeLabels}</span>` +
    `<span style="margin-left:auto;color:var(--text-dim);font-size:10px">${totalEnabled} selected</span>`;

  if (!splitterPreview.length) {
    container.innerHTML = '<div class="spl-preview-empty">No groups to preview</div>';
    return;
  }

  container.innerHTML = splitterPreview.map((g, i) => `
    <div class="spl-preview-row ${g.enabled?'':'disabled'}" id="splrow-${i}" onclick="splitterGroupClick(event,${i})">
      <div class="spl-preview-check">
        <span class="spl-check-icon">${g.enabled ? '✓' : '○'}</span>
      </div>
      <div class="spl-preview-info">
        <div class="spl-preview-label">${escH(g.label)}</div>
        <div class="spl-preview-filename">${escH(g.filename)}</div>
      </div>
      <div class="spl-preview-count">
        <span class="spl-count-num">${g.games.length.toLocaleString()}</span>
        <span class="spl-count-lbl">entries</span>
      </div>
    </div>`).join('');

  // Update save button
  const sel = splitterPreview.filter(g => g.enabled).length;
  document.getElementById('spl-btn-save').disabled = sel === 0 || !splitterGames.length;
  document.getElementById('spl-btn-save').textContent = `▶ SPLIT & SAVE  (${sel} file${sel!==1?'s':''})`;
}

function toggleSplitGroup(i) {
  splitterPreview[i].enabled = !splitterPreview[i].enabled;
  renderPreview();
}

function toggleAllGroups(enable) {
  splitterPreview.forEach(g => g.enabled = enable);
  renderPreview();
}

// ── SAVE ───────────────────────────────────────────────────

async function selectSplitOutputFolder() {
  const folder = await window.electronAPI.selectOutputFolder();
  if (folder) {
    outputFolder = folder;
    const short = folder.length > 48 ? '...' + folder.slice(-45) : folder;
    document.getElementById('spl-output-path').textContent = short;
    document.getElementById('spl-output-path').title = folder;
  }
}

async function runSplit() {
  if (!outputFolder) {
    await selectSplitOutputFolder();
    if (!outputFolder) return;
  }

  const groups = splitterPreview.filter(g => g.enabled);
  if (!groups.length) return;

  setSplitterStatus('SAVING...');
  showSplitterProgress(2, 'Starting...');

  window.electronAPI.onSplitProgress(({ pct, msg }) => showSplitterProgress(pct, msg));

  const result = await window.electronAPI.saveSplit({
    outputDir:    outputFolder,
    groups:       groups,
    sourceHeader: splitterHeader,
  });

  window.electronAPI.offSplitProgress();

  if (result.ok) {
    showSplitterProgress(100, `Done — ${result.results.length} files saved`);
    setTimeout(hideSplitterProgress, 1500);
    showSplitSummary(result.results, outputFolder);
    setSplitterStatus('DONE');
  } else {
    hideSplitterProgress();
    setSplitterStatus('ERROR');
    document.getElementById('spl-summary').innerHTML =
      `<div class="spl-error">⚠ Save error: ${escH(result.error)}</div>`;
  }
}

function showSplitSummary(results, folder) {
  const total = results.reduce((s,r) => s+r.count, 0);
  const html = `
    <div class="spl-summary-box">
      <div class="spl-summary-title">✓ SPLIT COMPLETE</div>
      <div class="spl-summary-stats">
        <span>${results.length} files created</span>
        <span class="sep">·</span>
        <span class="green">${total.toLocaleString()} entries total</span>
      </div>
      <div class="spl-summary-folder" onclick="window.electronAPI.openExternal('file://'+outputFolder)" title="${escH(folder)}">
        📁 ${escH(folder.length>52?'...'+folder.slice(-49):folder)}
      </div>
      <div class="spl-summary-rows">
        ${results.map(r=>`<div class="spl-sum-row spl-sum-row-clickable" onclick="openSplitResultInExplorer('${escH(r.path||'').replace(/\\/g,'\\\\')}')" title="Click to open in DAT Explorer">
          <span class="spl-sum-label">${escH(r.label)}</span>
          <span class="spl-sum-count">${r.count.toLocaleString()}</span>
          <span class="spl-sum-open-hint">▶ Explorer</span>
        </div>`).join('')}
      </div>
      <div style="font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
        Click any file above to open it in DAT Explorer
      </div>
    </div>`;
  document.getElementById('spl-summary').innerHTML = html;
  document.getElementById('spl-summary').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function openSplitResultInExplorer(filePath) {
  if (!filePath) return;
  // Switch to explorer and load the file
  goTo('explorer');
  setTimeout(() => loadDatFileInExplorer(filePath), 150);
}

// ── UI HELPERS ─────────────────────────────────────────────

function setSplitterStatus(s) { setStatus(s); }

function showSplitterProgress(pct, msg) {
  const bar  = document.getElementById('spl-progress');
  const fill = document.getElementById('spl-progress-fill');
  const lbl  = document.getElementById('spl-progress-msg');
  const pctEl= document.getElementById('spl-progress-pct');
  bar.classList.add('visible');
  fill.style.width = pct + '%';
  lbl.textContent  = msg || '';
  pctEl.textContent= pct + '%';
}

function hideSplitterProgress() {
  document.getElementById('spl-progress').classList.remove('visible');
}

function escH(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Init on load
document.addEventListener('DOMContentLoaded', initSplitter);

// ── COLLAPSIBLE LEFT PANEL ─────────────────────────────────
function toggleSplitterLeft() {
  const left = document.getElementById('spl-left');
  const btn  = document.getElementById('spl-collapse-btn');
  const collapsed = left.classList.toggle('collapsed');
  btn.textContent = collapsed ? '▶' : '◀';
  btn.title = collapsed ? 'Expand panel' : 'Collapse panel';
}

// ── GROUP VIEWER ───────────────────────────────────────────

let splitterViewerGroupIndex = -1;
let splitterViewerFilter     = '';

function splitterGroupClick(event, i) {
  // Click on checkbox area → toggle enable/disable
  if (event.target.closest('.spl-preview-check')) {
    toggleSplitGroup(i);
    return;
  }
  // Click anywhere else → open viewer
  openSplitterGroupViewer(i);
  // Highlight selected row
  document.querySelectorAll('.spl-preview-row').forEach((r,j) =>
    r.classList.toggle('viewing', j === i));
}

function openSplitterGroupViewer(i) {
  const group = splitterPreview[i];
  if (!group) return;
  splitterViewerGroupIndex = i;
  splitterViewerFilter     = '';

  document.getElementById('spl-center-hint').style.display  = 'none';
  document.getElementById('spl-group-viewer').style.display = '';
  document.getElementById('spl-gv-search').value = '';
  document.getElementById('spl-gv-label').textContent = group.label;

  renderSplitterGroupViewer();
}

function closeSplitterGroupViewer() {
  splitterViewerGroupIndex = -1;
  document.getElementById('spl-group-viewer').style.display = 'none';
  document.getElementById('spl-center-hint').style.display  = '';
  document.querySelectorAll('.spl-preview-row').forEach(r => r.classList.remove('viewing'));
}

function filterSplitterGroupViewer(val) {
  splitterViewerFilter = val.toLowerCase();
  renderSplitterGroupViewer();
}

function renderSplitterGroupViewer() {
  const group = splitterPreview[splitterViewerGroupIndex];
  if (!group) return;

  let games = group.games;
  if (splitterViewerFilter) {
    games = games.filter(g => (g.name||'').toLowerCase().includes(splitterViewerFilter));
  }

  document.getElementById('spl-gv-count').textContent =
    `${games.length.toLocaleString()} / ${group.games.length.toLocaleString()} entries`;

  const list = document.getElementById('spl-gv-list');
  if (!games.length) {
    list.innerHTML = '<div class="spl-gv-empty">No entries match filter</div>';
    return;
  }
  list.innerHTML = games.map(g => {
    const roms = (g.rom||[]).length;
    return `<div class="spl-gv-entry" title="${escH(g.name||'')}">
      ${escH(g.name||'(no name)')}
      <span class="spl-gv-entry-meta">${roms} ROM${roms!==1?'s':''}</span>
    </div>`;
  }).join('');
}

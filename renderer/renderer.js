// ============================================================
// STATE
// ============================================================
let loadedFiles = [];

// ============================================================
// LOGGING
// ============================================================
function log(msg, type = '') {
  const now = new Date();
  const time = now.toTimeString().split(' ')[0];

  const area = document.getElementById('log-area');
  if (area) { area.appendChild(makeLogLine(time, msg, type)); area.scrollTop = area.scrollHeight; }

  const progLog = document.getElementById('prog-log');
  if (progLog) { progLog.appendChild(makeLogLine(time, msg, type)); progLog.scrollTop = progLog.scrollHeight; }
}

function makeLogLine(time, msg, type) {
  const div = document.createElement('div');
  div.className = 'log-line';
  div.innerHTML = `<span class="log-time">${time}</span><span class="log-msg ${type}">${escHTML(msg)}</span>`;
  return div;
}

function escHTML(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// PROGRESS OVERLAY
// ============================================================
function showProgress(title) {
  document.getElementById('prog-log').innerHTML = '';
  setProgCurrent('Initializing...');
  setProgress(0, title || 'Processing...');
  document.getElementById('progress-overlay').classList.add('visible');
}
function hideProgress() {
  document.getElementById('progress-overlay').classList.remove('visible');
}
function setProgCurrent(text) {
  document.getElementById('prog-current').textContent = text;
}

// ============================================================
// SUMMARY MODAL
// ============================================================
function showSummary({ filePath, entries, sizeMB, sources, dupes, errors }) {
  const fname = filePath.split(/[/\\]/).pop();
  document.getElementById('sum-file').textContent    = fname;
  document.getElementById('sum-entries').textContent = entries.toLocaleString();
  document.getElementById('sum-size').textContent    = sizeMB + ' MB';
  document.getElementById('sum-sources').textContent = sources;

  const dupRow = document.getElementById('sum-dupes-row');
  if (dupes > 0) { dupRow.style.display = ''; document.getElementById('sum-dupes').textContent = dupes.toLocaleString(); }
  else { dupRow.style.display = 'none'; }

  const errRow = document.getElementById('sum-errors-row');
  if (errors > 0) { errRow.style.display = ''; document.getElementById('sum-errors').textContent = errors; }
  else { errRow.style.display = 'none'; }

  document.getElementById('summary-overlay').classList.add('visible');
}
function closeSummary() {
  document.getElementById('summary-overlay').classList.remove('visible');
}

// ============================================================
// FOLDER SELECTION
// ============================================================
async function selectFolder() {
  const folderPath = await window.electronAPI.selectFolder();
  if (!folderPath) return;
  await loadFromFolder(folderPath);
}

// ============================================================
// DRAG & DROP
// ============================================================
const dropArea = document.getElementById('drop-area');
dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('dragover'); });
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
dropArea.addEventListener('drop', async e => {
  e.preventDefault(); dropArea.classList.remove('dragover');
  const entries = [...e.dataTransfer.items].map(i => i.webkitGetAsEntry?.()).filter(Boolean);
  if (entries[0]?.isDirectory) {
    const nativePath = e.dataTransfer.files[0]?.path;
    if (nativePath) { await loadFromFolder(nativePath); return; }
  }
  const files = [...e.dataTransfer.files].filter(f => /\.(dat|xml)$/i.test(f.name));
  if (files.length) await processNativeFiles(files);
});

// ============================================================
// RESET
// ============================================================
function resetState() {
  loadedFiles = [];
  updateFileList([]);
  updateStats();
  document.getElementById('btn-merge').disabled = true;
  document.getElementById('badge-files').textContent = '—';
}

// ============================================================
// LOAD FROM FOLDER
// ============================================================
async function loadFromFolder(folderPath) {
  resetState();
  showProgress('SCANNING FOLDER');
  setStatus('SCANNING...');

  log('─────────────────────────────────');
  log(`Folder: ${folderPath}`, 'ok');
  log('Scanning subfolders...', '');
  setProgCurrent('Scanning folder structure...');
  setProgress(3, 'Scanning folders...');

  const paths = await window.electronAPI.scanFolder(folderPath);
  const datPaths = paths.filter(p => /\.(dat|xml)$/i.test(p));

  if (!datPaths.length) {
    log('No .dat or .xml files found in folder.', 'warn');
    setStatus('READY'); hideProgress(); return;
  }

  log(`Found ${datPaths.length} ${datPaths.length === 1 ? 'file' : 'files'}`, 'ok');
  setProgCurrent(`Found ${datPaths.length} files — starting parse...`);
  setProgress(8, `Found ${datPaths.length} files`);

  await processFilePaths(datPaths, folderPath);
}

// ============================================================
// PROCESS FILE PATHS
// ============================================================
async function processFilePaths(filePaths, basePath) {
  setStatus('LOADING...');
  const total = filePaths.length;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const fp = filePaths[i];
    const name = fp.replace(basePath, '').replace(/^[/\\]/, '');
    const shortName = fp.split(/[/\\]/).pop();

    setProgress(8 + ((i / total) * 80), `File ${i+1} of ${total}`);
    setProgCurrent(`[${i+1}/${total}] ${shortName}`);

    const text = await window.electronAPI.readFile(fp);
    if (!text) { log(`✗ Read error: ${name}`, 'err'); errors++; await sleep(0); continue; }

    const parsed = parseDAT(text, name, fp);
    loadedFiles.push(parsed);

    if (parsed.type === 'err') {
      log(`✗ ${shortName} — ${parsed.error}`, 'err'); errors++;
    } else {
      const pfx = parsed.type === 'clr' ? '[CLR] ' : '';
      log(`${pfx}${shortName} · ${parsed.games.length} ${parsed.games.length === 1 ? 'game' : 'games'}, ${parsed.roms} ${parsed.roms === 1 ? 'ROM' : 'ROMs'}`);
    }

    if (i % 5 === 0) { updateStats(); updateFileList(loadedFiles); await sleep(0); }
  }

  updateStats(); updateFileList(loadedFiles);
  const valid = loadedFiles.filter(f => f.type !== 'err').length;
  document.getElementById('btn-merge').disabled = valid === 0;
  document.getElementById('badge-files').textContent = valid;

  const errMsg = errors ? `, ${errors} ${errors === 1 ? 'error' : 'errors'}` : '';
  log(`── Done: ${valid} ${valid === 1 ? 'valid file' : 'valid files'}${errMsg}`, 'ok');
  setProgress(100, 'Loading complete');
  setProgCurrent(`✓ ${valid} files loaded${errMsg}`);
  setStatus('READY');
  await sleep(800); hideProgress();
}

// ============================================================
// PROCESS NATIVE FILES
// ============================================================
async function processNativeFiles(files) {
  resetState(); showProgress('LOADING FILES'); setStatus('LOADING...');
  const total = files.length;
  log('─────────────────────────────────');
  log(`Loading ${total} ${total === 1 ? 'file' : 'files'}...`, 'ok');

  for (let i = 0; i < total; i++) {
    const f = files[i];
    setProgress(8 + ((i / total) * 80), `File ${i+1} of ${total}`);
    setProgCurrent(`[${i+1}/${total}] ${f.name}`);
    const text = await f.text();
    const parsed = parseDAT(text, f.name, f.path || f.name);
    loadedFiles.push(parsed);
    const pfx = parsed.type === 'clr' ? '[CLR] ' : '';
    log(`${pfx}${f.name} · ${parsed.games.length} ${parsed.games.length === 1 ? 'game' : 'games'}, ${parsed.roms} ROMs`, parsed.type === 'err' ? 'err' : '');
    if (i % 5 === 0) { updateStats(); updateFileList(loadedFiles); await sleep(0); }
  }

  updateStats(); updateFileList(loadedFiles);
  const valid = loadedFiles.filter(f => f.type !== 'err').length;
  document.getElementById('btn-merge').disabled = valid === 0;
  document.getElementById('badge-files').textContent = valid;
  log(`── Done: ${valid} ${valid === 1 ? 'valid file' : 'valid files'}`, 'ok');
  setProgress(100, 'Loading complete'); setProgCurrent(`✓ ${valid} files loaded`);
  setStatus('READY'); await sleep(800); hideProgress();
}

// ============================================================
// PARSERS
// ============================================================
function parseDAT(text, name, fullPath) {
  const t = text.trim();
  if (t.startsWith('<') || t.includes('<?xml')) return parseXMLDAT(text, name, fullPath);
  if (/^\s*(clrmamepro|game|resource)\s*\(/mi.test(t)) return parseCLRDAT(text, name, fullPath);
  return parseXMLDAT(text, name, fullPath);
}

function parseXMLDAT(text, name, fullPath) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML parse error');
    const gameNodes = [...doc.querySelectorAll('game, machine')];
    const games = gameNodes.map(parseGameNode);
    const roms = games.reduce((s, g) => s + g.rom.length, 0);
    const header = {
      name:    doc.querySelector('header name, header > n')?.textContent || name,
      version: doc.querySelector('header version')?.textContent || '1.0',
      author:  doc.querySelector('header author')?.textContent || '',
    };
    return { name, fullPath, type: 'xml', games, roms, header };
  } catch(e) {
    return { name, fullPath, type: 'err', games: [], roms: 0, header: {}, error: e.message };
  }
}

function parseGameNode(g) {
  return {
    name:         g.getAttribute('name') || '',
    description:  g.querySelector('description')?.textContent || g.getAttribute('name') || '',
    year:         g.querySelector('year')?.textContent || '',
    manufacturer: g.querySelector('manufacturer')?.textContent || '',
    cloneof:      g.getAttribute('cloneof') || '',
    romof:        g.getAttribute('romof') || '',
    isbios:       g.getAttribute('isbios') || '',
    category:     g.querySelector('category')?.textContent || '',
    rom: [...g.querySelectorAll('rom')].map(r => ({
      name: r.getAttribute('name') || '',
      size: r.getAttribute('size') || '',
      crc:  r.getAttribute('crc')  || '',
      md5:  r.getAttribute('md5')  || '',
      sha1: r.getAttribute('sha1') || '',
      status: r.getAttribute('status') || '',
    })),
  };
}

function parseCLRDAT(text, name, fullPath) {
  try {
    const games = [];
    let header = { name, version: '1.0', author: '' };
    const hm = text.match(/clrmamepro\s*\(([\s\S]*?)\)/i);
    if (hm) {
      header.name    = extractCLRField(hm[1], 'name')    || name;
      header.version = extractCLRField(hm[1], 'version') || '1.0';
      header.author  = extractCLRField(hm[1], 'author')  || '';
    }
    const gameRegex = /(?:^|\n)\s*(?:game|resource)\s*\(([\s\S]*?)\n\s*\)/gm;
    let m;
    while ((m = gameRegex.exec(text)) !== null) {
      const block = m[1];
      const roms = [];
      const romRegex = /rom\s*\((.*?)\)/gs;
      let rm;
      while ((rm = romRegex.exec(block)) !== null) {
        const rb = rm[1];
        roms.push({ name: extractCLRField(rb,'name')||'', size: extractCLRField(rb,'size')||'', crc: extractCLRField(rb,'crc')||'', md5: extractCLRField(rb,'md5')||'', sha1: extractCLRField(rb,'sha1')||'', status: '' });
      }
      const gname = extractCLRField(block,'name') || '';
      games.push({ name: gname, description: extractCLRField(block,'description')||gname, year: extractCLRField(block,'year')||'', manufacturer: extractCLRField(block,'manufacturer')||'', cloneof: extractCLRField(block,'cloneof')||'', romof: '', isbios: '', category: '', rom: roms });
    }
    const roms = games.reduce((s, g) => s + g.rom.length, 0);
    return { name, fullPath, type: 'clr', games, roms, header };
  } catch(e) {
    return { name, fullPath, type: 'err', games: [], roms: 0, header: {}, error: e.message };
  }
}

function extractCLRField(block, field) {
  const m = block.match(new RegExp(`\\b${field}\\s+"([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

// ============================================================
// MERGE & SAVE
// ============================================================
async function runMerge() {
  const btn = document.getElementById('btn-merge');
  btn.disabled = true;
  showProgress('MERGING DAT FILES');
  setStatus('MERGING...');

  const outName   = document.getElementById('cfg-name').value    || 'merged_set';
  const version   = document.getElementById('cfg-version').value || '1.0';
  const author    = document.getElementById('cfg-author').value  || 'DAT//MERGER';
  const keepDupes = document.getElementById('cfg-dupes').checked;
  const addPrefix = document.getElementById('cfg-prefix').checked;

  const valid = loadedFiles.filter(f => f.type !== 'err');
  const allGames = [];
  const seenKeys = new Set();
  let skippedDupes = 0;
  const errorCount = loadedFiles.filter(f => f.type === 'err').length;

  log('─────────────────────────────────');
  log(`Starting merge of ${valid.length} ${valid.length === 1 ? 'file' : 'files'}...`, 'ok');

  for (let i = 0; i < valid.length; i++) {
    const f = valid[i];
    const shortName = f.name.split(/[/\\]/).pop();
    setProgress((i / valid.length) * 70, `Processing ${i+1} of ${valid.length}`);
    setProgCurrent(`[${i+1}/${valid.length}] ${shortName}`);
    log(`Merging: ${shortName} (${f.games.length} entries)`);
    if (i % 20 === 0) await sleep(0);

    for (const g of f.games) {
      const gc = { ...g, rom: [...g.rom] };
      if (addPrefix) {
        const prefix = f.header.name || f.name.replace(/\.(dat|xml)$/i, '');
        gc.name = `${prefix} - ${g.name}`;
        gc.description = `${prefix} - ${g.description}`;
      }
      if (!keepDupes) {
        const key = g.name + '|' + (g.rom[0]?.crc || '');
        if (seenKeys.has(key)) { skippedDupes++; continue; }
        seenKeys.add(key);
      }
      allGames.push(gc);
    }
  }

  const dupMsg = skippedDupes ? ` (${skippedDupes} duplicates removed)` : '';
  log(`Collected ${allGames.length} ${allGames.length === 1 ? 'entry' : 'entries'}${dupMsg}`, 'ok');
  setProgress(75, 'Saving file...'); setProgCurrent('Opening save dialog...'); await sleep(0);

  const result = await window.electronAPI.saveMerged({ suggestedName: outName, header: { name: outName, version, author }, games: allGames });

  if (result.ok) {
    const sizeMB = (result.size / 1024 / 1024).toFixed(2);
    setProgress(100, 'Merge complete!');
    setProgCurrent(`✓ Saved: ${sizeMB} MB · ${allGames.length} entries`);
    log(`Saved: ${result.path}`, 'ok');
    log(`── Merge complete.`, 'ok');
    setStatus('DONE');

    await sleep(600); hideProgress(); await sleep(200);

    // Show summary
    showSummary({ filePath: result.path, entries: allGames.length, sizeMB, sources: valid.length, dupes: skippedDupes, errors: errorCount });

    // Reset in background (already done, user sees summary)
    resetState();
    setStatus('READY');

  } else {
    log('Save cancelled.', 'warn');
    setProgress(0, 'Cancelled.'); setProgCurrent('');
    setStatus('READY'); await sleep(400); hideProgress();
    btn.disabled = false;
  }
}

// ============================================================
// UI HELPERS
// ============================================================
function updateFileList(files) {
  const list = document.getElementById('file-list');
  if (!files.length) {
    list.innerHTML = '<div class="empty-list"><span class="big">[ ]</span><span>No files loaded yet</span></div>';
    return;
  }
  list.innerHTML = files.map(f => {
    const shortName = f.name.split(/[/\\]/).pop();
    const subPath   = (f.name.includes('/') || f.name.includes('\\')) ? f.name.replace(/[/\\][^/\\]+$/, '') : '';
    return `<div class="file-item">
      <span class="fi-icon">${f.type === 'err' ? '✗' : '◈'}</span>
      <div class="fi-names">
        <span class="fi-name">${escHTML(shortName)}</span>
        ${subPath ? `<span class="fi-path">${escHTML(subPath)}</span>` : ''}
      </div>
      <span class="fi-badge ${f.type === 'clr' ? 'clr' : f.type === 'err' ? 'err' : 'xml'}">${f.type === 'clr' ? 'CLR' : f.type === 'err' ? 'ERR' : 'XML'}</span>
      <span class="fi-count">${f.type !== 'err' ? f.games.length + (f.games.length === 1 ? ' game' : ' games') : 'error'}</span>
    </div>`;
  }).join('');
}

function updateStats() {
  const valid = loadedFiles.filter(f => f.type !== 'err');
  document.getElementById('stat-files').textContent     = fmtNum(valid.length);
  document.getElementById('stat-games').textContent     = fmtNum(valid.reduce((s,f) => s + f.games.length, 0));
  document.getElementById('stat-roms').textContent      = fmtNum(valid.reduce((s,f) => s + f.roms, 0));
  document.getElementById('stat-converted').textContent = fmtNum(loadedFiles.filter(f => f.type === 'clr').length);
}

function fmtNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n/1000).toFixed(1) + 'K';
  return n.toString();
}

function setProgress(pct, label) {
  document.getElementById('prog-fill').style.width  = pct + '%';
  document.getElementById('prog-pct').textContent   = Math.round(pct) + '%';
  document.getElementById('prog-label').textContent = label;
}

function setStatus(text) {
  document.getElementById('status-text').textContent = text;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

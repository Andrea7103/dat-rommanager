// ============================================================
// MODULE 05 — DAT GENERATOR
// Mode A: Scan ROM folder → generate DAT from file hashes
// Mode B: Run emulator EXE → parse stdout XML as DAT
// ============================================================

let genMode       = 'folder';   // 'folder' | 'emulator'
let genFolderPath = null;
let genExePath    = null;
let genGames      = [];         // final game list after generation
let genRunning    = false;

// Known emulator profiles: exe name fragment → { label, args, note }
const EMULATOR_PROFILES = [
  { match: /\bmame\b/i,    label: 'MAME',    args: '-listxml',          note: 'Generates full MAME XML DAT' },
  { match: /hbmame/i,      label: 'HBMAME',  args: '-listxml',          note: 'Homebrew MAME fork' },
  { match: /mame64/i,      label: 'MAME64',  args: '-listxml',          note: 'MAME 64-bit' },
  { match: /fbneo|fba/i,   label: 'FBNeo',   args: '-listxml',          note: 'FinalBurn Neo' },
  { match: /nebula/i,      label: 'Nebula',  args: '-listgames',        note: 'Nebula emulator' },
  { match: /pinmame/i,     label: 'PinMAME', args: '-listxml',          note: 'PinMAME / Visual PinMAME' },
  { match: /mess/i,        label: 'MESS',    args: '-listxml',           note: 'MESS (Multi Emulator Super System)' },
  { match: /groovymame/i,  label: 'GroovyMAME', args: '-listxml',       note: 'GroovyMAME fork' },
  { match: /raine/i,       label: 'Raine',   args: '--listxml',         note: 'Raine emulator' },
];

// ============================================================
// INIT
// ============================================================
function initGenerator() {
  setGenMode('folder');
  resetGenDrop();
  genLog('ready', '◈ DAT GENERATOR ready — drop a folder or emulator EXE to begin');
}

// ============================================================
// MODE SWITCH
// ============================================================
function setGenMode(mode) {
  genMode = mode;
  document.getElementById('gen-mode-folder').classList.toggle('active', mode === 'folder');
  document.getElementById('gen-mode-emu').classList.toggle('active',    mode === 'emulator');
  document.getElementById('gen-panel-folder').style.display   = mode === 'folder'   ? '' : 'none';
  document.getElementById('gen-panel-emu').style.display      = mode === 'emulator' ? '' : 'none';
  document.getElementById('gen-drop-icon-folder').style.display   = mode === 'folder'   ? '' : 'none';
  document.getElementById('gen-drop-icon-emu').style.display      = mode === 'emulator' ? '' : 'none';
  document.getElementById('gen-drop-hint-folder').style.display  = mode === 'folder'   ? '' : 'none';
  document.getElementById('gen-drop-hint-emu').style.display     = mode === 'emulator' ? '' : 'none';
  resetGenDrop();
  clearGenConsole();
  genLog('ready', `◈ Mode: ${mode === 'folder' ? 'ROM Folder Scan' : 'Emulator EXE'} — drop ${mode === 'folder' ? 'a folder' : 'an EXE'} or use the button below`);
}

// ============================================================
// DROP ZONE
// ============================================================
function initGenDropZone() {
  const zone = document.getElementById('gen-drop-zone');

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const item = e.dataTransfer.files[0];
    if (!item) return;
    await handleGenDrop(item.path, item.name);
  });
}

async function handleGenDrop(filePath, fileName) {
  if (genMode === 'folder') {
    // Accept folders
    genFolderPath = filePath;
    genLog('info', `📂 Folder loaded: ${filePath}`);
    showGenFolderInfo(filePath, fileName);
    document.getElementById('gen-run-btn').disabled = false;
  } else {
    // Accept EXE
    genExePath = filePath;
    const profile = detectEmulatorProfile(fileName);
    showGenEmuInfo(filePath, fileName, profile);
    genLog('info', `🎮 Emulator loaded: ${fileName}`);
    if (profile) genLog('info', `◈ Auto-detected: ${profile.label} — args: ${profile.args}`);
    else         genLog('warn', `⚠ Unknown emulator — set args manually`);
    document.getElementById('gen-run-btn').disabled = false;
  }
}

async function browseGenFolder() {
  const fp = await window.electronAPI.selectRomFolder();
  if (fp) {
    const name = fp.split(/[\\/]/).pop();
    await handleGenDrop(fp, name);
  }
}

async function browseGenExe() {
  const fp = await window.electronAPI.selectExeFile();
  if (fp) {
    const name = fp.split(/[\\/]/).pop();
    await handleGenDrop(fp, name);
  }
}

function resetGenDrop() {
  genFolderPath = null;
  genExePath    = null;
  genGames      = [];
  document.getElementById('gen-folder-info').style.display = 'none';
  document.getElementById('gen-emu-info').style.display    = 'none';
  document.getElementById('gen-run-btn').disabled          = true;
  document.getElementById('gen-save-btn').disabled         = true;
  document.getElementById('gen-progress-bar').style.width  = '0%';
  document.getElementById('gen-stat-files').textContent    = '0';
  document.getElementById('gen-stat-games').textContent    = '0';
  document.getElementById('gen-stat-size').textContent     = '—';
}

// ============================================================
// EMULATOR PROFILE DETECTION
// ============================================================
function detectEmulatorProfile(exeName) {
  return EMULATOR_PROFILES.find(p => p.match.test(exeName)) || null;
}

function showGenFolderInfo(fp, name) {
  document.getElementById('gen-folder-info').style.display = '';
  document.getElementById('gen-folder-name').textContent   = name;
  document.getElementById('gen-folder-path').textContent   = fp;
}

function showGenEmuInfo(fp, name, profile) {
  document.getElementById('gen-emu-info').style.display = '';
  document.getElementById('gen-emu-name').textContent   = name;
  document.getElementById('gen-emu-label').textContent  = profile ? profile.label : 'Unknown';
  document.getElementById('gen-emu-note').textContent   = profile ? profile.note  : 'Set arguments manually';
  const argsEl = document.getElementById('gen-emu-args');
  if (profile && !argsEl.dataset.userEdited) argsEl.value = profile.args;
}

function genEmuArgsEdited() {
  document.getElementById('gen-emu-args').dataset.userEdited = '1';
}

// ============================================================
// RUN
// ============================================================
async function runGenerator() {
  if (genRunning) return;
  genRunning = true;
  genGames   = [];
  document.getElementById('gen-run-btn').disabled  = true;
  document.getElementById('gen-save-btn').disabled = true;
  document.getElementById('gen-progress-bar').style.width = '0%';
  document.getElementById('gen-stat-files').textContent   = '0';
  document.getElementById('gen-stat-games').textContent   = '0';
  document.getElementById('gen-stat-size').textContent    = '—';
  clearGenConsole();

  // Subscribe to progress events
  window.electronAPI.offGenProgress();
  window.electronAPI.onGenProgress(evt => handleGenProgress(evt));

  try {
    if (genMode === 'folder') {
      await runFolderScan();
    } else {
      await runEmulatorMode();
    }
  } catch(e) {
    genLog('error', `❌ Error: ${e.message}`);
  }

  window.electronAPI.offGenProgress();
  genRunning = false;
  document.getElementById('gen-run-btn').disabled = false;
}

// ── MODE A: FOLDER SCAN ──────────────────────────────────
async function runFolderScan() {
  if (!genFolderPath) { genLog('error','❌ No folder selected'); return; }
  const recursive = document.getElementById('gen-opt-recursive').checked;
  genLog('info', `⚙ Options: recursive=${recursive}`);

  const result = await window.electronAPI.scanRomFolder({ folderPath: genFolderPath, recursive });
  if (!result.ok) { genLog('error', '❌ Scan failed'); return; }
  genGames = result.games;
  document.getElementById('gen-stat-games').textContent = genGames.length.toLocaleString();
  document.getElementById('gen-save-btn').disabled = genGames.length === 0;
}

// ── MODE B: EMULATOR EXE ─────────────────────────────────
async function runEmulatorMode() {
  if (!genExePath) { genLog('error','❌ No emulator selected'); return; }
  const args = document.getElementById('gen-emu-args').value.trim();
  genLog('info', `⚙ Args: ${args || '(none)'}`);

  const result = await window.electronAPI.runEmulator({ exePath: genExePath, args });
  if (!result.ok) { genLog('error', `❌ ${result.error}`); return; }

  // Parse XML output
  genLog('info', '◈ Parsing XML output...');
  try {
    const parsed = parseEmulatorXML(result.xml);
    genGames = parsed;
    document.getElementById('gen-stat-games').textContent = genGames.length.toLocaleString();
    genLog('success', `✅ Parsed ${genGames.length.toLocaleString()} games from XML`);
    document.getElementById('gen-save-btn').disabled = genGames.length === 0;
  } catch(e) {
    genLog('error', `❌ XML parse error: ${e.message}`);
  }
}

function parseEmulatorXML(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const games = [];

  // Support both <game> and <machine> tags (MAME uses machine)
  const nodes = [...doc.querySelectorAll('game, machine')];
  for (const node of nodes) {
    const name = node.getAttribute('name') || '';
    const desc = node.querySelector('description')?.textContent || name;
    const year = node.querySelector('year')?.textContent || '';
    const mfr  = node.querySelector('manufacturer')?.textContent || '';
    const roms  = [...node.querySelectorAll('rom')].map(r => ({
      name:   r.getAttribute('name') || '',
      size:   r.getAttribute('size') || '',
      crc:    r.getAttribute('crc')  || '',
      md5:    r.getAttribute('md5')  || '',
      sha1:   r.getAttribute('sha1') || '',
    }));
    const disks = [...node.querySelectorAll('disk')].map(d => ({
      name: d.getAttribute('name') || '',
      md5:  d.getAttribute('md5')  || '',
      sha1: d.getAttribute('sha1') || '',
    }));
    games.push({ name, description: desc, year, manufacturer: mfr, rom: roms, disk: disks,
                 cloneof: node.getAttribute('cloneof') || '', romof: node.getAttribute('romof') || '' });
  }
  return games;
}

// ============================================================
// PROGRESS HANDLER
// ============================================================
function handleGenProgress(evt) {
  if (evt.type === 'log') {
    genLog(evt.cls || 'dim', evt.msg);
  } else if (evt.type === 'progress') {
    document.getElementById('gen-stat-files').textContent = evt.done.toLocaleString();
    if (evt.total > 0) {
      const pct = Math.round((evt.done / evt.total) * 100);
      document.getElementById('gen-progress-bar').style.width = pct + '%';
    }
  } else if (evt.type === 'total') {
    document.getElementById('gen-stat-size').textContent = evt.total.toLocaleString() + ' files';
  }
}

// ============================================================
// CONSOLE
// ============================================================
function clearGenConsole() {
  document.getElementById('gen-console').innerHTML = '';
}

function genLog(cls, msg) {
  const console = document.getElementById('gen-console');
  if (!console) return;
  const line = document.createElement('div');
  // Map cls names from main.js events to CSS classes
  const cssMap = {
    'gen-info': 'info', 'gen-ok': 'ok', 'gen-success': 'success',
    'gen-warn': 'warn', 'gen-error': 'error', 'gen-dim': 'dim', 'ready': 'ready'
  };
  const cssClass = cssMap[cls] || cls || 'dim';
  line.className = `gen-line gen-${cssClass}`;
  line.textContent = msg;
  console.appendChild(line);
  console.scrollTop = console.scrollHeight;
}

// ============================================================
// SAVE OUTPUT
// ============================================================
async function saveGeneratedDat() {
  if (!genGames.length) return;

  const name    = document.getElementById('gen-out-name').value.trim()    || 'Generated DAT';
  const version = document.getElementById('gen-out-version').value.trim() || '';
  const author  = document.getElementById('gen-out-author').value.trim()  || '';
  const cat     = document.getElementById('gen-out-category').value.trim()|| '';

  const result = await window.electronAPI.saveGeneratedDat({
    suggestedName: name,
    header: { name, description: name, version, author, category: cat },
    games:  genGames,
  });

  if (result.ok) {
    const kb = (result.size / 1024).toFixed(1);
    genLog('success', `💾 Saved: ${result.path} (${kb} KB)`);
  } else {
    genLog('warn', '⚠ Save cancelled');
  }
}

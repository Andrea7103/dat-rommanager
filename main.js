const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1050,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenu(null);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ============================================================
// IPC: Open URL in system browser
// ============================================================
ipcMain.handle('open-external', async (event, url) => {
  if (url && url.startsWith('https://')) {
    await shell.openExternal(url);
  }
});

// ============================================================
// IPC: Select folder dialog
// ============================================================
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select DAT folder',
  });
  return result.canceled ? null : result.filePaths[0];
});


// ============================================================
// IPC: Select single DAT file (for Explorer)
// ============================================================
ipcMain.handle('select-dat-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select DAT file',
    filters: [{ name: 'DAT Files', extensions: ['dat', 'xml'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ============================================================
// IPC: Scan folder recursively, return list of .dat/.xml paths
// ============================================================
ipcMain.handle('scan-folder', async (event, folderPath) => {
  const results = [];
  async function walk(dir) {
    let entries;
    try { entries = await fsPromises.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && /\.(dat|xml)$/i.test(e.name)) {
        results.push(full);
      }
    }
  }
  await walk(folderPath);
  return results;
});

// ============================================================
// IPC: Read a single file — handles UTF-8, UTF-16 LE/BE
// ============================================================
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const raw = await fsPromises.readFile(filePath);

    // UTF-16 LE BOM: FF FE
    if (raw[0] === 0xFF && raw[1] === 0xFE) {
      return raw.slice(2).toString('utf16le');
    }

    // UTF-16 BE BOM: FE FF — swap bytes then decode as utf16le
    if (raw[0] === 0xFE && raw[1] === 0xFF) {
      const body = raw.slice(2);
      const swapped = Buffer.alloc(body.length);
      for (let i = 0; i < body.length - 1; i += 2) {
        swapped[i]     = body[i + 1];
        swapped[i + 1] = body[i];
      }
      return swapped.toString('utf16le');
    }

    // UTF-8 BOM: EF BB BF
    if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
      return raw.slice(3).toString('utf8');
    }

    // Default: UTF-8
    return raw.toString('utf8');
  } catch (e) {
    return null;
  }
});

// ============================================================
// IPC: Save dialog + streaming XML write
// ============================================================
ipcMain.handle('save-merged', async (event, { suggestedName, header, games }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save merged DAT',
    defaultPath: suggestedName.endsWith('.dat') ? suggestedName : suggestedName + '.dat',
    filters: [{ name: 'DAT Files', extensions: ['dat', 'xml'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false };

  const outPath = result.filePath;
  const stream = fs.createWriteStream(outPath, { encoding: 'utf8' });

  const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // Write header
  stream.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
  stream.write(`<!DOCTYPE datafile PUBLIC "-//Logiqx//DTD ROM Management Datafile//EN" "http://www.logiqx.com/Docs/romdat.dtd">\n`);
  stream.write(`<datafile>\n`);
  stream.write(`\t<header>\n`);
  stream.write(`\t\t<name>${esc(header.name)}</name>\n`);
  stream.write(`\t\t<description>${esc(header.name)} - Merged DAT</description>\n`);
  stream.write(`\t\t<version>${esc(header.version)}</version>\n`);
  stream.write(`\t\t<author>${esc(header.author)}</author>\n`);
  stream.write(`\t\t<homepage>DAT//MERGER</homepage>\n`);
  stream.write(`\t</header>\n`);

  // Write games one by one (streaming = no memory spike)
  for (const g of games) {
    const cloneAttr = g.cloneof ? ` cloneof="${esc(g.cloneof)}"` : '';
    stream.write(`\t<game name="${esc(g.name)}"${cloneAttr}>\n`);
    stream.write(`\t\t<description>${esc(g.description)}</description>\n`);
    if (g.year)         stream.write(`\t\t<year>${esc(g.year)}</year>\n`);
    if (g.manufacturer) stream.write(`\t\t<manufacturer>${esc(g.manufacturer)}</manufacturer>\n`);
    for (const r of g.rom) {
      const attrs = [
        r.name ? ` name="${esc(r.name)}"` : '',
        r.size ? ` size="${esc(r.size)}"` : '',
        r.crc  ? ` crc="${esc(r.crc)}"` : '',
        r.md5  ? ` md5="${esc(r.md5)}"` : '',
        r.sha1 ? ` sha1="${esc(r.sha1)}"` : '',
      ].join('');
      stream.write(`\t\t<rom${attrs}/>\n`);
    }
    stream.write(`\t</game>\n`);
  }

  stream.write(`</datafile>\n`);

  await new Promise((resolve, reject) => {
    stream.end(err => err ? reject(err) : resolve());
  });

  const stats = await fsPromises.stat(outPath);
  return { ok: true, path: outPath, size: stats.size };
});

// ============================================================
// IPC: Select any files (for Checksum Calculator)
// ============================================================
ipcMain.handle('select-any-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select files to compute checksums',
  });
  return result.canceled ? [] : result.filePaths;
});

// ============================================================
// IPC: Read file as raw buffer (for Checksum Calculator)
// ============================================================
ipcMain.handle('read-file-buffer', async (event, filePath) => {
  try {
    const raw = await fsPromises.readFile(filePath);
    // Return as array so it can be transferred via IPC
    return Array.from(raw);
  } catch (e) {
    return null;
  }
});

// ============================================================
// IPC: Check for updates on GitHub
// ============================================================
ipcMain.handle('check-updates', async () => {
  try {
    const https = require('https');
    return await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/Andrea7103/dat-rommanager/releases/latest',
        headers: { 'User-Agent': 'dat-rommanager/0.9.0-beta' },
      };
      https.get(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
  } catch(e) { return null; }
});

// ============================================================
// IPC: Parse large DAT file in main process (streaming + progress)
// ============================================================
ipcMain.handle('parse-dat-file', async (event, filePath) => {
  try {
    // Progress helper — sends to renderer
    const sendProgress = (pct, msg) => {
      try { event.sender.send('parse-progress', { pct, msg }); } catch(e) {}
    };

    sendProgress(2, 'Reading file...');
    const raw = await fsPromises.readFile(filePath);

    sendProgress(10, 'Detecting encoding...');
    let text;
    if (raw[0] === 0xFF && raw[1] === 0xFE) {
      text = raw.slice(2).toString('utf16le');
    } else if (raw[0] === 0xFE && raw[1] === 0xFF) {
      const body = raw.slice(2);
      const swapped = Buffer.alloc(body.length);
      for (let i = 0; i < body.length - 1; i += 2) {
        swapped[i] = body[i+1]; swapped[i+1] = body[i];
      }
      text = swapped.toString('utf16le');
    } else if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
      text = raw.slice(3).toString('utf8');
    } else {
      text = raw.toString('utf8');
    }

    sendProgress(15, 'Detecting format...');
    const isCLR = /^\s*(clrmamepro|game|resource)\s*\(/mi.test(text);

    const result = isCLR
      ? parseCLRMain(text, sendProgress)
      : parseXMLMain(text, sendProgress);

    sendProgress(100, `Done — ${result.games.length.toLocaleString()} entries`);
    return result;
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

function parseXMLMain(text, sendProgress) {
  const header = { name:'', description:'', category:'', version:'', date:'', author:'', homepage:'', url:'', rompath:'' };
  const games = [];

  const tagVal = (t, s) => { const m = s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, 'i')); return m ? m[1].trim() : ''; };
  const hdrMatch = text.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  if (hdrMatch) {
    const h = hdrMatch[1];
    header.name        = tagVal('name', h) || tagVal('n', h);
    header.description = tagVal('description', h);
    header.category    = tagVal('category', h);
    header.version     = tagVal('version', h);
    header.date        = tagVal('date', h);
    header.author      = tagVal('author', h);
    header.homepage    = tagVal('homepage', h);
    header.url         = tagVal('url', h);
    header.rompath     = tagVal('rompath', h) || tagVal('rom_path', h);
  }

  // Count total games for progress (fast pre-scan)
  const totalApprox = (text.match(/<(?:game|machine)[\s>]/gi) || []).length || 1;
  sendProgress(20, `Found ~${totalApprox.toLocaleString()} entries, parsing...`);

  const gameRe = /<(?:game|machine)([\s\S]*?)<\/(?:game|machine)>/gi;
  const attrRe = (attr, s) => { const m = s.match(new RegExp(`\\b${attr}="([^"]*)"`,'i')); return m ? unescXML(m[1]) : ''; };

  let m, count = 0;
  let lastPct = 20;
  while ((m = gameRe.exec(text)) !== null) {
    const block = m[0];
    const attrsStr = m[1].split('>')[0];

    const roms = [];
    const romRe = /<rom([^>]*)\/?>/gi;
    let rm;
    while ((rm = romRe.exec(block)) !== null) {
      const ra = rm[1];
      roms.push({
        name:   attrRe('name', ra),   size:   attrRe('size', ra),
        crc:    attrRe('crc', ra),    md5:    attrRe('md5', ra),
        sha1:   attrRe('sha1', ra),   sha256: attrRe('sha256', ra),
        status: attrRe('status', ra), region: attrRe('region', ra),
      });
    }
    const disks = [];
    const diskRe = /<disk([^>]*)\/?>/gi;
    let dm;
    while ((dm = diskRe.exec(block)) !== null) {
      const da = dm[1];
      disks.push({ name: attrRe('name', da), md5: attrRe('md5', da), sha1: attrRe('sha1', da) });
    }

    games.push({
      name: attrRe('name', attrsStr),
      description: tagVal('description', block) || attrRe('name', attrsStr),
      year: tagVal('year', block), manufacturer: tagVal('manufacturer', block),
      cloneof: attrRe('cloneof', attrsStr), romof: attrRe('romof', attrsStr),
      isbios: attrRe('isbios', attrsStr), sampleof: attrRe('sampleof', attrsStr),
      category: tagVal('category', block), rom: roms, disk: disks,
    });

    count++;
    // Send progress every 2000 entries
    if (count % 2000 === 0) {
      const pct = Math.min(95, 20 + Math.round((count / totalApprox) * 75));
      if (pct > lastPct) {
        sendProgress(pct, `Parsed ${count.toLocaleString()} / ~${totalApprox.toLocaleString()} entries...`);
        lastPct = pct;
      }
    }
  }

  return { ok: true, games, header, type: 'XML (Logiqx)', encoding: 'UTF-8' };
}

function parseCLRMain(text, sendProgress) {
  const header = { name:'', description:'', category:'', version:'', date:'', author:'', homepage:'', url:'', rompath:'' };
  const exCLR = (block, field) => { const m = block.match(new RegExp(`\\b${field}\\s+"([^"]*)"`, 'i')); return m ? m[1] : ''; };

  const hm = text.match(/clrmamepro\s*\(([\s\S]*?)\)/i);
  if (hm) {
    ['name','description','category','version','date','author','homepage','url','rompath'].forEach(f => { header[f] = exCLR(hm[1], f); });
  }

  const totalApprox = (text.match(/(?:^|\n)\s*(?:game|resource)\s*\(/gm) || []).length || 1;
  sendProgress(20, `Found ~${totalApprox.toLocaleString()} entries, parsing...`);

  const games = [];
  const gameRe = /(?:^|\n)\s*(?:game|resource)\s*\(([\s\S]*?)\n\s*\)/gm;
  let m, count = 0, lastPct = 20;
  while ((m = gameRe.exec(text)) !== null) {
    const block = m[1];
    const roms = [];
    const romRe = /rom\s*\((.*?)\)/gs;
    let rm;
    while ((rm = romRe.exec(block)) !== null) {
      const rb = rm[1];
      roms.push({ name: exCLR(rb,'name'), size: exCLR(rb,'size'), crc: exCLR(rb,'crc'), md5: exCLR(rb,'md5'), sha1: exCLR(rb,'sha1'), sha256: '', status: exCLR(rb,'flags'), region: '' });
    }
    const gname = exCLR(block,'name');
    games.push({ name: gname, description: exCLR(block,'description')||gname, year: exCLR(block,'year'), manufacturer: exCLR(block,'manufacturer'), cloneof: exCLR(block,'cloneof'), romof:'', isbios:'', sampleof:'', category:'', rom: roms, disk: [] });

    count++;
    if (count % 2000 === 0) {
      const pct = Math.min(95, 20 + Math.round((count / totalApprox) * 75));
      if (pct > lastPct) {
        sendProgress(pct, `Parsed ${count.toLocaleString()} / ~${totalApprox.toLocaleString()} entries...`);
        lastPct = pct;
      }
    }
  }

  return { ok: true, games, header, type: 'ClrMamePro', encoding: 'UTF-8' };
}

function unescXML(s) {
  return (s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}

// ============================================================
// IPC: Select output folder for splitter
// ============================================================
// ============================================================
// IPC: Select EXE file (for DAT Generator — emulator mode)
// ============================================================
ipcMain.handle('select-exe-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select emulator executable',
    filters: [
      { name: 'Executables', extensions: ['exe','bat','sh','cmd','app'] },
      { name: 'All Files',   extensions: ['*'] }
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ============================================================
// IPC: Select ROM folder (for DAT Generator — folder mode)
// ============================================================
ipcMain.handle('select-rom-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder containing ROM files',
  });
  return result.canceled ? null : result.filePaths[0];
});

// ============================================================
// IPC: Scan ROM folder — stream progress, return file list
// ============================================================
ipcMain.handle('scan-rom-folder', async (event, { folderPath, recursive }) => {
  const send = (type, data) => { try { event.sender.send('gen-progress', { type, ...data }); } catch(e){} };
  const { createReadStream } = fs;
  const crypto = require('crypto');

  // CRC32 table
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c;}
    return t;
  })();

  // Walk directory
  const allFiles = [];
  async function walk(dir, depth) {
    let entries;
    try { entries = await fsPromises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && recursive) { await walk(full, depth + 1); }
      else if (e.isFile()) { allFiles.push({ full, name: e.name, rel: path.relative(folderPath, full) }); }
    }
  }

  send('log',  { msg: `📂 Scanning folder: ${folderPath}`, cls: 'gen-info' });
  await walk(folderPath, 0);
  send('log',  { msg: `📋 Found ${allFiles.length} files — computing hashes...`, cls: 'gen-info' });
  send('total',{ total: allFiles.length });

  const games = [];
  let done = 0;

  for (const f of allFiles) {
    send('log', { msg: `⧗ ${f.rel}`, cls: 'gen-dim' });
    let stat;
    try { stat = await fsPromises.stat(f.full); } catch { done++; continue; }

    // CRC32 + MD5 + SHA1 via streams
    let crc = 0xFFFFFFFF;
    const md5h  = crypto.createHash('md5');
    const sha1h = crypto.createHash('sha1');

    await new Promise((resolve, reject) => {
      const stream = createReadStream(f.full);
      stream.on('data', chunk => {
        const u8 = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.length);
        for (let i=0;i<u8.length;i++) crc=(crc>>>8)^CRC_TABLE[(crc^u8[i])&0xFF];
        md5h.update(chunk);
        sha1h.update(chunk);
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    }).catch(() => {});

    const crcStr  = ((crc^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0').toUpperCase();
    const md5Str  = md5h.digest('hex').toUpperCase();
    const sha1Str = sha1h.digest('hex').toUpperCase();
    const baseName = path.basename(f.name, path.extname(f.name));

    games.push({
      name:        baseName,
      description: baseName,
      rom: [{
        name: f.name,
        size: String(stat.size),
        crc:  crcStr,
        md5:  md5Str,
        sha1: sha1Str,
      }]
    });

    done++;
    send('progress', { done, total: allFiles.length, file: f.rel, crc: crcStr });
    send('log', { msg: `✔ ${f.name}  CRC:${crcStr}  MD5:${md5Str.slice(0,8)}…  Size:${stat.size}`, cls: 'gen-ok' });
  }

  send('log', { msg: `✅ Done — ${games.length} games generated`, cls: 'gen-success' });
  return { ok: true, games };
});

// ============================================================
// IPC: Run emulator → stream stdout as DAT
// ============================================================
ipcMain.handle('run-emulator', async (event, { exePath, args }) => {
  const send = (type, data) => { try { event.sender.send('gen-progress', { type, ...data }); } catch(e){} };
  const { spawn } = require('child_process');
  const workDir  = path.dirname(exePath);
  const exeName  = path.basename(exePath);

  send('log', { msg: `🚀 Launching: ${exeName} ${args}`, cls: 'gen-info' });
  send('log', { msg: `📁 Working dir: ${workDir}`, cls: 'gen-dim' });

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let lineCount = 0;
    let gameCount = 0;

    const child = spawn(exePath, args.split(/\s+/).filter(Boolean), {
      cwd: workDir,
      windowsHide: true,
    });

    child.stdout.on('data', chunk => {
      const text = chunk.toString('utf8');
      stdout += text;
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        lineCount++;
        if (line.includes('<game ') || line.includes('<machine ')) gameCount++;
        if (lineCount <= 3 || line.includes('<game ') || line.includes('<machine ') || line.includes('</game>') || line.includes('</machine>')) {
          send('log', { msg: line.trimEnd(), cls: 'gen-dim' });
        } else if (lineCount % 500 === 0) {
          send('log', { msg: `  … ${lineCount.toLocaleString()} lines, ${gameCount.toLocaleString()} games so far`, cls: 'gen-info' });
        }
        send('progress', { done: gameCount, total: 0, file: `${lineCount.toLocaleString()} lines` });
      }
    });

    child.stderr.on('data', chunk => {
      const text = chunk.toString('utf8');
      stderr += text;
      send('log', { msg: `⚠ ${text.trim()}`, cls: 'gen-warn' });
    });

    child.on('error', err => {
      send('log', { msg: `❌ Failed to launch: ${err.message}`, cls: 'gen-error' });
      resolve({ ok: false, error: err.message });
    });

    child.on('close', code => {
      send('log', { msg: `✅ Process exited (code ${code}) — ${lineCount.toLocaleString()} lines, ~${gameCount.toLocaleString()} games`, cls: 'gen-success' });
      resolve({ ok: true, xml: stdout, exitCode: code });
    });
  });
});

// ============================================================
// IPC: Save generated DAT file
// ============================================================
ipcMain.handle('save-generated-dat', async (event, { suggestedName, header, games }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Generated DAT',
    defaultPath: suggestedName.endsWith('.dat') ? suggestedName : suggestedName + '.dat',
    filters: [{ name: 'DAT Files', extensions: ['dat', 'xml'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false };

  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const stream = fs.createWriteStream(result.filePath, { encoding: 'utf8' });

  stream.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
  stream.write(`<!DOCTYPE datafile PUBLIC "-//Logiqx//DTD ROM Management Datafile//EN" "http://www.logiqx.com/Docs/romdat.dtd">\n`);
  stream.write(`<datafile>\n\t<header>\n`);
  stream.write(`\t\t<name>${esc(header.name)}</name>\n`);
  stream.write(`\t\t<description>${esc(header.description||header.name)}</description>\n`);
  if (header.version)  stream.write(`\t\t<version>${esc(header.version)}</version>\n`);
  if (header.author)   stream.write(`\t\t<author>${esc(header.author)}</author>\n`);
  if (header.category) stream.write(`\t\t<category>${esc(header.category)}</category>\n`);
  stream.write(`\t\t<homepage>DAT//GENERATOR</homepage>\n`);
  stream.write(`\t</header>\n`);

  for (const g of games) {
    stream.write(`\t<game name="${esc(g.name)}">\n`);
    stream.write(`\t\t<description>${esc(g.description||g.name)}</description>\n`);
    for (const r of (g.rom||[])) {
      const ra = [
        r.name ? ` name="${esc(r.name)}"` : '',
        r.size ? ` size="${esc(r.size)}"` : '',
        r.crc  ? ` crc="${esc(r.crc)}"` : '',
        r.md5  ? ` md5="${esc(r.md5)}"` : '',
        r.sha1 ? ` sha1="${esc(r.sha1)}"` : '',
      ].join('');
      stream.write(`\t\t<rom${ra}/>\n`);
    }
    stream.write(`\t</game>\n`);
  }

  stream.write(`</datafile>\n`);
  await new Promise((res, rej) => stream.end(err => err ? rej(err) : res()));
  const stats = await fsPromises.stat(result.filePath);
  return { ok: true, path: result.filePath, size: stats.size };
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select output folder for split DAT files',
  });
  return result.canceled ? null : result.filePaths[0];
});

// ============================================================
// IPC: Save split DAT files (streaming, one file per group)
// ============================================================
ipcMain.handle('save-split', async (event, { outputDir, groups, sourceHeader }) => {
  const sendProg = (pct, msg) => { try { event.sender.send('split-progress', { pct, msg }); } catch(e) {} };
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const writeDAT = async (filePath, header, games) => {
    const stream = fs.createWriteStream(filePath, { encoding:'utf8' });
    stream.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
    stream.write(`<!DOCTYPE datafile PUBLIC "-//Logiqx//DTD ROM Management Datafile//EN" "http://www.logiqx.com/Docs/romdat.dtd">\n`);
    stream.write(`<datafile>\n\t<header>\n`);
    stream.write(`\t\t<name>${esc(header.name)}</name>\n`);
    stream.write(`\t\t<description>${esc(header.description||header.name)}</description>\n`);
    if (header.category)    stream.write(`\t\t<category>${esc(header.category)}</category>\n`);
    if (header.version)     stream.write(`\t\t<version>${esc(header.version)}</version>\n`);
    if (header.date)        stream.write(`\t\t<date>${esc(header.date)}</date>\n`);
    if (header.author)      stream.write(`\t\t<author>${esc(header.author)}</author>\n`);
    if (header.homepage)    stream.write(`\t\t<homepage>${esc(header.homepage)}</homepage>\n`);
    stream.write(`\t\t<homepage>DAT//SPLITTER</homepage>\n`);
    stream.write(`\t</header>\n`);
    for (const g of games) {
      const attrs = [`name="${esc(g.name)}"`];
      if (g.cloneof) attrs.push(`cloneof="${esc(g.cloneof)}"`);
      if (g.romof)   attrs.push(`romof="${esc(g.romof)}"`);
      if (g.isbios==='yes') attrs.push(`isbios="yes"`);
      stream.write(`\t<game ${attrs.join(' ')}>\n`);
      stream.write(`\t\t<description>${esc(g.description||g.name)}</description>\n`);
      if (g.year)         stream.write(`\t\t<year>${esc(g.year)}</year>\n`);
      if (g.manufacturer) stream.write(`\t\t<manufacturer>${esc(g.manufacturer)}</manufacturer>\n`);
      if (g.category)     stream.write(`\t\t<category>${esc(g.category)}</category>\n`);
      for (const r of (g.rom||[])) {
        const ra = [
          r.name   ? ` name="${esc(r.name)}"` : '',
          r.size   ? ` size="${esc(r.size)}"` : '',
          r.crc    ? ` crc="${esc(r.crc)}"` : '',
          r.md5    ? ` md5="${esc(r.md5)}"` : '',
          r.sha1   ? ` sha1="${esc(r.sha1)}"` : '',
          r.sha256 ? ` sha256="${esc(r.sha256)}"` : '',
          r.status ? ` status="${esc(r.status)}"` : '',
          r.region ? ` region="${esc(r.region)}"` : '',
        ].join('');
        stream.write(`\t\t<rom${ra}/>\n`);
      }
      for (const d of (g.disk||[])) {
        const da = [
          d.name ? ` name="${esc(d.name)}"` : '',
          d.md5  ? ` md5="${esc(d.md5)}"` : '',
          d.sha1 ? ` sha1="${esc(d.sha1)}"` : '',
        ].join('');
        stream.write(`\t\t<disk${da}/>\n`);
      }
      stream.write(`\t</game>\n`);
    }
    stream.write(`</datafile>\n`);
    return new Promise((res, rej) => stream.end(err => err ? rej(err) : res()));
  };

  try {
    const results = [];
    let done = 0;
    sendProg(2, `Saving ${groups.length} DAT files...`);

    for (const group of groups) {
      const safeName = group.filename.replace(/[<>:"/\\|?*]/g, '_');
      const filePath = path.join(outputDir, safeName.endsWith('.dat') ? safeName : safeName + '.dat');
      const header = {
        ...sourceHeader,
        name: group.headerName || `${sourceHeader.name} - ${group.label}`,
        description: group.headerName || `${sourceHeader.name} - ${group.label}`,
      };
      await writeDAT(filePath, header, group.games);
      done++;
      results.push({ label: group.label, count: group.games.length, path: filePath });
      const pct = Math.round((done / groups.length) * 95) + 2;
      sendProg(pct, `Saved ${done} / ${groups.length}: ${group.label}`);
    }

    sendProg(100, `Done — ${groups.length} files saved`);
    return { ok: true, results };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

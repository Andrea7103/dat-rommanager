// ============================================================
// DAT EXPLORER — Module 02  |  v0.9.0-beta
// ============================================================
let explorerGames = [];
let filteredGames = [];
let selectedIndex = -1;
let currentSort   = 'az';

// ============================================================
// SYSTEM DATABASE
// Ogni entry può avere più alias per il matching
// ============================================================
const SYSTEM_DB = [
  // ── NINTENDO ──
  { aliases:['nintendo entertainment system','nes','famicom','family computer'],
    manufacturer:'Nintendo', year:'1983',
    desc:'The NES is an 8-bit home console that revitalized the video game industry after the 1983 crash. It became the best-selling console of its time with a library of iconic franchises.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/NES-Console-Set.jpg/320px-NES-Console-Set.jpg' },

  { aliases:['super nintendo entertainment system','snes','super famicom','super nintendo'],
    manufacturer:'Nintendo', year:'1990',
    desc:'The SNES is a 16-bit home console and successor to the NES. It became the best-selling 16-bit era system, home to legendary titles across every genre.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Nintendo-Super-NES-Set.jpg/320px-Nintendo-Super-NES-Set.jpg' },

  { aliases:['nintendo 64','n64'],
    manufacturer:'Nintendo', year:'1996',
    desc:'The Nintendo 64 brought 3D gaming to Nintendo\'s lineup with landmark titles like Super Mario 64 and The Legend of Zelda: Ocarina of Time.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Nintendo64logo.svg/320px-Nintendo64logo.svg.png' },

  { aliases:['game boy advance','gba','gameboy advance'],
    manufacturer:'Nintendo', year:'2001',
    desc:'The Game Boy Advance is a 32-bit handheld that brought Super NES-level graphics to portable gaming, with backward compatibility for all Game Boy cartridges.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Gameboy_advance.jpg/320px-Gameboy_advance.jpg' },

  { aliases:['game boy color','gbc','gameboy color'],
    manufacturer:'Nintendo', year:'1998',
    desc:'The Game Boy Color added a full color screen to the Game Boy formula while retaining full backward compatibility with the original Game Boy library.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Nintendo_Game_Boy_Color.jpg/220px-Nintendo_Game_Boy_Color.jpg' },

  { aliases:['game boy','gb','gameboy','game boy dmg'],
    manufacturer:'Nintendo', year:'1989',
    desc:'The Game Boy is an 8-bit portable console and one of the best-selling handhelds ever made, renowned for its long battery life and near-indestructible build quality.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Game-Boy-FL.jpg/220px-Game-Boy-FL.jpg' },

  { aliases:['nintendo ds','nds'],
    manufacturer:'Nintendo', year:'2004',
    desc:'The Nintendo DS is a dual-screen handheld with a touchscreen on the bottom display. Over 154 million units sold make it one of the best-selling handhelds of all time.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Nintendo_DS_-_Icon.svg/320px-Nintendo_DS_-_Icon.svg.png' },

  { aliases:['nintendo 3ds','3ds'],
    manufacturer:'Nintendo', year:'2011',
    desc:'The Nintendo 3DS displays stereoscopic 3D effects without glasses. It succeeded the DS with backward compatibility and an extensive library of quality titles.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Nintendo-3DS-AquaOpen.jpg/320px-Nintendo-3DS-AquaOpen.jpg' },

  { aliases:['gamecube','nintendo gamecube','gc'],
    manufacturer:'Nintendo', year:'2001',
    desc:'The GameCube is Nintendo\'s fourth home console and the first to use optical discs. Its small proprietary discs and distinctive handle were defining features.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/GameCube-Console-Set.jpg/320px-GameCube-Console-Set.jpg' },

  { aliases:['wii','nintendo wii'],
    manufacturer:'Nintendo', year:'2006',
    desc:'The Wii\'s motion-controlled Wii Remote redefined gaming accessibility, bringing consoles to a much wider audience including families and casual players.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Wii-console.jpg/320px-Wii-console.jpg' },

  { aliases:['virtual boy','virtualboy'],
    manufacturer:'Nintendo', year:'1995',
    desc:'The Virtual Boy was Nintendo\'s attempt at a portable 3D console displaying red monochrome stereoscopic graphics. It was discontinued after poor commercial reception.',
    img:null },

  // ── SEGA ──
  { aliases:['sega master system','master system','sega mark iii','mark iii','sg-1000'],
    manufacturer:'Sega', year:'1985',
    desc:'The Master System is Sega\'s 8-bit home console. While outsold by the NES in North America, it dominated Europe and remains extremely popular in Brazil to this day.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Sega-Master-System-Set.jpg/320px-Sega-Master-System-Set.jpg' },

  { aliases:['sega mega drive','mega drive','sega genesis','genesis','sega megadrive'],
    manufacturer:'Sega', year:'1988',
    desc:'The Mega Drive (Genesis in North America) is Sega\'s most successful console. Home to Sonic the Hedgehog and hundreds of classic titles, it defined 16-bit gaming.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Sega-Mega-Drive-JP-Mk1-Console-Set.jpg/320px-Sega-Mega-Drive-JP-Mk1-Console-Set.jpg' },

  { aliases:['sega game gear','game gear'],
    manufacturer:'Sega', year:'1990',
    desc:'The Game Gear was Sega\'s handheld challenger to the Game Boy, featuring a backlit color screen. Its major weakness was notoriously short battery life (6 AA batteries).',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Game_Gear_Handheld.jpg/320px-Game_Gear_Handheld.jpg' },

  { aliases:['sega saturn','saturn'],
    manufacturer:'Sega', year:'1994',
    desc:'The Saturn excelled at 2D sprite-based games and had a strong library in Japan. Its complex dual-CPU architecture made 3D development challenging but produced impressive 2D titles.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Sega_Saturn_no_background.png/320px-Sega_Saturn_no_background.png' },

  { aliases:['sega dreamcast','dreamcast'],
    manufacturer:'Sega', year:'1998',
    desc:'The Dreamcast was Sega\'s final console and a pioneer of online gaming. Despite its discontinuation in 2001, it retains a passionate fanbase and beloved game library.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Dreamcast_console_set.jpg/320px-Dreamcast_console_set.jpg' },

  { aliases:['sega 32x','32x','sega 32-x'],
    manufacturer:'Sega', year:'1994',
    desc:'The 32X was a Mega Drive add-on adding 32-bit processing. Its short lifespan was due to the imminent Saturn release, resulting in a small but interesting game library.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Sega32X.jpg/320px-Sega32X.jpg' },

  { aliases:['sega cd','mega cd','segacd','megacd'],
    manufacturer:'Sega', year:'1991',
    desc:'The Sega CD (Mega-CD in other regions) added CD-ROM storage to the Mega Drive, enabling FMV games and CD audio, though its capabilities were limited by the host hardware.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Sega-CD-Model1-Set.jpg/320px-Sega-CD-Model1-Set.jpg' },

  // ── SONY ──
  { aliases:['sony playstation','playstation','psx','ps1','psx'],
    manufacturer:'Sony', year:'1994',
    desc:'The original PlayStation was Sony\'s entry into gaming and became the first console to ship over 100 million units, establishing Sony as a major force in the industry.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/PSX-Console-wController.jpg/320px-PSX-Console-wController.jpg' },

  { aliases:['sony playstation 2','playstation 2','ps2'],
    manufacturer:'Sony', year:'2000',
    desc:'The PlayStation 2 is the best-selling video game console of all time with over 155 million units sold. Its DVD playback capability contributed massively to its dominance.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/PlayStation_2_-_set.jpg/320px-PlayStation_2_-_set.jpg' },

  { aliases:['sony playstation 3','playstation 3','ps3'],
    manufacturer:'Sony', year:'2006',
    desc:'The PlayStation 3 introduced Blu-ray playback and the PlayStation Network. It recovered from a slow start to become a strong platform with an excellent exclusive library.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PlayStation_3.jpg/320px-PlayStation_3.jpg' },

  { aliases:['sony psp','psp','playstation portable','sony playstation portable'],
    manufacturer:'Sony', year:'2004',
    desc:'The PlayStation Portable was Sony\'s first handheld, featuring impressive 3D graphics and multimedia capabilities via UMD discs. It sold over 80 million units worldwide.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/PSP_3000.jpg/320px-PSP_3000.jpg' },

  // ── ATARI ──
  { aliases:['atari 2600','atari vcs','2600'],
    manufacturer:'Atari', year:'1977',
    desc:'The Atari 2600 popularized ROM cartridges and is credited with bringing Arcade games to the home. It is one of the most iconic and influential consoles in gaming history.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Atari_2600_wooden_4Sw_Sears_set.jpg/320px-Atari_2600_wooden_4Sw_Sears_set.jpg' },

  { aliases:['atari 5200','5200'],
    manufacturer:'Atari', year:'1982',
    desc:'The Atari 5200 SuperSystem offered improved graphics over the 2600 but suffered from a controversial non-centering joystick and lack of 2600 cartridge compatibility.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Atari_5200.jpg/220px-Atari_5200.jpg' },

  { aliases:['atari 7800','7800'],
    manufacturer:'Atari', year:'1986',
    desc:'The Atari 7800 ProSystem was backward-compatible with the 2600. It competed directly against the NES and Sega Master System but lost market share rapidly.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Atari7800.jpg/320px-Atari7800.jpg' },

  { aliases:['atari jaguar','jaguar'],
    manufacturer:'Atari', year:'1993',
    desc:'The Jaguar was Atari\'s last console, marketed as the first 64-bit system. Despite some impressive technical titles, a limited library led to poor sales and discontinuation.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Atari_Jaguar_Console_%26_Controller.jpg/320px-Atari_Jaguar_Console_%26_Controller.jpg' },

  { aliases:['atari st','atari-st','atarist'],
    manufacturer:'Atari', year:'1985',
    desc:'The Atari ST series used a Motorola 68000 CPU and was hugely popular in Europe. Its built-in MIDI ports made it a staple of professional music studios throughout the late 1980s.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Atari_1040STf.jpg/320px-Atari_1040STf.jpg' },

  { aliases:['atari 8-bit','atari 400','atari 800','atari xe','atari xl','atari 8bit'],
    manufacturer:'Atari', year:'1979',
    desc:'The Atari 8-bit family were technically advanced home computers for their era, featuring custom chips for graphics and sound that outperformed contemporary systems.',
    img:null },

  { aliases:['atari lynx','lynx'],
    manufacturer:'Atari', year:'1989',
    desc:'The Atari Lynx was the world\'s first handheld with a color LCD screen. Technically impressive but limited by battery life and a smaller game library than competitors.',
    img:null },

  // ── COMMODORE / AMIGA ──
  { aliases:['commodore 64','c64','c-64','cbm 64','commodore64'],
    manufacturer:'Commodore', year:'1982',
    desc:'The Commodore 64 is the best-selling single personal computer model of all time. Its SID sound chip produced iconic audio that influenced electronic music for decades.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Commodore64.jpg/320px-Commodore64.jpg' },

  { aliases:['amiga','commodore amiga','amiga 500','amiga 1200','amiga 600','amiga 1000','amiga 2000','amiga 3000','amiga 4000','amiga aga','amiga ocs','amiga ecs'],
    manufacturer:'Commodore', year:'1985',
    desc:'The Amiga line featured custom chips (Agnus, Denise, Paula) handling graphics and audio independently of the CPU. Technically far ahead of its time and hugely popular in Europe.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Amiga500_system.jpg/320px-Amiga500_system.jpg' },

  { aliases:['commodore vic-20','vic-20','vic20'],
    manufacturer:'Commodore', year:'1980',
    desc:'The VIC-20 was Commodore\'s predecessor to the C64 and the first computer to sell one million units. It offered an affordable entry point into home computing.',
    img:null },

  { aliases:['commodore pet','pet 2001','cbm pet'],
    manufacturer:'Commodore', year:'1977',
    desc:'The Commodore PET was one of the first successful mass-market personal computers, popular in schools and offices throughout the late 1970s and early 1980s.',
    img:null },

  { aliases:['commodore plus 4','plus 4','plus/4','commodore 16','c16'],
    manufacturer:'Commodore', year:'1984',
    desc:'The Commodore Plus/4 featured built-in productivity software but lacked compatibility with the C64, limiting its market appeal despite solid hardware specifications.',
    img:null },

  // ── SINCLAIR / ZX ──
  { aliases:['sinclair zx spectrum','zx spectrum','spectrum','zx-spectrum'],
    manufacturer:'Sinclair Research', year:'1982',
    desc:'The ZX Spectrum was the dominant home computer in the UK, selling over 5 million units. It inspired a generation of British programmers and game developers.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/ZXSpectrum48k.jpg/320px-ZXSpectrum48k.jpg' },

  { aliases:['sinclair zx81','zx81','sinclair zx-81'],
    manufacturer:'Sinclair Research', year:'1981',
    desc:'The ZX81 was an extremely affordable home computer that introduced millions of people to computing. It used a membrane keyboard and stored programs on cassette tape.',
    img:null },

  { aliases:['sinclair zx80','zx80'],
    manufacturer:'Sinclair Research', year:'1980',
    desc:'The ZX80 was the first mass-market home computer priced under £100, making computing accessible to ordinary households for the first time.',
    img:null },

  // ── NEC ──
  { aliases:['nec pc engine','pc engine','turbografx','turbografx-16','turbografx 16','pc-engine'],
    manufacturer:'NEC', year:'1987',
    desc:'The PC Engine (TurboGrafx-16 in NA) was NEC\'s home console with a fast 8-bit CPU and 16-bit graphics. Extremely popular in Japan, especially for shooters and CD-ROM titles.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/TurboGrafx-16-Console-Set.jpg/320px-TurboGrafx-16-Console-Set.jpg' },

  { aliases:['nec pc-8801','pc-8801','pc8801','pc-88','pc88'],
    manufacturer:'NEC', year:'1981',
    desc:'The PC-8801 series dominated Japan\'s home computer market through the 1980s. Its vast library of RPGs, adventure games and shooters made it iconic in Japanese gaming culture.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/PC-8001.jpg/320px-PC-8001.jpg' },

  { aliases:['nec pc-9801','pc-9801','pc9801','pc-98','pc98'],
    manufacturer:'NEC', year:'1982',
    desc:'The PC-9801 series dominated Japanese business computing for over a decade. Its unique architecture spawned thousands of Japan-exclusive games unavailable on Western platforms.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/PC-9801E.jpg/320px-PC-9801E.jpg' },

  // ── SNK ──
  { aliases:['neo geo','neogeo','neo-geo','neo geo aes','neo geo mvs','neo geo cd','neogeo cd'],
    manufacturer:'SNK', year:'1990',
    desc:'The Neo Geo used identical hardware to SNK\'s arcade cabinets, guaranteeing perfect home ports. Famous for fighting games, shooters and the longest-supported cartridge format in history.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Neo-Geo-AES-Console-Set.jpg/320px-Neo-Geo-AES-Console-Set.jpg' },

  // ── MICROSOFT ──
  { aliases:['microsoft xbox','xbox'],
    manufacturer:'Microsoft', year:'2001',
    desc:'The original Xbox was Microsoft\'s first game console, featuring a built-in hard drive and Ethernet port. It launched Halo as one of gaming\'s most important franchises.',
    img:null },

  { aliases:['microsoft xbox 360','xbox 360'],
    manufacturer:'Microsoft', year:'2005',
    desc:'The Xbox 360 led the seventh generation with Xbox Live online gaming, downloadable content, and achievements. It sold over 84 million units during its lifetime.',
    img:null },

  // ── 3DO ──
  { aliases:['3do','3do interactive','panasonic 3do'],
    manufacturer:'3DO Company', year:'1993',
    desc:'The 3DO was an advanced 32-bit console sold by multiple manufacturers under license. Its high launch price limited adoption despite impressive hardware specifications.',
    img:null },

  // ── FUJITSU ──
  { aliases:['fujitsu fm towns','fm towns','fmtowns'],
    manufacturer:'Fujitsu', year:'1989',
    desc:'The FM Towns was the first PC with a built-in CD-ROM drive and 24-bit color support. Popular for multimedia and games in Japan, especially arcade ports and visual novels.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/FM_TOWNS_II_MX.jpg/320px-FM_TOWNS_II_MX.jpg' },

  { aliases:['fujitsu fm-7','fm-7','fm7','fujitsu fm77'],
    manufacturer:'Fujitsu', year:'1982',
    desc:'The FM-7 was a popular Japanese home computer known for its good graphics capabilities and extensive game library in Japan during the early 1980s.',
    img:null },

  // ── SHARP ──
  { aliases:['sharp x68000','x68000','x68k'],
    manufacturer:'Sharp', year:'1987',
    desc:'The X68000 is legendary in Japan for near-perfect arcade ports. Its Motorola 68000 CPU and advanced hardware specs made it a dream platform for game developers.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Sharp_X68000.jpg/220px-Sharp_X68000.jpg' },

  { aliases:['sharp mz','sharp mz-700','sharp mz-800','mz-2000'],
    manufacturer:'Sharp', year:'1978',
    desc:'The Sharp MZ series were popular home computers in Japan during the late 1970s and 1980s, known for their clean design and software versatility.',
    img:null },

  // ── BANDAI ──
  { aliases:['bandai wonderswan','wonderswan','wonderswan color'],
    manufacturer:'Bandai', year:'1999',
    desc:'The WonderSwan was a Japanese-exclusive handheld designed by Game Boy creator Gunpei Yokoi. Its horizontal/vertical screen rotation was a unique feature.',
    img:null },

  // ── TIGER ──
  { aliases:['tiger game.com','game.com'],
    manufacturer:'Tiger Electronics', year:'1997',
    desc:'The Game.com was Tiger Electronics\' attempt at a handheld with a touchscreen and internet connectivity. It had a small library of mostly ports from popular games.',
    img:null },

  // ── MATTEL ──
  { aliases:['mattel intellivision','intellivision'],
    manufacturer:'Mattel', year:'1979',
    desc:'The Intellivision was Mattel\'s competitor to the Atari 2600, featuring superior graphics and innovative sports games. It sold over 3 million units during its run.',
    img:null },

  { aliases:['mattel aquarius','aquarius'],
    manufacturer:'Mattel', year:'1983',
    desc:'The Aquarius was a short-lived home computer from Mattel, discontinued only months after launch. Its small library and limited capabilities earned it the nickname "system for the seventies".',
    img:null },

  // ── COLECO ──
  { aliases:['colecovision','coleco'],
    manufacturer:'Coleco', year:'1982',
    desc:'The ColecoVision offered near-arcade-quality graphics for its time and came bundled with Donkey Kong. It also included an Atari 2600 adapter for backward compatibility.',
    img:null },

  // ── PC / DOS ──
  { aliases:['ibm pc compatible','ms-dos','dos','pc-dos','msdos','ibm pc','ibm-pc'],
    manufacturer:'IBM / Microsoft', year:'1981',
    desc:'The IBM PC compatible platform became the dominant personal computer standard. MS-DOS was the primary OS through the 1980s and early 90s, hosting thousands of classic games.',
    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IBM_PC_5150.jpg/320px-IBM_PC_5150.jpg' },

  // ── ARCADE / MAME ──
  { aliases:['arcade','mame','multiple arcade machine','fb alpha','fba','fbneo','final burn','final burn alpha','final burn neo'],
    manufacturer:'Various', year:'1970s+',
    desc:'Arcade games represent the origin of video gaming culture. From Pong to Street Fighter, arcade cabinets drove hardware innovation and defined genres enjoyed to this day.',
    img:null },

  { aliases:['pinball','pinmame','visual pinball','vpinmame'],
    manufacturer:'Various', year:'1990s+',
    desc:'Digital pinball preservation covers decades of physical pinball machines emulated via PinMAME and Visual Pinball, maintaining the legacy of classic electromechanical and solid-state tables.',
    img:null },

  { aliases:['hbmame','hb mame'],
    manufacturer:'MAME project / Community', year:'2000s+',
    desc:'HBMAME is a MAME variant that includes homebrews, hacks, and unofficial games not accepted into the official MAME project, preserving the creative output of the gaming community.',
    img:null },

  // ── APPLE ──
  { aliases:['apple ii','apple 2','appleii','apple iie','apple iic','apple iigs'],
    manufacturer:'Apple', year:'1977',
    desc:'The Apple II was one of the first highly successful mass-produced personal computers. Its open architecture and extensive software library made it dominant in homes and schools.',
    img:null },

  { aliases:['apple macintosh','mac','macintosh'],
    manufacturer:'Apple', year:'1984',
    desc:'The original Macintosh introduced the graphical user interface to mainstream consumers. Its innovative design influenced personal computing for decades.',
    img:null },

  // ── BBC / ACORN ──
  { aliases:['bbc micro','bbc model b','bbc model a','acorn bbc'],
    manufacturer:'Acorn / BBC', year:'1981',
    desc:'The BBC Micro was the dominant computer in UK schools throughout the 1980s. Built by Acorn, it featured excellent BASIC and a wide range of educational and game software.',
    img:null },

  { aliases:['acorn archimedes','archimedes','acorn risc'],
    manufacturer:'Acorn Computers', year:'1987',
    desc:'The Archimedes used Acorn\'s own RISC processor and was the world\'s fastest desktop computer when launched. It was popular in UK schools and spawned the ARM processor architecture.',
    img:null },

  // ── THOMSON ──
  { aliases:['thomson to','thomson mo','thomson to7','thomson to8','thomson mo5'],
    manufacturer:'Thomson', year:'1982',
    desc:'Thomson computers were popular in French schools and homes in the 1980s. The TO and MO series were distributed widely through French educational programs.',
    img:null },

  // ── TANDY ──
  { aliases:['tandy trs-80','trs-80','trsdos','tandy coco','color computer','coco'],
    manufacturer:'Tandy', year:'1977',
    desc:'The TRS-80 was one of the first mass-market personal computers, sold through Tandy\'s Radio Shack stores. The Color Computer line extended the brand through the 1980s.',
    img:null },

  // ── EPOCH ──
  { aliases:['epoch super cassette vision','super cassette vision','scv'],
    manufacturer:'Epoch', year:'1984',
    desc:'The Super Cassette Vision was a Japanese home console by Epoch. It had a small but interesting library of games, mostly popular in Japan.',
    img:null },

  // ── CASIO ──
  { aliases:['casio pv-1000','pv-1000','casio'],
    manufacturer:'Casio', year:'1983',
    desc:'The Casio PV-1000 was a short-lived Japanese home console with only 15 games released. It is notable today mainly as a collector\'s curiosity.',
    img:null },
];

// ============================================================
// FUZZY SYSTEM MATCHING
// Strategy: tokenize both the DAT name and DB aliases,
// then find best overlap — handles TOSEC "System - Games (Region)"
// No-Intro "Manufacturer - System" and Redump "Manufacturer - System"
// ============================================================
function lookupSystem(datName) {
  if (!datName) return null;

  // Normalize input: lowercase, strip common noise words and punctuation
  const normalize = s => s.toLowerCase()
    .replace(/\.(dat|xml)$/i, '')
    .replace(/\b(tosec|no-intro|nointro|redump|goodset|goodtools|trurip|mame|hbmame|fbneo|fba|games|game|bios|bioses|demos|demo|applications|application|multimedia|utilities|utility|educational|compilations|compilation|magazines|magazine|coverdisks|coverdisk|updates|update|unknown|various|misc|miscellaneous|[0-9]{4}-[0-9]{2}-[0-9]{2}|v[0-9]+\.[0-9]+.*)\b/gi, ' ')
    .replace(/\(.*?\)/g, ' ')   // remove parentheses
    .replace(/\[.*?\]/g, ' ')   // remove brackets
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const inputNorm = normalize(datName);
  const inputTokens = new Set(inputNorm.split(' ').filter(t => t.length > 1));

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of SYSTEM_DB) {
    for (const alias of entry.aliases) {
      const aliasNorm = normalize(alias);
      const aliasTokens = aliasNorm.split(' ').filter(t => t.length > 1);

      // Score = number of alias tokens found in input tokens
      let score = 0;
      for (const tok of aliasTokens) {
        if (inputTokens.has(tok)) score += 2;
        // Partial match — input contains token as substring
        else if (inputNorm.includes(tok)) score += 1;
      }

      // Bonus: full alias string found inside input
      if (inputNorm.includes(aliasNorm)) score += 3;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  // Minimum threshold to avoid wrong matches
  return bestScore >= 2 ? bestMatch : null;
}

// ============================================================
// FILE SELECTION & DRAG-DROP
// ============================================================
async function selectDatFile() {
  const filePath = await window.electronAPI.selectDatFile();
  if (!filePath) return;
  await loadExplorerFile(filePath);
}

const expDrop = document.getElementById('exp-drop');
expDrop.addEventListener('dragover', e => { e.preventDefault(); expDrop.classList.add('dragover'); });
expDrop.addEventListener('dragleave', () => expDrop.classList.remove('dragover'));
expDrop.addEventListener('drop', async e => {
  e.preventDefault(); expDrop.classList.remove('dragover');
  const file = [...e.dataTransfer.files].find(f => /\.(dat|xml)$/i.test(f.name));
  if (!file) return;
  if (file.path) await loadExplorerFile(file.path);
  else { const text = await file.text(); processExplorerData(text, file.name); }
});

// ── PARSE PROGRESS BAR ──
function showParseProgress(pct, msg) {
  const bar  = document.getElementById('exp-parse-progress');
  const fill = document.getElementById('exp-parse-bar');
  const lbl  = document.getElementById('exp-parse-msg');
  const pctEl= document.getElementById('exp-parse-pct');
  bar.classList.add('visible');
  fill.style.width = pct + '%';
  lbl.textContent  = msg || 'Parsing...';
  pctEl.textContent= pct + '%';
}
function hideParseProgress() {
  document.getElementById('exp-parse-progress').classList.remove('visible');
}

async function loadExplorerFile(filePath) {
  resetExplorer();
  setStatus('PARSING...');
  showParseProgress(2, 'Reading file...');

  // Listen for progress events from main process
  if (window.electronAPI.onParseProgress) {
    window.electronAPI.offParseProgress();
    window.electronAPI.onParseProgress(({ pct, msg }) => showParseProgress(pct, msg));
  }

  let result = null;
  if (window.electronAPI.parseDatFile) {
    result = await window.electronAPI.parseDatFile(filePath);
  }

  if (window.electronAPI.offParseProgress) window.electronAPI.offParseProgress();

  // Fallback
  if (!result || !result.ok) {
    showParseProgress(50, 'Fallback parser...');
    const raw = await window.electronAPI.readFile(filePath);
    if (!raw) { hideParseProgress(); setStatus('ERROR'); return; }
    result = parseExplorerDAT(raw, filePath.split(/[/\\]/).pop());
    result.ok = true;
  }

  if (!result.ok) { hideParseProgress(); setStatus('ERROR'); return; }

  showParseProgress(100, `Done — ${result.games.length.toLocaleString()} entries`);
  setTimeout(hideParseProgress, 1200);

  const fileName = filePath.split(/[/\\]/).pop();
  explorerGames = result.games;
  window.explorerGamesForSplitter  = result.games;
  window.explorerHeaderForSplitter = result.header;
  selectedIndex = -1;
  populateDatInfo(result.header, result.games, result.type, result.encoding);
  applySortAndRender();
  loadSystemInfo(result.header.name || result.header.description || fileName);
  setStatus('READY');
}

function processExplorerData(text, fileName) {
  showParseProgress(50, 'Parsing...');
  const result = parseExplorerDAT(text, fileName);
  showParseProgress(100, 'Done');
  setTimeout(hideParseProgress, 1000);
  explorerGames = result.games;
  window.explorerGamesForSplitter  = result.games;
  window.explorerHeaderForSplitter = result.header;
  selectedIndex = -1;
  populateDatInfo(result.header, result.games, result.type, result.encoding);
  applySortAndRender();
  loadSystemInfo(result.header.name || result.header.description || fileName);
}

// ============================================================
// RESET
// ============================================================
function resetExplorer() {
  explorerGames = []; filteredGames = []; selectedIndex = -1;
  document.getElementById('exp-search').value = '';
  document.getElementById('exp-badge').textContent = '—';
  document.getElementById('exp-count').textContent = '';
  document.getElementById('detail-badge').textContent = '—';
  clearDatInfo();
  document.getElementById('rom-list').innerHTML = '<div class="exp-empty"><span class="big">[ ]</span><span>Load a DAT file to begin</span></div>';
  document.getElementById('rom-detail-list').innerHTML = '<div class="rom-detail-empty"><span class="big">◎</span><span>Select an entry to view ROM files</span></div>';
  vContainer = null;
  document.getElementById('sysinfo-body').innerHTML = '<div class="sysinfo-nodata"><span class="big">◈</span><span>Load a DAT file<br>to view system info</span></div>';
}

function clearDatInfo() {
  ['ei-name','ei-desc','ei-cat','ei-ver','ei-date','ei-author','ei-home','ei-url','ei-path','ei-total','ei-roms','ei-fmt','ei-enc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '—'; el.className = 'info-val dim'; }
  });
}

// ============================================================
// SORT
// ============================================================
function setSort(mode) {
  currentSort = mode;
  ['az','za','rdesc','rasc'].forEach(m => document.getElementById('sort-'+m).classList.toggle('active', m === mode));
  applySortAndRender();
}

function applySort(games) {
  const g = [...games];
  if      (currentSort === 'az')    g.sort((a,b) => a.name.localeCompare(b.name));
  else if (currentSort === 'za')    g.sort((a,b) => b.name.localeCompare(a.name));
  else if (currentSort === 'rdesc') g.sort((a,b) => b.rom.length - a.rom.length);
  else if (currentSort === 'rasc')  g.sort((a,b) => a.rom.length - b.rom.length);
  return g;
}

function applySortAndRender() {
  const query = document.getElementById('exp-search').value.trim().toLowerCase();
  let base = query
    ? explorerGames.filter(g =>
        g.name.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query) ||
        g.manufacturer.toLowerCase().includes(query))
    : explorerGames;
  filteredGames = applySort(base);
  selectedIndex = -1;
  renderEntryList(filteredGames);
  document.getElementById('rom-detail-list').innerHTML = '<div class="rom-detail-empty"><span class="big">◎</span><span>Select an entry to view ROM files</span></div>';
  vContainer = null;
  document.getElementById('detail-badge').textContent = '—';
  document.getElementById('exp-count').textContent = query
    ? `${filteredGames.length} / ${explorerGames.length}`
    : `${filteredGames.length.toLocaleString()} entries`;
}

function filterEntries(query) { applySortAndRender(); }

// ============================================================
// KEYBOARD NAVIGATION
// ============================================================
document.getElementById('rom-list').addEventListener('keydown', e => {
  if (!filteredGames.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectEntry(Math.min(selectedIndex + 1, filteredGames.length - 1), true);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectEntry(Math.max(selectedIndex - 1, 0), true);
  }
});

// ============================================================
// RENDER LIST
// ============================================================
function renderEntryList(games) {
  const list = document.getElementById('rom-list');
  document.getElementById('exp-badge').textContent = games.length.toLocaleString();
  if (!games.length) {
    list.innerHTML = '<div class="exp-empty"><span class="big">[ ]</span><span>No entries found</span></div>';
    return;
  }
  list.innerHTML = games.map((g, i) => {
    const icon = g.isbios === 'yes' ? '⚑' : g.cloneof ? '◌' : '◈';
    return `<div class="rom-item${selectedIndex===i?' selected':''}" data-idx="${i}" onclick="selectEntry(${i})">
      <span class="rom-item-icon">${icon}</span>
      <span class="rom-item-name" title="${xH(g.name)}">${xH(g.name)}</span>
      <span class="rom-item-roms">${g.rom.length} ${g.rom.length===1?'ROM':'ROMs'}</span>
    </div>`;
  }).join('');
}

// ============================================================
// ============================================================
// VIRTUAL SCROLL — ROM detail pane
// ============================================================
let vRoms = [];        // current rom array being displayed
let vRowH = 0;         // estimated row height (computed once)
let vContainer = null;

function initVScroll() {
  const container = document.getElementById('rom-detail-list');
  // Replace static list with virtual scroll wrapper
  container.innerHTML = '<div class="vscroll-wrap" id="vscroll-outer"><div class="vscroll-spacer" id="vscroll-spacer"></div><div class="vscroll-visible" id="vscroll-items"></div></div>';
  const outer = document.getElementById('vscroll-outer');
  outer.addEventListener('scroll', () => renderVVisible(), { passive: true });
  vContainer = outer;
}

function estimateRowHeight(rom) {
  // count how many fields are non-empty (2 per row in grid)
  const fields = [rom.size, rom.crc, rom.md5, rom.sha1, rom.sha256, rom.status, rom.region].filter(Boolean);
  const rows = Math.ceil(fields.length / 2);
  // name: ~24px, grid rows: ~18px each, card padding: 16px
  return 24 + rows * 18 + 20;
}

function renderVList(roms, disks) {
  vRoms = [
    ...roms.map(r  => ({ ...r, _type: 'rom'  })),
    ...disks.map(d => ({ ...d, _type: 'disk' }))
  ];

  if (!vContainer) initVScroll();
  else {
    // Reset scroll
    vContainer.scrollTop = 0;
  }

  if (!vRoms.length) {
    document.getElementById('rom-detail-list').innerHTML =
      '<div class="rom-detail-empty"><span class="big">◎</span><span>No ROM files in this entry</span></div>';
    vContainer = null;
    return;
  }

  // Compute total height estimate
  let totalH = 0;
  vRoms._offsets = [0];
  vRoms._heights = [];
  for (const r of vRoms) {
    const h = estimateRowHeight(r);
    vRoms._heights.push(h);
    totalH += h;
    vRoms._offsets.push(totalH);
  }

  document.getElementById('vscroll-spacer').style.height = totalH + 'px';
  renderVVisible();
}

function renderVVisible() {
  if (!vContainer || !vRoms.length) return;
  const scrollTop = vContainer.scrollTop;
  const viewH     = vContainer.clientHeight;
  const OVERSCAN  = 5; // extra items above/below viewport

  // Binary search for first visible item
  let lo = 0, hi = vRoms.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (vRoms._offsets[mid + 1] < scrollTop) lo = mid + 1;
    else hi = mid;
  }
  const first = Math.max(0, lo - OVERSCAN);

  let last = first;
  while (last < vRoms.length && vRoms._offsets[last] < scrollTop + viewH) last++;
  last = Math.min(vRoms.length - 1, last + OVERSCAN);

  // Build HTML only for visible slice
  let html = '';
  let top  = vRoms._offsets[first];
  for (let i = first; i <= last; i++) {
    const r = vRoms[i];
    const h = vRoms._heights[i];
    if (r._type === 'disk') {
      const fields = [['MD5',r.md5],['SHA1',r.sha1]].filter(([,v])=>v);
      html += `<div class="rom-file-card" style="position:absolute;top:${top}px;left:0;right:0;min-height:${h}px">
        <div class="rom-file-card-name" style="color:var(--text-mid)">◉ ${xH(r.name)} <span style="font-size:10px;color:var(--text-dim)">[DISK]</span></div>
        <div class="rom-file-grid">${fields.map(([k,v])=>`<div class="rom-file-field"><span class="rom-file-key">${k}</span><span class="rom-file-val">${xH(v)}</span></div>`).join('')}</div>
      </div>`;
    } else {
      const fields = [['Size',r.size],['CRC',r.crc],['MD5',r.md5],['SHA1',r.sha1],['SHA256',r.sha256],['Status',r.status],['Region',r.region]].filter(([,v])=>v);
      html += `<div class="rom-file-card" style="position:absolute;top:${top}px;left:0;right:0;min-height:${h}px">
        <div class="rom-file-card-name">▸ ${xH(r.name)}</div>
        <div class="rom-file-grid">${fields.map(([k,v])=>`<div class="rom-file-field"><span class="rom-file-key">${k}</span><span class="rom-file-val">${xH(v)}</span></div>`).join('')}</div>
      </div>`;
    }
    top += h;
  }

  document.getElementById('vscroll-items').innerHTML = html;
}

// ============================================================
// SELECT ENTRY
// ============================================================
function selectEntry(idx, fromKeyboard = false) {
  selectedIndex = idx;
  document.querySelectorAll('.rom-item').forEach(el =>
    el.classList.toggle('selected', parseInt(el.dataset.idx) === idx));

  if (fromKeyboard) {
    const el = document.querySelector(`.rom-item[data-idx="${idx}"]`);
    if (el) el.scrollIntoView({ block:'nearest' });
  }

  const g = filteredGames[idx];
  if (!g) return;

  const romCount = g.rom.length + g.disk.length;
  document.getElementById('detail-badge').textContent = romCount + (romCount === 1 ? ' ROM' : ' ROMs');

  // Init virtual scroll container if needed
  const detailEl = document.getElementById('rom-detail-list');
  if (!vContainer || !detailEl.querySelector('#vscroll-outer')) {
    initVScroll();
  }

  if (!g.rom.length && !g.disk.length) {
    detailEl.innerHTML = '<div class="rom-detail-empty"><span class="big">◎</span><span>No ROM files in this entry</span></div>';
    vContainer = null;
    return;
  }

  renderVList(g.rom, g.disk);
}


// ============================================================
// SYSTEM INFO — loads on DAT open, never changes per-entry
// ============================================================
async function loadSystemInfo(datName) {
  const body = document.getElementById('sysinfo-body');
  body.innerHTML = '<div class="sysinfo-loading">⟳ LOADING...</div>';

  // 1. Try local DB with fuzzy matching
  const info = lookupSystem(datName);
  if (info) {
    renderSystemInfo(info, 'local database');
    return;
  }

  // 2. Fallback: Wikipedia REST API
  const wikiQuery = datName
    .replace(/\.(dat|xml)$/i,'')
    .replace(/[-_]/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.extract && data.type !== 'disambiguation') {
        renderSystemInfo({
          desc: data.extract,
          img:  data.thumbnail?.source || null,
          manufacturer: null,
          year: null,
          wikiUrl: data.content_urls?.desktop?.page,
          wikiTitle: data.title,
        }, 'Wikipedia');
        return;
      }
    }
  } catch(e) { /* offline or CSP block */ }

  // 3. No data
  body.innerHTML = `<div class="sysinfo-nodata">
    <span class="big">◈</span>
    <span>NO DATA AVAILABLE<br><span style="font-size:9px;color:var(--text-dim);letter-spacing:0">${xH(datName)}</span></span>
  </div>`;
}

function renderSystemInfo(info, source) {
  const body = document.getElementById('sysinfo-body');
  let html = '';

  if (info.img) {
    html += `<img class="sysinfo-img" src="${xH(info.img)}" alt="system" onerror="this.style.display='none'">`;
  }

  html += '<div class="sysinfo-fields">';
  if (info.manufacturer) html += `<div class="sysinfo-field"><div class="sysinfo-field-key">Manufacturer</div><div class="sysinfo-field-val amber">${xH(info.manufacturer)}</div></div>`;
  if (info.year)         html += `<div class="sysinfo-field"><div class="sysinfo-field-key">Released</div><div class="sysinfo-field-val green">${xH(info.year)}</div></div>`;
  if (info.desc) {
    const short = info.desc.length > 420 ? info.desc.substring(0,420)+'…' : info.desc;
    html += `<div class="sysinfo-field"><div class="sysinfo-field-key">About</div><div class="sysinfo-field-val" style="font-size:11px;line-height:1.7;white-space:normal;">${xH(short)}</div></div>`;
  }
  html += '</div>';

  let srcHtml = `<div class="sysinfo-source">Source: ${xH(source)}`;
  if (info.wikiUrl) srcHtml += ` · <a onclick="window.electronAPI?.openExternal('${xH(info.wikiUrl)}')">${xH(info.wikiTitle||'Read more')}</a>`;
  srcHtml += '</div>';

  body.innerHTML = html + srcHtml;
}

// ============================================================
// DAT INFO PANEL
// ============================================================
function populateDatInfo(header, games, type, encoding) {
  const set = (id, val, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val) { el.textContent = val; el.className = 'info-val '+(cls||''); }
    else     { el.textContent = '—'; el.className = 'info-val dim'; }
  };
  set('ei-name',   header.name,        'green');
  set('ei-desc',   header.description, '');
  set('ei-cat',    header.category,    '');
  set('ei-ver',    header.version,     'green');
  set('ei-date',   header.date,        '');
  set('ei-author', header.author,      'amber');
  set('ei-home',   header.homepage,    '');
  set('ei-url',    header.url,         '');
  set('ei-path',   header.rompath,     '');
  const totalRoms = games.reduce((s,g) => s + g.rom.length, 0);
  set('ei-total', games.length.toLocaleString(), 'green');
  set('ei-roms',  totalRoms.toLocaleString(),    'amber');
  set('ei-fmt',   type,     '');
  set('ei-enc',   encoding, '');
}

// ============================================================
// PARSERS
// ============================================================
function parseExplorerDAT(text, name) {
  const t = text.trim();
  if (t.startsWith('<') || t.includes('<?xml')) return parseExplorerXML(text, name);
  if (/^\s*(clrmamepro|game|resource)\s*\(/mi.test(t)) return parseExplorerCLR(text, name);
  return parseExplorerXML(text, name);
}

function parseExplorerXML(text, name) {
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML parse error');
    const hdr = doc.querySelector('header');
    const header = {
      name:        hdr?.querySelector('name')?.textContent        || '',
      description: hdr?.querySelector('description')?.textContent || '',
      category:    hdr?.querySelector('category')?.textContent    || '',
      version:     hdr?.querySelector('version')?.textContent     || '',
      date:        hdr?.querySelector('date')?.textContent        || '',
      author:      hdr?.querySelector('author')?.textContent      || '',
      homepage:    hdr?.querySelector('homepage')?.textContent    || '',
      url:         hdr?.querySelector('url')?.textContent         || '',
      rompath:     hdr?.querySelector('rompath,rom_path')?.textContent || '',
    };
    const games = [...doc.querySelectorAll('game, machine')].map(g => ({
      name:         g.getAttribute('name')           || '',
      description:  g.querySelector('description')?.textContent || g.getAttribute('name') || '',
      year:         g.querySelector('year')?.textContent  || '',
      manufacturer: g.querySelector('manufacturer')?.textContent || '',
      cloneof:      g.getAttribute('cloneof')  || '',
      romof:        g.getAttribute('romof')    || '',
      isbios:       g.getAttribute('isbios')   || '',
      sampleof:     g.getAttribute('sampleof') || '',
      category:     g.querySelector('category')?.textContent || '',
      rom: [...g.querySelectorAll('rom')].map(r => ({
        name:r.getAttribute('name')||'', size:r.getAttribute('size')||'',
        crc:r.getAttribute('crc')||'',   md5:r.getAttribute('md5')||'',
        sha1:r.getAttribute('sha1')||'', sha256:r.getAttribute('sha256')||'',
        status:r.getAttribute('status')||'', region:r.getAttribute('region')||'',
      })),
      disk: [...g.querySelectorAll('disk')].map(d => ({
        name:d.getAttribute('name')||'', md5:d.getAttribute('md5')||'', sha1:d.getAttribute('sha1')||'',
      })),
    }));
    return { games, header, type:'XML (Logiqx)', encoding:'UTF-8' };
  } catch(e) {
    return { games:[], header:{name:'',description:'',category:'',version:'',date:'',author:'',homepage:'',url:'',rompath:''}, type:'XML (error)', encoding:'—' };
  }
}

function parseExplorerCLR(text, name) {
  let header = { name:'',description:'',category:'',version:'',date:'',author:'',homepage:'',url:'',rompath:'' };
  const hm = text.match(/clrmamepro\s*\(([\s\S]*?)\)/i);
  if (hm) ['name','description','category','version','date','author','homepage','url','rompath'].forEach(f => { header[f]=exCLR(hm[1],f)||''; });

  const games = [];
  const gameRe = /(?:^|\n)\s*(?:game|resource)\s*\(([\s\S]*?)\n\s*\)/gm;
  let m;
  while ((m = gameRe.exec(text)) !== null) {
    const block = m[1];
    const roms = [];
    const romRe = /rom\s*\((.*?)\)/gs;
    let rm;
    while ((rm = romRe.exec(block)) !== null) {
      const rb = rm[1];
      roms.push({ name:exCLR(rb,'name')||'', size:exCLR(rb,'size')||'', crc:exCLR(rb,'crc')||'', md5:exCLR(rb,'md5')||'', sha1:exCLR(rb,'sha1')||'', sha256:'', status:exCLR(rb,'flags')||'', region:'' });
    }
    const gname = exCLR(block,'name')||'';
    games.push({ name:gname, description:exCLR(block,'description')||gname, year:exCLR(block,'year')||'', manufacturer:exCLR(block,'manufacturer')||'', cloneof:exCLR(block,'cloneof')||'', romof:'', isbios:'', sampleof:'', category:'', rom:roms, disk:[] });
  }
  return { games, header, type:'ClrMamePro', encoding:'UTF-8' };
}

function exCLR(block, field) {
  const m = block.match(new RegExp(`\\b${field}\\s+"([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

function xH(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// RESIZABLE SPLITTER
// ============================================================
(function initSplitter() {
  const splitter    = document.getElementById('exp-splitter');
  const entriesPane = document.getElementById('exp-entries-pane');
  const center      = document.getElementById('exp-center');
  let dragging = false, startY = 0, startH = 0;

  splitter.addEventListener('mousedown', e => {
    dragging = true; startY = e.clientY;
    startH = entriesPane.getBoundingClientRect().height;
    splitter.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const total = center.getBoundingClientRect().height;
    const newH  = Math.max(80, Math.min(total - 120, startH + (e.clientY - startY)));
    entriesPane.style.height = newH + 'px';
    entriesPane.style.flex   = 'none';
    document.getElementById('exp-detail-pane').style.flex = '1';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();

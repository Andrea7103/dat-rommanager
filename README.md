# DAT//ROMMANAGER

> Universal DAT Management Toolkit for ROM preservation

A modern desktop application for managing, inspecting and processing DAT files used by ROM managers like **RomVault**, **ClrMamePro** and **RomCenter**.  
Built with Electron — runs on Windows, macOS and Linux.

---

## Modules

| # | Module | Status | Description |
|---|--------|--------|-------------|
| 01 | **DAT Merger** | ✅ READY | Merge hundreds of DAT files into a single file |
| 02 | **DAT Explorer** | ✅ READY | Browse DAT entries, inspect ROM details and system info |
| 03 | **DAT Splitter** | ✅ READY | Split a DAT by region, language, year, alphabet and more |
| 04 | **DAT Diff** | 🔶 BETA | Compare two DAT files — find unique and common entries |
| 05 | **Coming Soon** | 🔜 | Next module in development |
| 06 | **Checksum Calc** | ✅ READY | Compute CRC32 / MD5 / SHA1 / SHA256 for any file |

---

## Download

Grab the latest release for your platform:

| Platform | File |
|----------|------|
| 🪟 Windows | `.exe` installer |
| 🍎 macOS | `.dmg` package |
| 🐧 Linux | `.AppImage` |

👉 **[Latest Release](https://github.com/Andrea7103/dat-rommanager/releases/latest)**

---

## Features

- **DAT Merger** — drag and drop a folder of DATs, merge into one in seconds. Supports Logiqx XML and ClrMamePro formats.
- **DAT Explorer** — virtual scroll for 100k+ entries, live search, ROM detail view, system identification with logos.
- **DAT Splitter** — 10 split modes (region, language, year, alphabet, type, publisher, status, rating, players, custom). Multi-mode support with composite keys.
- **DAT Diff** — compare DATs by CRC32 + SHA1 + size fingerprint (name-agnostic). Supports merge vs split DATs, folder scan, export by category.
- **Checksum Calc** — drag any file, get CRC32 / MD5 / SHA1 / SHA256. Hash verify included. Export results as DAT.

---

## Supported DAT Formats

- **Logiqx XML** — No-Intro, Redump, TOSEC, MAME
- **ClrMamePro** `.dat` — legacy and modern
- Standard `.xml` ROM database files

Compatible with: RomVault · ClrMamePro · RomCenter

---

## Build from Source

**Prerequisites:** Node.js 18+ · npm

```bash
git clone https://github.com/Andrea7103/dat-rommanager.git
cd dat-rommanager
npm install
npm start
```

**Build installers:**
```bash
npm run build-win    # Windows .exe
npm run build-mac    # macOS .dmg
npm run build-linux  # Linux .AppImage
```

---

## Roadmap

- [x] DAT Merger
- [x] DAT Explorer
- [x] DAT Splitter
- [x] DAT Diff
- [x] Checksum Calculator
- [ ] Module 05 — in development
- [ ] DAT Generator (from ROM folder scan)
- [ ] Explorer Fix & Export (repair malformed DATs)

---

## Credits

**Author:** Andrea Luca Bozzalla ([@Andrea7103](https://github.com/Andrea7103))  
**AI Pair Programming:** Claude (Anthropic AI)

Special thanks: Simone73 · Mamechannel.it · Ricky74 · Vankraus · Napalm · Walter68 · Fava

---

Built with ❤️ for the ROM preservation community.

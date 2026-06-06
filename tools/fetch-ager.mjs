// Holt den offiziellen OÖ-Wassertemperatur-Export, extrahiert die Station
// "Ager / Raudaschlsäge" und schreibt eine winzige JSON-Datei, die der
// Shelly Wall Display (oder andere Geräte) ohne Größenprobleme abrufen können.
//
// Aufruf:  node tools/fetch-ager.mjs [ausgabe.json]
// Test:    AGER_LOCAL_FILE=beispiel.zrxp node tools/fetch-ager.mjs out.json
//
// Quelle: Land Oberösterreich – Hydrographischer Dienst (data.ooe.gv.at), CC BY 4.0.

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const SOURCE_URL = "https://data.ooe.gv.at/files/hydro/HDOOE_Export_WT.zrxp";
const WATER = "Ager";
const STATION_QUERY = "Raudaschl"; // Teilstring von "Raudaschlsäge"
const STATION_DISPLAY = "Ager / Raudaschlsäge";

const SWATER_RE = /SWATER([^|\n\r]*)/;
const SNAME_RE = /SNAME([^|\n\r]*)/;

/** Sucht den Stationsblock und liefert { celsius, stamp } der jüngsten gültigen Messung. */
export function parseZrxp(content, water, nameContains) {
  let matching = false;
  let header = "";
  let best = null;

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (line[0] === "#") {
      if (line.indexOf("SANR") !== -1) header = "";
      header += line + "|";
      const sw = (header.match(SWATER_RE) || [])[1];
      const sn = (header.match(SNAME_RE) || [])[1];
      matching =
        sw != null &&
        sw.trim().toLowerCase() === water.toLowerCase() &&
        sn != null &&
        sn.toLowerCase().indexOf(nameContains.toLowerCase()) !== -1;
    } else if (matching) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const value = parseFloat(parts[1]);
      if (!Number.isFinite(value) || value <= -50 || value >= 50) continue;
      const stamp = normalizeStamp(parts[0]);
      if (!stamp) continue;
      // Fixe Breite (yyyyMMddHHmmss) -> lexikografischer Vergleich = zeitlicher Vergleich.
      if (best === null || stamp >= best.stamp) best = { celsius: value, stamp };
    }
  }
  return best;
}

/** yyyyMMddHHmmss (ggf. ohne Sekunden) -> normalisierter 14-stelliger String. */
function normalizeStamp(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 12) return null;
  return (digits + "00").slice(0, 14);
}

/** "20260606143000" -> "06.06. 14:30" (Lokalzeit, wie von der Quelle geliefert). */
function stampToText(stamp) {
  const dd = stamp.slice(6, 8);
  const mm = stamp.slice(4, 6);
  const hh = stamp.slice(8, 10);
  const mi = stamp.slice(10, 12);
  return `${dd}.${mm}. ${hh}:${mi}`;
}

/** "20260606143000" -> "2026-06-06 14:30" (lokale Zeit der Messstelle). */
function stampToLocalIso(stamp) {
  const y = stamp.slice(0, 4);
  const mm = stamp.slice(4, 6);
  const dd = stamp.slice(6, 8);
  const hh = stamp.slice(8, 10);
  const mi = stamp.slice(10, 12);
  return `${y}-${mm}-${dd} ${hh}:${mi}`;
}

async function loadContent() {
  const local = process.env.AGER_LOCAL_FILE;
  if (local) {
    const buf = await readFile(local);
    return Buffer.from(buf).toString("latin1");
  }
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "AgerWassertemperatur/1.0 (+github actions)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} von data.ooe.gv.at`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Die ZRXP-Dateien sind ISO-8859-1 (latin1) kodiert.
  return buf.toString("latin1");
}

async function main() {
  const outPath = process.argv[2] || "public/ager.json";
  const content = await loadContent();
  const reading = parseZrxp(content, WATER, STATION_QUERY);
  if (!reading) throw new Error(`Station '${STATION_DISPLAY}' nicht gefunden`);

  const payload = {
    celsius: reading.celsius,
    unit: "°C",
    station: STATION_DISPLAY,
    measuredAtText: stampToText(reading.stamp),
    measuredAtLocal: stampToLocalIso(reading.stamp),
    source: "Land Oberösterreich – Hydrographischer Dienst (data.ooe.gv.at), CC BY 4.0",
    fetchedAt: new Date().toISOString(),
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(payload) + "\n");
  console.log("Geschrieben:", outPath, JSON.stringify(payload));
}

// Nur ausführen, wenn direkt gestartet (nicht beim Import im Test).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fehler:", err.message);
    process.exit(1);
  });
}

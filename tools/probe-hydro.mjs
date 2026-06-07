// Diagnose: Findet die SANR (Stationsnummer) der Ager/Raudaschlsäge im WT-Export
// und testet, ob es einen kleinen, direkt abrufbaren Stations-JSON-Endpunkt gibt,
// den der Shelly Wall Display selbst abfragen könnte (statt über GitHub).

const WT_URL = "https://data.ooe.gv.at/files/hydro/HDOOE_Export_WT.zrxp";

async function text(url, opts) {
  const res = await fetch(url, opts);
  const body = await res.text();
  return { status: res.status, len: body.length, body };
}

function findSanr(content) {
  let header = "";
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("#")) continue;
    if (line.indexOf("SANR") !== -1) header = "";
    header += line + "|";
    const sw = (header.match(/SWATER([^|\n\r]*)/) || [])[1];
    const sn = (header.match(/SNAME([^|\n\r]*)/) || [])[1];
    const sa = (header.match(/SANR([0-9]+)/) || [])[1];
    if (sw && sn && sa && sw.trim().toLowerCase() === "ager" &&
        sn.toLowerCase().indexOf("raudaschl") !== -1) {
      return sa;
    }
  }
  return null;
}

const zrxp = await text(WT_URL, { headers: { "User-Agent": "probe/1.0" } });
console.log("ZRXP status", zrxp.status, "len", zrxp.len);
const sanr = findSanr(zrxp.body);
console.log("Ager/Raudaschlsäge SANR =", sanr);

// Aufbau der week.json zeigen: Spalten + letzte Datenzeilen.
{
  const wk = await text(`https://hydro.ooe.gv.at/daten/internet/stations/OG/${sanr}/WT/week.json`,
    { headers: { "User-Agent": "Mozilla/5.0" } });
  try {
    const j = JSON.parse(wk.body);
    const o = j[0];
    console.log("WEEK columns:", o.columns);
    console.log("WEEK rows:", o.rows, "data.length:", o.data.length);
    console.log("WEEK last3:", JSON.stringify(o.data.slice(-3)));
  } catch (e) {
    console.log("WEEK parse error:", e.message, "tail:", wk.body.slice(-300));
  }
}

if (sanr) {
  // Test: unterstützt der Server HTTP-Range (nur die letzten Bytes holen)?
  const weekUrl = `https://hydro.ooe.gv.at/daten/internet/stations/OG/${sanr}/WT/week.json`;
  const rng = await fetch(weekUrl, { headers: { "Range": "bytes=-1500", "User-Agent": "Mozilla/5.0" } });
  const rbody = await rng.text();
  console.log("RANGE status:", rng.status);
  console.log("RANGE accept-ranges:", rng.headers.get("accept-ranges"));
  console.log("RANGE content-length:", rng.headers.get("content-length"));
  console.log("RANGE content-range:", rng.headers.get("content-range"));
  console.log("RANGE body length:", rbody.length);
  console.log("RANGE tail:", rbody.slice(-160));
}

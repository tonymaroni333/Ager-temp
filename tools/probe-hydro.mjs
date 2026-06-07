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
  const base = "https://hydro.ooe.gv.at/daten/internet/stations";
  const candidates = [
    `${base}/OG/${sanr}/WT/hour.json`,
    `${base}/OG/${sanr}/WT/current.json`,
    `${base}/OG/${sanr}/WT/last.json`,
    `${base}/OG/${sanr}/WT/S.json`,
    `${base}/OG/${sanr}/index.json`,
  ];
  for (const url of candidates) {
    try {
      const r = await text(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      console.log("----", url, "=>", r.status, "len", r.len);
      // index.json komplett ausgeben, um zu sehen, ob der aktuelle Wert drinsteht.
      if (r.status === 200) console.log(url.indexOf("index.json") !== -1 ? r.body : r.body.slice(0, 200));
    } catch (e) {
      console.log("----", url, "=> ERROR", e.message);
    }
  }
}

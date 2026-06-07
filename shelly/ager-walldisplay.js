// Ager Wassertemperatur (Raudaschlsäge) -> Shelly Wall Display
//
// VOLL EIGENSTÄNDIG & VERLÄSSLICH: holt alle 15 Minuten DIREKT die offizielle
// OÖ-Quelle. Dank HTTP-Range wird nur das letzte ~1,5 KB der Datei geladen
// (passt in das ~8-KB-Limit des Shelly), daraus der jüngste Messwert geparst
// und in eine Virtual-Number-Kachel geschrieben. Keine Abhängigkeit von
// GitHub/Cloudflare.
//
// Quelle: Land Oberösterreich – Hydrographischer Dienst (hydro.ooe.gv.at),
// Station 5320 (Ager/Raudaschlsäge), Parameter WT. Daten CC BY 4.0.
//
// Einrichtung: App -> Walldisplay -> Scripts ({}) -> Add script -> einfügen
//              -> Save -> Start -> "Run on startup". Die Number-Komponente
//              wird beim ersten Start automatisch angelegt.

let CONFIG = {
  url: "https://hydro.ooe.gv.at/daten/internet/stations/OG/5320/WT/week.json",
  componentName: "Ager",
  iconUrl: "https://tonymaroni333.github.io/Ager-temp/drop.png",
  preferredId: 200,        // erste Virtual-Number ist üblicherweise number:200
  updateEverySec: 900,     // 15 Minuten
};

let numberId = null;
let lastName = "";

function applyValue(body) {
  // body endet z.B. mit: ...["2026-06-07T08:30:00.000+02:00",17.5,140]]}]
  let rows = body.split('["');
  let last = rows[rows.length - 1];   // 2026-...+02:00",17.5,140]]}]
  let a = last.split('"');
  let ts = a[0];                      // 2026-06-07T08:30:00.000+02:00
  let nums = a[1].split(",");         // ["", "17.5", "140]]}]"]
  let celsius;
  try { celsius = JSON.parse(nums[1]); } catch (e) { print("Ager: Wert-Parsing-Fehler"); return; }
  if (!(celsius > -50 && celsius < 50)) { print("Ager: kein gültiger Wert"); return; }

  Shelly.call("Number.Set", { id: numberId, value: celsius });

  // Mess-Uhrzeit (HH:MM) hinter den Namen, z.B. "Ager 08:30"
  let tpos = ts.indexOf("T");
  let hhmm = (tpos >= 0) ? ts.slice(tpos + 1, tpos + 6) : "";
  let newName = CONFIG.componentName + " " + hhmm;
  if (newName !== lastName) {
    lastName = newName;
    Shelly.call("Number.SetConfig", {
      id: numberId,
      config: { name: newName, meta: { ui: { view: "label", unit: "°C", icon: CONFIG.iconUrl } } },
    });
  }
  print("Ager:", celsius, "C", hhmm);
}

function fetchAndSet() {
  if (numberId === null) return;
  Shelly.call(
    "HTTP.Request",
    { method: "GET", url: CONFIG.url, timeout: 15, ssl_ca: "*", headers: { "Range": "bytes=-1500" } },
    function (res, err, msg) {
      if (err !== 0 || res === null) { print("Ager: HTTP-Fehler", err, msg); return; }
      // 206 = Range akzeptiert. Nur dann ist das Dateiende (jüngster Wert) enthalten.
      if (res.code !== 206) { print("Ager: Range nicht akzeptiert, Status", res.code); return; }
      applyValue(res.body);
    }
  );
}

function startLoop() {
  fetchAndSet();
  Timer.set(CONFIG.updateEverySec * 1000, true, fetchAndSet);
}

function createComponent() {
  Shelly.call(
    "Virtual.Add",
    { type: "number", config: { name: CONFIG.componentName, meta: { ui: { view: "label", unit: "°C", icon: CONFIG.iconUrl } } } },
    function (res, err, msg) {
      if (err !== 0 || res === null) { print("Ager: Anlegen fehlgeschlagen:", err, msg); return; }
      numberId = JSON.parse(res.id.split(":")[1]);
      print("Ager: Komponente angelegt -> number:" + JSON.stringify(numberId));
      startLoop();
    }
  );
}

// Komponente vorhanden? Dann nutzen, sonst automatisch anlegen.
Shelly.call("Number.GetConfig", { id: CONFIG.preferredId }, function (res, err) {
  if (err === 0 && res !== null) { numberId = CONFIG.preferredId; startLoop(); }
  else { createComponent(); }
});

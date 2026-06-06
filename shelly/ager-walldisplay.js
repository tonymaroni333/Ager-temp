// Shelly-Script für den Wall Display.
// Holt die Wassertemperatur der Ager (Raudaschlsäge) aus der kleinen ager.json
// und zeigt sie als Virtual-Number-Kachel an.
//
// BESONDERHEIT: Das Script legt die Number-Komponente beim ersten Start
// AUTOMATISCH an – du musst also nichts manuell erstellen.
//
// Einrichtung:
//   1) Shelly-App -> Walldisplay -> Scripts ({}) -> Add script
//   2) Diesen Inhalt einfügen, ggf. nur die url anpassen
//   3) Save -> Start -> "Run on startup" aktivieren
//   4) Danach am Display die Kachel hinzufügen:
//      Homescreen -> von oben nach unten wischen -> + -> Virtual components
//      -> "Ager Raudaschlsäge" -> rechts unten platzieren
//
// mJS (Shelly Gen2/Gen3 Scripting).

let CONFIG = {
  // Öffentliche URL deiner ager.json (GitHub Pages):
  url: "https://tonymaroni333.github.io/Ager-temp/ager.json",

  // Anzeigename der Kachel:
  componentName: "Ager Raudaschlsäge",

  // Bevorzugte ID. Auf einem Gerät ohne weitere Virtual Components wird die
  // erste angelegte Komponente üblicherweise number:200.
  preferredId: 200,

  // Aktualisierungsintervall in Sekunden (1800 = 30 Minuten):
  updateEverySec: 1800,
};

let numberId = null;

function fetchAndSet() {
  if (numberId === null) return;
  Shelly.call(
    "HTTP.GET",
    { url: CONFIG.url, timeout: 10, ssl_ca: "*" },
    function (res, err, msg) {
      if (err !== 0 || res === null) {
        print("Ager: HTTP-Fehler", err, msg);
        return;
      }
      if (res.code !== 200) {
        print("Ager: HTTP-Status", res.code);
        return;
      }
      let data = null;
      try {
        data = JSON.parse(res.body);
      } catch (e) {
        print("Ager: JSON konnte nicht gelesen werden");
        return;
      }
      if (typeof data.celsius !== "number") {
        print("Ager: kein gültiger Wert");
        return;
      }
      Shelly.call("Number.Set", { id: numberId, value: data.celsius });
      print("Ager aktualisiert:", data.celsius, "°C (Stand", data.measuredAtText + ")");
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
    {
      type: "number",
      config: {
        name: CONFIG.componentName,
        meta: { ui: { view: "label", unit: "°C", step: 0.1 } },
      },
    },
    function (res, err, msg) {
      if (err !== 0 || res === null) {
        print("Ager: Komponente anlegen fehlgeschlagen:", err, msg);
        return;
      }
      // res.id ist z.B. "number:200" -> numerische ID extrahieren
      numberId = JSON.parse(res.id.split(":")[1]);
      print("Ager: Komponente angelegt -> number:" + JSON.stringify(numberId));
      startLoop();
    }
  );
}

// Schon vorhanden? Dann wiederverwenden, sonst automatisch anlegen.
Shelly.call("Number.GetConfig", { id: CONFIG.preferredId }, function (res, err) {
  if (err === 0 && res !== null) {
    numberId = CONFIG.preferredId;
    print("Ager: nutze vorhandene number:" + JSON.stringify(numberId));
    startLoop();
  } else {
    createComponent();
  }
});

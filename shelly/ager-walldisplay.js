// Shelly-Script für den Wall Display: holt die aktuelle Wassertemperatur der
// Ager (Raudaschlsäge) aus der kleinen ager.json und schreibt sie in eine
// Virtual-Number-Komponente, die du als Kachel auf den Homescreen legst.
//
// Einrichtung siehe shelly/README.md
//
// mJS (Shelly Gen2/Gen3 Scripting). Bewusst einfach gehalten.

let CONFIG = {
  // Öffentliche URL deiner ager.json (GitHub Pages). USERNAME ggf. anpassen.
  url: "https://tonymaroni333.github.io/Ager-temp/ager.json",

  // ID deiner Virtual-Number-Komponente, z.B. 200 für "number:200".
  // Im Web-Interface unter Settings -> Virtual components anlegen & ID ablesen.
  numberId: 200,

  // Aktualisierungsintervall in Sekunden (1800 = 30 Minuten).
  updateEverySec: 1800,
};

function applyValue(data) {
  if (typeof data.celsius !== "number") {
    print("Ager: kein gültiger Wert in JSON");
    return;
  }
  Shelly.call("Number.Set", { id: CONFIG.numberId, value: data.celsius });
  print("Ager aktualisiert:", data.celsius, "°C  (Stand", data.measuredAtText, ")");
}

function update() {
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
      applyValue(data);
    }
  );
}

// Direkt beim Start einmal aktualisieren, danach periodisch.
update();
Timer.set(CONFIG.updateEverySec * 1000, true, update);

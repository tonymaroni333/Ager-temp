# Ager-Wassertemperatur auf dem Shelly Wall Display

Zeigt die Wassertemperatur der Ager (Raudaschlsäge) als Kachel auf dem
Homescreen des Wall Display an – inkl. Wassertropfen-Icon und Mess-Uhrzeit
(z. B. „Ager 08:30").

## So funktioniert es (verlässlich, ohne Zwischenstelle)

```
hydro.ooe.gv.at  ── HTTP-Range (letzte ~1,5 KB) ──►  Shelly-Script ──►  Virtual Number ──►  Kachel
```

Das Shelly-Script holt alle 15 Minuten **direkt** die offizielle OÖ-Quelle.
Die komplette Wochendatei (`week.json`) ist ~30 KB und damit zu groß für den
Script-Puffer (~8 KB) – deshalb wird per **HTTP-Range** nur das **Ende der Datei**
(die letzten ~1,5 KB) geladen. Darin steht die jüngste Messung, die das Script
herausparst. Es gibt **keine Abhängigkeit von GitHub oder Cloudflare** – damit
kann nichts „einfrieren".

> Station: **5320** (Ager/Raudaschlsäge), Parameter **WT** (Wassertemperatur).
> Endpunkt: `https://hydro.ooe.gv.at/daten/internet/stations/OG/5320/WT/week.json`
> Quelle: Land Oberösterreich – Hydrographischer Dienst, CC BY 4.0.

## Einrichtung

1. Shelly-App → **Walldisplay → Scripts ({}) → Add script**.
2. Inhalt von [`ager-walldisplay.js`](./ager-walldisplay.js) einfügen.
3. **Save → Start →** „Run on startup" aktivieren.
   - Beim ersten Start legt das Script die Number-Komponente **automatisch** an.
   - Konsole/Effekt: `Ager: 17.5 C 08:30`.
4. Kachel platzieren: Homescreen → von oben wischen → **+ → Virtual components →
   „Ager"** → an die gewünschte Stelle ziehen.

## Anpassen

- **Anderes Intervall:** `updateEverySec` (Sekunden) im Script.
- **Andere Station:** die Stationsnummer in der `url` tauschen (Format
  `.../OG/<NR>/WT/week.json`). Die Nummer findet man über die OÖ-Hydro-Seite
  bzw. den WT-Export.
- **Icon:** `iconUrl` (PNG-URL).

## Hinweis zum GitHub-Teil

Der frühere Weg über eine `ager.json` auf GitHub Pages (Workflow „Publish Ager
data") wird vom Wall Display **nicht mehr benötigt** – der Shelly liest jetzt
direkt an der Quelle. Der Workflow kann bleiben oder deaktiviert werden; er hat
auf das Display keinen Einfluss mehr.

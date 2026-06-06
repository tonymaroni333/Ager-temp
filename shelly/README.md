# Ager-Wassertemperatur auf dem Shelly Wall Display

Zeigt die Wassertemperatur der Ager (Raudaschlsäge) als Kachel auf dem
Homescreen des Wall Display an – genau wie deine vorhandenen Kacheln
„Hütte 29.1°" oder „Cellar 18.4°".

## So funktioniert es

```
data.ooe.gv.at (ZRXP)  ──►  GitHub Action (alle 30 Min)  ──►  ager.json (GitHub Pages)
                                                                     │
                                                                     ▼
                                          Shelly-Script  ──►  Virtual Number  ──►  Kachel
```

Der Wall Display kann die große offizielle Datei nicht selbst verarbeiten
(zu groß fürs Script). Deshalb erzeugt eine GitHub Action daraus eine winzige
`ager.json`, die das Shelly-Script problemlos abruft.

---

## Schritt 1 – ager.json öffentlich bereitstellen (GitHub Pages)

1. Im Repo: **Settings → Pages**.
2. Bei **Source**: **GitHub Actions** auswählen.
3. Der Workflow **„Publish Ager data"** unter **Actions** erzeugt und veröffentlicht
   die Datei. Einmal manuell starten: **Actions → Publish Ager data → Run workflow**.
4. Danach ist sie erreichbar unter:
   `https://<DEIN-GITHUB-NAME>.github.io/Ager-temp/ager.json`
   (für `tonymaroni333`: `https://tonymaroni333.github.io/Ager-temp/ager.json`)

> Hinweise:
> - **Automatik alle 30 Min** (cron) läuft nur, wenn die Workflow-Datei auf dem
>   **Default-Branch** liegt. Dazu den Branch `claude/ager-water-temp-widget-QplSy`
>   nach `main` mergen (oder den Default-Branch umstellen).
> - GitHub Pages eines **privaten** Repos braucht ggf. einen kostenpflichtigen Plan.
>   Alternativen: das Repo öffentlich machen (es enthält nur offene Daten + App-Code,
>   keine Geheimnisse) – dann funktioniert Pages kostenlos.

Teste die URL im Browser – es sollte etwa so aussehen:

```json
{"celsius":12.3,"unit":"°C","station":"Ager / Raudaschlsäge","measuredAtText":"06.06. 14:45", ...}
```

## Schritt 2 – Script hinzufügen (legt die Komponente automatisch an)

Die Number-Komponente musst du **nicht** von Hand erstellen – das Script macht
das beim ersten Start selbst.

1. Shelly-App → **Walldisplay → Scripts ({})  → Add script**
   (oder Web-Interface → Scripts).
2. Inhalt von [`ager-walldisplay.js`](./ager-walldisplay.js) hineinkopieren.
3. Oben im Script ggf. die `url` (deine Pages-URL aus Schritt 1) prüfen.
4. **Speichern**, **Start**, und **„Run on startup"** aktivieren.
5. In der Konsole sollte erscheinen:
   `Ager: Komponente angelegt -> number:200` und kurz darauf
   `Ager aktualisiert: 18.8 °C (Stand ...)`.

> Möchtest du die Komponente lieber selbst anlegen (z.B. anderes Icon)? Das geht
> im **Web-Interface** (Geräte-IP im Browser) → **User-defined components →
> Create new → Number**. Dann im Script `preferredId` auf die ID setzen.

## Schritt 3 – Kachel rechts unten platzieren

1. Auf dem Homescreen vom oberen Rand **nach unten wischen**.
2. **+**-Symbol → **Virtual components** → `Ager Raudaschlsäge` auswählen.
3. Kachelgröße wählen und an die **freie Stelle rechts unten** ziehen.

Fertig – die Kachel zeigt z.B. **12.3 °C** und aktualisiert sich automatisch alle 30 Minuten.

---

### Fehlersuche
- **Kachel bleibt leer / `--`:** Script-Konsole prüfen. Bei `HTTP-Status 404`
  ist die Pages-URL falsch oder Pages noch nicht aktiv.
- **`JSON konnte nicht gelesen werden`:** URL zeigt nicht direkt auf die `ager.json`.
- **Wert veraltet:** Prüfen, ob die GitHub Action „Publish Ager data" zuletzt grün lief.

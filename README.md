# Ager Wassertemperatur – Android-Widget

Ein Homescreen-Widget (und eine kleine App) für Android/Pixel 7, das die **aktuelle
Wassertemperatur der Ager bei Raudaschlsäge** zuverlässig anzeigt.

![Widget zeigt z. B. „Ager · Raudaschlsäge / 12,3 °C / Stand 06.06. 14:30"]

## Datenquelle

Die App liest die Daten direkt von der **offiziellen Open-Government-Data-Quelle**
des Landes Oberösterreich – derselben Quelle, die auch
[wassertemperatur.at](https://wassertemperatur.at/) verwendet:

```
https://data.ooe.gv.at/files/hydro/HDOOE_Export_WT.zrxp
```

Das ist der Export aller Wassertemperatur-Messstellen (WT) des Hydrographischen
Dienstes OÖ im ZRXP-Format. Die App sucht darin den Stationsblock
`SWATER = Ager` / `SNAME = Raudaschlsäge` und nimmt den jüngsten gültigen Messwert.

Dadurch hängt die App **nicht** vom HTML der Webseite ab (das sich ändern kann),
sondern liest direkt an der Quelle – das ist maximal zuverlässig.

> Datenlizenz: **CC BY 4.0**, „Land Oberösterreich – Hydrographischer Dienst,
> data.ooe.gv.at". Die Quellenangabe ist in der App enthalten.

## Funktionen

- **Homescreen-Widget** mit Temperatur und Messzeitpunkt.
- **Automatische Aktualisierung alle 30 Minuten** (über `WorkManager`, akkuschonend,
  nur bei vorhandener Internetverbindung).
- **Antippen** des Widgets ⇒ sofortige Aktualisierung.
- **Offline-fest:** Der zuletzt bekannte Wert bleibt sichtbar; ist er älter als
  3 Stunden oder schlug der letzte Abruf fehl, erscheint ein ⚠-Hinweis.
- Kleine **App-Ansicht** zum Nachschauen und manuellen Aktualisieren.

## APK herunterladen & installieren (ohne PC/Android Studio)

Die APK wird bei jedem Push automatisch von **GitHub Actions** gebaut:

1. Im Repository oben auf den Reiter **„Actions"** gehen.
2. Den letzten Lauf von **„Build APK"** öffnen (grünes Häkchen).
3. Unten unter **„Artifacts"** die Datei **`ager-wassertemperatur-apk`**
   herunterladen (am einfachsten direkt am Pixel 7 im Browser) und entpacken –
   darin liegt `app-debug.apk`.
4. Die `app-debug.apk` antippen und installieren. Falls Android fragt:
   **„Installieren von unbekannten Apps"** für den Browser/Dateimanager erlauben.
5. App einmal öffnen (lädt die ersten Daten), dann das **Widget** hinzufügen:
   lange auf eine freie Stelle des Homescreens tippen → **„Widgets"** →
   **„Ager Wassertemperatur"** auf den Homescreen ziehen.

> Hinweis: Es handelt sich um eine **Debug-APK** (mit dem Standard-Debug-Schlüssel
> signiert). Sie ist zum Sideloaden auf das eigene Gerät gedacht, nicht für den
> Play Store.

## Andere Messstelle verwenden

Soll das Widget ein anderes Gewässer/eine andere Station zeigen, in
`app/src/main/java/at/feiner/agertemp/TemperatureRepository.kt` anpassen:

```kotlin
const val WATER = "Ager"            // Gewässer (Feld SWATER)
const val STATION_QUERY = "Raudaschl" // Teilstring des Stationsnamens (Feld SNAME)
const val STATION_DISPLAY = "Raudaschlsäge"
```

Die Namen entsprechen den Feldern `SWATER`/`SNAME` in der ZRXP-Datei.

## Lokal bauen (optional)

Mit installiertem Android SDK:

```bash
# Wrapper einmalig erzeugen (oder Projekt einfach in Android Studio öffnen)
gradle wrapper --gradle-version 8.9
./gradlew assembleDebug
# Ergebnis: app/build/outputs/apk/debug/app-debug.apk
```

## Shelly Wall Display

Die Temperatur lässt sich auch als Kachel auf einem **Shelly Wall Display**
anzeigen. Eine GitHub Action veröffentlicht dafür alle 30 Minuten eine winzige
`ager.json` (über GitHub Pages), die ein kleines Shelly-Script in eine
Virtual-Number-Komponente schreibt.

➡️ Anleitung: [`shelly/README.md`](shelly/README.md)

## Technik

- Sprache: **Kotlin**, reines Android-SDK (keine schweren Abhängigkeiten).
- `minSdk 26`, `targetSdk 34` (Pixel 7 = Android 13+).
- Datenabruf: `HttpURLConnection`, Parsing: eigener ZRXP-Parser
  (`ZrxpParser.kt`), Hintergrund: `WorkManager`.

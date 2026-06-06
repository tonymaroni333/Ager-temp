package at.feiner.agertemp

import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** Eine einzelne Wassertemperatur-Messung. */
data class Reading(
    /** Temperatur in Grad Celsius. */
    val celsius: Double,
    /** Zeitpunkt der Messung als Unix-Zeit in Millisekunden. */
    val timestampMillis: Long,
)

/**
 * Parser für das ZRXP-Exportformat des Hydrographischen Dienstes Oberösterreich.
 *
 * Datei: https://data.ooe.gv.at/files/hydro/HDOOE_Export_WT.zrxp  (WT = Wassertemperatur)
 *
 * Aufbau der Datei (vereinfacht):
 *
 *   #SANR114673|SNAMERaudaschlsäge|SWATERAger|CNAME...|...
 *   #...weitere Headerzeilen...
 *   #LAYOUT(timestamp,value)|
 *   20240601083000 12.30
 *   20240601084500 12.40
 *   ...
 *   #SANR.... (nächste Station)
 *
 * Headerzeilen beginnen mit '#'. Die Felder sind durch '|' getrennt; der Schlüssel
 * (z.B. SWATER) steht direkt vor dem Wert (z.B. Ager). Messzeilen enthalten einen
 * Zeitstempel im Format yyyyMMddHHmmss und den Messwert, durch Whitespace getrennt.
 */
object ZrxpParser {

    private val SWATER = Regex("SWATER([^|\\n\\r]*)")
    private val SNAME = Regex("SNAME([^|\\n\\r]*)")
    private val WHITESPACE = Regex("\\s+")

    /**
     * Sucht den Stationsblock, dessen Gewässer [water] entspricht und dessen
     * Stationsname [nameContains] enthält, und liefert die jüngste gültige Messung.
     *
     * Die Suche ist absichtlich auf ASCII-Teilstrings ausgelegt (z.B. "Ager",
     * "Raudaschl"), damit sie unabhängig von der Zeichenkodierung der Datei
     * (ISO-8859-1 / UTF-8) zuverlässig funktioniert.
     */
    fun parse(content: String, water: String, nameContains: String): Reading? {
        var matching = false
        val header = StringBuilder()
        var best: Reading? = null

        for (rawLine in content.lineSequence()) {
            val line = rawLine.trim()
            if (line.isEmpty()) continue

            if (line.startsWith("#")) {
                // Eine Zeile mit "SANR" leitet einen neuen Stationsblock ein.
                if (line.contains("SANR")) {
                    header.setLength(0)
                }
                header.append(line).append('|')

                val h = header.toString()
                val sw = SWATER.find(h)?.groupValues?.get(1)?.trim()
                val sn = SNAME.find(h)?.groupValues?.get(1)?.trim()
                matching = sw != null && sw.equals(water, ignoreCase = true) &&
                    sn != null && sn.contains(nameContains, ignoreCase = true)
            } else if (matching) {
                val parts = line.split(WHITESPACE)
                if (parts.size < 2) continue
                val value = parts[1].toDoubleOrNull() ?: continue
                // Ungültige Messwerte (Fehlwerte wie -777) und Unsinn aussortieren.
                if (value <= -50.0 || value >= 50.0) continue
                val millis = parseTimestamp(parts[0]) ?: continue
                if (best == null || millis >= best!!.timestampMillis) {
                    best = Reading(value, millis)
                }
            }
        }
        return best
    }

    /** Wandelt einen ZRXP-Zeitstempel (yyyyMMddHHmmss) in Unix-Millisekunden um. */
    private fun parseTimestamp(raw: String): Long? {
        val digits = raw.filter { it.isDigit() }
        if (digits.length < 12) return null
        val normalized = (digits + "00").substring(0, 14)
        return try {
            val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US)
            // Die OÖ-Messdaten sind in Lokalzeit (Europe/Vienna) angegeben.
            sdf.timeZone = TimeZone.getTimeZone("Europe/Vienna")
            sdf.parse(normalized)?.time
        } catch (e: Exception) {
            null
        }
    }
}

package at.feiner.agertemp

import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.Charset

/**
 * Holt die aktuelle Wassertemperatur der Ager bei Raudaschlsäge direkt von der
 * offiziellen Open-Government-Data-Quelle des Landes Oberösterreich.
 *
 * Quelle: Land Oberösterreich – Hydrographischer Dienst (data.ooe.gv.at),
 * lizenziert unter CC BY 4.0. Dies ist dieselbe Quelle, die auch
 * wassertemperatur.at verwendet – also direkt am Ursprung und maximal zuverlässig.
 */
object TemperatureRepository {

    /** Offizieller Export aller Wassertemperatur-Messstellen Oberösterreichs. */
    const val URL = "https://data.ooe.gv.at/files/hydro/HDOOE_Export_WT.zrxp"

    /** Gewässer und Stationsname der gewünschten Messstelle. */
    const val WATER = "Ager"
    const val STATION_QUERY = "Raudaschl" // Teilstring von "Raudaschlsäge"
    const val STATION_DISPLAY = "Raudaschlsäge"

    private const val TIMEOUT_MS = 20_000

    /** Lädt und parst die Datei und liefert die jüngste Messung der Zielstation. */
    fun fetch(): Result<Reading> {
        return try {
            val content = download()
            val reading = ZrxpParser.parse(content, WATER, STATION_QUERY)
                ?: return Result.failure(IllegalStateException("Station '$WATER / $STATION_DISPLAY' nicht gefunden"))
            Result.success(reading)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun download(): String {
        val connection = (URL(URL).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = TIMEOUT_MS
            readTimeout = TIMEOUT_MS
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "AgerWassertemperatur/1.0 (Android)")
            setRequestProperty("Accept", "text/plain, */*")
        }
        try {
            val code = connection.responseCode
            if (code !in 200..299) {
                throw IllegalStateException("HTTP $code von data.ooe.gv.at")
            }
            // Die ZRXP-Dateien des Landes OÖ sind ISO-8859-1 kodiert.
            val charset = Charset.forName("ISO-8859-1")
            BufferedReader(InputStreamReader(connection.inputStream, charset)).use { reader ->
                return reader.readText()
            }
        } finally {
            connection.disconnect()
        }
    }
}

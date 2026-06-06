package at.feiner.agertemp

import android.content.Context

/**
 * Persistiert den zuletzt bekannten Messwert, damit das Widget auch offline bzw.
 * bei einem fehlgeschlagenen Abruf den letzten Stand anzeigen kann.
 */
object TempStore {

    private const val PREFS = "ager_temp_store"
    private const val KEY_HAS_VALUE = "has_value"
    private const val KEY_CELSIUS = "celsius"
    private const val KEY_MEASURED_AT = "measured_at"
    private const val KEY_FETCHED_AT = "fetched_at"
    private const val KEY_LAST_FETCH_OK = "last_fetch_ok"

    data class State(
        val hasValue: Boolean,
        val celsius: Double,
        /** Zeitpunkt der Messung (Quelle). */
        val measuredAt: Long,
        /** Zeitpunkt des letzten Abrufversuchs. */
        val fetchedAt: Long,
        /** War der letzte Abruf erfolgreich? */
        val lastFetchOk: Boolean,
    )

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveSuccess(context: Context, reading: Reading) {
        prefs(context).edit()
            .putBoolean(KEY_HAS_VALUE, true)
            .putFloat(KEY_CELSIUS, reading.celsius.toFloat())
            .putLong(KEY_MEASURED_AT, reading.timestampMillis)
            .putLong(KEY_FETCHED_AT, System.currentTimeMillis())
            .putBoolean(KEY_LAST_FETCH_OK, true)
            .apply()
    }

    /** Behält den alten Wert, markiert aber den letzten Abruf als fehlgeschlagen. */
    fun saveFailure(context: Context) {
        prefs(context).edit()
            .putLong(KEY_FETCHED_AT, System.currentTimeMillis())
            .putBoolean(KEY_LAST_FETCH_OK, false)
            .apply()
    }

    fun load(context: Context): State {
        val p = prefs(context)
        return State(
            hasValue = p.getBoolean(KEY_HAS_VALUE, false),
            celsius = p.getFloat(KEY_CELSIUS, 0f).toDouble(),
            measuredAt = p.getLong(KEY_MEASURED_AT, 0L),
            fetchedAt = p.getLong(KEY_FETCHED_AT, 0L),
            lastFetchOk = p.getBoolean(KEY_LAST_FETCH_OK, true),
        )
    }
}

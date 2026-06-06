package at.feiner.agertemp

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Baut die Widget-Ansicht aus dem zuletzt gespeicherten Zustand und schiebt sie auf den Homescreen. */
object WidgetRenderer {

    /** Eine Messung gilt als veraltet, wenn sie älter als 3 Stunden ist. */
    private const val STALE_AFTER_MS = 3 * 60 * 60 * 1000L

    fun renderAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, WaterTempWidget::class.java))
        if (ids.isNotEmpty()) render(context, manager, ids)
    }

    fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val state = TempStore.load(context)
        for (id in ids) {
            val views = RemoteViews(context.packageName, R.layout.widget_water_temp)
            views.setTextViewText(R.id.widget_title, "Ager · ${TemperatureRepository.STATION_DISPLAY}")

            if (state.hasValue) {
                views.setTextViewText(R.id.widget_temp, formatTemp(state.celsius))
                views.setTextViewText(R.id.widget_subtitle, subtitle(state))
            } else {
                views.setTextViewText(R.id.widget_temp, "–")
                views.setTextViewText(
                    R.id.widget_subtitle,
                    if (state.fetchedAt > 0) "Keine Daten – tippen" else "Lade …",
                )
            }

            views.setOnClickPendingIntent(R.id.widget_root, refreshIntent(context))
            manager.updateAppWidget(id, views)
        }
    }

    private fun formatTemp(celsius: Double): String =
        String.format(Locale.GERMAN, "%.1f °C", celsius)

    private fun subtitle(state: TempStore.State): String {
        val time = SimpleDateFormat("dd.MM. HH:mm", Locale.GERMAN).format(Date(state.measuredAt))
        val stale = System.currentTimeMillis() - state.measuredAt > STALE_AFTER_MS
        val warn = if (stale || !state.lastFetchOk) " ⚠" else ""
        return "Stand $time$warn"
    }

    private fun refreshIntent(context: Context): PendingIntent {
        val intent = Intent(context, WaterTempWidget::class.java).apply {
            action = WaterTempWidget.ACTION_REFRESH
        }
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}

package at.feiner.agertemp

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

/**
 * Homescreen-Widget, das die aktuelle Wassertemperatur der Ager bei Raudaschlsäge anzeigt.
 *
 * - Beim Hinzufügen wird sofort ein Abruf gestartet und der 30-Minuten-Job geplant.
 * - Antippen löst eine sofortige Aktualisierung aus.
 * - Die eigentliche Datenaktualisierung übernimmt der WidgetUpdateWorker (WorkManager).
 */
class WaterTempWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        WidgetRenderer.render(context, appWidgetManager, appWidgetIds)
        WidgetScheduler.ensureScheduled(context)
        WidgetScheduler.fetchNow(context)
    }

    override fun onEnabled(context: Context) {
        WidgetScheduler.ensureScheduled(context)
        WidgetScheduler.fetchNow(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            WidgetScheduler.fetchNow(context)
        }
    }

    override fun onDisabled(context: Context) {
        WidgetScheduler.cancel(context)
    }

    companion object {
        const val ACTION_REFRESH = "at.feiner.agertemp.action.REFRESH"
    }
}

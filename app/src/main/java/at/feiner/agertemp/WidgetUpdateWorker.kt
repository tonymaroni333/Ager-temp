package at.feiner.agertemp

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Hintergrund-Job (WorkManager), der die aktuelle Wassertemperatur abruft,
 * speichert und anschließend alle aktiven Widgets neu zeichnet.
 */
class WidgetUpdateWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val result = TemperatureRepository.fetch()
        result
            .onSuccess { TempStore.saveSuccess(applicationContext, it) }
            .onFailure { TempStore.saveFailure(applicationContext) }

        WidgetRenderer.renderAll(applicationContext)

        // Auch bei einem Fehler "success" zurückgeben: das Widget zeigt dann den
        // letzten bekannten Wert mit Warnhinweis; der nächste periodische Lauf
        // versucht es ohnehin erneut.
        Result.success()
    }
}

package at.feiner.agertemp

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/** Plant die periodischen sowie sofortigen Aktualisierungen des Widgets. */
object WidgetScheduler {

    private const val PERIODIC_WORK = "ager_temp_periodic"
    private const val ONESHOT_WORK = "ager_temp_oneshot"

    /** Aktualisierungsintervall des Widgets (vom Nutzer gewählt: 30 Minuten). */
    private const val INTERVAL_MINUTES = 30L

    private val networkConstraint = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    /** Stellt sicher, dass der periodische 30-Minuten-Job läuft. */
    fun ensureScheduled(context: Context) {
        val request = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
            INTERVAL_MINUTES, TimeUnit.MINUTES,
        ).setConstraints(networkConstraint).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    /** Stößt sofort einen einmaligen Abruf an (z.B. beim Hinzufügen oder Antippen). */
    fun fetchNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
            .setConstraints(networkConstraint)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            ONESHOT_WORK,
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    /** Stoppt die periodische Aktualisierung (wenn das letzte Widget entfernt wurde). */
    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK)
    }
}

package at.feiner.agertemp

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Einfache App-Oberfläche. Der Hauptzweck der App ist das Homescreen-Widget –
 * diese Ansicht dient zum schnellen Nachschauen, manuellen Aktualisieren und
 * zeigt die Quellenangabe (CC BY 4.0).
 */
class MainActivity : AppCompatActivity() {

    private lateinit var tempView: TextView
    private lateinit var subtitleView: TextView
    private lateinit var refreshButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tempView = findViewById(R.id.main_temp)
        subtitleView = findViewById(R.id.main_subtitle)
        refreshButton = findViewById(R.id.main_refresh)

        refreshButton.setOnClickListener { refresh() }

        // Periodischen Job sicherstellen, falls die App ohne Widget genutzt wird.
        WidgetScheduler.ensureScheduled(this)
    }

    override fun onResume() {
        super.onResume()
        renderFromStore()
        refresh()
    }

    private fun renderFromStore() {
        val state = TempStore.load(this)
        if (state.hasValue) {
            tempView.text = String.format(Locale.GERMAN, "%.1f °C", state.celsius)
            val time = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.GERMAN).format(Date(state.measuredAt))
            val warn = if (!state.lastFetchOk) "  ⚠ letzter Abruf fehlgeschlagen" else ""
            subtitleView.text = "Stand: $time$warn"
        } else {
            tempView.text = "–"
            subtitleView.text = "Noch keine Daten geladen."
        }
    }

    private fun refresh() {
        refreshButton.isEnabled = false
        subtitleView.text = "Aktualisiere …"
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { TemperatureRepository.fetch() }
            result
                .onSuccess { TempStore.saveSuccess(this@MainActivity, it) }
                .onFailure { TempStore.saveFailure(this@MainActivity) }
            WidgetRenderer.renderAll(this@MainActivity)
            renderFromStore()
            if (result.isFailure) {
                subtitleView.text = "Abruf fehlgeschlagen – Internet prüfen und erneut versuchen."
            }
            refreshButton.isEnabled = true
        }
    }
}

package com.idlestream.app

import android.app.Application
import android.content.ComponentCallbacks2
import android.webkit.CookieManager

/**
 * Singleton de processo do IdleStream no Android.
 * Mantém o GameSlotManager desacoplado do ciclo de vida da MainActivity para que
 * uma recriação ou destruição da Activity nunca encerre os jogos em execução.
 */
class IdleStreamApplication : Application() {

    val gameSlotManager: GameSlotManager by lazy { GameSlotManager(this) }

    override fun onCreate() {
        super.onCreate()
        instance = this
        KickHttpBridge.ensureRegistered()
        LifecycleLogger.log(
            this,
            "APP_CREATE",
            "sdk=${android.os.Build.VERSION.SDK_INT} manufacturer=${android.os.Build.MANUFACTURER} model=${android.os.Build.MODEL}"
        )
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) {
            LifecycleLogger.log(this, "TRIM_MEMORY", "level=$level")
            try {
                CookieManager.getInstance().flush()
            } catch (_: Throwable) {}
        }
        if (level >= ComponentCallbacks2.TRIM_MEMORY_COMPLETE) {
            try {
                gameSlotManager.onLowMemoryPressure()
            } catch (_: Throwable) {}
        }
    }

    override fun onLowMemory() {
        super.onLowMemory()
        LifecycleLogger.log(this, "LOW_MEMORY", "System reported low memory")
        try {
            CookieManager.getInstance().flush()
            gameSlotManager.onLowMemoryPressure()
        } catch (_: Throwable) {}
    }

    companion object {
        @Volatile
        var instance: IdleStreamApplication? = null
            private set
    }
}

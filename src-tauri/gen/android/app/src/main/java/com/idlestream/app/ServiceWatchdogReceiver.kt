package com.idlestream.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock

/**
 * Watchdog independente via AlarmManager (setAndAllowWhileIdle) que verifica a cada 5 minutos
 * se o processo / IdleStreamForegroundService continua vivo enquanto houver farm ativo.
 * Caso o Android ou algum killer OEM tenha encerrado o serviço, ele é reerguido imediatamente.
 */
class ServiceWatchdogReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return
        val appCtx = context.applicationContext

        if (!IdleStreamForegroundService.isFarmingActive(appCtx)) {
            LifecycleLogger.log(appCtx, "WATCHDOG_SKIP", "Farming não está ativo; watchdog cancelado")
            cancel(appCtx)
            return
        }

        // Reagenda o próximo pulso de 5 minutos antes de tudo
        scheduleNext(appCtx, INTERVAL_MS)

        if (!IdleStreamForegroundService.isRunning) {
            LifecycleLogger.log(
                appCtx,
                "WATCHDOG_REVIVE",
                "ForegroundService estava parado com farm ativo! Reiniciando serviço..."
            )
            IdleStreamForegroundService.start(appCtx)

            if (MainActivity.instance == null) {
                IdleStreamForegroundService.tryAutoRecoverMainActivityOrNotify(appCtx, "watchdog")
            }
        } else {
            IdleStreamForegroundService.instance?.verifyLocksAndHealth()
        }
    }

    companion object {
        const val ACTION_WATCHDOG = "com.idlestream.app.ACTION_SERVICE_WATCHDOG"
        private const val REQ_CODE = 202699
        private const val INTERVAL_MS = 5 * 60 * 1000L

        fun scheduleNext(context: Context, delayMs: Long = INTERVAL_MS) {
            try {
                val appCtx = context.applicationContext
                val alarmManager = appCtx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val pending = buildPendingIntent(appCtx)
                val triggerAt = SystemClock.elapsedRealtime() + delayMs

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAt,
                        pending
                    )
                } else {
                    alarmManager.set(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAt,
                        pending
                    )
                }
            } catch (e: Throwable) {
                LifecycleLogger.log(context, "WATCHDOG_SCHEDULE_ERR", e.message ?: "unknown")
            }
        }

        fun scheduleImmediateRecovery(context: Context) {
            scheduleNext(context, 1500L)
        }

        fun cancel(context: Context) {
            try {
                val appCtx = context.applicationContext
                val alarmManager = appCtx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                alarmManager.cancel(buildPendingIntent(appCtx))
            } catch (_: Throwable) {}
        }

        private fun buildPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, ServiceWatchdogReceiver::class.java).apply {
                action = ACTION_WATCHDOG
            }
            return PendingIntent.getBroadcast(
                context,
                REQ_CODE,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }
    }
}

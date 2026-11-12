package com.idlestream.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val farmingActive = IdleStreamForegroundService.isFarmingActive(context)
            LifecycleLogger.log(context, "BOOT_RECEIVER", "action=$action farmingActive=$farmingActive")

            if (farmingActive) {
                IdleStreamForegroundService.start(context)
                ServiceWatchdogReceiver.scheduleNext(context)
                if (MainActivity.instance == null) {
                    IdleStreamForegroundService.tryAutoRecoverMainActivityOrNotify(context, "boot_$action")
                }
            }

            // Reagenda os alarmes de votação (24h 01m) e dispara notificações pendentes vencidas
            VoteAlarmScheduler.rescheduleAllFromStorage(context, fireImmediatelyIfOverdue = true)
        }
    }
}

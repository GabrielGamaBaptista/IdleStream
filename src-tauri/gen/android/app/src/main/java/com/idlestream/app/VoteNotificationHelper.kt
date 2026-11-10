package com.idlestream.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlin.math.abs

/**
 * Canal de notificação de alta prioridade para alertas de liberação de voto (24h 01m) no TopIdle.
 * Faz deduplicação via SharedPreferences para impedir notificações duplicadas entre
 * o scheduler Rust e o AlarmManager nativo do Android.
 */
object VoteNotificationHelper {
    private const val TAG = "VoteNotificationHelper"
    const val CHANNEL_ID = "idlestream_vote_alerts_channel"
    const val CHANNEL_NAME = "Alertas de Votação TopIdle"
    private const val PREFS_ALERTS = "idlestream_vote_alerts"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val existing = manager.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifica após 24h 01m do último voto em cada conta do TopIdle."
                    enableVibration(true)
                    enableLights(true)
                    setShowBadge(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    fun clearDedupForAccount(context: Context, accountId: String) {
        try {
            val prefs = context.getSharedPreferences(PREFS_ALERTS, Context.MODE_PRIVATE)
            prefs.edit().remove("notified_$accountId").apply()
        } catch (_: Throwable) {}
    }

    fun hasAlreadyNotifiedForVote(context: Context, accountId: String, voteAtSec: Long): Boolean {
        if (voteAtSec <= 0L) return false
        return try {
            val prefs = context.getSharedPreferences(PREFS_ALERTS, Context.MODE_PRIVATE)
            prefs.getLong("notified_$accountId", -1L) == voteAtSec
        } catch (_: Throwable) {
            false
        }
    }

    fun showVoteAlert(
        context: Context,
        accountId: String,
        title: String,
        text: String,
        dedupVoteAtSec: Long = 0L
    ) {
        try {
            val appCtx = context.applicationContext
            if (dedupVoteAtSec > 0L) {
                val prefs = appCtx.getSharedPreferences(PREFS_ALERTS, Context.MODE_PRIVATE)
                val key = "notified_$accountId"
                val prev = prefs.getLong(key, -1L)
                if (prev == dedupVoteAtSec) {
                    Log.d(TAG, "Ignorando alerta duplicado para $accountId (voteAt=$dedupVoteAtSec)")
                    return
                }
                prefs.edit().putLong(key, dedupVoteAtSec).apply()
            }

            ensureChannel(appCtx)

            val launchIntent = Intent(appCtx, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("open_tab", "votes")
                putExtra("vote_account_id", accountId)
            }

            val reqCode = 30000 + abs(accountId.hashCode() % 1000)
            val pendingIntent = PendingIntent.getActivity(
                appCtx,
                reqCode,
                launchIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            val iconRes = appCtx.applicationInfo.icon.takeIf { it != 0 }
                ?: android.R.drawable.ic_popup_reminder

            val notification = NotificationCompat.Builder(appCtx, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(NotificationCompat.BigTextStyle().bigText(text))
                .setSmallIcon(iconRes)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .build()

            val manager = appCtx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val notifId = if (dedupVoteAtSec <= 0L) {
                32000 + abs(accountId.hashCode() % 1000)
            } else {
                31000 + abs(accountId.hashCode() % 1000)
            }
            manager.notify(notifId, notification)
            Log.d(TAG, "Notificação de voto exibida para $accountId (notifId=$notifId)")
        } catch (e: Throwable) {
            Log.e(TAG, "Falha ao exibir notificação de voto: ${e.message}", e)
        }
    }
}

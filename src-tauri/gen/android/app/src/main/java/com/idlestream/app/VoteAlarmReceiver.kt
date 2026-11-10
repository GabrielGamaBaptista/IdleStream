package com.idlestream.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

/**
 * BroadcastReceiver acordado pelo AlarmManager após 24h 01m do último voto
 * mesmo quando o aparelho entrou em Doze Mode ou após reinicialização.
 */
class VoteAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val accountId = intent.getStringExtra(EXTRA_ACCOUNT_ID) ?: return
        val label = intent.getStringExtra(EXTRA_LABEL) ?: accountId
        val playerIdentifier = intent.getStringExtra(EXTRA_PLAYER_IDENTIFIER) ?: label
        val lastVotedAt = intent.getLongExtra(EXTRA_LAST_VOTED_AT, 0L)

        Log.i(TAG, "Alarme de voto disparado para $accountId ($playerIdentifier), lastVotedAt=$lastVotedAt")

        val title = "🗳️ Voto Liberado: $label"
        val body = "Já se passaram 24h 01m! Você já pode votar no TopIdle com a conta '$playerIdentifier'."
        VoteNotificationHelper.showVoteAlert(
            context = context,
            accountId = accountId,
            title = title,
            text = body,
            dedupVoteAtSec = lastVotedAt
        )
    }

    companion object {
        private const val TAG = "VoteAlarmReceiver"
        const val EXTRA_ACCOUNT_ID = "vote_account_id"
        const val EXTRA_LABEL = "vote_label"
        const val EXTRA_PLAYER_IDENTIFIER = "vote_player_identifier"
        const val EXTRA_LAST_VOTED_AT = "vote_last_voted_at"
    }
}

object VoteAlarmScheduler {
    private const val TAG = "VoteAlarmScheduler"
    private const val PREFS_ALARMS = "idlestream_vote_alarms"
    private const val KEY_ACCOUNTS_JSON = "accounts_json"

    fun syncAlarms(context: Context, jsonAccounts: String) {
        try {
            val appCtx = context.applicationContext
            val prefs = appCtx.getSharedPreferences(PREFS_ALARMS, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_ACCOUNTS_JSON, jsonAccounts).apply()
            scheduleFromJson(appCtx, jsonAccounts, fireImmediatelyIfOverdue = false)
        } catch (e: Throwable) {
            Log.e(TAG, "Erro ao sincronizar alarmes de voto: ${e.message}", e)
        }
    }

    fun rescheduleAllFromStorage(context: Context, fireImmediatelyIfOverdue: Boolean = false) {
        try {
            val appCtx = context.applicationContext
            val prefs = appCtx.getSharedPreferences(PREFS_ALARMS, Context.MODE_PRIVATE)
            val savedJson = prefs.getString(KEY_ACCOUNTS_JSON, "[]") ?: "[]"
            scheduleFromJson(appCtx, savedJson, fireImmediatelyIfOverdue)
        } catch (e: Throwable) {
            Log.e(TAG, "Erro ao reagendar alarmes após boot: ${e.message}", e)
        }
    }

    private fun scheduleFromJson(
        context: Context,
        jsonAccounts: String,
        fireImmediatelyIfOverdue: Boolean
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val array = try {
            JSONArray(jsonAccounts)
        } catch (_: Throwable) {
            return
        }

        val nowMs = System.currentTimeMillis()

        for (i in 0 until array.length()) {
            val obj = array.optJSONObject(i) ?: continue
            val accountId = obj.optString("id", "").trim()
            if (accountId.isEmpty()) continue

            val label = obj.optString("label", accountId).ifBlank { accountId }
            val playerIdentifier = obj.optString("player_identifier", label).ifBlank { label }
            val notificationsEnabled = obj.optBoolean("notifications_enabled", true)
            val lastVotedAt = if (obj.isNull("last_voted_at")) 0L else obj.optLong("last_voted_at", 0L)

            val pending = buildAlarmPendingIntent(context, accountId, label, playerIdentifier, lastVotedAt)
            alarmManager.cancel(pending)

            if (!notificationsEnabled || lastVotedAt <= 0L) {
                VoteNotificationHelper.clearDedupForAccount(context, accountId)
                continue
            }

            if (VoteNotificationHelper.hasAlreadyNotifiedForVote(context, accountId, lastVotedAt)) {
                continue
            }

            val triggerAtMs = VoteUrlPolicy.nextVoteTimestampSeconds(lastVotedAt) * 1000L

            if (triggerAtMs <= nowMs) {
                if (fireImmediatelyIfOverdue) {
                    val title = "🗳️ Voto Liberado: $label"
                    val body = "Já se passaram 24h 01m! Você já pode votar no TopIdle com a conta '$playerIdentifier'."
                    VoteNotificationHelper.showVoteAlert(
                        context = context,
                        accountId = accountId,
                        title = title,
                        text = body,
                        dedupVoteAtSec = lastVotedAt
                    )
                }
                continue
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAtMs,
                        pending
                    )
                } else {
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        triggerAtMs,
                        pending
                    )
                }
                Log.d(TAG, "Alarme de voto agendado para $accountId ($playerIdentifier) em triggerAtMs=$triggerAtMs")
            } catch (e: Throwable) {
                Log.w(TAG, "Falha ao agendar alarme para $accountId: ${e.message}")
            }
        }
    }

    private fun buildAlarmPendingIntent(
        context: Context,
        accountId: String,
        label: String,
        playerIdentifier: String,
        lastVotedAt: Long
    ): PendingIntent {
        val intent = Intent(context, VoteAlarmReceiver::class.java).apply {
            action = "com.idlestream.app.ACTION_VOTE_READY_$accountId"
            putExtra(VoteAlarmReceiver.EXTRA_ACCOUNT_ID, accountId)
            putExtra(VoteAlarmReceiver.EXTRA_LABEL, label)
            putExtra(VoteAlarmReceiver.EXTRA_PLAYER_IDENTIFIER, playerIdentifier)
            putExtra(VoteAlarmReceiver.EXTRA_LAST_VOTED_AT, lastVotedAt)
        }
        val reqCode = 40000 + abs(accountId.hashCode() % 1000)
        return PendingIntent.getBroadcast(
            context,
            reqCode,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }
}

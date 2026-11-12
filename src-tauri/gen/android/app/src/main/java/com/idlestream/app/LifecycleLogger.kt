package com.idlestream.app

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Logger circular leve de ciclo de vida e diagnóstico de encerramentos do processo.
 * Grava em filesDir/lifecycle.log (máx ~64 KB) e consulta ApplicationExitInfo (Android 11+).
 */
object LifecycleLogger {
    private const val TAG = "IdleStreamLifecycle"
    private const val LOG_FILE = "lifecycle.log"
    private const val MAX_BYTES = 64 * 1024L
    private const val KEEP_BYTES = 32 * 1024

    private val lock = Any()
    private val dateFmt = ThreadLocal.withInitial {
        SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)
    }

    fun rotateTextIfNeeded(existing: String, keepChars: Int = KEEP_BYTES): String {
        val tail = if (existing.length > keepChars) existing.takeLast(keepChars) else existing
        val firstNewline = tail.indexOf('\n')
        val trimmed = if (firstNewline >= 0) tail.substring(firstNewline + 1) else tail
        return "--- LOG ROTATED ---\n$trimmed"
    }

    fun formatLine(event: String, details: String = "", now: Date = Date()): String {
        return buildString {
            append(dateFmt.get()?.format(now) ?: "")
            append(" [")
            append(event)
            append("]")
            if (details.isNotBlank()) {
                append(" ")
                append(details)
            }
            append("\n")
        }
    }

    fun log(context: Context?, event: String, details: String = "") {
        val line = formatLine(event, details)
        try {
            Log.i(TAG, line.trimEnd())
        } catch (_: Throwable) {}
        if (context == null) return
        synchronized(lock) {
            try {
                val appCtx = context.applicationContext ?: context
                val file = File(appCtx.filesDir, LOG_FILE)
                if (file.exists() && file.length() > MAX_BYTES) {
                    file.writeText(rotateTextIfNeeded(file.readText()))
                }
                file.appendText(line)
            } catch (_: Throwable) {
            }
        }
    }

    fun readLifecycleLog(context: Context): String {
        return synchronized(lock) {
            try {
                val file = File(context.applicationContext.filesDir, LOG_FILE)
                if (file.exists()) file.readText() else "Nenhum evento de ciclo de vida registrado."
            } catch (e: Throwable) {
                "Erro ao ler lifecycle.log: ${e.message}"
            }
        }
    }

    fun getHistoricalExitReasons(context: Context, maxCount: Int = 6): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return "ApplicationExitInfo indisponível (Android < 11)."
        }
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                ?: return "ActivityManager indisponível."
            val reasons = am.getHistoricalProcessExitReasons(context.packageName, 0, maxCount)
            if (reasons.isEmpty()) {
                return "Nenhum encerramento anterior registrado pelo Android."
            }
            val fmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
            reasons.joinToString("\n") { info ->
                val ts = fmt.format(Date(info.timestamp))
                val reasonName = exitReasonToString(info.reason)
                val rssMb = info.rss / 1024L
                val desc = info.description?.takeIf { it.isNotBlank() } ?: "-"
                "- [$ts] $reasonName (status=${info.status}, importance=${info.importance}, rss=${rssMb}MB, desc=$desc)"
            }
        } catch (e: Throwable) {
            "Falha ao consultar ExitReasons: ${e.message}"
        }
    }

    private const val REASON_FREEZER_COMPAT = 14

    fun isManualExitReason(reason: Int, description: String?): Boolean {
        val descLower = description?.lowercase(Locale.US) ?: ""
        if (descLower.contains("remove task")) {
            return true
        }
        return when (reason) {
            // 1 = REASON_EXIT_SELF, 8 = REASON_PERMISSION_CHANGE, 10 = REASON_USER_REQUESTED, 11 = REASON_USER_STOPPED
            1, 8, 10, 11 -> true
            else -> false
        }
    }

    fun shouldTreatExitAsManualSince(
        reason: Int,
        description: String?,
        exitTimestampMs: Long,
        sessionStartedAtMs: Long
    ): Boolean {
        if (!isManualExitReason(reason, description)) {
            return false
        }
        if (sessionStartedAtMs > 0L && exitTimestampMs < sessionStartedAtMs - 5_000L) {
            return false
        }
        return true
    }

    fun wasLastExitManualSince(context: Context, sessionStartedAtMs: Long): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return false
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return false
            val latest = am.getHistoricalProcessExitReasons(context.packageName, 0, 1).firstOrNull()
                ?: return false
            shouldTreatExitAsManualSince(
                reason = latest.reason,
                description = latest.description,
                exitTimestampMs = latest.timestamp,
                sessionStartedAtMs = sessionStartedAtMs
            )
        } catch (_: Throwable) {
            false
        }
    }

    private fun exitReasonToString(reason: Int): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return reason.toString()
        return when (reason) {
            android.app.ApplicationExitInfo.REASON_EXIT_SELF -> "EXIT_SELF"
            android.app.ApplicationExitInfo.REASON_SIGNALED -> "SIGNALED"
            android.app.ApplicationExitInfo.REASON_LOW_MEMORY -> "LOW_MEMORY (LMK)"
            android.app.ApplicationExitInfo.REASON_CRASH -> "CRASH (Java)"
            android.app.ApplicationExitInfo.REASON_CRASH_NATIVE -> "CRASH_NATIVE (WebView/Rust)"
            android.app.ApplicationExitInfo.REASON_ANR -> "ANR"
            android.app.ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "INIT_FAILURE"
            android.app.ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "PERMISSION_CHANGE"
            android.app.ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "EXCESSIVE_RESOURCE_USAGE"
            android.app.ApplicationExitInfo.REASON_USER_REQUESTED -> "USER_REQUESTED"
            android.app.ApplicationExitInfo.REASON_USER_STOPPED -> "USER_STOPPED"
            android.app.ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "DEPENDENCY_DIED (WebView Renderer)"
            REASON_FREEZER_COMPAT -> "FREEZER (Android 14+)"
            android.app.ApplicationExitInfo.REASON_OTHER -> "OTHER (OEM/Sistema)"
            else -> "REASON_$reason"
        }
    }

    fun buildDiagnosticReport(context: Context): String {
        val appCtx = context.applicationContext
        val crashLog = try {
            val f = File(appCtx.filesDir, "crash.log")
            if (f.exists()) f.readText() else "Nenhum crash Java registrado."
        } catch (e: Throwable) {
            "Erro ao ler crash.log: ${e.message}"
        }
        val panicLog = try {
            val f = File(appCtx.filesDir, "panic.log")
            if (f.exists()) f.readText() else "Nenhum panic Rust registrado."
        } catch (e: Throwable) {
            "Erro ao ler panic.log: ${e.message}"
        }
        val exitReasons = getHistoricalExitReasons(appCtx)
        val lifecycle = readLifecycleLog(appCtx)

        return buildString {
            append("=== ANDROID PROCESS EXIT REASONS ===\n")
            append(exitReasons)
            append("\n\n=== DEVICE & POWER STATUS ===\n")
            append("Manufacturer: ${Build.MANUFACTURER} | Model: ${Build.MODEL} | SDK: ${Build.VERSION.SDK_INT}\n")
            append("BatteryOptIgnored: ${BatteryOptimizationHelper.isBatteryOptimizationIgnored(appCtx)}\n")
            append("CanDrawOverlays: ${BatteryOptimizationHelper.canDrawOverlays(appCtx)}\n")
            append("NotificationsAllowed: ${BatteryOptimizationHelper.hasNotificationPermission(appCtx)}\n")
            append("ForegroundServiceRunning: ${IdleStreamForegroundService.isRunning}\n")
            append("WakeLockHeld: ${IdleStreamForegroundService.isWakeLockHeld} | WifiLockHeld: ${IdleStreamForegroundService.isWifiLockHeld}\n")
            append("\n=== NATIVE CRASH LOG ===\n")
            append(crashLog)
            append("\n\n=== RUST PANIC LOG ===\n")
            append(panicLog)
            append("\n\n=== LIFECYCLE LOG (RECENT) ===\n")
            append(lifecycle)
        }
    }
}

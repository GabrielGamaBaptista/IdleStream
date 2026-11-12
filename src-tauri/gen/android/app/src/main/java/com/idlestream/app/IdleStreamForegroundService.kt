package com.idlestream.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.webkit.CookieManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class IdleStreamForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "idlestream_vigilance_channel"
        const val CHANNEL_NAME = "IdleStream Monitoramento"
        const val RECOVERY_CHANNEL_ID = "idlestream_recovery_channel"
        const val NOTIFICATION_ID = 202610
        const val RECOVERY_NOTIFICATION_ID = 202611

        const val ACTION_START = "com.idlestream.app.ACTION_START"
        const val ACTION_STOP = "com.idlestream.app.ACTION_STOP"
        const val ACTION_UPDATE = "com.idlestream.app.ACTION_UPDATE"

        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_TEXT = "extra_text"

        const val PREFS_RUNTIME = "idlestream_runtime_state"
        private const val KEY_FARMING_ACTIVE = "farming_active"
        private const val KEY_FARMING_STARTED_AT_MS = "farming_started_at_ms"

        @Volatile
        var instance: IdleStreamForegroundService? = null

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var isStoppingByUser: Boolean = false

        @Volatile
        var isWakeLockHeld: Boolean = false
            private set

        @Volatile
        var isWifiLockHeld: Boolean = false
            private set

        @Volatile
        private var lastRecoveryAttemptMs: Long = 0L

        fun isFarmingActive(context: Context): Boolean {
            return try {
                context.applicationContext
                    .getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE)
                    .getBoolean(KEY_FARMING_ACTIVE, false)
            } catch (_: Throwable) {
                false
            }
        }

        fun getFarmingStartedAtMs(context: Context): Long {
            return try {
                context.applicationContext
                    .getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE)
                    .getLong(KEY_FARMING_STARTED_AT_MS, 0L)
            } catch (_: Throwable) {
                0L
            }
        }

        fun setFarmingActive(context: Context, active: Boolean, commitSync: Boolean = false) {
            try {
                val appCtx = context.applicationContext
                val prefs = appCtx.getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE)
                val prev = prefs.getBoolean(KEY_FARMING_ACTIVE, false)
                val editor = prefs.edit().putBoolean(KEY_FARMING_ACTIVE, active)
                if (active) {
                    isStoppingByUser = false
                    if (!prev || prefs.getLong(KEY_FARMING_STARTED_AT_MS, 0L) <= 0L) {
                        editor.putLong(KEY_FARMING_STARTED_AT_MS, System.currentTimeMillis())
                    }
                    if (commitSync || !prev) {
                        editor.commit()
                    } else {
                        editor.apply()
                    }
                    if (!prev) {
                        LifecycleLogger.log(appCtx, "FARMING_ACTIVE", "Persistindo estado de farm ativo + watchdog")
                        ServiceWatchdogReceiver.scheduleNext(appCtx)
                    }
                } else {
                    editor.remove(KEY_FARMING_STARTED_AT_MS)
                    if (commitSync) {
                        editor.commit()
                    } else {
                        editor.apply()
                    }
                    if (prev) {
                        LifecycleLogger.log(appCtx, "FARMING_INACTIVE", "Farm encerrado; watchdog desarmado")
                    }
                    ServiceWatchdogReceiver.cancel(appCtx)
                }
            } catch (_: Throwable) {}
        }

        fun start(context: Context) {
            isStoppingByUser = false
            val intent = Intent(context, IdleStreamForegroundService::class.java).apply {
                action = ACTION_START
            }
            try {
                ContextCompat.startForegroundService(context, intent)
            } catch (e: Exception) {
                LifecycleLogger.log(context, "SERVICE_START_ERR", e.message ?: "unknown")
                e.printStackTrace()
            }
        }

        fun stop(context: Context) {
            isStoppingByUser = true
            setFarmingActive(context, false, commitSync = true)
            val intent = Intent(context, IdleStreamForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            try {
                context.startService(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun updateStatus(context: Context, title: String, text: String) {
            val service = instance
            if (service != null) {
                service.currentTitle = title
                service.currentText = text
                val notification = service.buildNotification(title, text)
                val manager = service.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.notify(NOTIFICATION_ID, notification)
                return
            }

            val intent = Intent(context, IdleStreamForegroundService::class.java).apply {
                action = ACTION_UPDATE
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_TEXT, text)
            }
            try {
                ContextCompat.startForegroundService(context, intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @JvmStatic
        fun updateStatusDirect(title: String, text: String) {
            val service = instance
            if (service != null) {
                service.currentTitle = title
                service.currentText = text
                val notification = service.buildNotification(title, text)
                val manager = service.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.notify(NOTIFICATION_ID, notification)
            } else {
                MainActivity.instance?.let { ctx ->
                    updateStatus(ctx, title, text)
                }
            }
        }

        fun tryAutoRecoverMainActivityOrNotify(context: Context, reason: String) {
            val appCtx = context.applicationContext
            if (isStoppingByUser || !isFarmingActive(appCtx)) {
                return
            }
            if (LifecycleLogger.wasLastExitManualSince(appCtx, getFarmingStartedAtMs(appCtx))) {
                LifecycleLogger.log(
                    appCtx,
                    "REVIVE_BLOCKED_MANUAL_EXIT",
                    "Auto-recuperação cancelada porque o usuário encerrou o app manualmente (reason=$reason)"
                )
                setFarmingActive(appCtx, false, commitSync = true)
                return
            }

            val now = System.currentTimeMillis()
            if (now - lastRecoveryAttemptMs < 25_000L) {
                return
            }
            lastRecoveryAttemptMs = now

            if (MainActivity.instance != null) {
                return
            }

            if (BatteryOptimizationHelper.canDrawOverlays(appCtx)) {
                try {
                    val recoverIntent = Intent(appCtx, MainActivity::class.java).apply {
                        addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                                Intent.FLAG_ACTIVITY_NO_ANIMATION
                        )
                        putExtra("background_recovery", true)
                        putExtra("recovery_reason", reason)
                    }
                    appCtx.startActivity(recoverIntent)
                    LifecycleLogger.log(
                        appCtx,
                        "AUTO_RECOVER_ACTIVITY",
                        "MainActivity relançada silenciosamente via OVERLAY (reason=$reason)"
                    )
                    return
                } catch (e: Throwable) {
                    LifecycleLogger.log(appCtx, "AUTO_RECOVER_ERR", e.message ?: "unknown")
                }
            }

            showRecoveryNotification(appCtx, reason)
        }

        fun showRecoveryNotification(context: Context, reason: String) {
            try {
                val appCtx = context.applicationContext
                val manager = appCtx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (manager.getNotificationChannel(RECOVERY_CHANNEL_ID) == null) {
                        val channel = NotificationChannel(
                            RECOVERY_CHANNEL_ID,
                            "Recuperação de Sessão IdleStream",
                            NotificationManager.IMPORTANCE_HIGH
                        ).apply {
                            description = "Avisa caso o sistema operacional encerre o processo principal durante o farm."
                            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                        }
                        manager.createNotificationChannel(channel)
                    }
                }

                val launchIntent = Intent(appCtx, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("recovery_reason", reason)
                }
                val pendingIntent = PendingIntent.getActivity(
                    appCtx,
                    202612,
                    launchIntent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )

                val iconRes = appCtx.applicationInfo.icon.takeIf { it != 0 }
                    ?: android.R.drawable.ic_popup_reminder

                val title = "Sessão interrompida pelo sistema"
                val text = "O Android reiniciou a interface em segundo plano. Toque para retomar suas lives e jogos automaticamente."

                val notif = NotificationCompat.Builder(appCtx, RECOVERY_CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setStyle(NotificationCompat.BigTextStyle().bigText(text))
                    .setSmallIcon(iconRes)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setContentIntent(pendingIntent)
                    .build()

                manager.notify(RECOVERY_NOTIFICATION_ID, notif)
                LifecycleLogger.log(
                    appCtx,
                    "RECOVERY_NOTIF_SHOWN",
                    "Notificação de recuperação exibida (reason=$reason, canDrawOverlays=${BatteryOptimizationHelper.canDrawOverlays(appCtx)})"
                )
            } catch (_: Throwable) {}
        }

        fun clearRecoveryNotification(context: Context) {
            try {
                val manager = context.applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.cancel(RECOVERY_NOTIFICATION_ID)
            } catch (_: Throwable) {}
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var currentTitle: String = "IdleStream Ativo (Segundo Plano)"
    private var currentText: String = "Modo vigília conectado • 24/7 ativo"
    private var supervisorExecutor: ScheduledExecutorService? = null
    private var supervisorTickCount = 0
    private var screenReceiverRegistered = false

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action ?: return
            val gsm = (application as? IdleStreamApplication)?.gameSlotManager
            when (action) {
                Intent.ACTION_SCREEN_OFF -> {
                    LifecycleLogger.log(this@IdleStreamForegroundService, "SCREEN_OFF", "Tela desligada -> ativando modo 1 FPS / low-GPU")
                    gsm?.setLowPowerBackgroundMode(true, "screen_off")
                }
                Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> {
                    val isFg = MainActivity.isForeground
                    LifecycleLogger.log(this@IdleStreamForegroundService, "SCREEN_ON", "action=$action isForeground=$isFg")
                    if (isFg) {
                        gsm?.setLowPowerBackgroundMode(false, "screen_on_foreground")
                    }
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        KickHttpBridge.ensureRegistered()
        isRunning = true
        createNotificationChannel()
        acquireLocks()
        registerScreenReceiver()
        startSupervisor()
        LifecycleLogger.log(this, "SERVICE_CREATE", "IdleStreamForegroundService criado")
    }

    private fun registerScreenReceiver() {
        if (screenReceiverRegistered) return
        try {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_SCREEN_ON)
                addAction(Intent.ACTION_USER_PRESENT)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(screenReceiver, filter, RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(screenReceiver, filter)
            }
            screenReceiverRegistered = true
        } catch (e: Throwable) {
            LifecycleLogger.log(this, "SCREEN_RECEIVER_ERR", e.message ?: "unknown")
        }
    }

    private fun unregisterScreenReceiver() {
        if (!screenReceiverRegistered) return
        try {
            unregisterReceiver(screenReceiver)
        } catch (_: Throwable) {
        } finally {
            screenReceiverRegistered = false
        }
    }

    private fun startSupervisor() {
        if (supervisorExecutor != null && !supervisorExecutor!!.isShutdown) return
        supervisorExecutor = Executors.newSingleThreadScheduledExecutor()
        supervisorExecutor?.scheduleWithFixedDelay({
            verifyLocksAndHealth()
        }, 30, 30, TimeUnit.SECONDS)
    }

    private fun stopSupervisor() {
        try {
            supervisorExecutor?.shutdownNow()
            supervisorExecutor = null
        } catch (_: Throwable) {}
    }

    fun verifyLocksAndHealth() {
        try {
            acquireLocks()
            supervisorTickCount++
            if (supervisorTickCount % 4 == 0) {
                try {
                    CookieManager.getInstance().flush()
                } catch (_: Throwable) {}
            }
        } catch (_: Throwable) {}
    }

    private fun performManualShutdown(source: String, removeTask: Boolean) {
        LifecycleLogger.log(this, "MANUAL_STOP", "source=$source -> encerramento manual sem auto-reabertura")
        isStoppingByUser = true
        setFarmingActive(this, false, commitSync = true)
        clearRecoveryNotification(this)
        try {
            (application as? IdleStreamApplication)?.gameSlotManager?.destroy(clearPersistence = true)
        } catch (_: Throwable) {}
        releaseLocks()
        isRunning = false
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (_: Throwable) {}
        stopSelf()
        if (removeTask) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    MainActivity.instance?.finishAndRemoveTask()
                } else {
                    MainActivity.instance?.finish()
                }
            } catch (_: Throwable) {
                MainActivity.instance?.finish()
            }
        }
    }

    private fun ensureForeground() {
        val notification = buildNotification(currentTitle, currentText)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val serviceType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            } else {
                0
            }
            try {
                startForeground(NOTIFICATION_ID, notification, serviceType)
            } catch (e: Throwable) {
                LifecycleLogger.log(this, "START_FGS_ERR", e.message ?: "specialUse error")
                android.util.Log.e("IdleStream", "Failed to startForeground (specialUse): ${e.message}", e)
            }
        } else {
            try {
                startForeground(NOTIFICATION_ID, notification)
            } catch (e: Throwable) {
                LifecycleLogger.log(this, "START_FGS_ERR", e.message ?: "legacy error")
                android.util.Log.e("IdleStream", "Failed to startForeground: ${e.message}", e)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            performManualShutdown("notification_stop", removeTask = true)
            return START_NOT_STICKY
        }

        if (intent == null) {
            // Reinício via START_STICKY após encerramento do processo: só reabre se NÃO tiver sido fechamento manual do usuário
            val farmingWasActive = isFarmingActive(this)
            val manualExit = LifecycleLogger.wasLastExitManualSince(this, getFarmingStartedAtMs(this))
            LifecycleLogger.log(
                this,
                "SERVICE_STICKY_RESTART",
                "intent=null farmingWasActive=$farmingWasActive manualExit=$manualExit mainActivity=${MainActivity.instance != null}"
            )
            ensureForeground()
            if (!farmingWasActive || manualExit || isStoppingByUser) {
                performManualShutdown(
                    if (manualExit) "sticky_blocked_manual_exit" else "sticky_inactive",
                    removeTask = false
                )
                return START_NOT_STICKY
            }
            acquireLocks()
            ServiceWatchdogReceiver.scheduleNext(this)
            if (MainActivity.instance == null) {
                if (!BatteryOptimizationHelper.canDrawOverlays(this)) {
                    currentTitle = "IdleStream interrompido pelo sistema"
                    currentText = "Toque aqui para retomar suas lives e jogos automaticamente"
                    ensureForeground()
                }
                tryAutoRecoverMainActivityOrNotify(this, "sticky_restart")
            }
            return START_STICKY
        }

        isStoppingByUser = false
        acquireLocks()

        when (intent.action) {
            ACTION_UPDATE -> {
                intent.getStringExtra(EXTRA_TITLE)?.let { currentTitle = it }
                intent.getStringExtra(EXTRA_TEXT)?.let { currentText = it }
                ensureForeground()
            }
            else -> {
                ensureForeground()
                if (isFarmingActive(this)) {
                    ServiceWatchdogReceiver.scheduleNext(this)
                }
            }
        }

        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // Remover o app dos Apps Recentes é um fechamento MANUAL do usuário: nunca reabrir automaticamente.
        performManualShutdown("task_removed", removeTask = false)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notificação persistente para manter streams e pontos ativos"
                setShowBadge(false)
                enableVibration(false)
                enableLights(false)
                setSound(null, null)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, text: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED or Intent.FLAG_ACTIVITY_SINGLE_TOP
        } ?: Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = Intent(this, IdleStreamForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val iconRes = applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_popup_sync

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(iconRes)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Parar", stopPendingIntent)
            .build()
    }

    private fun acquireLocks() {
        try {
            if (wakeLock == null) {
                val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "IdleStream::VigilanceWakeLock"
                ).apply {
                    setReferenceCounted(false)
                }
            }
            if (wakeLock?.isHeld == false) {
                wakeLock?.acquire()
                android.util.Log.d("IdleStream", "Partial WakeLock acquired (24/7 background CPU active)")
            }
            isWakeLockHeld = wakeLock?.isHeld == true

            if (wifiLock == null) {
                val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val lockMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    WifiManager.WIFI_MODE_FULL_LOW_LATENCY
                } else {
                    @Suppress("DEPRECATION")
                    WifiManager.WIFI_MODE_FULL_HIGH_PERF
                }
                wifiLock = wm?.createWifiLock(
                    lockMode,
                    "IdleStream::WifiLock"
                )?.apply {
                    setReferenceCounted(false)
                }
            }
            if (wifiLock?.isHeld == false) {
                wifiLock?.acquire()
                android.util.Log.d("IdleStream", "WifiLock acquired (low-latency active)")
            }
            isWifiLockHeld = wifiLock?.isHeld == true
        } catch (e: Exception) {
            android.util.Log.e("IdleStream", "Error acquiring WakeLock/WifiLock: ${e.message}", e)
        }
    }

    private fun releaseLocks() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    android.util.Log.d("IdleStream", "WakeLock released")
                }
            }
            wakeLock = null
            isWakeLockHeld = false

            wifiLock?.let {
                if (it.isHeld) {
                    it.release()
                    android.util.Log.d("IdleStream", "WifiLock released")
                }
            }
            wifiLock = null
            isWifiLockHeld = false
        } catch (e: Exception) {
            android.util.Log.e("IdleStream", "Error releasing WakeLock/WifiLock: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        val manualExit = LifecycleLogger.wasLastExitManualSince(this, getFarmingStartedAtMs(this))
        LifecycleLogger.log(
            this,
            "SERVICE_DESTROY",
            "stoppingByUser=$isStoppingByUser farmingActive=${isFarmingActive(this)} manualExit=$manualExit"
        )
        stopSupervisor()
        unregisterScreenReceiver()
        if (instance == this) {
            instance = null
        }
        isRunning = false
        releaseLocks()
        if (isFarmingActive(this) && !isStoppingByUser && !manualExit) {
            ServiceWatchdogReceiver.scheduleNext(this, 10_000L)
        }
        super.onDestroy()
    }

    override fun onTimeout(startId: Int, fgsType: Int) {
        val manualExit = LifecycleLogger.wasLastExitManualSince(this, getFarmingStartedAtMs(this))
        LifecycleLogger.log(this, "SERVICE_TIMEOUT", "fgsType=$fgsType startId=$startId manualExit=$manualExit")
        android.util.Log.w("IdleStream", "Foreground service onTimeout called for fgsType=$fgsType, startId=$startId")
        if (isFarmingActive(this) && !isStoppingByUser && !manualExit) {
            ServiceWatchdogReceiver.scheduleNext(this, 10_000L)
        }
        try {
            super.onTimeout(startId, fgsType)
        } catch (e: Throwable) {
            android.util.Log.e("IdleStream", "super.onTimeout failed: ${e.message}")
        }
        try {
            stopSelf(startId)
        } catch (e: Throwable) {
            android.util.Log.e("IdleStream", "stopSelf on timeout failed: ${e.message}")
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

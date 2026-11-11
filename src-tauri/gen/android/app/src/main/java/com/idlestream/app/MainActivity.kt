package com.idlestream.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : TauriActivity() {

    companion object {
        var instance: MainActivity? = null
    }

    private var mainWebView: WebView? = null
    val gameSlotManager by lazy { GameSlotManager(this) }
    val voteWebViewManager by lazy { VoteWebViewManager(this) }

    @Volatile
    var pendingOpenTab: String? = null
    @Volatile
    var pendingVoteAccountId: String? = null

    @Volatile
    var lastUserInteractionTime = System.currentTimeMillis()
    private var lastActivityJsDispatchTime = 0L

    fun recordUserActivity() {
        lastUserInteractionTime = System.currentTimeMillis()
        val now = lastUserInteractionTime
        if (now - lastActivityJsDispatchTime > 1000) {
            lastActivityJsDispatchTime = now
            runOnUiThread {
                mainWebView?.evaluateJavascript("if (typeof window.__onUserActivity === 'function') { window.__onUserActivity(); }", null)
            }
        }
    }

    override fun dispatchTouchEvent(ev: android.view.MotionEvent): Boolean {
        recordUserActivity()
        return super.dispatchTouchEvent(ev)
    }

    class WebAppInterface(private val activity: MainActivity) {
        @JavascriptInterface
        fun isBatteryOptimizationIgnored(): Boolean {
            return BatteryOptimizationHelper.isBatteryOptimizationIgnored(activity)
        }

        @JavascriptInterface
        fun requestIgnoreBatteryOptimization() {
            activity.runOnUiThread {
                BatteryOptimizationHelper.requestIgnoreBatteryOptimization(activity)
            }
        }

        @JavascriptInterface
        fun startForegroundService() {
            activity.runOnUiThread {
                IdleStreamForegroundService.start(activity)
            }
        }

        @JavascriptInterface
        fun stopForegroundService() {
            activity.runOnUiThread {
                IdleStreamForegroundService.stop(activity)
            }
        }

        @JavascriptInterface
        fun updateNotification(title: String, text: String) {
            activity.runOnUiThread {
                IdleStreamForegroundService.updateStatus(activity, title, text)
            }
        }

        @JavascriptInterface
        fun isAndroid(): Boolean {
            return true
        }

        @JavascriptInterface
        @JvmOverloads
        fun openTwitchLogin(accountId: String, accountLabel: String = "") {
            activity.runOnUiThread {
                val intent = Intent(activity, TwitchLoginActivity::class.java).apply {
                    putExtra("account_id", accountId)
                    putExtra("account_label", accountLabel)
                }
                activity.startActivity(intent)
            }
        }

        @JavascriptInterface
        fun openKickLogin(accountId: String, accountLabel: String) {
            activity.runOnUiThread {
                val intent = Intent(activity, KickLoginActivity::class.java).apply {
                    putExtra("account_id", accountId)
                    putExtra("account_label", accountLabel)
                }
                activity.startActivity(intent)
            }
        }

        @JavascriptInterface
        fun openStreamRedeem(
            platform: String,
            channelSlug: String,
            accountId: String,
            accountLabel: String,
            accountUsername: String,
            authToken: String,
            kickSession: String,
            sessionToken: String,
            xsrfToken: String
        ) {
            activity.runOnUiThread {
                val intent = Intent(activity, StreamRedeemActivity::class.java).apply {
                    putExtra("platform", platform)
                    putExtra("channel_slug", channelSlug)
                    putExtra("account_id", accountId)
                    putExtra("account_label", accountLabel)
                    putExtra("account_username", accountUsername)
                    putExtra("auth_token", authToken)
                    putExtra("kick_session", kickSession)
                    putExtra("session_token", sessionToken)
                    putExtra("xsrf_token", xsrfToken)
                }
                activity.startActivity(intent)
            }
        }

        @JavascriptInterface
        fun getCrashLog(): String {
            return try {
                val f = java.io.File(activity.filesDir, "crash.log")
                if (f.exists()) f.readText() else "Nenhum erro recente registrado."
            } catch (e: Throwable) {
                "Erro ao ler log: ${e.message}"
            }
        }

        @JavascriptInterface
        fun clearCrashLog(): Boolean {
            return try {
                val f = java.io.File(activity.filesDir, "crash.log")
                if (f.exists()) f.delete() else true
            } catch (e: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun canInstallPackages(): Boolean {
            return AppUpdateHelper.canInstallPackages(activity)
        }

        @JavascriptInterface
        fun requestInstallPermission() {
            activity.runOnUiThread {
                AppUpdateHelper.openInstallPermissionSettings(activity)
            }
        }

        @JavascriptInterface
        fun downloadAndInstallApk(apkUrl: String) {
            activity.runOnUiThread {
                activity.notifyUpdateStatus("Baixando atualização (0%)...", 0)
            }
            AppUpdateHelper.downloadAndInstall(
                activity = activity,
                apkUrl = apkUrl,
                onProgress = { percent ->
                    activity.notifyUpdateProgress(percent)
                },
                onError = { error ->
                    activity.notifyUpdateError(error)
                },
                onReadyToInstall = {
                    activity.notifyUpdateStatus("Abrindo instalador de pacotes...", 100)
                }
            )
        }

        // ============================================================
        // MÉTODOS NATIVOS DO GAME SLOT MANAGER (ANDROID)
        // ============================================================

        @JavascriptInterface
        fun startGameSlot(slotId: String, url: String, zoom: Double) {
            activity.gameSlotManager.startSlot(slotId, url, zoom)
        }

        @JavascriptInterface
        fun stopGameSlot(slotId: String) {
            activity.gameSlotManager.stopSlot(slotId)
        }

        @JavascriptInterface
        fun reloadGameSlot(slotId: String) {
            activity.gameSlotManager.reloadSlot(slotId)
        }

        @JavascriptInterface
        fun updateGameSlotBounds(jsonBounds: String) {
            activity.gameSlotManager.updateBounds(jsonBounds)
        }

        @JavascriptInterface
        fun setGameSlotZoom(slotId: String, zoom: Double) {
            activity.gameSlotManager.setSlotZoom(slotId, zoom)
        }

        @JavascriptInterface
        fun setGameSlotFps(fps: Int) {
            activity.gameSlotManager.setFps(fps)
        }

        @JavascriptInterface
        fun togglePokeIdleUltra(slotId: String, forceState: String) {
            val stateOpt = when (forceState) {
                "true" -> true
                "false" -> false
                else -> null
            }
            activity.gameSlotManager.togglePokeIdleUltra(if (slotId.isEmpty()) null else slotId, stateOpt)
        }

        @JavascriptInterface
        fun hideAllGameSlots() {
            activity.gameSlotManager.hideAll()
        }

        @JavascriptInterface
        fun getActiveGameSlots(): String {
            val list = activity.gameSlotManager.getActiveSlots()
            val arr = org.json.JSONArray()
            for (id in list) {
                arr.put(id)
            }
            return arr.toString()
        }

        @JavascriptInterface
        fun getUserIdleSeconds(): Long {
            val idleMs = System.currentTimeMillis() - activity.lastUserInteractionTime
            return if (idleMs < 0) 0 else idleMs / 1000
        }

        // ============================================================
        // MÉTODOS NATIVOS DA SEÇÃO VOTOS TOPIDLE (ANDROID)
        // ============================================================

        @JavascriptInterface
        fun openVoteWebView(
            accountId: String,
            targetUrl: String,
            linkedSlotId: String,
            shareGameProfile: Boolean
        ) {
            activity.voteWebViewManager.openVoteWebView(
                accountId = accountId,
                targetUrl = targetUrl,
                linkedGameSlotId = if (linkedSlotId.isBlank()) null else linkedSlotId,
                shareGameProfile = shareGameProfile
            )
        }

        @JavascriptInterface
        fun closeVoteWebView() {
            activity.voteWebViewManager.closeVoteWebView()
        }

        @JavascriptInterface
        fun updateVoteWebViewBounds(x: Double, y: Double, width: Double, height: Double, visible: Boolean) {
            activity.voteWebViewManager.updateBounds(x, y, width, height, visible)
        }

        @JavascriptInterface
        fun hideVoteWebView() {
            activity.voteWebViewManager.hideVoteWebView()
        }

        @JavascriptInterface
        fun reloadVoteWebView() {
            activity.voteWebViewManager.reloadVoteWebView()
        }

        @JavascriptInterface
        fun clearVoteTopIdleSession(targetUrl: String) {
            activity.voteWebViewManager.clearTopIdleSession(targetUrl)
        }

        @JavascriptInterface
        fun getActiveVoteAccount(): String {
            return activity.voteWebViewManager.getActiveAccountId() ?: ""
        }

        @JavascriptInterface
        fun syncVoteAlarms(jsonAccounts: String) {
            VoteAlarmScheduler.syncAlarms(activity, jsonAccounts)
        }

        @JavascriptInterface
        fun sendVoteTestNotification(accountId: String, title: String, text: String) {
            VoteNotificationHelper.showVoteAlert(
                context = activity,
                accountId = accountId,
                title = title,
                text = text,
                dedupVoteAtSec = 0L
            )
        }

        @JavascriptInterface
        fun consumePendingOpenTab(): String {
            val tab = activity.pendingOpenTab ?: return ""
            val accountId = activity.pendingVoteAccountId ?: ""
            activity.pendingOpenTab = null
            activity.pendingVoteAccountId = null
            return org.json.JSONObject().apply {
                put("tab", tab)
                put("accountId", accountId)
            }.toString()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        instance = this
        enableEdgeToEdge()

        // Capturador global de exceções não tratadas para diagnóstico imediato
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            android.util.Log.e("IdleStreamCrash", "FATAL UNCAUGHT EXCEPTION in thread ${thread.name}: ${throwable.message}", throwable)
            try {
                val crashFile = java.io.File(filesDir, "crash.log")
                val sw = java.io.StringWriter()
                throwable.printStackTrace(java.io.PrintWriter(sw))
                val logText = "Timestamp: ${java.util.Date()}\nThread: ${thread.name}\nException: ${throwable.javaClass.name}: ${throwable.message}\nStacktrace:\n$sw\n"
                crashFile.writeText(logText)
            } catch (e: Throwable) {
                // Ignore
            }
            defaultHandler?.uncaughtException(thread, throwable)
        }

        super.onCreate(savedInstanceState)
        KickHttpBridge.ensureRegistered()
        VoteNotificationHelper.ensureChannel(this)
        pendingOpenTab = intent?.getStringExtra("open_tab")
        pendingVoteAccountId = intent?.getStringExtra("vote_account_id")

        // Solicita permissão de notificação no Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    101
                )
            }
        }

        // Inicia o Foreground Service persistente para garantir execução 24/7
        try {
            IdleStreamForegroundService.start(this)
        } catch (e: Throwable) {
            android.util.Log.e("IdleStream", "Error initiating IdleStreamForegroundService: ${e.message}", e)
        }

        // Previne destruição ao pressionar o botão Voltar: move para segundo plano preservando Rust
        onBackPressedDispatcher.addCallback(this, object : androidx.activity.OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                moveTaskToBack(true)
            }
        })

        // Se ainda não estiver isento de otimização de bateria, solicita ao usuário
        if (!BatteryOptimizationHelper.isBatteryOptimizationIgnored(this)) {
            BatteryOptimizationHelper.requestIgnoreBatteryOptimization(this)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        moveTaskToBack(true)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        android.util.Log.d("IdleStream", "onNewIntent action=${intent.action}")
        when (intent.action) {
            "com.idlestream.TEST_TWITCH_AUTH" -> {
                val accId = intent.getStringExtra("account_id") ?: ""
                val token = intent.getStringExtra("token") ?: ""
                notifyTwitchAuthSuccess(accId, token)
            }
            "com.idlestream.TEST_KICK_AUTH" -> {
                val accId = intent.getStringExtra("account_id") ?: ""
                val session = intent.getStringExtra("kick_session") ?: ""
                val token = intent.getStringExtra("session_token") ?: ""
                val xsrf = intent.getStringExtra("xsrf_token") ?: ""
                notifyKickAuthSuccess(accId, session, token, xsrf)
            }
        }
        val openTab = intent.getStringExtra("open_tab")
        if (!openTab.isNullOrBlank()) {
            val voteAccId = intent.getStringExtra("vote_account_id") ?: ""
            pendingOpenTab = openTab
            pendingVoteAccountId = voteAccId
            notifyOpenTab(openTab, voteAccId)
        }
    }

    override fun onResume() {
        super.onResume()
        try {
            mainWebView?.onResume()
            mainWebView?.resumeTimers()
            gameSlotManager.resumeAllTimers()
        } catch (_: Throwable) {}
    }

    override fun onPause() {
        super.onPause()
        try {
            android.webkit.CookieManager.getInstance().flush()
            // WryActivity.onPause() chama mWebView.onPause().
            // Chamamos onResume() imediatamente para manter o pipeline de JavaScript do Tauri ativo
            // e evitar congelamento dos slots e do frontend em segundo plano.
            mainWebView?.onResume()
            mainWebView?.resumeTimers()
            gameSlotManager.resumeAllTimers()
        } catch (_: Throwable) {}
    }

    override fun onStop() {
        super.onStop()
        try {
            android.webkit.CookieManager.getInstance().flush()
            mainWebView?.onResume()
            mainWebView?.resumeTimers()
            gameSlotManager.resumeAllTimers()
        } catch (_: Throwable) {}
    }

    override fun onDestroy() {
        try {
            voteWebViewManager.destroy()
        } catch (_: Throwable) {}
        try {
            gameSlotManager.destroy()
        } catch (_: Throwable) {}
        if (instance == this) {
            instance = null
        }
        super.onDestroy()
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        this.mainWebView = webView
        webView.setBackgroundColor(android.graphics.Color.parseColor("#0a0a0a"))
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false)
            } catch (e: Throwable) {
                android.util.Log.w("IdleStream", "Falha ao definir prioridade de renderizador na mainWebView: ${e.message}")
            }
        }
        android.util.Log.d("IdleStream", "onWebViewCreate initialized with $webView")
    }

    fun notifyTwitchAuthSuccess(accountId: String, token: String) {
        runOnUiThread {
            val safeToken = org.json.JSONObject.quote(token)
            val safeAccId = org.json.JSONObject.quote(accountId)
            android.util.Log.d("IdleStream", "notifyTwitchAuthSuccess accId=$accountId, webView=$mainWebView")
            val script = """
                (function() {
                    const accId = $safeAccId;
                    const tok = $safeToken;
                    if (typeof window.__onAndroidTwitchAuth === 'function') {
                        try { window.__onAndroidTwitchAuth(accId, tok); } catch(e) { console.error(e); }
                    }
                    window.dispatchEvent(new CustomEvent('android-twitch-auth', { detail: { accountId: accId, token: tok } }));
                })();
            """.trimIndent()
            mainWebView?.evaluateJavascript(script) { res ->
                android.util.Log.d("IdleStream", "notifyTwitchAuthSuccess evaluateJavascript result: $res")
            }
        }
    }

    fun notifyKickAuthSuccess(accountId: String, kickSession: String, sessionToken: String, xsrfToken: String) {
        runOnUiThread {
            val safeKickSession = org.json.JSONObject.quote(kickSession)
            val safeSessionToken = org.json.JSONObject.quote(sessionToken)
            val safeXsrfToken = org.json.JSONObject.quote(xsrfToken)
            val safeAccId = org.json.JSONObject.quote(accountId)
            android.util.Log.d("IdleStream", "notifyKickAuthSuccess accId=$accountId, webView=$mainWebView")
            val script = """
                (function() {
                    const accId = $safeAccId;
                    const ks = $safeKickSession;
                    const st = $safeSessionToken;
                    const xs = $safeXsrfToken;
                    if (typeof window.__onAndroidKickAuth === 'function') {
                        try { window.__onAndroidKickAuth(accId, ks, st, xs); } catch(e) { console.error(e); }
                    }
                    window.dispatchEvent(new CustomEvent('android-kick-auth', {
                        detail: { accountId: accId, kickSession: ks, sessionToken: st, xsrfToken: xs }
                    }));
                })();
            """.trimIndent()
            mainWebView?.evaluateJavascript(script) { res ->
                android.util.Log.d("IdleStream", "notifyKickAuthSuccess evaluateJavascript result: $res")
            }
        }
    }

    fun notifyKickSessionRotated(accountId: String, kickSession: String, sessionToken: String, xsrfToken: String) {
        runOnUiThread {
            val safeKickSession = org.json.JSONObject.quote(kickSession)
            val safeSessionToken = org.json.JSONObject.quote(sessionToken)
            val safeXsrfToken = org.json.JSONObject.quote(xsrfToken)
            val safeAccId = org.json.JSONObject.quote(accountId)
            val script = """
                (function() {
                    window.dispatchEvent(new CustomEvent('android-kick-session-synced', {
                        detail: { accountId: $safeAccId, kickSession: $safeKickSession, sessionToken: $safeSessionToken, xsrfToken: $safeXsrfToken }
                    }));
                })();
            """.trimIndent()
            mainWebView?.evaluateJavascript(script, null)
        }
    }

    fun notifyUpdateProgress(percent: Int) {
        runOnUiThread {
            val script = """
                (function() {
                    window.dispatchEvent(new CustomEvent('android-update-progress', { detail: { percent: $percent } }));
                })();
            """.trimIndent()
            mainWebView?.evaluateJavascript(script, null)
        }
    }

    fun notifyUpdateStatus(status: String, percent: Int) {
        runOnUiThread {
            val safeStatus = org.json.JSONObject.quote(status)
            val script = """
                (function() {
                    window.dispatchEvent(new CustomEvent('android-update-status', { detail: { status: $safeStatus, percent: $percent } }));
                })();
            """.trimIndent()
            mainWebView?.evaluateJavascript(script, null)
        }
    }

    fun notifyUpdateError(error: String) {
        runOnUiThread {
            val safeError = org.json.JSONObject.quote(error)
            val script = """
                (function() {
                    window.dispatchEvent(new CustomEvent('android-update-error', { detail: { error: $safeError } }));
                })();
            """.trimIndent()
            mainWebView?.evaluateJavascript(script, null)
        }
    }

    fun dispatchVoteEvent(eventName: String, jsonPayload: String) {
        runOnUiThread {
            val safeEvent = org.json.JSONObject.quote(eventName)
            val script = "window.dispatchEvent(new CustomEvent($safeEvent, { detail: $jsonPayload }));"
            mainWebView?.evaluateJavascript(script, null)
        }
    }

    fun notifyOpenTab(tab: String, voteAccountId: String) {
        val payload = org.json.JSONObject().apply {
            put("tab", tab)
            put("accountId", voteAccountId)
        }.toString()
        dispatchVoteEvent("idlestream-open-tab", payload)
    }
}

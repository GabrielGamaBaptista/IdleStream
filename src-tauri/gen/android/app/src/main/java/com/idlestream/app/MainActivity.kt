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
        fun openTwitchLogin(accountId: String) {
            activity.runOnUiThread {
                val intent = Intent(activity, TwitchLoginActivity::class.java).apply {
                    putExtra("account_id", accountId)
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
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        instance = this
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

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
        IdleStreamForegroundService.start(this)

        // Se ainda não estiver isento de otimização de bateria, solicita ao usuário
        if (!BatteryOptimizationHelper.isBatteryOptimizationIgnored(this)) {
            BatteryOptimizationHelper.requestIgnoreBatteryOptimization(this)
        }
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
    }

    override fun onDestroy() {
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
        android.util.Log.d("IdleStream", "onWebViewCreate initialized with $webView")
    }

    fun notifyTwitchAuthSuccess(accountId: String, token: String) {
        runOnUiThread {
            val safeToken = token.replace("'", "\\'")
            val safeAccId = accountId.replace("'", "\\'")
            android.util.Log.d("IdleStream", "notifyTwitchAuthSuccess accId=$safeAccId, webView=$mainWebView")
            val script = """
                (function() {
                    const accId = '$safeAccId';
                    const tok = '$safeToken';
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
            val safeKickSession = kickSession.replace("'", "\\'")
            val safeSessionToken = sessionToken.replace("'", "\\'")
            val safeXsrfToken = xsrfToken.replace("'", "\\'")
            val safeAccId = accountId.replace("'", "\\'")
            android.util.Log.d("IdleStream", "notifyKickAuthSuccess accId=$safeAccId, webView=$mainWebView")
            val script = """
                (function() {
                    const accId = '$safeAccId';
                    const ks = '$safeKickSession';
                    const st = '$safeSessionToken';
                    const xs = '$safeXsrfToken';
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
}

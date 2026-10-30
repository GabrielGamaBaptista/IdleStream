package com.idlestream.app

import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class TwitchLoginActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var accountId: String = ""
    private var isCompleted = false

    companion object {
        const val DEFAULT_CLIENT_ID = "gp762nuuoqcoxypju8c569th9wz7q5"

        fun getAuthUrl(clientId: String = DEFAULT_CLIENT_ID): String {
            return "https://id.twitch.tv/oauth2/authorize" +
                    "?client_id=$clientId" +
                    "&redirect_uri=http://localhost" +
                    "&response_type=token" +
                    "&scope=chat:read+chat:edit" +
                    "&force_verify=true"
        }

        fun isLocalhostRedirect(url: String): Boolean {
            return url.startsWith("http://localhost") || url.startsWith("https://localhost")
        }

        fun extractParam(url: String, paramName: String): String? {
            // Check fragment first (#key=value&...), commonly used by OAuth implicit grant
            val queryOrFragment = when {
                url.contains('#') -> url.substringAfter('#')
                url.contains('?') -> url.substringAfter('?')
                else -> url
            }
            val clean = queryOrFragment.substringBefore('#').substringBefore('?')
            for (part in clean.split('&')) {
                val eq = part.indexOf('=')
                if (eq != -1) {
                    val key = part.substring(0, eq).trim()
                    val value = part.substring(eq + 1).trim()
                    if (key.equals(paramName, ignoreCase = true)) {
                        return try {
                            java.net.URLDecoder.decode(value, "UTF-8")
                        } catch (_: Exception) {
                            value
                        }
                    }
                }
            }

            // Fallback raw string inspection for edge-cases
            val marker = "$paramName="
            val idx = url.indexOf(marker)
            if (idx != -1) {
                val start = idx + marker.length
                val endAmp = url.indexOf('&', start)
                val endHash = url.indexOf('#', start)
                val end = when {
                    endAmp != -1 && endHash != -1 -> minOf(endAmp, endHash)
                    endAmp != -1 -> endAmp
                    endHash != -1 -> endHash
                    else -> url.length
                }
                val rawVal = url.substring(start, end)
                return try {
                    java.net.URLDecoder.decode(rawVal, "UTF-8")
                } catch (_: Exception) {
                    rawVal
                }
            }

            return null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_twitch_login)

        accountId = intent.getStringExtra("account_id") ?: ""

        val titleView = findViewById<TextView>(R.id.txt_twitch_title)
        titleView.text = "Conectar Twitch"

        progressBar = findViewById(R.id.twitch_progress_bar)
        webView = findViewById(R.id.twitch_webview)

        val btnCancel = findViewById<Button>(R.id.btn_cancel_twitch)
        btnCancel.setOnClickListener {
            finish()
        }

        val btnReset = findViewById<Button>(R.id.btn_reset_session_twitch)
        btnReset.setOnClickListener {
            Toast.makeText(this, "Limpando sessão da Twitch...", Toast.LENGTH_SHORT).show()
            SessionResetHelper.clearSession(this, webView) {
                loadAuthUrl()
            }
        }

        setupWebView()
    }

    private fun loadAuthUrl() {
        val testUrl = intent.getStringExtra("test_redirect_url")
        if (!testUrl.isNullOrEmpty()) {
            android.util.Log.d("IdleStream", "TwitchLoginActivity testing redirect directly: $testUrl")
            checkInterceptUrl(testUrl)
        } else {
            webView.loadUrl(getAuthUrl())
        }
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.setSupportMultipleWindows(false)

        val originalUa = settings.userAgentString
        settings.userAgentString = originalUa
            .replace("; wv", "")
            .replace(Regex("Version/\\d+\\.\\d+\\s+"), "")

        val cookieManager = android.webkit.CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
                if (url != null && checkInterceptUrl(url)) {
                    view?.stopLoading()
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                if (url != null && checkInterceptUrl(url)) {
                    view?.stopLoading()
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: ""
                return checkInterceptUrl(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null && checkInterceptUrl(url)) {
                    return true
                }
                return false
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                val failingUrl = request?.url?.toString() ?: ""
                if (checkInterceptUrl(failingUrl)) {
                    view?.stopLoading()
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                if (failingUrl != null && checkInterceptUrl(failingUrl)) {
                    view?.stopLoading()
                }
            }
        }

        // Fase 1: Pre-Flight Purge - Limpeza total antes de carregar authUrl
        SessionResetHelper.clearSession(this, webView) {
            loadAuthUrl()
        }
    }

    private fun checkInterceptUrl(url: String): Boolean {
        if (isCompleted) return true

        if (isLocalhostRedirect(url)) {
            android.util.Log.d("IdleStream", "checkInterceptUrl intercepted localhost: $url")
            // Check for OAuth error response
            val error = extractParam(url, "error")
            if (!error.isNullOrEmpty()) {
                val errorDesc = extractParam(url, "error_description") ?: error
                isCompleted = true
                android.util.Log.w("IdleStream", "checkInterceptUrl OAuth error: $errorDesc")
                Toast.makeText(this, "Autorização Twitch: $errorDesc", Toast.LENGTH_LONG).show()
                // Post-Auth Purge
                SessionResetHelper.clearSession(this, webView) {
                    finish()
                }
                return true
            }

            // Check for access_token
            val token = extractParam(url, "access_token")
            if (!token.isNullOrEmpty()) {
                isCompleted = true
                android.util.Log.i("IdleStream", "checkInterceptUrl successfully captured token for accountId: $accountId")
                MainActivity.instance?.notifyTwitchAuthSuccess(accountId, token)
                Toast.makeText(this, "Conta Twitch autenticada com sucesso!", Toast.LENGTH_SHORT).show()
                // Post-Auth Purge
                SessionResetHelper.clearSession(this, webView) {
                    finish()
                }
                return true
            }

            // If it reached localhost without token yet, prevent ERR_CONNECTION_REFUSED
            return true
        }
        return false
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        webView.stopLoading()
        super.onDestroy()
    }
}

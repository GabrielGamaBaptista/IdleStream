package com.idlestream.app

import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
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
        const val TWITCH_LOGIN_URL = "https://www.twitch.tv/login"

        fun parseCookies(rawCookies: String?): String? {
            if (rawCookies.isNullOrBlank()) return null
            val pairs = rawCookies.split(";").map { it.trim() }
            for (pair in pairs) {
                val idx = pair.indexOf('=')
                if (idx > 0) {
                    val name = pair.substring(0, idx).trim()
                    val value = pair.substring(idx + 1).trim()
                    if (name.equals("auth-token", ignoreCase = true)) {
                        return try {
                            java.net.URLDecoder.decode(value, "UTF-8")
                        } catch (_: Exception) {
                            value
                        }
                    }
                }
            }
            return null
        }

        fun isLocalhostRedirect(url: String): Boolean {
            return url.startsWith("http://localhost") || url.startsWith("https://localhost")
        }

        fun extractParam(url: String, paramName: String): String? {
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
            return null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_twitch_login)

        accountId = intent.getStringExtra("account_id") ?: ""
        val accountLabel = intent.getStringExtra("account_label") ?: ""

        val titleView = findViewById<TextView>(R.id.txt_twitch_title)
        titleView.text = if (accountLabel.isNotBlank()) "Login Twitch ($accountLabel)" else "Login Twitch"

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
                if (!isFinishing && !isDestroyed) {
                    loadAuthUrl()
                }
            }
        }

        val btnSave = findViewById<Button>(R.id.btn_save_twitch)
        btnSave.setOnClickListener {
            tryExtractAndSaveCookies(manual = true)
        }

        setupWebView()
    }

    private fun loadAuthUrl() {
        val testUrl = intent.getStringExtra("test_login_url")
        val url = if (!testUrl.isNullOrEmpty()) testUrl else TWITCH_LOGIN_URL
        webView.loadUrl(url)
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

        // Higieniza o User-Agent omitindo '; wv' e 'Version/X.X' para que a Twitch reconheça como Chrome Mobile padrão
        val originalUa = settings.userAgentString
        settings.userAgentString = originalUa
            .replace("; wv", "")
            .replace(Regex("Version/\\d+\\.\\d+\\s+"), "")

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE

                // Auto-detecta login se o usuário navegou para fora da página de login e tem o cookie de autenticação
                if (!isCompleted && url != null &&
                    url.contains("twitch.tv", ignoreCase = true) &&
                    !url.contains("/login", ignoreCase = true) &&
                    !url.contains("/passport", ignoreCase = true)
                ) {
                    tryExtractAndSaveCookies(manual = false)
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: ""
                return handleRedirects(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null && handleRedirects(url)) {
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
            }
        }

        // Fase 1: Pre-Flight Purge - Limpeza completa de Cookies e Cache antes de abrir
        SessionResetHelper.clearSession(this, webView) {
            loadAuthUrl()
        }
    }

    private fun handleRedirects(url: String): Boolean {
        if (isLocalhostRedirect(url)) {
            val token = extractParam(url, "access_token")
            if (!token.isNullOrEmpty()) {
                isCompleted = true
                getSharedPreferences("idlestream_redeem_prefs", MODE_PRIVATE)
                    .edit()
                    .remove("sync_hash_twitch_$accountId")
                    .apply()
                MainActivity.instance?.notifyTwitchAuthSuccess(accountId, token)
                Toast.makeText(this, "Conta Twitch autenticada com sucesso!", Toast.LENGTH_SHORT).show()
                SessionResetHelper.clearSession(this, webView) {
                    finish()
                }
                return true
            }
        }
        return false
    }

    private fun tryExtractAndSaveCookies(manual: Boolean) {
        if (isCompleted) return

        val cookieManager = CookieManager.getInstance()
        val c1 = cookieManager.getCookie("https://www.twitch.tv") ?: ""
        val c2 = cookieManager.getCookie("https://twitch.tv") ?: ""
        val c3 = cookieManager.getCookie("https://id.twitch.tv") ?: ""
        val allCookies = "$c1; $c2; $c3"

        val token = parseCookies(allCookies)

        if (!token.isNullOrEmpty()) {
            isCompleted = true
            getSharedPreferences("idlestream_redeem_prefs", MODE_PRIVATE)
                .edit()
                .remove("sync_hash_twitch_$accountId")
                .apply()
            android.util.Log.i("IdleStream", "Twitch auth-token cookie capturado com sucesso para accountId: $accountId")
            MainActivity.instance?.notifyTwitchAuthSuccess(accountId, token)
            Toast.makeText(this, "Sessão da Twitch salva com sucesso!", Toast.LENGTH_SHORT).show()

            // Fase 2: Post-Auth Purge - Limpeza para garantir isolamento multi-contas
            SessionResetHelper.clearSession(this, webView) {
                finish()
            }
        } else if (manual) {
            Toast.makeText(
                this,
                "Login ainda não detectado. Complete o login no site da Twitch antes de concluir.",
                Toast.LENGTH_LONG
            ).show()
        }
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

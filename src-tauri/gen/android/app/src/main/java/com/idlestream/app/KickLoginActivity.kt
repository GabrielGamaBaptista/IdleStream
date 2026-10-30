package com.idlestream.app

import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

data class KickAuthCookies(
    val kickSession: String?,
    val sessionToken: String?,
    val xsrfToken: String?
) {
    val isValid: Boolean get() = !kickSession.isNullOrBlank()
    val isAuthenticated: Boolean get() = !kickSession.isNullOrBlank() && !sessionToken.isNullOrBlank()
}

class KickLoginActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var accountId: String = ""
    private var isCompleted = false

    companion object {
        const val KICK_LOGIN_URL = "https://kick.com/login"

        fun isGoogleAuthUrl(url: String?): Boolean {
            if (url.isNullOrBlank()) return false
            val lower = url.lowercase()
            if (!lower.contains("accounts.google.com")) return false

            val isOAuthEndpoint = lower.contains("/o/oauth2/") || lower.contains("/oauth2/")
            val hasOAuthParams = lower.contains("response_type=") ||
                    (lower.contains("client_id=") && lower.contains("redirect_uri="))

            val isInternalGoogleNav = lower.contains("/oauthchooseaccount") ||
                    lower.contains("/signin/v2/challenge") ||
                    lower.contains("/signin/challenge")

            return (isOAuthEndpoint || hasOAuthParams) && !isInternalGoogleNav
        }

        fun ensureSelectAccountPrompt(url: String): String {
            val promptRegex = Regex("""([?&])prompt=([^&#]*)""", RegexOption.IGNORE_CASE)
            val match = promptRegex.find(url)

            if (match != null) {
                val prefix = match.groupValues[1]
                val currentPrompt = match.groupValues[2]
                val decodedPrompt = try {
                    java.net.URLDecoder.decode(currentPrompt, "UTF-8")
                } catch (_: Exception) {
                    currentPrompt
                }

                if (decodedPrompt.contains("select_account", ignoreCase = true)) {
                    return url
                }

                val newPrompt = if (decodedPrompt.isBlank()) {
                    "select_account"
                } else {
                    "select_account%20$currentPrompt"
                }
                return url.replaceRange(match.range, "${prefix}prompt=$newPrompt")
            } else {
                val hashIdx = url.indexOf('#')
                return if (hashIdx != -1) {
                    val beforeHash = url.substring(0, hashIdx)
                    val afterHash = url.substring(hashIdx)
                    val sep = if (beforeHash.contains("?")) "&" else "?"
                    "${beforeHash}${sep}prompt=select_account${afterHash}"
                } else {
                    val sep = if (url.contains("?")) "&" else "?"
                    "${url}${sep}prompt=select_account"
                }
            }
        }

        fun parseCookies(rawCookies: String?): KickAuthCookies {
            if (rawCookies.isNullOrBlank()) {
                return KickAuthCookies(null, null, null)
            }

            var kickSession: String? = null
            var sessionToken: String? = null
            var xsrfToken: String? = null

            val pairs = rawCookies.split(";").map { it.trim() }
            for (pair in pairs) {
                val idx = pair.indexOf('=')
                if (idx > 0) {
                    val name = pair.substring(0, idx).trim()
                    val value = pair.substring(idx + 1).trim()
                    if (name.equals("kick_session", ignoreCase = true)) {
                        kickSession = value
                    } else if (name.equals("session_token", ignoreCase = true)) {
                        sessionToken = try {
                            java.net.URLDecoder.decode(value, "UTF-8")
                        } catch (_: Exception) {
                            value
                        }
                    } else if (name.equals("XSRF-TOKEN", ignoreCase = true)) {
                        xsrfToken = value
                    }
                }
            }

            return KickAuthCookies(kickSession, sessionToken, xsrfToken)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_kick_login)

        accountId = intent.getStringExtra("account_id") ?: ""
        val accountLabel = intent.getStringExtra("account_label") ?: "Kick"

        val titleView = findViewById<TextView>(R.id.txt_title)
        titleView.text = "Login Kick ($accountLabel)"

        progressBar = findViewById(R.id.progress_bar)
        webView = findViewById(R.id.kick_webview)

        val btnCancel = findViewById<Button>(R.id.btn_cancel)
        btnCancel.setOnClickListener {
            finish()
        }

        val btnReset = findViewById<Button>(R.id.btn_reset_session)
        btnReset.setOnClickListener {
            val options = arrayOf(
                "🔄 Limpar Sessão da Kick",
                "🚪 Desconectar Conta Google",
                "🧹 Limpeza Total (Kick + Google)"
            )
            AlertDialog.Builder(this)
                .setTitle("Opções de Reset / Troca de Conta")
                .setItems(options) { _, which ->
                    when (which) {
                        0 -> {
                            Toast.makeText(this, "Limpando sessão da Kick...", Toast.LENGTH_SHORT).show()
                            SessionResetHelper.clearSession(this, webView) {
                                if (!isFinishing && !isDestroyed) {
                                    loadInitialUrl()
                                }
                            }
                        }
                        1 -> {
                            Toast.makeText(this, "Desconectando do Google...", Toast.LENGTH_SHORT).show()
                            webView.loadUrl("https://accounts.google.com/Logout")
                        }
                        2 -> {
                            Toast.makeText(this, "Realizando limpeza total...", Toast.LENGTH_SHORT).show()
                            SessionResetHelper.clearSession(this, webView) {
                                webView.loadUrl("https://accounts.google.com/Logout")
                                webView.postDelayed({
                                    SessionResetHelper.clearSession(this, webView) {
                                        loadInitialUrl()
                                    }
                                }, 1500)
                            }
                        }
                    }
                }
                .setNegativeButton("Cancelar", null)
                .show()
        }

        val btnSave = findViewById<Button>(R.id.btn_save)
        btnSave.setOnClickListener {
            tryExtractAndSaveCookies(manual = true)
        }

        setupWebView()
    }

    private fun loadInitialUrl() {
        val testUrl = intent.getStringExtra("test_login_url")
        val url = if (!testUrl.isNullOrEmpty()) testUrl else KICK_LOGIN_URL
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

        // Omit '; wv' and 'Version/X.X' so Cloudflare Turnstile treats it like standard Chrome mobile
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

                // Injeta prompt=select_account quando o Kick redireciona para o Google OAuth
                if (url != null && isGoogleAuthUrl(url)) {
                    val modifiedUrl = ensureSelectAccountPrompt(url)
                    if (modifiedUrl != url) {
                        android.util.Log.i("IdleStream", "Injetando prompt=select_account no Google OAuth (onPageStarted): $modifiedUrl")
                        view?.stopLoading()
                        view?.loadUrl(modifiedUrl)
                        return
                    }
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                // Auto-detecta login somente se o usuário voltou para o Kick (fora do /login)
                // e NUNCA enquanto ainda estiver nas telas de autenticação da Google
                if (!isCompleted && url != null &&
                    url.contains("kick.com", ignoreCase = true) &&
                    !url.contains("/login", ignoreCase = true) &&
                    !url.contains("accounts.google.com", ignoreCase = true)
                ) {
                    tryExtractAndSaveCookies(manual = false)
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (isGoogleAuthUrl(url)) {
                    val modifiedUrl = ensureSelectAccountPrompt(url)
                    if (modifiedUrl != url) {
                        android.util.Log.i("IdleStream", "Injetando prompt=select_account no Google OAuth (shouldOverrideUrlLoading): $modifiedUrl")
                        view?.loadUrl(modifiedUrl)
                        return true
                    }
                }
                return false
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null && isGoogleAuthUrl(url)) {
                    val modifiedUrl = ensureSelectAccountPrompt(url)
                    if (modifiedUrl != url) {
                        android.util.Log.i("IdleStream", "Injetando prompt=select_account no Google OAuth (deprecated shouldOverrideUrlLoading): $modifiedUrl")
                        view?.loadUrl(modifiedUrl)
                        return true
                    }
                }
                return false
            }
        }

        // Fase 1: Pre-Flight Purge - Limpeza completa de Cookies, WebStorage e Cache antes de abrir
        SessionResetHelper.clearSession(this, webView) {
            loadInitialUrl()
        }
    }

    private fun tryExtractAndSaveCookies(manual: Boolean) {
        if (isCompleted) return

        val cookieManager = CookieManager.getInstance()
        val rawCookies = cookieManager.getCookie("https://kick.com") ?: ""
        val cookies = parseCookies(rawCookies)

        val canSave = if (manual) cookies.isValid else cookies.isAuthenticated

        if (canSave) {
            isCompleted = true
            MainActivity.instance?.notifyKickAuthSuccess(
                accountId,
                cookies.kickSession!!,
                cookies.sessionToken ?: "",
                cookies.xsrfToken ?: ""
            )
            Toast.makeText(this, "Sessão da Kick salva com sucesso!", Toast.LENGTH_SHORT).show()

            // Fase 2: Post-Auth Purge - Limpa imediatamente cookies e storage antes de fechar a Activity
            SessionResetHelper.clearSession(this, webView) {
                finish()
            }
        } else if (manual) {
            Toast.makeText(
                this,
                "Login ainda não detectado. Complete o login no site da Kick antes de salvar.",
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

package com.idlestream.app

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.ProfileStore
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

class StreamRedeemActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    private var platform: String = "twitch"
    private var channelSlug: String = ""
    private var accountId: String = ""
    private var accountLabel: String = ""
    private var accountUsername: String = ""
    private var authToken: String = ""
    private var kickSession: String = ""
    private var sessionToken: String = ""
    private var xsrfToken: String = ""

    companion object {
        private const val TAG = "StreamRedeemActivity"

        fun buildTargetUrl(platform: String, channelSlug: String): String {
            val cleanSlug = channelSlug.trim()
            return if (platform.equals("kick", ignoreCase = true)) {
                "https://kick.com/$cleanSlug"
            } else {
                "https://www.twitch.tv/$cleanSlug"
            }
        }

        fun buildProfileName(platform: String, accountId: String): String {
            val cleanId = accountId.replace(Regex("[^a-zA-Z0-9_-]"), "_")
            return "redeem_${platform.lowercase()}_$cleanId"
        }

        fun buildTwitchCookieString(authToken: String): String {
            return "auth-token=${authToken.trim()}; Domain=.twitch.tv; Path=/; Secure; SameSite=Lax"
        }

        fun buildKickCookies(
            sessionToken: String?,
            kickSession: String?,
            xsrfToken: String?
        ): List<Pair<String, String>> {
            val list = mutableListOf<Pair<String, String>>()
            if (!sessionToken.isNullOrBlank()) {
                list.add("session_token" to "session_token=${sessionToken.trim()}; Domain=.kick.com; Path=/; Secure")
            }
            if (!kickSession.isNullOrBlank()) {
                list.add("kick_session" to "kick_session=${kickSession.trim()}; Domain=.kick.com; Path=/; Secure")
            }
            if (!xsrfToken.isNullOrBlank()) {
                list.add("XSRF-TOKEN" to "XSRF-TOKEN=${xsrfToken.trim()}; Domain=.kick.com; Path=/; Secure")
            }
            return list
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_stream_redeem)

        platform = intent.getStringExtra("platform") ?: "twitch"
        channelSlug = intent.getStringExtra("channel_slug") ?: ""
        accountId = intent.getStringExtra("account_id") ?: ""
        accountLabel = intent.getStringExtra("account_label") ?: ""
        accountUsername = intent.getStringExtra("account_username") ?: ""
        authToken = intent.getStringExtra("auth_token") ?: ""
        kickSession = intent.getStringExtra("kick_session") ?: ""
        sessionToken = intent.getStringExtra("session_token") ?: ""
        xsrfToken = intent.getStringExtra("xsrf_token") ?: ""

        val txtTitle = findViewById<TextView>(R.id.txt_redeem_title)
        val txtSubtitle = findViewById<TextView>(R.id.txt_redeem_subtitle)
        val btnClose = findViewById<Button>(R.id.btn_close_redeem)
        val btnReload = findViewById<Button>(R.id.btn_reload_redeem)
        progressBar = findViewById(R.id.redeem_progress_bar)
        webView = findViewById(R.id.redeem_webview)

        val platDisplay = if (platform.equals("kick", ignoreCase = true)) "Kick" else "Twitch"
        txtTitle.text = if (channelSlug.isNotBlank()) "Live: $channelSlug" else "Resgatar Pontos"
        txtSubtitle.text = "${accountLabel.ifBlank { "Conta" }} (@${accountUsername.ifBlank { "user" }}) • $platDisplay"

        btnClose.setOnClickListener {
            finish()
        }

        btnReload.setOnClickListener {
            webView.reload()
        }

        setupWebView()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.setSupportMultipleWindows(false)

        // Higieniza o User-Agent omitindo '; wv' e 'Version/X.X' para que Twitch e Kick
        // reconheçam o navegador como Chrome Mobile padrão, permitindo chat e resgate de pontos
        val originalUa = settings.userAgentString
        settings.userAgentString = originalUa
            .replace("; wv", "")
            .replace(Regex("Version/\\d+\\.\\d+\\s+"), "")

        // Configuração de cookies e isolamento multi-profile
        setupCookiesAndProfile()

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE

                // Injeção de reforço de cookies via JS no início do ciclo de renderização
                injectCookiesViaJs(view)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                Log.w(TAG, "Erro de rede no stream redeem: ${error?.description}")
            }
        }

        val testUrl = intent.getStringExtra("test_override_url")
        val targetUrl = if (!testUrl.isNullOrBlank()) testUrl else buildTargetUrl(platform, channelSlug)

        if (platform.equals("twitch", ignoreCase = true) && authToken.isBlank()) {
            Toast.makeText(
                this,
                "Aviso: Conta sem token de autenticação Twitch salvo.",
                Toast.LENGTH_SHORT
            ).show()
        } else if (platform.equals("kick", ignoreCase = true) && sessionToken.isBlank() && kickSession.isBlank()) {
            Toast.makeText(
                this,
                "Aviso: Conta sem sessão/cookies Kick salvos.",
                Toast.LENGTH_SHORT
            ).show()
        }

        Log.i(TAG, "Carregando live de resgate para $accountLabel em $targetUrl")
        webView.loadUrl(targetUrl)
    }

    private fun setupCookiesAndProfile() {
        val profileName = buildProfileName(platform, accountId)
        val isKick = platform.equals("kick", ignoreCase = true)

        val cookieMgr: CookieManager = if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
            try {
                val profileStore = ProfileStore.getInstance()
                val profile = profileStore.getOrCreateProfile(profileName)
                WebViewCompat.setProfile(webView, profileName)
                Log.d(TAG, "Multi-Profile $profileName ativado para redeem")
                profile.cookieManager
            } catch (e: Throwable) {
                Log.w(TAG, "Fallback para CookieManager padrão: ${e.message}")
                CookieManager.getInstance()
            }
        } else {
            CookieManager.getInstance()
        }

        cookieMgr.setAcceptCookie(true)
        cookieMgr.setAcceptThirdPartyCookies(webView, true)

        if (!isKick) {
            // Twitch
            if (authToken.isNotBlank()) {
                val cookieStr = buildTwitchCookieString(authToken)
                val domains = listOf(
                    "https://.twitch.tv",
                    "https://twitch.tv",
                    "https://www.twitch.tv",
                    "https://m.twitch.tv",
                    "https://id.twitch.tv"
                )
                for (domain in domains) {
                    cookieMgr.setCookie(domain, cookieStr)
                }
            }
        } else {
            // Kick
            val kickCookies = buildKickCookies(sessionToken, kickSession, xsrfToken)
            val domains = listOf(
                "https://.kick.com",
                "https://kick.com"
            )
            for (domain in domains) {
                for ((_, cookieStr) in kickCookies) {
                    cookieMgr.setCookie(domain, cookieStr)
                }
            }
        }

        cookieMgr.flush()
    }

    private fun injectCookiesViaJs(view: WebView?) {
        if (view == null) return
        val isKick = platform.equals("kick", ignoreCase = true)

        if (!isKick && authToken.isNotBlank()) {
            val safeToken = authToken.replace("'", "\\'")
            val js = """
                (function() {
                    try {
                        document.cookie = 'auth-token=$safeToken; domain=.twitch.tv; path=/; secure; SameSite=Lax';
                        document.cookie = 'auth-token=$safeToken; domain=www.twitch.tv; path=/; secure; SameSite=Lax';
                    } catch(e) {}
                })();
            """.trimIndent()
            view.evaluateJavascript(js, null)
        } else if (isKick) {
            val safeSessionToken = sessionToken.replace("'", "\\'")
            val safeKickSession = kickSession.replace("'", "\\'")
            val safeXsrf = xsrfToken.replace("'", "\\'")
            val js = """
                (function() {
                    try {
                        ${if (safeSessionToken.isNotBlank()) "document.cookie = 'session_token=$safeSessionToken; domain=.kick.com; path=/; secure';" else ""}
                        ${if (safeKickSession.isNotBlank()) "document.cookie = 'kick_session=$safeKickSession; domain=.kick.com; path=/; secure';" else ""}
                        ${if (safeXsrf.isNotBlank()) "document.cookie = 'XSRF-TOKEN=$safeXsrf; domain=.kick.com; path=/; secure';" else ""}
                    } catch(e) {}
                })();
            """.trimIndent()
            view.evaluateJavascript(js, null)
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
        webView.destroy()
        super.onDestroy()
    }
}

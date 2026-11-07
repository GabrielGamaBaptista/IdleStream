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

        const val TWITCH_DESKTOP_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

        const val AUTO_CLAIM_TWITCH_JS = """
            (function() {
                if (window._idlestreamClaimerInjected) return;
                window._idlestreamClaimerInjected = true;

                let lastClaimTime = 0;
                let debounceTimer = null;

                function clickChest() {
                    try {
                        // Se o menu de recompensas/resgate estiver aberto pelo usuário, não clica em nada para não fechar
                        if (document.querySelector('[data-test-selector="community-points-rewards"], .rewards-list, [data-test-selector="reward-list-item"]')) {
                            return false;
                        }

                        const now = Date.now();
                        if (now - lastClaimTime < 3000) return false;

                        const selectors = [
                            'button[aria-label="Claim Bonus"]',
                            'button[aria-label="Resgatar bônus"]',
                            'button[aria-label*="Claim Bonus" i]',
                            'button[aria-label*="Resgatar bônus" i]',
                            '[data-test-selector="community-points-claim-summary"] button',
                            '[data-test-selector="community-points-claim-summary"]',
                            '.claimable-bonus__icon'
                        ];
                        for (let i = 0; i < selectors.length; i++) {
                            const el = document.querySelector(selectors[i]);
                            if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)) {
                                console.log('[IdleStream] Baú de pontos Twitch detectado! Clicando...');
                                lastClaimTime = Date.now();
                                el.click();
                                return true;
                            }
                        }
                    } catch(e) {
                        console.error('[IdleStream] Erro no auto-claim:', e);
                    }
                    return false;
                }

                clickChest();
                setInterval(clickChest, 2000);

                const observer = new MutationObserver(function() {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(clickChest, 400);
                });
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            })();
        """

        fun buildTargetUrl(platform: String, channelSlug: String, popoutChat: Boolean = true): String {
            val cleanSlug = channelSlug.trim()
            return if (platform.equals("kick", ignoreCase = true)) {
                "https://kick.com/$cleanSlug"
            } else if (popoutChat) {
                "https://www.twitch.tv/popout/$cleanSlug/chat?popout="
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

        val isTwitch = platform.equals("twitch", ignoreCase = true)
        val layoutModeSwitch = findViewById<View>(R.id.layout_mode_switch)
        val btnModeChat = findViewById<Button>(R.id.btn_mode_chat)
        val btnModeLive = findViewById<Button>(R.id.btn_mode_live)

        if (isTwitch) {
            layoutModeSwitch.visibility = View.VISIBLE
            btnModeChat.setOnClickListener {
                btnModeChat.setTextColor(android.graphics.Color.parseColor("#38bdf8"))
                btnModeChat.setBackgroundColor(android.graphics.Color.parseColor("#1e293b"))
                btnModeLive.setTextColor(android.graphics.Color.parseColor("#94a3b8"))
                btnModeLive.setBackgroundColor(android.graphics.Color.TRANSPARENT)
                val url = buildTargetUrl(platform, channelSlug, popoutChat = true)
                webView.loadUrl(url)
            }
            btnModeLive.setOnClickListener {
                btnModeLive.setTextColor(android.graphics.Color.parseColor("#38bdf8"))
                btnModeLive.setBackgroundColor(android.graphics.Color.parseColor("#1e293b"))
                btnModeChat.setTextColor(android.graphics.Color.parseColor("#94a3b8"))
                btnModeChat.setBackgroundColor(android.graphics.Color.TRANSPARENT)
                val url = buildTargetUrl(platform, channelSlug, popoutChat = false)
                webView.loadUrl(url)
            }
        } else {
            layoutModeSwitch.visibility = View.GONE
        }

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

        val isTwitch = platform.equals("twitch", ignoreCase = true)
        if (isTwitch) {
            // Para Twitch no Android: O layout m.twitch.tv oculta saldo de pontos, baú e loja de resgate.
            // O User-Agent Desktop garante o carregamento da interface desktop com chat e pontos completos.
            settings.userAgentString = TWITCH_DESKTOP_UA
        } else {
            // Para Kick: Higieniza o User-Agent omitindo '; wv' e 'Version/X.X' para que Kick
            // reconheça como Chrome Mobile padrão, permitindo chat e resgate de pontos nativo.
            val originalUa = settings.userAgentString
            settings.userAgentString = originalUa
                .replace("; wv", "")
                .replace(Regex("Version/\\d+\\.\\d+\\s+"), "")
        }

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

                if (isTwitch) {
                    view?.evaluateJavascript(AUTO_CLAIM_TWITCH_JS, null)
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE

                if (isTwitch) {
                    view?.evaluateJavascript(AUTO_CLAIM_TWITCH_JS, null)
                }
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

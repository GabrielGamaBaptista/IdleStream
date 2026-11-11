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
    private var activeCookieMgr: CookieManager? = null

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

        fun encodeKickSessionToken(raw: String): String {
            val decoded = decodeKickSessionToken(raw)
            if (decoded.isBlank()) return ""
            return decoded.replace("|", "%7C")
        }

        fun decodeKickSessionToken(raw: String): String {
            val trimmed = raw.trim()
            if (trimmed.isBlank()) return ""
            return try {
                java.net.URLDecoder.decode(trimmed, "UTF-8")
            } catch (_: Exception) {
                trimmed
            }
        }

        fun computeCredentialsHash(
            platform: String,
            secret1: String?,
            secret2: String?,
            secret3: String? = null
        ): String {
            val plat = platform.trim().lowercase()
            val p1 = secret1?.trim() ?: ""
            val p2 = if (plat == "kick") decodeKickSessionToken(secret2 ?: "") else (secret2?.trim() ?: "")
            val p3 = secret3?.trim() ?: ""
            val raw = "$plat|$p1|$p2|$p3"
            val digest = java.security.MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(Charsets.UTF_8))
            return digest.joinToString("") { "%02x".format(it) }
        }

        private fun parseCookieMap(rawCookies: String?): Map<String, String> {
            if (rawCookies.isNullOrBlank()) return emptyMap()
            val map = linkedMapOf<String, String>()
            for (pair in rawCookies.split(";")) {
                val trimmed = pair.trim()
                val idx = trimmed.indexOf('=')
                if (idx > 0) {
                    val name = trimmed.substring(0, idx).trim().lowercase()
                    val value = trimmed.substring(idx + 1).trim()
                    if (value.isNotBlank()) {
                        map[name] = value
                    }
                }
            }
            return map
        }

        fun shouldSeedProfileCookies(
            platform: String,
            existingRawCookies: String?,
            currentHash: String,
            savedHash: String?
        ): Boolean {
            if (savedHash.isNullOrBlank() || savedHash != currentHash) {
                return true
            }
            val parsed = parseCookieMap(existingRawCookies)
            return if (platform.equals("kick", ignoreCase = true)) {
                parsed["kick_session"].isNullOrBlank() || parsed["session_token"].isNullOrBlank()
            } else {
                parsed["auth-token"].isNullOrBlank()
            }
        }

        fun extractKickCookiesFromHeader(rawCookies: String?): Triple<String?, String?, String?> {
            val parsed = parseCookieMap(rawCookies)
            val ks = parsed["kick_session"]
            val st = parsed["session_token"]?.let { decodeKickSessionToken(it) }?.takeIf { it.isNotBlank() }
            val xs = parsed["xsrf-token"]
            return Triple(ks, st, xs)
        }

        fun extractTwitchAuthFromHeader(rawCookies: String?): String? {
            val parsed = parseCookieMap(rawCookies)
            val raw = parsed["auth-token"] ?: return null
            return decodeKickSessionToken(raw).takeIf { it.isNotBlank() }
        }

        fun buildTwitchCookieString(authToken: String): String {
            return "auth-token=${authToken.trim()}; Domain=.twitch.tv; Path=/; Max-Age=7776000; Secure; SameSite=Lax"
        }

        fun buildKickCookies(
            sessionToken: String?,
            kickSession: String?,
            xsrfToken: String?
        ): List<Pair<String, String>> {
            val list = mutableListOf<Pair<String, String>>()
            if (!sessionToken.isNullOrBlank()) {
                val encodedSt = encodeKickSessionToken(sessionToken)
                list.add("session_token" to "session_token=$encodedSt; Domain=.kick.com; Path=/; Max-Age=7776000; Secure")
            }
            if (!kickSession.isNullOrBlank()) {
                list.add("kick_session" to "kick_session=${kickSession.trim()}; Domain=.kick.com; Path=/; Max-Age=7776000; Secure; HttpOnly")
            }
            if (!xsrfToken.isNullOrBlank()) {
                list.add("XSRF-TOKEN" to "XSRF-TOKEN=${xsrfToken.trim()}; Domain=.kick.com; Path=/; Max-Age=7776000; Secure")
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

                if (isTwitch) {
                    view?.evaluateJavascript(AUTO_CLAIM_TWITCH_JS, null)
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE

                syncCookiesBackToApp()

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
        activeCookieMgr = cookieMgr

        val prefs = getSharedPreferences("idlestream_redeem_prefs", MODE_PRIVATE)
        val syncKey = "sync_hash_${if (isKick) "kick" else "twitch"}_$accountId"
        val savedHash = prefs.getString(syncKey, null)

        if (!isKick) {
            // Twitch (Profile-First + Cookie Nativo com Max-Age=90d)
            if (authToken.isNotBlank()) {
                val currentHash = computeCredentialsHash("twitch", authToken, null, null)
                val existingRaw = cookieMgr.getCookie("https://www.twitch.tv")
                if (shouldSeedProfileCookies("twitch", existingRaw, currentHash, savedHash)) {
                    val cookieStr = buildTwitchCookieString(authToken)
                    val origins = listOf(
                        "https://twitch.tv",
                        "https://www.twitch.tv",
                        "https://m.twitch.tv",
                        "https://id.twitch.tv"
                    )
                    for (origin in origins) {
                        cookieMgr.setCookie(origin, cookieStr)
                    }
                    cookieMgr.flush()
                    prefs.edit().putString(syncKey, currentHash).apply()
                    Log.d(TAG, "Seed Profile-First aplicado na Twitch para conta $accountId")
                } else {
                    Log.d(TAG, "Profile-First preservou sessão Twitch existente para conta $accountId")
                }
            }
        } else {
            // Kick (Profile-First + Cookie Nativo HttpOnly + Max-Age=90d)
            if (sessionToken.isNotBlank() || kickSession.isNotBlank()) {
                val currentHash = computeCredentialsHash("kick", kickSession, sessionToken, xsrfToken)
                val existingRaw = cookieMgr.getCookie("https://kick.com")
                if (shouldSeedProfileCookies("kick", existingRaw, currentHash, savedHash)) {
                    val kickCookies = buildKickCookies(sessionToken, kickSession, xsrfToken)
                    val origins = listOf(
                        "https://kick.com",
                        "https://www.kick.com"
                    )
                    for (origin in origins) {
                        for ((_, cookieStr) in kickCookies) {
                            cookieMgr.setCookie(origin, cookieStr)
                        }
                    }
                    cookieMgr.flush()
                    prefs.edit().putString(syncKey, currentHash).apply()
                    Log.d(TAG, "Seed Profile-First aplicado na Kick para conta $accountId")
                } else {
                    Log.d(TAG, "Profile-First preservou sessão Kick existente para conta $accountId")
                }
            }
        }
    }

    private fun syncCookiesBackToApp() {
        val cookieMgr = activeCookieMgr ?: return
        try {
            cookieMgr.flush()
            val isKick = platform.equals("kick", ignoreCase = true)
            val prefs = getSharedPreferences("idlestream_redeem_prefs", MODE_PRIVATE)
            if (isKick) {
                val raw = cookieMgr.getCookie("https://kick.com") ?: return
                val (obsKs, obsSt, obsXs) = extractKickCookiesFromHeader(raw)
                if (obsKs.isNullOrBlank() && obsSt.isNullOrBlank()) return

                val curStDecoded = decodeKickSessionToken(sessionToken)
                val ksChanged = !obsKs.isNullOrBlank() && obsKs != kickSession
                val stChanged = !obsSt.isNullOrBlank() && obsSt != curStDecoded
                val xsChanged = !obsXs.isNullOrBlank() && obsXs != xsrfToken

                if (ksChanged || stChanged || xsChanged) {
                    val mergedKs = obsKs?.takeIf { it.isNotBlank() } ?: kickSession
                    val mergedSt = obsSt?.takeIf { it.isNotBlank() } ?: curStDecoded
                    val mergedXs = obsXs?.takeIf { it.isNotBlank() } ?: xsrfToken

                    kickSession = mergedKs
                    sessionToken = mergedSt
                    xsrfToken = mergedXs

                    val newHash = computeCredentialsHash("kick", mergedKs, mergedSt, mergedXs)
                    prefs.edit().putString("sync_hash_kick_$accountId", newHash).apply()
                    MainActivity.instance?.notifyKickSessionRotated(accountId, mergedKs, mergedSt, mergedXs)
                }
            } else {
                val raw = cookieMgr.getCookie("https://www.twitch.tv") ?: return
                val obsTok = extractTwitchAuthFromHeader(raw) ?: return
                if (obsTok.isNotBlank() && obsTok != authToken.removePrefix("oauth:").trim()) {
                    authToken = obsTok
                    val newHash = computeCredentialsHash("twitch", obsTok, null, null)
                    prefs.edit().putString("sync_hash_twitch_$accountId", newHash).apply()
                    MainActivity.instance?.notifyTwitchAuthSuccess(accountId, obsTok)
                }
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Falha não-crítica ao sincronizar cookies de retorno: ${e.message}")
        }
    }

    override fun onPause() {
        super.onPause()
        syncCookiesBackToApp()
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
        syncCookiesBackToApp()
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }
}

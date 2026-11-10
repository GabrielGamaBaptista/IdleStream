package com.idlestream.app

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Message
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.ProfileStore
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.util.Collections

class VoteBridgeInterface(
    private val accountId: String,
    private val manager: VoteWebViewManager
) {
    @JavascriptInterface
    fun onVoteDetectedHint(reason: String) {
        manager.emitVoteDetectedHint(accountId, reason)
    }
}

/**
 * Gerenciador nativo de WebView sob demanda exclusiva da seção Votos (Android).
 *
 * Princípios:
 * - Cria apenas UMA WebView interativa somente quando o usuário clica em votar.
 * - Ao fechar ou trocar de aba, destrói completamente (`destroy()`) liberando 100% da RAM.
 * - Restringe navegação top-level estritamente ao TopIdle (+ Google OAuth e CAPTCHAs).
 * - Compartilha o mesmo Multi-Profile ("slot_slot-X") dos Idle Games para reutilizar o login Google.
 */
class VoteWebViewManager(private val activity: MainActivity) {
    companion object {
        private const val TAG = "VoteWebViewManager"
    }

    private var container: PassThroughFrameLayout? = null
    private var activeWebView: WebView? = null
    private var popupWrapper: LinearLayout? = null
    private var popupWebView: WebView? = null

    @Volatile
    private var activeAccountId: String? = null
    private var activeLinkedSlotId: String? = null
    private var activeShareProfile: Boolean = true
    private var activeProfileName: String = "slot_slot-1"

    private var lastX = 0.0
    private var lastY = 0.0
    private var lastWidth = 0.0
    private var lastHeight = 0.0
    private var lastVisible = false

    private fun ensureContainer() {
        if (container != null) return
        val root = activity.findViewById<ViewGroup>(android.R.id.content) ?: return
        val fl = PassThroughFrameLayout(activity).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.TRANSPARENT)
            isClickable = false
            isFocusable = false
        }
        root.addView(fl)
        container = fl
    }

    private fun getCookieManagerForProfile(profileName: String): CookieManager {
        if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
            try {
                val profile = ProfileStore.getInstance().getOrCreateProfile(profileName)
                return profile.cookieManager
            } catch (e: Throwable) {
                Log.w(TAG, "Falha ao obter CookieManager do profile $profileName: ${e.message}")
            }
        }
        return CookieManager.getInstance()
    }

    private fun configureVoteWebView(
        wv: WebView,
        accountId: String,
        profileName: String,
        isPopup: Boolean
    ) {
        wv.setBackgroundColor(Color.parseColor("#0a0a0a"))
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(true)
            builtInZoomControls = false
            displayZoomControls = false
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(true)

            val originalUa = userAgentString
            userAgentString = originalUa
                .replace("; wv", "")
                .replace(Regex("Version/\\d+\\.\\d+\\s+"), "")
        }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
            try {
                val profile = ProfileStore.getInstance().getOrCreateProfile(profileName)
                WebViewCompat.setProfile(wv, profileName)
                profile.cookieManager.setAcceptCookie(true)
                profile.cookieManager.setAcceptThirdPartyCookies(wv, true)
                Log.d(TAG, "Profile $profileName aplicado à WebView de voto (popup=$isPopup)")
            } catch (e: Throwable) {
                Log.w(TAG, "Erro ao aplicar MULTI_PROFILE ($profileName): ${e.message}")
                val cm = CookieManager.getInstance()
                cm.setAcceptCookie(true)
                cm.setAcceptThirdPartyCookies(wv, true)
            }
        } else {
            val cm = CookieManager.getInstance()
            cm.setAcceptCookie(true)
            cm.setAcceptThirdPartyCookies(wv, true)
        }

        wv.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        if (!isPopup) {
            wv.addJavascriptInterface(VoteBridgeInterface(accountId, this), "IdleStreamVoteBridge")
            val observerScript = loadObserverScript()
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                try {
                    WebViewCompat.addDocumentStartJavaScript(
                        wv,
                        observerScript,
                        Collections.singleton("*")
                    )
                } catch (e: Throwable) {
                    Log.w(TAG, "Falha ao registrar document_start observer em voto: ${e.message}")
                }
            }
        }

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val reqUrl = request?.url?.toString() ?: return false
                val isMainFrame = request.isForMainFrame

                if (!isMainFrame) {
                    return false
                }

                if (!VoteUrlPolicy.isAllowedVoteNavigation(reqUrl, isPopup)) {
                    val host = try {
                        java.net.URI(reqUrl).host ?: "desconhecido"
                    } catch (_: Exception) {
                        "desconhecido"
                    }
                    Log.w(TAG, "Navegação externa bloqueada na seção Votos: $reqUrl")
                    emitBlockedEvent(accountId, reqUrl, host)
                    return true
                }

                if (VoteUrlPolicy.isGoogleAuthUrl(reqUrl)) {
                    val modified = VoteUrlPolicy.ensureSelectAccountPrompt(reqUrl)
                    if (modified != reqUrl) {
                        view?.loadUrl(modified)
                        return true
                    }
                }
                return false
            }

            override fun onPageStarted(view: WebView?, pageUrl: String?, favicon: Bitmap?) {
                super.onPageStarted(view, pageUrl, favicon)
                if (pageUrl != null) {
                    if (!isPopup) {
                        emitUrlChanged(accountId, pageUrl, true)
                    }
                    if (VoteUrlPolicy.isGoogleAuthUrl(pageUrl)) {
                        val modified = VoteUrlPolicy.ensureSelectAccountPrompt(pageUrl)
                        if (modified != pageUrl) {
                            view?.stopLoading()
                            view?.loadUrl(modified)
                            return
                        }
                    }
                }
            }

            override fun onPageFinished(view: WebView?, pageUrl: String?) {
                super.onPageFinished(view, pageUrl)
                if (!isPopup) {
                    if (pageUrl != null) {
                        emitUrlChanged(accountId, pageUrl, false)
                        if (pageUrl.contains("topidle.com", ignoreCase = true)) {
                            view?.evaluateJavascript(loadObserverScript(), null)
                        }
                    }
                }
                try {
                    getCookieManagerForProfile(profileName).flush()
                } catch (_: Throwable) {}
            }
        }

        wv.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                if (isPopup) return false
                val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                openOAuthPopup(accountId, profileName, transport, resultMsg)
                return true
            }

            override fun onCloseWindow(window: WebView?) {
                if (isPopup) {
                    closePopupInternal()
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun openOAuthPopup(
        accountId: String,
        profileName: String,
        transport: WebView.WebViewTransport,
        resultMsg: Message
    ) {
        closePopupInternal()
        ensureContainer()
        val parent = container ?: return

        val wrapper = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#111111"))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            elevation = 24f
            isClickable = true
            isFocusable = true
        }
        ViewCompat.setOnApplyWindowInsetsListener(wrapper) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }

        val header = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#171717"))
            setPadding(24, 16, 24, 16)
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val titleView = TextView(activity).apply {
            text = "Autenticação Google / TopIdle"
            setTextColor(Color.WHITE)
            textSize = 13f
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val closeBtn = Button(activity).apply {
            text = "Fechar"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#3f3f46"))
            textSize = 11f
            setOnClickListener { closePopupInternal() }
        }

        header.addView(titleView)
        header.addView(closeBtn)

        val childWv = WebView(activity).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }
        configureVoteWebView(childWv, accountId, profileName, true)

        wrapper.addView(header)
        wrapper.addView(childWv)
        parent.addView(wrapper)

        popupWrapper = wrapper
        popupWebView = childWv

        transport.webView = childWv
        resultMsg.sendToTarget()
    }

    private fun closePopupInternal() {
        try {
            popupWebView?.let { pwv ->
                pwv.stopLoading()
                pwv.destroy()
            }
            popupWrapper?.let { wrap ->
                container?.removeView(wrap)
            }
        } catch (_: Throwable) {}
        popupWebView = null
        popupWrapper = null
    }

    private fun loadObserverScript(): String {
        return try {
            activity.assets.open("votes/vote_observer.js").bufferedReader().use { it.readText() }
        } catch (_: Throwable) {
            VoteUrlPolicy.VOTE_OBSERVER_JS
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun openVoteWebView(
        accountId: String,
        targetUrl: String,
        linkedGameSlotId: String?,
        shareGameProfile: Boolean
    ) {
        val validUrl = VoteUrlPolicy.buildVoteTargetUrl(targetUrl, "")
            .let {
                // Target URL já vem pronta do frontend com playerIdentifier; garante whitelist estrita
                if (!VoteUrlPolicy.isAllowedVoteNavigation(targetUrl, false)) {
                    throw IllegalArgumentException("URL fora da whitelist TopIdle: $targetUrl")
                }
                targetUrl
            }

        val profileName = VoteUrlPolicy.resolveProfileName(accountId, linkedGameSlotId, shareGameProfile)

        activity.runOnUiThread {
            closePopupInternal()
            activeWebView?.let { oldWv ->
                container?.removeView(oldWv)
                oldWv.stopLoading()
                oldWv.destroy()
            }
            activeWebView = null

            ensureContainer()
            val parent = container ?: return@runOnUiThread

            activeAccountId = accountId
            activeLinkedSlotId = linkedGameSlotId
            activeShareProfile = shareGameProfile
            activeProfileName = profileName

            val wv = WebView(activity).apply {
                layoutParams = FrameLayout.LayoutParams(1, 1).apply {
                    leftMargin = -1000
                    topMargin = -1000
                }
                visibility = View.INVISIBLE
            }
            configureVoteWebView(wv, accountId, profileName, false)
            parent.addView(wv)
            activeWebView = wv

            applyBoundsToActiveWebView()
            wv.loadUrl(validUrl)
            Log.i(TAG, "Vote WebView aberta para $accountId (profile=$profileName) em $validUrl")
        }
    }

    fun closeVoteWebView() {
        activeAccountId = null
        activity.runOnUiThread {
            closePopupInternal()
            activeWebView?.let { wv ->
                try {
                    getCookieManagerForProfile(activeProfileName).flush()
                } catch (_: Throwable) {}
                container?.removeView(wv)
                wv.stopLoading()
                wv.destroy()
            }
            activeWebView = null
            lastVisible = false
            Log.i(TAG, "Vote WebView destruída completamente (0 MB RAM).")
        }
    }

    fun updateBounds(x: Double, y: Double, width: Double, height: Double, visible: Boolean) {
        lastX = x
        lastY = y
        lastWidth = width
        lastHeight = height
        lastVisible = visible
        activity.runOnUiThread {
            applyBoundsToActiveWebView()
        }
    }

    fun hideVoteWebView() {
        lastVisible = false
        activity.runOnUiThread {
            activeWebView?.let { wv ->
                wv.visibility = View.INVISIBLE
                wv.layoutParams = FrameLayout.LayoutParams(1, 1).apply {
                    leftMargin = -10000
                    topMargin = -10000
                }
            }
        }
    }

    fun reloadVoteWebView() {
        activity.runOnUiThread {
            activeWebView?.reload()
        }
    }

    /**
     * Limpa exclusivamente cookies e Web Storage de topidle.com preservando Google e pokeidle.io.
     */
    fun clearTopIdleSession(targetUrl: String) {
        if (!VoteUrlPolicy.isAllowedVoteNavigation(targetUrl, false)) return
        activity.runOnUiThread {
            val wv = activeWebView ?: return@runOnUiThread
            try {
                val cm = getCookieManagerForProfile(activeProfileName)
                val topidleCookies = cm.getCookie("https://topidle.com") ?: ""
                if (topidleCookies.isNotBlank()) {
                    for (pair in topidleCookies.split(";")) {
                        val name = pair.substringBefore("=").trim()
                        if (name.isEmpty()) continue
                        cm.setCookie("https://topidle.com", "$name=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Domain=topidle.com; Secure")
                        cm.setCookie("https://topidle.com", "$name=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Domain=.topidle.com; Secure")
                        cm.setCookie("https://topidle.com", "$name=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Domain=topidle.com")
                        cm.setCookie("https://topidle.com", "$name=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/")
                    }
                    cm.flush()
                }
            } catch (e: Throwable) {
                Log.w(TAG, "Erro ao limpar cookies TopIdle: ${e.message}")
            }

            wv.evaluateJavascript(
                "try { if (location.hostname.endsWith('topidle.com')) { localStorage.clear(); sessionStorage.clear(); } } catch(_) {}"
            ) {
                wv.loadUrl(targetUrl)
            }
        }
    }

    fun getActiveAccountId(): String? = activeAccountId

    private fun applyBoundsToActiveWebView() {
        val wv = activeWebView ?: return
        if (!lastVisible || lastWidth <= 10.0 || lastHeight <= 10.0) {
            wv.visibility = View.INVISIBLE
            wv.layoutParams = FrameLayout.LayoutParams(1, 1).apply {
                leftMargin = -10000
                topMargin = -10000
            }
            return
        }

        val density = activity.resources.displayMetrics.density
        val pxX = (lastX * density).toInt()
        val pxY = (lastY * density).toInt()
        val pxW = (lastWidth * density).toInt()
        val pxH = (lastHeight * density).toInt()

        wv.visibility = View.VISIBLE
        wv.layoutParams = FrameLayout.LayoutParams(pxW, pxH).apply {
            leftMargin = pxX
            topMargin = pxY
        }
    }

    private fun emitUrlChanged(accountId: String, url: String, loading: Boolean) {
        val payload = JSONObject().apply {
            put("account_id", accountId)
            put("url", url)
            put("loading", loading)
        }.toString()
        activity.dispatchVoteEvent("android-vote-url-changed", payload)
    }

    private fun emitBlockedEvent(accountId: String, blockedUrl: String, host: String) {
        val payload = JSONObject().apply {
            put("account_id", accountId)
            put("blocked_url", blockedUrl)
            put("host", host)
        }.toString()
        activity.dispatchVoteEvent("android-vote-blocked", payload)
    }

    fun emitVoteDetectedHint(accountId: String, reason: String) {
        val payload = JSONObject().apply {
            put("account_id", accountId)
            put("reason", reason)
        }.toString()
        activity.dispatchVoteEvent("android-vote-detected-hint", payload)
    }

    fun destroy() {
        closeVoteWebView()
    }
}

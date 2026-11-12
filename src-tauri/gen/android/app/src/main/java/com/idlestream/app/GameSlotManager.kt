package com.idlestream.app

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import android.content.MutableContextWrapper
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.FrameLayout
import androidx.webkit.ProfileStore
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONArray
import org.json.JSONObject
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * Layout especial que repassa eventos de toque para a WebView principal subjacente
 * caso o toque ocorra fora das WebViews filhas dos slots de jogos.
 * Blindado para forçar View.VISIBLE nas mudanças de visibilidade de janela.
 */
class PassThroughFrameLayout(context: Context) : FrameLayout(context) {
    override fun onTouchEvent(event: MotionEvent): Boolean {
        return false
    }

    override fun dispatchWindowVisibilityChanged(visibility: Int) {
        super.dispatchWindowVisibilityChanged(View.VISIBLE)
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        super.onWindowVisibilityChanged(View.VISIBLE)
    }
}

/**
 * WebView blindada para execução ininterrupta 24/7 de slots de jogos em segundo plano
 * e com tela desligada.
 */
class PersistentWebView(context: Context) : WebView(context) {
    init {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                setRendererPriorityPolicy(RENDERER_PRIORITY_IMPORTANT, false)
            } catch (e: Throwable) {
                Log.w("PersistentWebView", "Falha ao definir política de renderizador: ${e.message}")
            }
        }
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        super.onWindowVisibilityChanged(View.VISIBLE)
    }

    override fun onVisibilityChanged(changedView: View, visibility: Int) {
        super.onVisibilityChanged(changedView, View.VISIBLE)
    }

    override fun dispatchWindowVisibilityChanged(visibility: Int) {
        super.dispatchWindowVisibilityChanged(View.VISIBLE)
    }

    override fun onPause() {
        // Intencionalmente não congela o slot, mas assegura o flush atômico de cookies e cache SQLite para o disco
        try {
            CookieManager.getInstance().flush()
        } catch (_: Throwable) {}
    }

    override fun pauseTimers() {
        // Intencionalmente vazio: impede o congelamento global de timers
    }
}

/**
 * Bridge Javascript nativa exposta para cada slot de jogo ("IdleStreamSlotBridge").
 * Usa Application/GameSlotManager (sem referência forte para MainActivity) evitando vazamentos.
 */
class GameSlotBridge(private val slotId: String, private val app: Application, private val manager: GameSlotManager) {
    private val prefs = app.getSharedPreferences("idlestream_game_sessions", Context.MODE_PRIVATE)

    @JavascriptInterface
    fun saveSession(sessionJson: String) {
        if (sessionJson.isBlank() || sessionJson == "null" || sessionJson == "undefined") return
        try {
            prefs.edit().putString("slot_${slotId}_sessao", sessionJson).apply()
            CookieManager.getInstance().flush()
            manager.reportUserActivity()
            Log.d("GameSlotBridge", "Sessão salva com sucesso no slot $slotId (${sessionJson.length} bytes)")
        } catch (e: Throwable) {
            Log.e("GameSlotBridge", "Erro ao salvar sessão no slot $slotId: ${e.message}")
        }
    }

    @JavascriptInterface
    fun getSavedSession(): String {
        return try {
            val s = prefs.getString("slot_${slotId}_sessao", "") ?: ""
            if (s.isNotBlank() && s != "null") s else ""
        } catch (e: Throwable) {
            ""
        }
    }

    @JavascriptInterface
    fun clearSession() {
        try {
            prefs.edit().remove("slot_${slotId}_sessao").apply()
            CookieManager.getInstance().flush()
            Log.d("GameSlotBridge", "Sessão removida do slot $slotId")
        } catch (e: Throwable) {
            Log.e("GameSlotBridge", "Erro ao limpar sessão no slot $slotId: ${e.message}")
        }
    }

    @JavascriptInterface
    fun reportActivity() {
        manager.reportUserActivity()
    }
}

/**
 * Gerenciador nativo de WebViews filhas para slots de jogos no Android.
 * Pertence à IdleStreamApplication (nível de processo) para sobreviver à recriação/destruição
 * da MainActivity sem encerrar os jogos ou perder sessões ativas.
 */
class GameSlotManager(private val app: Application) {
    companion object {
        private const val TAG = "GameSlotManager"
        private const val PREFS_RUNTIME = IdleStreamForegroundService.PREFS_RUNTIME
        private const val KEY_DESIRED_SLOTS = "desired_game_slots_json"
        private const val KEY_FPS_TIER = "game_fps_tier"

        fun isGoogleAuthUrl(url: String?): Boolean {
            if (url.isNullOrBlank()) return false
            val lower = url.lowercase()
            if (!lower.contains("accounts.google.com")) return false

            val isOAuthEndpoint = lower.contains("/o/oauth2/") || lower.contains("/oauth2/") || lower.contains("/signin/oauth")
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
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val containerContext = MutableContextWrapper(app)
    private var container: PassThroughFrameLayout? = null
    private val slotContexts = ConcurrentHashMap<String, MutableContextWrapper>()
    private val slotWebViews = ConcurrentHashMap<String, WebView>()
    private val activeSlots = ConcurrentHashMap<String, String>() // slotId -> url
    private val slotZooms = ConcurrentHashMap<String, Double>()
    private val slotVisibleMap = ConcurrentHashMap<String, Boolean>()
    private val slotHiddenJsState = ConcurrentHashMap<String, Boolean>()

    @Volatile
    private var currentActivity: MainActivity? = null

    @Volatile
    private var currentFps: Int = try {
        app.getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE).getInt(KEY_FPS_TIER, 30)
    } catch (_: Throwable) {
        30
    }

    @Volatile
    private var isLowPowerBackground: Boolean = false

    private var watchdogExecutor: java.util.concurrent.ScheduledExecutorService? = null
    private val watchdogTick = AtomicInteger(0)

    private fun runOnMain(block: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            block()
        } else {
            mainHandler.post(block)
        }
    }

    fun reportUserActivity() {
        MainActivity.instance?.recordUserActivity()
    }

    fun attachToActivity(activity: MainActivity) {
        currentActivity = activity
        runOnMain {
            containerContext.baseContext = activity
            slotContexts.values.forEach { it.baseContext = activity }
            ensureContainer()
        }
    }

    fun detachFromActivity(activity: MainActivity) {
        if (currentActivity === activity) {
            currentActivity = null
        }
        try {
            CookieManager.getInstance().flush()
        } catch (_: Throwable) {}
        runOnMain {
            container?.let { fl ->
                (fl.parent as? ViewGroup)?.removeView(fl)
            }
            if (currentActivity == null) {
                containerContext.baseContext = app
                slotContexts.values.forEach { it.baseContext = app }
            }
        }
    }

    fun startWatchdog() {
        if (watchdogExecutor != null && !watchdogExecutor!!.isShutdown) return
        watchdogExecutor = java.util.concurrent.Executors.newSingleThreadScheduledExecutor()
        watchdogExecutor?.scheduleWithFixedDelay({
            if (activeSlots.isEmpty()) return@scheduleWithFixedDelay
            val tick = watchdogTick.incrementAndGet()
            // Em segundo plano/tela desligada reduz o pulso nativo para a cada ~10s (economia de CPU),
            // mantendo em 2s quando o app está em primeiro plano ativo.
            if (isLowPowerBackground && (tick % 5 != 0)) {
                return@scheduleWithFixedDelay
            }
            mainHandler.post {
                for (wv in slotWebViews.values) {
                    try {
                        wv.dispatchWindowVisibilityChanged(View.VISIBLE)
                        wv.resumeTimers()
                        wv.evaluateJavascript(
                            "if (typeof window.__idlestreamHeartbeat === 'function') { window.__idlestreamHeartbeat(); }",
                            null
                        )
                    } catch (_: Throwable) {}
                }
            }
        }, 2000, 2000, java.util.concurrent.TimeUnit.MILLISECONDS)
        Log.d(TAG, "Watchdog de segundo plano iniciado (pulso 2s foreground / 10s background)")
    }

    fun stopWatchdog() {
        try {
            watchdogExecutor?.shutdownNow()
            watchdogExecutor = null
        } catch (_: Throwable) {}
    }

    fun ensureContainer() {
        runOnMain {
            val activity = currentActivity ?: MainActivity.instance ?: return@runOnMain
            val root = activity.findViewById<ViewGroup>(android.R.id.content) ?: return@runOnMain

            var fl = container
            if (fl == null) {
                containerContext.baseContext = activity
                fl = PassThroughFrameLayout(containerContext).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(Color.TRANSPARENT)
                    isClickable = false
                    isFocusable = false
                }
                container = fl
            }

            if (fl.parent !== root) {
                (fl.parent as? ViewGroup)?.removeView(fl)
                root.addView(fl)
                Log.d(TAG, "GameSlotManager container anexado à MainActivity.")
            }
        }
    }

    private fun persistDesiredSlots() {
        try {
            val root = JSONObject()
            for ((id, url) in activeSlots) {
                val entry = JSONObject().apply {
                    put("url", url)
                    put("zoom", slotZooms[id] ?: 1.0)
                }
                root.put(id, entry)
            }
            app.getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_DESIRED_SLOTS, root.toString())
                .apply()
        } catch (_: Throwable) {}
    }

    fun clearPersistedSlots() {
        try {
            app.getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_DESIRED_SLOTS)
                .apply()
        } catch (_: Throwable) {}
    }

    fun restorePersistedSlots() {
        try {
            val raw = app.getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE)
                .getString(KEY_DESIRED_SLOTS, null) ?: return
            if (raw.isBlank() || raw == "{}") return
            val obj = JSONObject(raw)
            val keys = obj.keys()
            var restoredCount = 0
            while (keys.hasNext()) {
                val slotId = keys.next()
                if (slotWebViews.containsKey(slotId)) continue
                val entry = obj.optJSONObject(slotId) ?: continue
                val url = entry.optString("url", "").ifBlank { "https://pokeidle.io/app" }
                val zoom = entry.optDouble("zoom", 1.0)
                startSlot(slotId, url, zoom)
                restoredCount++
            }
            if (restoredCount > 0) {
                LifecycleLogger.log(app, "SLOTS_AUTO_RESTORED", "restored=$restoredCount")
            }
        } catch (e: Throwable) {
            LifecycleLogger.log(app, "SLOTS_RESTORE_ERR", e.message ?: "unknown")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun startSlot(slotId: String, url: String, zoom: Double = 1.0) {
        val previousUrl = activeSlots[slotId]
        activeSlots[slotId] = url
        slotZooms[slotId] = zoom
        persistDesiredSlots()

        runOnMain {
            ensureContainer()
            val parent = container

            var webView = slotWebViews[slotId]
            val createdNow = webView == null
            if (webView == null) {
                val wvCtx = MutableContextWrapper(currentActivity ?: MainActivity.instance ?: app)
                slotContexts[slotId] = wvCtx

                webView = PersistentWebView(wvCtx).apply {
                    layoutParams = FrameLayout.LayoutParams(1, 1).apply {
                        leftMargin = -100
                        topMargin = -100
                    }
                    visibility = View.VISIBLE
                    alpha = 0f
                    setBackgroundColor(Color.parseColor("#0a0a0a"))

                    settings.apply {
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
                        setSupportMultipleWindows(false)
                    }

                    // Remove '; wv' e 'Version/X.X' para que Google OAuth, Cloudflare e Discord
                    // tratem a WebView como um navegador Chrome Mobile normal, evitando bloqueios
                    val originalUa = settings.userAgentString
                    settings.userAgentString = originalUa
                        .replace("; wv", "")
                        .replace(Regex("Version/\\d+\\.\\d+\\s+"), "")

                    // Registra a bridge nativa para persistência atômica da sessão do PokeIdle e monitor de atividade
                    addJavascriptInterface(GameSlotBridge(slotId, app, this@GameSlotManager), "IdleStreamSlotBridge")

                    // Isolamento NATIVO de Cookies e Sessões via Multi-Profile (AndroidX WebKit)
                    val profileName = "slot_$slotId"
                    if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
                        try {
                            val profileStore = ProfileStore.getInstance()
                            val profile = profileStore.getOrCreateProfile(profileName)
                            WebViewCompat.setProfile(this, profileName)
                            val profileCookieManager = profile.cookieManager
                            profileCookieManager.setAcceptCookie(true)
                            profileCookieManager.setAcceptThirdPartyCookies(this, true)
                            Log.d(TAG, "Multi-profile $profileName configurado com sucesso para $slotId")
                        } catch (e: Throwable) {
                            Log.w(TAG, "Falha ao aplicar MULTI_PROFILE ($profileName): ${e.message}")
                            val cookieManager = CookieManager.getInstance()
                            cookieManager.setAcceptCookie(true)
                            cookieManager.setAcceptThirdPartyCookies(this, true)
                        }
                    } else {
                        val cookieManager = CookieManager.getInstance()
                        cookieManager.setAcceptCookie(true)
                        cookieManager.setAcceptThirdPartyCookies(this, true)
                    }

                    setLayerType(
                        if (isLowPowerBackground) View.LAYER_TYPE_NONE else View.LAYER_TYPE_HARDWARE,
                        null
                    )

                    val isolationScript = getStorageIsolationScript(slotId)
                    val antiSleepScript = loadAssetScript("games/anti_sleep.js")
                    val huntScript = getHuntScript()

                    val combinedStartScript = buildString {
                        append(isolationScript)
                        append("\n")
                        append(antiSleepScript)
                        if (huntScript.isNotEmpty()) {
                            append("\n\n// === /hunt for PokeIdle Extension (Early WebSocket Hook) ===\n")
                            append("""
                                (function() {
                                    try {
                                        if (window.location && window.location.hostname && window.location.hostname.includes('pokeidle.io')) {
                                            $huntScript
                                        }
                                    } catch (e) {
                                        console.error('[IdleStream Hunt] Erro na injeção document_start:', e);
                                    }
                                })();
                            """.trimIndent())
                        }
                    }

                    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                        try {
                            WebViewCompat.addDocumentStartJavaScript(
                                this,
                                combinedStartScript,
                                Collections.singleton("*")
                            )
                            Log.d(TAG, "addDocumentStartJavaScript configurado com sucesso para $slotId")
                        } catch (e: Throwable) {
                            Log.w(TAG, "Falha ao registrar addDocumentStartJavaScript: ${e.message}")
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, pageUrl: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, pageUrl, favicon)
                            if (pageUrl != null && isGoogleAuthUrl(pageUrl)) {
                                val modifiedUrl = ensureSelectAccountPrompt(pageUrl)
                                if (modifiedUrl != pageUrl) {
                                    Log.i(TAG, "Injetando prompt=select_account no Google OAuth (slot $slotId): $modifiedUrl")
                                    view?.stopLoading()
                                    view?.loadUrl(modifiedUrl)
                                    return
                                }
                            }
                            view?.evaluateJavascript(getStorageIsolationScript(slotId), null)
                            val antiSleep = loadAssetScript("games/anti_sleep.js")
                            if (antiSleep.isNotEmpty()) {
                                view?.evaluateJavascript(antiSleep, null)
                            }
                            if (pageUrl != null && pageUrl.contains("pokeidle.io")) {
                                val hunt = getHuntScript()
                                if (hunt.isNotEmpty()) {
                                    view?.evaluateJavascript(hunt, null)
                                }
                            }
                        }

                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                            val reqUrl = request?.url?.toString()
                            if (reqUrl != null && isGoogleAuthUrl(reqUrl)) {
                                val modifiedUrl = ensureSelectAccountPrompt(reqUrl)
                                if (modifiedUrl != reqUrl) {
                                    Log.i(TAG, "Injetando prompt=select_account no Google OAuth (shouldOverride, slot $slotId): $modifiedUrl")
                                    view?.loadUrl(modifiedUrl)
                                    return true
                                }
                            }
                            return false
                        }

                        override fun onPageFinished(view: WebView?, pageUrl: String?) {
                            super.onPageFinished(view, pageUrl)
                            injectEngineScripts(slotId, view, pageUrl)
                        }

                        override fun onRenderProcessGone(
                            view: WebView?,
                            detail: RenderProcessGoneDetail?
                        ): Boolean {
                            val didCrash = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                detail?.didCrash() ?: false
                            } else {
                                false
                            }
                            val prio = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                detail?.rendererPriorityAtExit() ?: -1
                            } else {
                                -1
                            }
                            LifecycleLogger.log(
                                app,
                                "WEBVIEW_SLOT_RENDER_GONE",
                                "slot=$slotId didCrash=$didCrash rendererPriority=$prio"
                            )
                            val targetUrl = activeSlots[slotId]
                            val targetZoom = slotZooms[slotId] ?: 1.0
                            val removed = slotWebViews.remove(slotId)
                            slotContexts.remove(slotId)
                            slotHiddenJsState.remove(slotId)
                            if (removed != null) {
                                try {
                                    container?.removeView(removed)
                                    removed.destroy()
                                } catch (_: Throwable) {}
                            }
                            if (targetUrl != null) {
                                mainHandler.postDelayed({
                                    if (activeSlots.containsKey(slotId)) {
                                        startSlot(slotId, targetUrl, targetZoom)
                                    }
                                }, 1500L)
                            }
                            return true
                        }
                    }

                    webChromeClient = WebChromeClient()
                }
                parent?.addView(webView)
                slotWebViews[slotId] = webView
            }

            startWatchdog()
            if (zoom != 1.0) {
                setSlotZoom(slotId, zoom)
            }
            if (createdNow || previousUrl != url) {
                webView.loadUrl(url)
                Log.d(TAG, "Slot $slotId iniciado com URL: $url")
            } else {
                Log.d(TAG, "Slot $slotId já ativo com URL atual, mantendo instância viva")
            }
        }
    }

    private fun getStorageIsolationScript(slotId: String): String {
        return """
            (function() {
                if (window.__slotStorageIsolated) return;
                window.__slotStorageIsolated = true;
                const PREFIX = 'slot_' + '$slotId' + '_';
                const proto = Storage.prototype;
                const rawGet = proto.getItem;
                const rawSet = proto.setItem;
                const rawRemove = proto.removeItem;
                const rawClear = proto.clear;
                const rawKey = proto.key;

                // Restaura imediatamente a sessão persistida no SharedPreferences nativo
                // garantindo que ao fechar e reabrir o app no Android a conta permaneça logada
                try {
                    let savedSession = null;
                    if (window.IdleStreamSlotBridge && typeof window.IdleStreamSlotBridge.getSavedSession === 'function') {
                        savedSession = window.IdleStreamSlotBridge.getSavedSession();
                    }
                    if (savedSession && savedSession.length > 2 && savedSession !== 'null') {
                        rawSet.call(window.localStorage, PREFIX + 'sessao', savedSession);
                        rawSet.call(window.localStorage, 'sessao', savedSession);
                    }
                } catch (_) {}

                proto.getItem = function(k) {
                    if (this === window.localStorage) {
                        let val = rawGet.call(this, PREFIX + k);
                        if (val !== null && val !== undefined) return val;
                        if (k === 'sessao') {
                            try {
                                if (window.IdleStreamSlotBridge && typeof window.IdleStreamSlotBridge.getSavedSession === 'function') {
                                    const saved = window.IdleStreamSlotBridge.getSavedSession();
                                    if (saved && saved.length > 2 && saved !== 'null') {
                                        rawSet.call(this, PREFIX + 'sessao', saved);
                                        return saved;
                                    }
                                }
                            } catch (_) {}
                        }
                        // APENAS chaves efêmeras anti-CSRF do OAuth têm fallback, NUNCA a sessão do jogo!
                        if (k === 'oauth-ida' || k === 'oauth_state') {
                            return rawGet.call(this, k);
                        }
                        return null;
                    }
                    return rawGet.call(this, k);
                };

                proto.setItem = function(k, v) {
                    if (this === window.localStorage) {
                        const strVal = String(v);
                        rawSet.call(this, PREFIX + k, strVal);
                        if (k === 'sessao') {
                            try {
                                if (window.IdleStreamSlotBridge && typeof window.IdleStreamSlotBridge.saveSession === 'function') {
                                    window.IdleStreamSlotBridge.saveSession(strVal);
                                }
                            } catch (_) {}
                        }
                        // APENAS chaves efêmeras de ida ao OAuth são espelhadas
                        if (k === 'oauth-ida') {
                            rawSet.call(this, k, strVal);
                        }
                        return;
                    }
                    return rawSet.call(this, k, v);
                };

                proto.removeItem = function(k) {
                    if (this === window.localStorage) {
                        rawRemove.call(this, PREFIX + k);
                        if (k === 'sessao') {
                            try {
                                if (window.IdleStreamSlotBridge && typeof window.IdleStreamSlotBridge.clearSession === 'function') {
                                    window.IdleStreamSlotBridge.clearSession();
                                }
                            } catch (_) {}
                        }
                        if (k === 'oauth-ida') {
                            rawRemove.call(this, k);
                        }
                        return;
                    }
                    return rawRemove.call(this, k);
                };

                proto.clear = function() {
                    if (this === window.localStorage) {
                        const toRemove = [];
                        for (let i = 0; i < this.length; i++) {
                            const k = rawKey.call(this, i);
                            if (k && k.startsWith(PREFIX)) {
                                toRemove.push(k);
                            }
                        }
                        for (let i = 0; i < toRemove.length; i++) {
                            rawRemove.call(this, toRemove[i]);
                        }
                        return;
                    }
                    return rawClear.call(this);
                };

                try {
                    const storageProxy = new Proxy(window.localStorage, {
                        get(target, prop, receiver) {
                            if (typeof prop === 'string') {
                                if (prop in proto) {
                                    const val = target[prop];
                                    return typeof val === 'function' ? val.bind(target) : val;
                                }
                                return target.getItem(prop);
                            }
                            return Reflect.get(target, prop, receiver);
                        },
                        set(target, prop, value, receiver) {
                            if (typeof prop === 'string') {
                                target.setItem(prop, value);
                                return true;
                            }
                            return Reflect.set(target, prop, value, receiver);
                        },
                        deleteProperty(target, prop) {
                            if (typeof prop === 'string') {
                                target.removeItem(prop);
                                return true;
                            }
                            return Reflect.deleteProperty(target, prop);
                        }
                    });
                    Object.defineProperty(window, 'localStorage', {
                        configurable: true,
                        enumerable: true,
                        get: () => storageProxy
                    });
                } catch (_) {}
            })();
        """.trimIndent()
    }

    private fun injectEngineScripts(slotId: String, view: WebView?, url: String?) {
        if (view == null) return

        // 1. Isolamento de localStorage redundante para garantir inicialização
        view.evaluateJavascript(getStorageIsolationScript(slotId), null)

        // 2. Motor Anti-Sleep e Throttling de FPS
        val antiSleepScript = loadAssetScript("games/anti_sleep.js")
        if (antiSleepScript.isNotEmpty()) {
            view.evaluateJavascript(antiSleepScript) {
                val shouldBeHidden = isLowPowerBackground || (slotVisibleMap[slotId] == false)
                val initEcoScript = buildString {
                    append("if (typeof window.__setIdleStreamFps === 'function') { window.__setIdleStreamFps($currentFps); }")
                    if (shouldBeHidden) {
                        append("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(true); }")
                    }
                }
                view.evaluateJavascript(initEcoScript, null)
                slotHiddenJsState[slotId] = shouldBeHidden
            }
        }

        // 3. Extensão oficial /hunt para PokeIdle
        if (url != null && url.contains("pokeidle.io")) {
            val huntScript = getHuntScript()
            if (huntScript.isNotEmpty()) {
                view.evaluateJavascript(huntScript, null)
            }
        }
    }

    @Volatile
    private var cachedHuntScript: String? = null

    private fun getHuntScript(): String {
        return cachedHuntScript ?: synchronized(this) {
            cachedHuntScript ?: run {
                val s = loadAssetScript("games/hunt_extension.js")
                cachedHuntScript = s
                s
            }
        }
    }

    private fun loadAssetScript(path: String): String {
        return try {
            app.assets.open(path).bufferedReader().use { it.readText() }
        } catch (e: Throwable) {
            Log.w(TAG, "Asset de script não encontrado: $path (${e.message})")
            ""
        }
    }

    fun stopSlot(slotId: String) {
        activeSlots.remove(slotId)
        slotZooms.remove(slotId)
        slotVisibleMap.remove(slotId)
        slotHiddenJsState.remove(slotId)
        persistDesiredSlots()
        runOnMain {
            slotContexts.remove(slotId)
            val wv = slotWebViews.remove(slotId)
            if (wv != null) {
                container?.removeView(wv)
                wv.stopLoading()
                wv.destroy()
                Log.d(TAG, "Slot $slotId parado e destruído.")
            }
        }
    }

    fun reloadSlot(slotId: String) {
        runOnMain {
            slotWebViews[slotId]?.reload()
        }
    }

    fun setSlotZoom(slotId: String, zoom: Double) {
        slotZooms[slotId] = zoom
        if (activeSlots.containsKey(slotId)) {
            persistDesiredSlots()
        }
        runOnMain {
            val wv = slotWebViews[slotId] ?: return@runOnMain
            val pct = (zoom * 100).toInt()
            wv.setInitialScale(pct)
            wv.evaluateJavascript("document.body.style.zoom = '${zoom}';", null)
        }
    }

    fun setFps(fps: Int) {
        currentFps = fps
        try {
            app.getSharedPreferences(PREFS_RUNTIME, Context.MODE_PRIVATE)
                .edit()
                .putInt(KEY_FPS_TIER, fps)
                .apply()
        } catch (_: Throwable) {}
        val script = "if (typeof window.__setIdleStreamFps === 'function') { window.__setIdleStreamFps($fps); }"
        runOnMain {
            slotWebViews.values.forEach { it.evaluateJavascript(script, null) }
        }
    }

    fun togglePokeIdleUltra(slotId: String? = null, forceState: Boolean? = null) {
        val script = when (forceState) {
            true -> "if (typeof window.__togglePokeIdleUltra === 'function') { window.__togglePokeIdleUltra(true); }"
            false -> "if (typeof window.__togglePokeIdleUltra === 'function') { window.__togglePokeIdleUltra(false); }"
            null -> "if (typeof window.__togglePokeIdleUltra === 'function') { window.__togglePokeIdleUltra(); }"
        }
        runOnMain {
            if (slotId != null) {
                slotWebViews[slotId]?.evaluateJavascript(script, null)
            } else {
                slotWebViews.values.forEach { it.evaluateJavascript(script, null) }
            }
        }
    }

    private fun applySlotHiddenJsState(slotId: String, wv: WebView, hidden: Boolean) {
        val prev = slotHiddenJsState[slotId]
        if (prev == hidden) return
        slotHiddenJsState[slotId] = hidden
        wv.evaluateJavascript(
            "if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden($hidden); }",
            null
        )
    }

    fun setLowPowerBackgroundMode(enabled: Boolean, reason: String) {
        val changed = isLowPowerBackground != enabled
        isLowPowerBackground = enabled
        if (changed) {
            LifecycleLogger.log(
                app,
                "GAME_LOW_POWER_MODE",
                "enabled=$enabled reason=$reason activeSlots=${slotWebViews.size}"
            )
        }
        runOnMain {
            for ((slotId, wv) in slotWebViews) {
                try {
                    if (enabled) {
                        wv.setLayerType(View.LAYER_TYPE_NONE, null)
                        applySlotHiddenJsState(slotId, wv, true)
                    } else {
                        val isVisibleUi = slotVisibleMap[slotId] ?: true
                        if (isVisibleUi) {
                            wv.setLayerType(View.LAYER_TYPE_HARDWARE, null)
                            applySlotHiddenJsState(slotId, wv, false)
                        } else {
                            wv.setLayerType(View.LAYER_TYPE_NONE, null)
                            applySlotHiddenJsState(slotId, wv, true)
                        }
                    }
                } catch (_: Throwable) {}
            }
        }
    }

    fun onLowMemoryPressure() {
        runOnMain {
            try {
                CookieManager.getInstance().flush()
            } catch (_: Throwable) {}
            for (wv in slotWebViews.values) {
                try {
                    wv.clearCache(false) // apenas memória/disco seguro sem apagar cookies/localStorage
                    wv.evaluateJavascript("if (typeof window.gc === 'function') { try { window.gc(); } catch(_) {} }", null)
                } catch (_: Throwable) {}
            }
        }
        if (!MainActivity.isForeground) {
            setLowPowerBackgroundMode(true, "low_memory")
        }
    }

    fun updateBounds(jsonBounds: String) {
        runOnMain {
            ensureContainer()
            try {
                val array = JSONArray(jsonBounds)
                val density = app.resources.displayMetrics.density

                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val slotId = if (obj.has("slot_id")) obj.getString("slot_id") else obj.optString("slotId", "")
                    if (slotId.isEmpty()) continue
                    val x = obj.getDouble("x")
                    val y = obj.getDouble("y")
                    val width = obj.getDouble("width")
                    val height = obj.getDouble("height")
                    val visible = obj.optBoolean("visible", true)

                    val wv = slotWebViews[slotId] ?: continue

                    if (!visible || width <= 5 || height <= 5) {
                        slotVisibleMap[slotId] = false
                        val lp = FrameLayout.LayoutParams(1, 1).apply {
                            leftMargin = -100
                            topMargin = -100
                        }
                        wv.layoutParams = lp
                        wv.visibility = View.VISIBLE
                        wv.alpha = 0f
                        wv.setLayerType(View.LAYER_TYPE_NONE, null)
                        applySlotHiddenJsState(slotId, wv, true)
                    } else {
                        slotVisibleMap[slotId] = true
                        val pxX = (x * density).toInt()
                        val pxY = (y * density).toInt()
                        val pxW = (width * density).toInt()
                        val pxH = (height * density).toInt()

                        val lp = FrameLayout.LayoutParams(pxW, pxH).apply {
                            leftMargin = pxX
                            topMargin = pxY
                        }
                        wv.layoutParams = lp
                        wv.visibility = View.VISIBLE
                        wv.alpha = 1f
                        if (isLowPowerBackground) {
                            wv.setLayerType(View.LAYER_TYPE_NONE, null)
                            applySlotHiddenJsState(slotId, wv, true)
                        } else {
                            wv.setLayerType(View.LAYER_TYPE_HARDWARE, null)
                            applySlotHiddenJsState(slotId, wv, false)
                        }
                    }
                }
            } catch (e: Throwable) {
                Log.e(TAG, "Erro ao atualizar limites dos slots: ${e.message}", e)
            }
        }
    }

    fun hideAll() {
        runOnMain {
            for ((slotId, wv) in slotWebViews) {
                slotVisibleMap[slotId] = false
                val lp = FrameLayout.LayoutParams(1, 1).apply {
                    leftMargin = -100
                    topMargin = -100
                }
                wv.layoutParams = lp
                wv.visibility = View.VISIBLE
                wv.alpha = 0f
                wv.setLayerType(View.LAYER_TYPE_NONE, null)
                applySlotHiddenJsState(slotId, wv, true)
            }
        }
    }

    fun resumeAllTimers() {
        if (activeSlots.isNotEmpty()) {
            startWatchdog()
        }
        runOnMain {
            slotWebViews.values.forEach { wv ->
                try {
                    wv.dispatchWindowVisibilityChanged(View.VISIBLE)
                    wv.resumeTimers()
                    wv.evaluateJavascript(
                        "if (typeof window.__idlestreamHeartbeat === 'function') { window.__idlestreamHeartbeat(); }",
                        null
                    )
                } catch (_: Throwable) {}
            }
        }
    }

    fun getActiveSlots(): List<String> {
        return activeSlots.keys().toList()
    }

    fun destroy(clearPersistence: Boolean = true) {
        stopWatchdog()
        if (clearPersistence) {
            clearPersistedSlots()
        }
        runOnMain {
            try {
                CookieManager.getInstance().flush()
            } catch (_: Throwable) {}
            slotWebViews.values.forEach { wv ->
                wv.stopLoading()
                wv.destroy()
            }
            slotWebViews.clear()
            slotContexts.clear()
            slotZooms.clear()
            slotVisibleMap.clear()
            slotHiddenJsState.clear()
            activeSlots.clear()
            container?.removeAllViews()
        }
    }
}

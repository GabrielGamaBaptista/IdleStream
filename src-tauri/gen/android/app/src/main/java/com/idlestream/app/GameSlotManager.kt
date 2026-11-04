package com.idlestream.app

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.FrameLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONArray
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap

/**
 * Layout especial que repassa eventos de toque para a WebView principal subjacente
 * caso o toque ocorra fora das WebViews filhas dos slots de jogos.
 */
class PassThroughFrameLayout(context: Context) : FrameLayout(context) {
    override fun onTouchEvent(event: MotionEvent): Boolean {
        return false
    }
}

/**
 * Gerenciador nativo de WebViews filhas para slots de jogos no Android.
 * Permite que até 4 contas rodem simultaneamente em hardware nativo sem limitações
 * de iframe ou bloqueio por X-Frame-Options: DENY.
 */
class GameSlotManager(private val activity: MainActivity) {
    companion object {
        private const val TAG = "GameSlotManager"
    }

    private var container: PassThroughFrameLayout? = null
    private val slotWebViews = ConcurrentHashMap<String, WebView>()
    private val activeSlots = ConcurrentHashMap<String, String>() // slotId -> url
    private var currentFps = 30
    private var isEcoMode = true

    fun ensureContainer() {
        if (container != null) return
        activity.runOnUiThread {
            if (container != null) return@runOnUiThread
            val root = activity.findViewById<ViewGroup>(android.R.id.content)
            if (root != null) {
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
                Log.d(TAG, "GameSlotManager container anexado com sucesso.")
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun startSlot(slotId: String, url: String, zoom: Double = 1.0) {
        activeSlots[slotId] = url
        activity.runOnUiThread {
            ensureContainer()
            val parent = container ?: return@runOnUiThread

            var webView = slotWebViews[slotId]
            if (webView == null) {
                webView = WebView(activity).apply {
                    layoutParams = FrameLayout.LayoutParams(0, 0)
                    visibility = View.GONE
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

                    // Habilita cookies padrão e de terceiros para redirecionamentos OAuth
                    val cookieManager = CookieManager.getInstance()
                    cookieManager.setAcceptCookie(true)
                    cookieManager.setAcceptThirdPartyCookies(this, true)

                    setLayerType(View.LAYER_TYPE_HARDWARE, null)

                    val isolationScript = getStorageIsolationScript(slotId)
                    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                        try {
                            WebViewCompat.addDocumentStartJavaScript(
                                this,
                                isolationScript,
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
                            view?.evaluateJavascript(getStorageIsolationScript(slotId), null)
                        }

                        override fun onPageFinished(view: WebView?, pageUrl: String?) {
                            super.onPageFinished(view, pageUrl)
                            injectEngineScripts(slotId, view, pageUrl)
                        }
                    }

                    webChromeClient = WebChromeClient()
                }
                parent.addView(webView)
                slotWebViews[slotId] = webView
            }

            activeSlots[slotId] = url
            if (zoom != 1.0) {
                setSlotZoom(slotId, zoom)
            }
            webView.loadUrl(url)
            Log.d(TAG, "Slot $slotId iniciado com URL: $url")
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

                proto.getItem = function(k) {
                    if (this === window.localStorage) {
                        const val = rawGet.call(this, PREFIX + k);
                        if (val !== null && val !== undefined) return val;
                        // Fallback para chave original (garante resgate de tokens/idas de OAuth)
                        return rawGet.call(this, k);
                    }
                    return rawGet.call(this, k);
                };

                proto.setItem = function(k, v) {
                    if (this === window.localStorage) {
                        const strVal = String(v);
                        rawSet.call(this, PREFIX + k, strVal);
                        // Chaves críticas de autenticação OAuth (PokeIdle e Discord/Google)
                        if (k === 'oauth-ida' || k.startsWith('oauth')) {
                            rawSet.call(this, k, strVal);
                        }
                        return;
                    }
                    return rawSet.call(this, k, v);
                };

                proto.removeItem = function(k) {
                    if (this === window.localStorage) {
                        rawRemove.call(this, PREFIX + k);
                        if (k === 'oauth-ida' || k.startsWith('oauth')) {
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
                val initEcoScript = "if (typeof window.__setIdleStreamFps === 'function') { window.__setIdleStreamFps($currentFps); }"
                view.evaluateJavascript(initEcoScript, null)
            }
        }

        // 3. Extensão oficial /hunt para PokeIdle
        if (url != null && url.contains("pokeidle.io")) {
            val huntScript = loadAssetScript("games/hunt_extension.js")
            if (huntScript.isNotEmpty()) {
                view.evaluateJavascript(huntScript, null)
            }
        }
    }

    private fun loadAssetScript(path: String): String {
        return try {
            activity.assets.open(path).bufferedReader().use { it.readText() }
        } catch (e: Throwable) {
            Log.w(TAG, "Asset de script não encontrado: $path (${e.message})")
            ""
        }
    }

    fun stopSlot(slotId: String) {
        activeSlots.remove(slotId)
        activity.runOnUiThread {
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
        activity.runOnUiThread {
            slotWebViews[slotId]?.reload()
        }
    }

    fun setSlotZoom(slotId: String, zoom: Double) {
        activity.runOnUiThread {
            val wv = slotWebViews[slotId] ?: return@runOnUiThread
            val pct = (zoom * 100).toInt()
            wv.setInitialScale(pct)
            wv.evaluateJavascript("document.body.style.zoom = '${zoom}';", null)
        }
    }

    fun setFps(fps: Int) {
        currentFps = fps
        isEcoMode = fps < 60
        val script = "if (typeof window.__setIdleStreamFps === 'function') { window.__setIdleStreamFps($fps); }"
        activity.runOnUiThread {
            slotWebViews.values.forEach { it.evaluateJavascript(script, null) }
        }
    }

    fun togglePokeIdleUltra(slotId: String? = null, forceState: Boolean? = null) {
        val script = when (forceState) {
            true -> "if (typeof window.__togglePokeIdleUltra === 'function') { window.__togglePokeIdleUltra(true); }"
            false -> "if (typeof window.__togglePokeIdleUltra === 'function') { window.__togglePokeIdleUltra(false); }"
            null -> "if (typeof window.__togglePokeIdleUltra === 'function') { window.__togglePokeIdleUltra(); }"
        }
        activity.runOnUiThread {
            if (slotId != null) {
                slotWebViews[slotId]?.evaluateJavascript(script, null)
            } else {
                slotWebViews.values.forEach { it.evaluateJavascript(script, null) }
            }
        }
    }

    fun updateBounds(jsonBounds: String) {
        activity.runOnUiThread {
            ensureContainer()
            try {
                val array = JSONArray(jsonBounds)
                val density = activity.resources.displayMetrics.density

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
                        wv.visibility = View.GONE
                    } else {
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
                    }
                }
            } catch (e: Throwable) {
                Log.e(TAG, "Erro ao atualizar limites dos slots: ${e.message}", e)
            }
        }
    }

    fun hideAll() {
        activity.runOnUiThread {
            slotWebViews.values.forEach { it.visibility = View.GONE }
        }
    }

    fun resumeAllTimers() {
        activity.runOnUiThread {
            slotWebViews.values.forEach { wv ->
                try {
                    wv.resumeTimers()
                } catch (_: Throwable) {}
            }
        }
    }

    fun getActiveSlots(): List<String> {
        return activeSlots.keys().toList()
    }

    fun destroy() {
        activity.runOnUiThread {
            slotWebViews.values.forEach { wv ->
                wv.stopLoading()
                wv.destroy()
            }
            slotWebViews.clear()
            activeSlots.clear()
            container?.removeAllViews()
        }
    }
}

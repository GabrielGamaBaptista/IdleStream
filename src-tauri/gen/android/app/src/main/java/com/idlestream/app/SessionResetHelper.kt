package com.idlestream.app

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.CookieManager
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewDatabase

object SessionResetHelper {
    private const val TAG = "IdleStream"

    /**
     * Limpa completamente cookies, WebStorage (HTML5 LocalStorage, SessionStorage, IndexedDB),
     * cache, histórico e credenciais locais do WebView de forma assíncrona.
     * O callback onComplete é sempre despachado na thread principal (Main Looper).
     */
    fun clearSession(context: Context, webView: WebView?, onComplete: (() -> Unit)? = null) {
        val mainHandler = Handler(Looper.getMainLooper())

        try {
            // 1. Limpa WebStorage (HTML5 LocalStorage, SessionStorage, IndexedDB)
            WebStorage.getInstance().deleteAllData()

            // 2. Limpa cache e dados de formulário do WebView
            webView?.clearCache(true)
            webView?.clearFormData()
            webView?.clearHistory()
            webView?.clearSslPreferences()

            // 3. Limpa bancos de dados locais de credenciais
            val db = WebViewDatabase.getInstance(context)
            db.clearFormData()
            db.clearHttpAuthUsernamePassword()
        } catch (e: Exception) {
            Log.w(TAG, "Aviso ao limpar WebStorage/Cache: ${e.message}")
        }

        // 4. Limpa cookies de forma assíncrona e executa o callback após o flush
        try {
            val cookieManager = CookieManager.getInstance()
            cookieManager.removeAllCookies { success ->
                cookieManager.flush()
                Log.d(TAG, "SessionResetHelper: Todos os cookies e sessões foram eliminados com sucesso ($success).")
                if (onComplete != null) {
                    mainHandler.post {
                        onComplete.invoke()
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao limpar cookies: ${e.message}", e)
            if (onComplete != null) {
                mainHandler.post {
                    onComplete.invoke()
                }
            }
        }
    }
}

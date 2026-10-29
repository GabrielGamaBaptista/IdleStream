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

        setupWebView()
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

        val authUrl = "https://id.twitch.tv/oauth2/authorize" +
                "?client_id=gp762nuuoqcoxypju8c569th9wz7q5" +
                "&redirect_uri=http://localhost" +
                "&response_type=token" +
                "&scope=chat:read+chat:edit"

        val testUrl = intent.getStringExtra("test_redirect_url")
        if (!testUrl.isNullOrEmpty()) {
            android.util.Log.d("IdleStream", "TwitchLoginActivity testing redirect directly: $testUrl")
            checkInterceptUrl(testUrl)
        } else {
            webView.loadUrl(authUrl)
        }
    }

    private fun extractParam(url: String, paramName: String): String? {
        val uri = try { Uri.parse(url) } catch (_: Exception) { null }
        // 1. Try standard query parameter (?key=value)
        val fromQuery = uri?.getQueryParameter(paramName)
        if (!fromQuery.isNullOrEmpty()) return fromQuery

        // 2. Try fragment string (#key=value&...)
        val fragment = uri?.fragment
        if (!fragment.isNullOrEmpty()) {
            for (part in fragment.split('&')) {
                val eq = part.indexOf('=')
                if (eq != -1) {
                    val key = part.substring(0, eq)
                    val value = part.substring(eq + 1)
                    if (key.equals(paramName, ignoreCase = true)) {
                        return Uri.decode(value)
                    }
                }
            }
        }

        // 3. Fallback raw string inspection for edge-cases
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
            return Uri.decode(url.substring(start, end))
        }

        return null
    }

    private fun checkInterceptUrl(url: String): Boolean {
        if (isCompleted) return true

        if (url.startsWith("http://localhost") || url.startsWith("https://localhost")) {
            android.util.Log.d("IdleStream", "checkInterceptUrl intercepted localhost: $url")
            // Check for OAuth error response
            val error = extractParam(url, "error")
            if (!error.isNullOrEmpty()) {
                val errorDesc = extractParam(url, "error_description") ?: error
                isCompleted = true
                android.util.Log.w("IdleStream", "checkInterceptUrl OAuth error: $errorDesc")
                Toast.makeText(this, "Autorização Twitch: $errorDesc", Toast.LENGTH_LONG).show()
                finish()
                return true
            }

            // Check for access_token
            val token = extractParam(url, "access_token")
            if (!token.isNullOrEmpty()) {
                isCompleted = true
                android.util.Log.i("IdleStream", "checkInterceptUrl successfully captured token for accountId: $accountId")
                MainActivity.instance?.notifyTwitchAuthSuccess(accountId, token)
                Toast.makeText(this, "Conta Twitch autenticada com sucesso!", Toast.LENGTH_SHORT).show()
                finish()
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

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
import androidx.appcompat.app.AppCompatActivity

class KickLoginActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var accountId: String = ""
    private var isCompleted = false

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

        val btnSave = findViewById<Button>(R.id.btn_save)
        btnSave.setOnClickListener {
            tryExtractAndSaveCookies(manual = true)
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
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                // Auto-detect login if user navigated away from /login and cookies are set
                if (!isCompleted && url != null && !url.contains("/login")) {
                    tryExtractAndSaveCookies(manual = false)
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }
        }

        webView.loadUrl("https://kick.com/login")
    }

    private fun tryExtractAndSaveCookies(manual: Boolean) {
        if (isCompleted) return

        val cookieManager = CookieManager.getInstance()
        val rawCookies = cookieManager.getCookie("https://kick.com") ?: ""

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
                    } catch (e: Exception) {
                        value
                    }
                } else if (name.equals("XSRF-TOKEN", ignoreCase = true)) {
                    xsrfToken = value
                }
            }
        }

        if (!kickSession.isNullOrEmpty()) {
            isCompleted = true
            MainActivity.instance?.notifyKickAuthSuccess(
                accountId,
                kickSession,
                sessionToken ?: "",
                xsrfToken ?: ""
            )
            Toast.makeText(this, "Sessão da Kick salva com sucesso!", Toast.LENGTH_SHORT).show()
            finish()
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

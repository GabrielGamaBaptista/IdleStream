package com.idlestream.app

import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
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
        }

        val authUrl = "https://id.twitch.tv/oauth2/authorize" +
                "?client_id=gp762nuuoqcoxypju8c569th9wz7q5" +
                "&redirect_uri=http://localhost" +
                "&response_type=token" +
                "&scope=chat:read+chat:edit"

        webView.loadUrl(authUrl)
    }

    private fun checkInterceptUrl(url: String): Boolean {
        if (isCompleted) return true

        if (url.startsWith("http://localhost") || url.startsWith("https://localhost")) {
            // Token is in hash fragment or query: http://localhost/#access_token=...&scope=...
            var token: String? = null
            val hashIdx = url.indexOf('#')
            val queryIdx = url.indexOf('?')

            val paramsString = if (hashIdx >= 0) {
                url.substring(hashIdx + 1)
            } else if (queryIdx >= 0) {
                url.substring(queryIdx + 1)
            } else {
                ""
            }

            for (part in paramsString.split('&')) {
                val kv = part.split('=')
                if (kv.size == 2 && kv[0] == "access_token") {
                    token = Uri.decode(kv[1])
                    break
                }
            }

            if (!token.isNullOrEmpty()) {
                isCompleted = true
                MainActivity.instance?.notifyTwitchAuthSuccess(accountId, token)
                Toast.makeText(this, "Conta Twitch autenticada com sucesso!", Toast.LENGTH_SHORT).show()
                finish()
                return true
            }
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

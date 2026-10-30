package com.idlestream.app

import android.webkit.CookieManager
import android.webkit.WebView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class SessionResetHelperAndroidTest {

    @Test
    fun testClearSessionPurgesAllCookiesAndStorage() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        val instrumentation = InstrumentationRegistry.getInstrumentation()

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)

        val latchSetup = CountDownLatch(3)
        // Set cookies across domains (Kick, Twitch, Google) on Main Thread with Looper
        instrumentation.runOnMainSync {
            cookieManager.setCookie("https://kick.com", "kick_session=test_session_123; Path=/") { latchSetup.countDown() }
            cookieManager.setCookie("https://id.twitch.tv", "twitch_session=test_twitch_456; Path=/") { latchSetup.countDown() }
            cookieManager.setCookie("https://accounts.google.com", "SID=google_test_token_789; Path=/") { latchSetup.countDown() }
            cookieManager.flush()
        }
        assertTrue("Setup de cookies expirou", latchSetup.await(5, TimeUnit.SECONDS))

        // Confirm cookies were set
        val kickCookiesBefore = cookieManager.getCookie("https://kick.com")
        assertTrue("Cookie da Kick deveria existir antes da limpeza", kickCookiesBefore?.contains("kick_session") == true)

        val twitchCookiesBefore = cookieManager.getCookie("https://id.twitch.tv")
        assertTrue("Cookie da Twitch deveria existir antes da limpeza", twitchCookiesBefore?.contains("twitch_session") == true)

        val googleCookiesBefore = cookieManager.getCookie("https://accounts.google.com")
        assertTrue("Cookie do Google deveria existir antes da limpeza", googleCookiesBefore?.contains("SID") == true)

        // Purge session via SessionResetHelper
        val latchPurge = CountDownLatch(1)
        instrumentation.runOnMainSync {
            val webView = WebView(appContext)
            SessionResetHelper.clearSession(appContext, webView) {
                latchPurge.countDown()
            }
        }

        assertTrue("Timeout ao executar SessionResetHelper.clearSession", latchPurge.await(5, TimeUnit.SECONDS))

        // Verify all cookies are completely removed
        val kickCookiesAfter = cookieManager.getCookie("https://kick.com")
        val twitchCookiesAfter = cookieManager.getCookie("https://id.twitch.tv")
        val googleCookiesAfter = cookieManager.getCookie("https://accounts.google.com")

        assertTrue("Cookies da Kick devem ser nulos ou vazios após clearSession: $kickCookiesAfter",
            kickCookiesAfter.isNullOrEmpty())
        assertTrue("Cookies da Twitch devem ser nulos ou vazios após clearSession: $twitchCookiesAfter",
            twitchCookiesAfter.isNullOrEmpty())
        assertTrue("Cookies do Google devem ser nulos ou vazios após clearSession: $googleCookiesAfter",
            googleCookiesAfter.isNullOrEmpty())
    }
}

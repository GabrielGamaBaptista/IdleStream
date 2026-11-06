package com.idlestream.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StreamRedeemActivityTest {

    @Test
    fun testBuildTargetUrlForTwitch() {
        // Popout Chat padrão para resgate vertical com pontos e baú visíveis
        val urlPopout = StreamRedeemActivity.buildTargetUrl("twitch", "gaules")
        assertEquals("https://www.twitch.tv/popout/gaules/chat?popout=", urlPopout)

        val urlPopoutTrim = StreamRedeemActivity.buildTargetUrl("twitch", "  alanzoka  ")
        assertEquals("https://www.twitch.tv/popout/alanzoka/chat?popout=", urlPopoutTrim)

        // Live completa
        val urlFull = StreamRedeemActivity.buildTargetUrl("twitch", "gaules", popoutChat = false)
        assertEquals("https://www.twitch.tv/gaules", urlFull)
    }

    @Test
    fun testTwitchDesktopUaAndAutoClaimScript() {
        assertTrue(StreamRedeemActivity.TWITCH_DESKTOP_UA.contains("Windows NT 10.0"))
        assertTrue(StreamRedeemActivity.TWITCH_DESKTOP_UA.contains("Chrome/"))
        assertTrue(StreamRedeemActivity.AUTO_CLAIM_TWITCH_JS.contains("Claim Bonus"))
        assertTrue(StreamRedeemActivity.AUTO_CLAIM_TWITCH_JS.contains("Resgatar bônus"))
        assertTrue(StreamRedeemActivity.AUTO_CLAIM_TWITCH_JS.contains("MutationObserver"))
    }

    @Test
    fun testBuildTargetUrlForKick() {
        val url1 = StreamRedeemActivity.buildTargetUrl("kick", "xqc")
        assertEquals("https://kick.com/xqc", url1)

        val url2 = StreamRedeemActivity.buildTargetUrl("kick", "  trainwreckstv  ")
        assertEquals("https://kick.com/trainwreckstv", url2)
    }

    @Test
    fun testBuildProfileNameSanitization() {
        val profile1 = StreamRedeemActivity.buildProfileName("twitch", "account-123_abc")
        assertEquals("redeem_twitch_account-123_abc", profile1)

        val profile2 = StreamRedeemActivity.buildProfileName("kick", "acc!@#$456")
        assertEquals("redeem_kick_acc____456", profile2)
    }

    @Test
    fun testBuildTwitchCookieString() {
        val token = "super_oauth_twitch_token_999"
        val cookie = StreamRedeemActivity.buildTwitchCookieString(token)
        assertTrue("Deve conter o nome do cookie auth-token", cookie.startsWith("auth-token=$token"))
        assertTrue("Deve conter Domain=.twitch.tv", cookie.contains("Domain=.twitch.tv"))
        assertTrue("Deve conter Secure", cookie.contains("Secure"))
        assertTrue("Deve conter SameSite=Lax", cookie.contains("SameSite=Lax"))
    }

    @Test
    fun testBuildKickCookies() {
        val cookies = StreamRedeemActivity.buildKickCookies(
            sessionToken = "token_abc",
            kickSession = "session_xyz",
            xsrfToken = "xsrf_123"
        )
        assertEquals(3, cookies.size)
        assertEquals("session_token", cookies[0].first)
        assertTrue(cookies[0].second.contains("session_token=token_abc"))
        assertTrue(cookies[0].second.contains("Domain=.kick.com"))

        assertEquals("kick_session", cookies[1].first)
        assertTrue(cookies[1].second.contains("kick_session=session_xyz"))

        assertEquals("XSRF-TOKEN", cookies[2].first)
        assertTrue(cookies[2].second.contains("XSRF-TOKEN=xsrf_123"))
    }

    @Test
    fun testBuildKickCookiesPartialOrBlank() {
        val cookies = StreamRedeemActivity.buildKickCookies(
            sessionToken = "only_session_token",
            kickSession = "",
            xsrfToken = null
        )
        assertEquals(1, cookies.size)
        assertEquals("session_token", cookies[0].first)
        assertTrue(cookies[0].second.contains("session_token=only_session_token"))
    }
}

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

    @Test
    fun testKickCookiesIncludeMaxAgeAndHttpOnly() {
        // TDD-10a: Cookies Android tambem devem declarar persistencia (Max-Age=90d) e HttpOnly em kick_session
        val twitchCookie = StreamRedeemActivity.buildTwitchCookieString("oauth_abc")
        assertTrue("Twitch auth-token deve ter Max-Age=7776000", twitchCookie.contains("Max-Age=7776000"))

        val cookies = StreamRedeemActivity.buildKickCookies(
            sessionToken = "123|abc",
            kickSession = "ks_val",
            xsrfToken = "xsrf_val"
        )
        val stCookie = cookies.first { it.first == "session_token" }.second
        val ksCookie = cookies.first { it.first == "kick_session" }.second
        assertTrue("session_token deve conter Max-Age=7776000", stCookie.contains("Max-Age=7776000"))
        assertTrue("session_token deve preservar %7C no cookie", stCookie.contains("123%7Cabc"))
        assertFalse("session_token nao deve ter HttpOnly", stCookie.contains("HttpOnly"))
        assertTrue("kick_session deve conter Max-Age=7776000", ksCookie.contains("Max-Age=7776000"))
        assertTrue("kick_session deve conter HttpOnly", ksCookie.contains("HttpOnly"))
    }

    @Test
    fun testShouldSeedCookiesProfileFirst() {
        // TDD-10b: Profile-First no Android - nao sobrescrever perfil valido se o hash do login nao mudou
        val hashA = StreamRedeemActivity.computeCredentialsHash("kick", "ks1", "123|st1", "x1")
        val existingRaw = "kick_session=ks_rotated; session_token=123%7Cst_rotated; XSRF-TOKEN=x1"
        assertFalse(
            "Nao deve sobrescrever cookies ja presentes no perfil quando hash coincide",
            StreamRedeemActivity.shouldSeedProfileCookies("kick", existingRaw, hashA, hashA)
        )
        assertTrue(
            "Deve seedar se hash mudou por novo login explicito",
            StreamRedeemActivity.shouldSeedProfileCookies("kick", existingRaw, hashA, "new_hash")
        )
        assertTrue(
            "Deve seedar se session_token estiver ausente no perfil",
            StreamRedeemActivity.shouldSeedProfileCookies("kick", "kick_session=ks1", hashA, hashA)
        )
    }

    @Test
    fun testAutoClaimJsDoesNotTouchCookies() {
        assertFalse(StreamRedeemActivity.AUTO_CLAIM_TWITCH_JS.contains("document.cookie"))
    }
}

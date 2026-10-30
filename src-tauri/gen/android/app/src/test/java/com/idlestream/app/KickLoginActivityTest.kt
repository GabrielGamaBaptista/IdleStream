package com.idlestream.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KickLoginActivityTest {

    @Test
    fun testParseValidKickCookies() {
        val rawCookies = "cf_clearance=abc12345; kick_session=sess_987654321; session_token=token_abcdef; XSRF-TOKEN=xsrf_xyz; other_cookie=1"
        val cookies = KickLoginActivity.parseCookies(rawCookies)

        assertTrue("Cookies com kick_session devem ser válidos", cookies.isValid)
        assertTrue("Cookies com kick_session e session_token devem ser autenticados", cookies.isAuthenticated)
        assertEquals("sess_987654321", cookies.kickSession)
        assertEquals("token_abcdef", cookies.sessionToken)
        assertEquals("xsrf_xyz", cookies.xsrfToken)
    }

    @Test
    fun testGuestSessionWithoutSessionTokenIsNotAuthenticated() {
        val guestCookies = "kick_session=guest_laravel_session_123; XSRF-TOKEN=xsrf_guest"
        val cookies = KickLoginActivity.parseCookies(guestCookies)

        assertTrue(cookies.isValid)
        assertFalse("Sessão guest da Kick (sem session_token) NÃO deve ser considerada autenticada",
            cookies.isAuthenticated)
    }

    @Test
    fun testParseUrlEncodedSessionToken() {
        val encodedToken = "%7B%22user_id%22%3A12345%2C%22name%22%3A%22testuser%22%7D"
        val rawCookies = "kick_session=abc; session_token=$encodedToken; XSRF-TOKEN=def"
        val cookies = KickLoginActivity.parseCookies(rawCookies)

        assertTrue(cookies.isValid)
        assertTrue(cookies.isAuthenticated)
        assertEquals("{\"user_id\":12345,\"name\":\"testuser\"}", cookies.sessionToken)
    }

    @Test
    fun testMissingKickSessionIsInvalid() {
        val rawCookies = "session_token=token_abc; XSRF-TOKEN=xsrf_xyz; google_session=xyz"
        val cookies = KickLoginActivity.parseCookies(rawCookies)

        assertFalse("Sem kick_session os cookies devem ser considerados inválidos", cookies.isValid)
        assertFalse(cookies.isAuthenticated)
        assertNull(cookies.kickSession)
        assertEquals("token_abc", cookies.sessionToken)
        assertEquals("xsrf_xyz", cookies.xsrfToken)
    }

    @Test
    fun testNullOrEmptyCookiesAreInvalid() {
        val nullCookies = KickLoginActivity.parseCookies(null)
        assertFalse(nullCookies.isValid)
        assertFalse(nullCookies.isAuthenticated)
        assertNull(nullCookies.kickSession)

        val emptyCookies = KickLoginActivity.parseCookies("   ")
        assertFalse(emptyCookies.isValid)
        assertFalse(emptyCookies.isAuthenticated)
        assertNull(emptyCookies.kickSession)
    }

    @Test
    fun testCaseInsensitiveCookieNames() {
        val rawCookies = "KICK_SESSION=sess_case_test; SESSION_TOKEN=tok_case_test; xsrf-token=xsrf_case_test"
        val cookies = KickLoginActivity.parseCookies(rawCookies)

        assertTrue(cookies.isValid)
        assertTrue(cookies.isAuthenticated)
        assertEquals("sess_case_test", cookies.kickSession)
        assertEquals("tok_case_test", cookies.sessionToken)
        assertEquals("xsrf_case_test", cookies.xsrfToken)
    }

    @Test
    fun testIsGoogleAuthUrl() {
        assertTrue(KickLoginActivity.isGoogleAuthUrl("https://accounts.google.com/o/oauth2/v2/auth?client_id=123&redirect_uri=abc"))
        assertTrue(KickLoginActivity.isGoogleAuthUrl("https://accounts.google.com/o/oauth2/auth?client_id=123&response_type=code"))
        assertTrue(KickLoginActivity.isGoogleAuthUrl("https://accounts.google.com/signin/oauth/v2/?client_id=123&redirect_uri=abc"))

        assertFalse(KickLoginActivity.isGoogleAuthUrl("https://accounts.google.com/signin/oauth/oauthchooseaccount"))
        assertFalse(KickLoginActivity.isGoogleAuthUrl("https://accounts.google.com/signin/challenge"))
        assertFalse(KickLoginActivity.isGoogleAuthUrl("https://kick.com/login"))
        assertFalse(KickLoginActivity.isGoogleAuthUrl("https://id.twitch.tv/oauth2/authorize"))
        assertFalse(KickLoginActivity.isGoogleAuthUrl(null))
    }

    @Test
    fun testEnsureSelectAccountPrompt() {
        // Cenário 1: URL sem o parâmetro prompt
        val urlWithoutPrompt = "https://accounts.google.com/o/oauth2/v2/auth?client_id=123&redirect_uri=abc"
        val modified1 = KickLoginActivity.ensureSelectAccountPrompt(urlWithoutPrompt)
        assertTrue("Deve conter prompt=select_account", modified1.contains("prompt=select_account"))
        assertTrue("Deve preservar parâmetros originais", modified1.contains("client_id=123"))

        // Cenário 2: URL que já contém prompt=consent
        val urlWithConsent = "https://accounts.google.com/o/oauth2/v2/auth?client_id=123&prompt=consent"
        val modified2 = KickLoginActivity.ensureSelectAccountPrompt(urlWithConsent)
        assertTrue("Deve incluir select_account junto com consent", modified2.contains("prompt=select_account%20consent"))

        // Cenário 3: URL que já tem prompt=select_account
        val urlWithSelectAccount = "https://accounts.google.com/o/oauth2/v2/auth?client_id=123&prompt=select_account"
        val modified3 = KickLoginActivity.ensureSelectAccountPrompt(urlWithSelectAccount)
        assertEquals(urlWithSelectAccount, modified3)

        // Cenário 4: URL com fragmento de hash (#)
        val urlWithHash = "https://accounts.google.com/o/oauth2/v2/auth?client_id=123#myhash"
        val modified4 = KickLoginActivity.ensureSelectAccountPrompt(urlWithHash)
        assertTrue(modified4.contains("prompt=select_account"))
        assertTrue(modified4.endsWith("#myhash"))
    }
}

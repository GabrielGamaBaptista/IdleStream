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
        assertEquals("sess_987654321", cookies.kickSession)
        assertEquals("token_abcdef", cookies.sessionToken)
        assertEquals("xsrf_xyz", cookies.xsrfToken)
    }

    @Test
    fun testParseUrlEncodedSessionToken() {
        val encodedToken = "%7B%22user_id%22%3A12345%2C%22name%22%3A%22testuser%22%7D"
        val rawCookies = "kick_session=abc; session_token=$encodedToken; XSRF-TOKEN=def"
        val cookies = KickLoginActivity.parseCookies(rawCookies)

        assertTrue(cookies.isValid)
        assertEquals("{\"user_id\":12345,\"name\":\"testuser\"}", cookies.sessionToken)
    }

    @Test
    fun testMissingKickSessionIsInvalid() {
        val rawCookies = "session_token=token_abc; XSRF-TOKEN=xsrf_xyz; google_session=xyz"
        val cookies = KickLoginActivity.parseCookies(rawCookies)

        assertFalse("Sem kick_session os cookies devem ser considerados inválidos", cookies.isValid)
        assertNull(cookies.kickSession)
        assertEquals("token_abc", cookies.sessionToken)
        assertEquals("xsrf_xyz", cookies.xsrfToken)
    }

    @Test
    fun testNullOrEmptyCookiesAreInvalid() {
        val nullCookies = KickLoginActivity.parseCookies(null)
        assertFalse(nullCookies.isValid)
        assertNull(nullCookies.kickSession)

        val emptyCookies = KickLoginActivity.parseCookies("   ")
        assertFalse(emptyCookies.isValid)
        assertNull(emptyCookies.kickSession)
    }

    @Test
    fun testCaseInsensitiveCookieNames() {
        val rawCookies = "KICK_SESSION=sess_case_test; SESSION_TOKEN=tok_case_test; xsrf-token=xsrf_case_test"
        val cookies = KickLoginActivity.parseCookies(rawCookies)

        assertTrue(cookies.isValid)
        assertEquals("sess_case_test", cookies.kickSession)
        assertEquals("tok_case_test", cookies.sessionToken)
        assertEquals("xsrf_case_test", cookies.xsrfToken)
    }
}

package com.idlestream.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TwitchLoginActivityTest {

    @Test
    fun testTwitchLoginUrl() {
        val loginUrl = TwitchLoginActivity.TWITCH_LOGIN_URL
        assertEquals("https://www.twitch.tv/login", loginUrl)
    }

    @Test
    fun testParseCookiesExtractsAuthToken() {
        val raw = "some_cookie=123; auth-token=secret_token_abc; other=456"
        val token = TwitchLoginActivity.parseCookies(raw)
        assertEquals("secret_token_abc", token)
    }

    @Test
    fun testLocalhostRedirectDetection() {
        assertTrue(TwitchLoginActivity.isLocalhostRedirect("http://localhost#access_token=foo"))
        assertTrue(TwitchLoginActivity.isLocalhostRedirect("http://localhost:8080/?code=foo"))
        assertTrue(TwitchLoginActivity.isLocalhostRedirect("https://localhost/callback#access_token=foo"))
        
        assertFalse(TwitchLoginActivity.isLocalhostRedirect("https://id.twitch.tv/oauth2/authorize"))
        assertFalse(TwitchLoginActivity.isLocalhostRedirect("https://kick.com/login"))
        assertFalse(TwitchLoginActivity.isLocalhostRedirect("https://accounts.google.com"))
    }

    @Test
    fun testExtractAccessTokenFromFragment() {
        val testUrl = "http://localhost/#access_token=super_secret_oauth_token_123&scope=chat%3Aread+chat%3Aedit&token_type=bearer"
        val token = TwitchLoginActivity.extractParam(testUrl, "access_token")
        assertEquals("super_secret_oauth_token_123", token)

        val tokenType = TwitchLoginActivity.extractParam(testUrl, "token_type")
        assertEquals("bearer", tokenType)
    }

    @Test
    fun testExtractOAuthErrorFromFragment() {
        val testUrl = "http://localhost/#error=access_denied&error_description=The+user+denied+you+any+access"
        val error = TwitchLoginActivity.extractParam(testUrl, "error")
        val errorDesc = TwitchLoginActivity.extractParam(testUrl, "error_description")
        
        assertEquals("access_denied", error)
        assertNotNull(errorDesc)
        assertTrue(errorDesc!!.contains("denied"))
    }

    @Test
    fun testExtractParamFromQueryString() {
        val testUrl = "http://localhost/?access_token=query_token_abc&scope=chat"
        val token = TwitchLoginActivity.extractParam(testUrl, "access_token")
        assertEquals("query_token_abc", token)
    }

    @Test
    fun testMissingParamReturnsNull() {
        val testUrl = "http://localhost/#other_param=val"
        val token = TwitchLoginActivity.extractParam(testUrl, "access_token")
        assertNull(token)
    }
}

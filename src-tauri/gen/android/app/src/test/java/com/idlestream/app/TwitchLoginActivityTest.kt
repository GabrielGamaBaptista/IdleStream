package com.idlestream.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TwitchLoginActivityTest {

    @Test
    fun testAuthUrlContainsForceVerifyAndRequiredOAuthParameters() {
        val authUrl = TwitchLoginActivity.getAuthUrl()
        
        assertTrue("OAuth URL deve conter force_verify=true para garantir isolamento de sessão",
            authUrl.contains("force_verify=true"))
        assertTrue("OAuth URL deve conter response_type=token",
            authUrl.contains("response_type=token"))
        assertTrue("OAuth URL deve conter client_id",
            authUrl.contains("client_id=gp762nuuoqcoxypju8c569th9wz7q5"))
        assertTrue("OAuth URL deve conter redirect_uri=http://localhost",
            authUrl.contains("redirect_uri=http://localhost"))
        assertTrue("OAuth URL deve conter os escopos necessários",
            authUrl.contains("scope=chat:read+chat:edit"))
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

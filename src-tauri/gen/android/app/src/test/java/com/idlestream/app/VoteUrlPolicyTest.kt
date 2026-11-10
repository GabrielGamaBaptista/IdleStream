package com.idlestream.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VoteUrlPolicyTest {

    @Test
    fun testBuildVoteTargetUrlNormalizationAndPlayerIdentifier() {
        val u1 = VoteUrlPolicy.buildVoteTargetUrl("https://topidle.com/jogo/pokeidle-io-5f9969", "GGB2006_3")
        assertEquals("https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006_3", u1)

        val u2 = VoteUrlPolicy.buildVoteTargetUrl("topidle.com", "GGB2006")
        assertEquals("https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006", u2)

        val u3 = VoteUrlPolicy.buildVoteTargetUrl(
            "https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=OLD_ID&ref=app",
            "GGB2006_2"
        )
        assertTrue(u3.contains("ref=app"))
        assertTrue(u3.contains("playerIdentifier=GGB2006_2"))
        assertFalse(u3.contains("OLD_ID"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun testBuildVoteTargetUrlRejectsNonTopIdleDomain() {
        VoteUrlPolicy.buildVoteTargetUrl("https://evil.com/jogo/pokeidle-io-5f9969", "GGB2006")
    }

    @Test(expected = IllegalArgumentException::class)
    fun testBuildVoteTargetUrlRejectsHttpScheme() {
        VoteUrlPolicy.buildVoteTargetUrl("http://topidle.com/jogo/pokeidle-io-5f9969", "GGB2006")
    }

    @Test
    fun testStrictVoteNavigationWhitelist() {
        // Permitidos: TopIdle, Google OAuth e CAPTCHAs interativos
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006_4"))
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("https://www.topidle.com/votar"))
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("https://accounts.google.com/o/oauth2/v2/auth?client_id=1"))
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("https://challenges.cloudflare.com/turnstile/v0/api.js"))
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("https://newassets.hcaptcha.com/captcha/v1/api.js"))
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("https://www.google.com/recaptcha/api2/anchor"))
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("https://www.gstatic.com/recaptcha/releases/1.js"))
        assertTrue(VoteUrlPolicy.isAllowedVoteNavigation("about:blank", isPopup = true))

        // Bloqueados: sites externos não autorizados e Google fora do OAuth/reCAPTCHA
        assertFalse(VoteUrlPolicy.isAllowedVoteNavigation("https://google.com/search?q=x"))
        assertFalse(VoteUrlPolicy.isAllowedVoteNavigation("https://youtube.com/watch?v=123"))
        assertFalse(VoteUrlPolicy.isAllowedVoteNavigation("https://topidle.com.evil.org/phish"))
        assertFalse(VoteUrlPolicy.isAllowedVoteNavigation("http://topidle.com/insecure"))
        assertFalse(VoteUrlPolicy.isAllowedVoteNavigation("about:blank", isPopup = false))
    }

    @Test
    fun testEnsureSelectAccountPromptPreservesExistingParams() {
        val raw = "https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&redirect_uri=https://topidle.com/cb"
        val res = VoteUrlPolicy.ensureSelectAccountPrompt(raw)
        assertTrue(res.contains("prompt=select_account"))
        assertTrue(res.contains("client_id=abc"))

        val internal = "https://accounts.google.com/signin/v2/challenge/pwd"
        assertEquals(internal, VoteUrlPolicy.ensureSelectAccountPrompt(internal))
    }

    @Test
    fun testProfileResolutionSharedVsIsolated() {
        assertEquals(
            "slot_slot-3",
            VoteUrlPolicy.resolveProfileName("vote-3", "slot-3", shareGameProfile = true)
        )
        assertEquals(
            "vote_vote-3",
            VoteUrlPolicy.resolveProfileName("vote-3", "slot-3", shareGameProfile = false)
        )
        assertEquals(
            "vote_vote-1",
            VoteUrlPolicy.resolveProfileName("vote-1", "", shareGameProfile = true)
        )
    }

    @Test
    fun testExact24h01mCooldownMath() {
        val baseVote = 1_700_000_000L
        assertEquals(baseVote + 86_460L, VoteUrlPolicy.nextVoteTimestampSeconds(baseVote))
        assertEquals(1L, VoteUrlPolicy.remainingCooldownSeconds(baseVote, baseVote + 86_459L))
        assertEquals(0L, VoteUrlPolicy.remainingCooldownSeconds(baseVote, baseVote + 86_460L))
        assertEquals(0L, VoteUrlPolicy.remainingCooldownSeconds(null, baseVote))
    }
}

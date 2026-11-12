package com.idlestream.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BackgroundResilienceTest {

    @Test
    fun testOemGuidanceResolutionForMajorManufacturers() {
        val xiaomi = BatteryOptimizationHelper.resolveOemGuidanceSpec("Xiaomi")
        assertEquals("xiaomi", xiaomi.oemKey)
        assertTrue(xiaomi.steps.any { it.contains("Sem restrições") })
        assertTrue(xiaomi.steps.any { it.contains("cadeado") })

        val poco = BatteryOptimizationHelper.resolveOemGuidanceSpec("POCO")
        assertEquals("xiaomi", poco.oemKey)

        val samsung = BatteryOptimizationHelper.resolveOemGuidanceSpec("samsung")
        assertEquals("samsung", samsung.oemKey)
        assertTrue(samsung.steps.any { it.contains("Irrestrito") })

        val motorola = BatteryOptimizationHelper.resolveOemGuidanceSpec("motorola")
        assertEquals("motorola", motorola.oemKey)

        val realme = BatteryOptimizationHelper.resolveOemGuidanceSpec("Realme")
        assertEquals("oppo_realme_oneplus", realme.oemKey)

        val generic = BatteryOptimizationHelper.resolveOemGuidanceSpec("Google")
        assertEquals("generic", generic.oemKey)
        assertTrue(generic.title.contains("Google"))
    }

    @Test
    fun testLifecycleLoggerFormattingAndCircularRotation() {
        val line = LifecycleLogger.formatLine("SCREEN_OFF", "slots=4")
        assertTrue(line.contains("[SCREEN_OFF]"))
        assertTrue(line.contains("slots=4"))
        assertTrue(line.endsWith("\n"))

        val huge = (1..200).joinToString("\n") { "line-$it-abcdef" }
        val rotated = LifecycleLogger.rotateTextIfNeeded(huge, keepChars = 120)
        assertTrue(rotated.startsWith("--- LOG ROTATED ---\n"))
        assertTrue(rotated.contains("line-200-abcdef"))
        assertFalse(rotated.contains("line-1-abcdef"))
    }

    @Test
    fun testGameSlotGoogleOAuthSelectAccountHelper() {
        assertTrue(
            GameSlotManager.isGoogleAuthUrl(
                "https://accounts.google.com/o/oauth2/v2/auth?client_id=123&redirect_uri=https://pokeidle.io"
            )
        )
        assertFalse(
            GameSlotManager.isGoogleAuthUrl("https://accounts.google.com/signin/v2/challenge/pwd")
        )
        val patched = GameSlotManager.ensureSelectAccountPrompt(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=123"
        )
        assertTrue(patched.contains("prompt=select_account"))
    }
}

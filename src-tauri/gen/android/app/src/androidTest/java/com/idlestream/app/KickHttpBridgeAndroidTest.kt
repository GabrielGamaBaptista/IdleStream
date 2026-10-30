package com.idlestream.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class KickHttpBridgeAndroidTest {

    @Test
    fun testKickHttpBridgeGetChannelInfo() {
        // Streamers mencionados pelo usuário para teste
        val testStreamers = listOf("surskity", "cogu", "dersin2k", "biscoitao", "mecmeno", "tftoddy")

        var atLeastOneLiveFound = false

        for (slug in testStreamers) {
            val url = "https://kick.com/api/v2/channels/$slug"
            val respStr = KickHttpBridge.request("GET", url, null, null, 10000)

            val json = JSONObject(respStr)
            val status = json.optInt("status", -1)
            assertEquals("KickHttpBridge deve retornar HTTP 200 para canal $slug", 200, status)

            val body = json.optString("body", "")
            assertTrue("Body não deve ser vazio para $slug", body.isNotEmpty())

            val channelJson = JSONObject(body)
            assertEquals("Slug deve coincidir", slug.lowercase(), channelJson.optString("slug", "").lowercase())
            assertTrue("Deve possuir ID de canal numérico", channelJson.optLong("id", 0) > 0)

            val livestream = channelJson.optJSONObject("livestream")
            if (livestream != null && !livestream.isNull("id")) {
                val isLive = livestream.optBoolean("is_live", false)
                println("[TEST] Canal $slug ESTÁ AO VIVO! is_live=$isLive, viewers=${livestream.optInt("viewer_count")}")
                if (isLive) {
                    atLeastOneLiveFound = true
                }
            } else {
                println("[TEST] Canal $slug está offline no momento da consulta")
            }
        }

        assertTrue(
            "Pelo menos uma das lives indicadas pelo usuário deve estar ao vivo e ser detectada pelo bridge",
            atLeastOneLiveFound
        )
    }

    @Test
    fun testKickHttpBridgeCustomHeaders() {
        val headers = JSONObject().apply {
            put("X-Custom-Test", "IdleStreamTest")
            put("Accept", "application/json")
        }
        val respStr = KickHttpBridge.request(
            "GET",
            "https://kick.com/api/v2/channels/surskity",
            headers.toString(),
            null,
            8000
        )
        val json = JSONObject(respStr)
        assertEquals(200, json.optInt("status", -1))
        val body = json.optString("body", "")
        assertTrue(body.contains("surskity"))
    }

    @Test
    fun testNativeKickHttpRequestFromRust() {
        KickHttpBridge.ensureRegistered()
        val result = KickHttpBridge.testNativeKickHttpRequest("surskity")
        println("[TEST RESULT RUST HTTP]: $result")
        assertTrue("Deve iniciar com OK: $result", result.startsWith("OK:"))
    }
}

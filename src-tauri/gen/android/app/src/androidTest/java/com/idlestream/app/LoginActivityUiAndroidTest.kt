package com.idlestream.app

import android.content.Intent
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LoginActivityUiAndroidTest {

    @Test
    fun testTwitchLoginActivityViewsAndResetButton() {
        val intent = Intent(ApplicationProvider.getApplicationContext(), TwitchLoginActivity::class.java).apply {
            putExtra("account_id", "test_twitch_acc_1")
        }

        ActivityScenario.launch<TwitchLoginActivity>(intent).use { scenario ->
            scenario.onActivity { activity ->
                val titleView = activity.findViewById<TextView>(R.id.txt_twitch_title)
                assertNotNull("Título deve existir", titleView)
                assertEquals("Conectar Twitch", titleView.text.toString())

                val btnCancel = activity.findViewById<Button>(R.id.btn_cancel_twitch)
                assertNotNull("Botão Fechar deve existir", btnCancel)
                assertEquals(View.VISIBLE, btnCancel.visibility)

                val btnReset = activity.findViewById<Button>(R.id.btn_reset_session_twitch)
                assertNotNull("Botão Limpar deve existir", btnReset)
                assertEquals(View.VISIBLE, btnReset.visibility)

                val webView = activity.findViewById<View>(R.id.twitch_webview)
                assertNotNull("WebView deve existir", webView)
                assertEquals(View.VISIBLE, webView.visibility)

                // Simula clique no botão Reset/Limpar
                assertTrue("Botão Reset deve ser clicável", btnReset.performClick())
            }
            Thread.sleep(500)
        }
    }

    @Test
    fun testKickLoginActivityViewsAndResetButton() {
        val intent = Intent(ApplicationProvider.getApplicationContext(), KickLoginActivity::class.java).apply {
            putExtra("account_id", "test_kick_acc_1")
            putExtra("account_label", "Streamer1")
        }

        ActivityScenario.launch<KickLoginActivity>(intent).use { scenario ->
            scenario.onActivity { activity ->
                val titleView = activity.findViewById<TextView>(R.id.txt_title)
                assertNotNull("Título deve existir", titleView)
                assertTrue(titleView.text.toString().contains("Streamer1"))

                val btnCancel = activity.findViewById<Button>(R.id.btn_cancel)
                assertNotNull("Botão Fechar deve existir", btnCancel)
                assertEquals(View.VISIBLE, btnCancel.visibility)

                val btnSave = activity.findViewById<Button>(R.id.btn_save)
                assertNotNull("Botão Concluir deve existir", btnSave)
                assertEquals(View.VISIBLE, btnSave.visibility)

                val btnReset = activity.findViewById<Button>(R.id.btn_reset_session)
                assertNotNull("Botão Limpar deve existir", btnReset)
                assertEquals(View.VISIBLE, btnReset.visibility)

                val webView = activity.findViewById<View>(R.id.kick_webview)
                assertNotNull("WebView deve existir", webView)
                assertEquals(View.VISIBLE, webView.visibility)

                // Simula clique no botão Reset/Limpar
                assertTrue("Botão Reset deve ser clicável", btnReset.performClick())
            }
            Thread.sleep(500)
        }
    }
}

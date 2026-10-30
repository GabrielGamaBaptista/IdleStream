package com.idlestream.app

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ForegroundServiceLifecycleAndroidTest {

    @Test
    fun testForegroundServiceStartAndUpdateAndStop() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        assertNotNull(context)

        // 1. Inicia o serviço
        IdleStreamForegroundService.start(context)
        Thread.sleep(1000)

        assertTrue("Serviço deve estar executando", IdleStreamForegroundService.isRunning)
        assertTrue("WakeLock deve estar ativo para 24/7 background", IdleStreamForegroundService.isWakeLockHeld)
        assertTrue("WifiLock deve estar ativo para sockets contínuos", IdleStreamForegroundService.isWifiLockHeld)

        // 2. Atualiza o status da notificação com informações de live
        IdleStreamForegroundService.updateStatus(
            context,
            "IdleStream • 4 Lives Ativas",
            "Twitch: surskity, cogu • Kick: dersin2k, biscoitao"
        )
        Thread.sleep(500)

        // 3. Para o serviço
        IdleStreamForegroundService.stop(context)
        Thread.sleep(1000)

        assertFalse("Serviço deve ser encerrado", IdleStreamForegroundService.isRunning)
        assertFalse("WakeLock deve ser liberado", IdleStreamForegroundService.isWakeLockHeld)
        assertFalse("WifiLock deve ser liberado", IdleStreamForegroundService.isWifiLockHeld)
    }

    @Test
    fun testServiceNotificationChannelCreation() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

        IdleStreamForegroundService.start(context)
        Thread.sleep(500)

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = manager.getNotificationChannel(IdleStreamForegroundService.CHANNEL_ID)
            assertNotNull("Notification channel deve existir", channel)
            assertTrue(channel.name.toString().contains("IdleStream"))
        }

        IdleStreamForegroundService.stop(context)
        Thread.sleep(500)
    }
}

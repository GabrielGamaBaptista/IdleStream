package com.idlestream.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class AppUpdateHelperTest {

    @Test
    fun testUpdateFileNameConstant() {
        assertEquals("idlestream_update.apk", AppUpdateHelper.UPDATE_FILE_NAME)
    }

    @Test
    fun testCalculateProgressZeroOrNegativeTotal() {
        assertEquals(0, AppUpdateHelper.calculateProgress(0, 0))
        assertEquals(0, AppUpdateHelper.calculateProgress(100, 0))
        assertEquals(0, AppUpdateHelper.calculateProgress(50, -10))
    }

    @Test
    fun testCalculateProgressStandardPercentages() {
        assertEquals(0, AppUpdateHelper.calculateProgress(0, 1000))
        assertEquals(10, AppUpdateHelper.calculateProgress(100, 1000))
        assertEquals(25, AppUpdateHelper.calculateProgress(250, 1000))
        assertEquals(50, AppUpdateHelper.calculateProgress(500, 1000))
        assertEquals(75, AppUpdateHelper.calculateProgress(750, 1000))
        assertEquals(99, AppUpdateHelper.calculateProgress(999, 1000))
        assertEquals(100, AppUpdateHelper.calculateProgress(1000, 1000))
    }

    @Test
    fun testCalculateProgressLargeByteValues() {
        // Testando com valores típicos de APK (ex: 25MB de 50MB)
        val downloaded = 26_214_400L // 25 MB
        val total = 52_428_800L      // 50 MB
        assertEquals(50, AppUpdateHelper.calculateProgress(downloaded, total))
    }

    @Test
    fun testCalculateProgressCoerceBoundaries() {
        // Se por qualquer razão os bytes baixados superarem o total esperado
        assertEquals(100, AppUpdateHelper.calculateProgress(1200, 1000))
        // Se bytes forem negativos
        assertEquals(0, AppUpdateHelper.calculateProgress(-50, 1000))
    }
}

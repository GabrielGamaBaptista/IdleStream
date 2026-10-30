package com.idlestream.app

import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object KickHttpBridge {
    private const val TAG = "KickHttpBridge"

    init {
        try {
            System.loadLibrary("idlestream_lib")
            registerNativeBridge()
            Log.d(TAG, "Native bridge registered in init")
        } catch (e: Throwable) {
            Log.w(TAG, "Could not register native bridge in init: ${e.message}")
        }
    }

    @JvmStatic
    external fun registerNativeBridge()

    @JvmStatic
    fun ensureRegistered() {
        try {
            registerNativeBridge()
            Log.d(TAG, "Native bridge successfully registered via ensureRegistered")
        } catch (e: Throwable) {
            Log.e(TAG, "Error in ensureRegistered: ${e.message}")
        }
    }

    @JvmStatic
    fun request(
        method: String,
        urlStr: String,
        headersJsonStr: String?,
        body: String?,
        timeoutMs: Int
    ): String {
        val result = JSONObject()
        var conn: HttpURLConnection? = null
        try {
            val url = URL(urlStr)
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = method.uppercase()
            val effectiveTimeout = if (timeoutMs > 0) timeoutMs else 10000
            conn.connectTimeout = effectiveTimeout
            conn.readTimeout = effectiveTimeout
            conn.instanceFollowRedirects = true

            // Default browser headers
            conn.setRequestProperty(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            conn.setRequestProperty("Accept", "application/json, text/plain, */*")
            conn.setRequestProperty("Referer", "https://kick.com/")
            conn.setRequestProperty("Origin", "https://kick.com")

            // Custom headers
            if (!headersJsonStr.isNullOrBlank()) {
                val headersJson = JSONObject(headersJsonStr)
                val keys = headersJson.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val value = headersJson.getString(key)
                    conn.setRequestProperty(key, value)
                }
            }

            // Body for POST / PUT
            if (!body.isNullOrBlank() && (method.equals("POST", true) || method.equals("PUT", true))) {
                conn.doOutput = true
                conn.outputStream.use { os ->
                    OutputStreamWriter(os, Charsets.UTF_8).use { writer ->
                        writer.write(body)
                        writer.flush()
                    }
                }
            }

            val statusCode = conn.responseCode
            val stream = if (statusCode in 200..299) conn.inputStream else conn.errorStream
            val respBody = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""

            result.put("status", statusCode)
            result.put("body", respBody)
            result.put("error", "")
        } catch (e: Exception) {
            Log.e(TAG, "HTTP request failed for $urlStr: ${e.message}", e)
            result.put("status", -1)
            result.put("body", "")
            result.put("error", e.message ?: "Unknown network error")
        } finally {
            conn?.disconnect()
        }
        return result.toString()
    }
}

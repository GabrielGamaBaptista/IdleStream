package com.idlestream.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

object AppUpdateHelper {

    const val UPDATE_FILE_NAME = "idlestream_update.apk"

    /**
     * Verifica se o app possui permissão para solicitar instalação de pacotes (Android 8.0+).
     */
    fun canInstallPackages(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    /**
     * Abre a tela de configurações do sistema para o usuário autorizar instalação de fontes desconhecidas.
     */
    fun openInstallPermissionSettings(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Throwable) {
                // Fallback para configurações gerais de segurança caso o dispositivo restrinja
                val fallbackIntent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
            }
        }
    }

    /**
     * Calcula o percentual de download com segurança contra divisão por zero e overflow.
     */
    fun calculateProgress(downloadedBytes: Long, totalBytes: Long): Int {
        if (totalBytes <= 0) return 0
        val percent = ((downloadedBytes * 100L) / totalBytes).toInt()
        return percent.coerceIn(0, 100)
    }

    /**
     * Cria a Intent com a URI segura do FileProvider para abrir o instalador nativo do sistema Android.
     */
    fun createInstallIntent(context: Context, apkFile: File): Intent {
        val apkUri: Uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile
        )

        return Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    /**
     * Obtém o arquivo de destino para o download no diretório de cache do app.
     */
    fun getDestinationFile(context: Context): File {
        return File(context.cacheDir, UPDATE_FILE_NAME)
    }

    /**
     * Abre uma conexão HTTP seguindo até maxRedirects (necessário para downloads do GitHub que redirecionam para AWS S3).
     */
    fun openConnectionWithRedirects(initialUrl: String, maxRedirects: Int = 5): HttpURLConnection {
        var currentUrl = initialUrl
        var redirects = 0

        while (redirects < maxRedirects) {
            val url = URL(currentUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 15000
            connection.readTimeout = 30000
            connection.setRequestProperty("User-Agent", "IdleStream-Android-Updater")

            connection.connect()
            val responseCode = connection.responseCode

            if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                responseCode == HttpURLConnection.HTTP_SEE_OTHER ||
                responseCode == 307 || responseCode == 308
            ) {
                val newUrl = connection.getHeaderField("Location")
                    ?: throw IllegalStateException("Redirecionamento sem header Location ao baixar atualização.")
                connection.disconnect()
                currentUrl = newUrl
                redirects++
                continue
            }

            if (responseCode != HttpURLConnection.HTTP_OK) {
                connection.disconnect()
                throw IllegalStateException("Servidor retornou código HTTP $responseCode ao tentar baixar $currentUrl")
            }

            return connection
        }

        throw IllegalStateException("Muitos redirecionamentos seguidos ao baixar o APK.")
    }

    /**
     * Baixa o arquivo do APK gravando em disco e reportando progresso via callback.
     */
    fun downloadApkFile(
        urlStr: String,
        destinationFile: File,
        progressListener: (percent: Int, downloaded: Long, total: Long) -> Unit
    ) {
        if (destinationFile.exists()) {
            destinationFile.delete()
        }

        val connection = openConnectionWithRedirects(urlStr)
        val totalBytes = connection.contentLength.toLong()

        var input: InputStream? = null
        var output: FileOutputStream? = null

        try {
            input = connection.inputStream
            output = FileOutputStream(destinationFile)

            val buffer = ByteArray(8192)
            var downloadedBytes: Long = 0
            var bytesRead: Int
            var lastReportedPercent = -1

            while (input.read(buffer).also { bytesRead = it } != -1) {
                output.write(buffer, 0, bytesRead)
                downloadedBytes += bytesRead

                val percent = calculateProgress(downloadedBytes, totalBytes)
                if (percent != lastReportedPercent) {
                    lastReportedPercent = percent
                    progressListener(percent, downloadedBytes, totalBytes)
                }
            }

            output.flush()

            if (destinationFile.length() == 0L) {
                throw IllegalStateException("O arquivo baixado está vazio.")
            }
        } finally {
            try { output?.close() } catch (ignored: Throwable) {}
            try { input?.close() } catch (ignored: Throwable) {}
            try { connection.disconnect() } catch (ignored: Throwable) {}
        }
    }

    /**
     * Executa o fluxo assíncrono completo: checagem de permissão, download e abertura do instalador nativo.
     */
    fun downloadAndInstall(
        activity: Activity,
        apkUrl: String,
        onProgress: (percent: Int) -> Unit,
        onError: (message: String) -> Unit,
        onReadyToInstall: () -> Unit = {}
    ) {
        Thread {
            try {
                val destination = getDestinationFile(activity)
                onProgress(1)

                downloadApkFile(apkUrl, destination) { percent, _, _ ->
                    activity.runOnUiThread {
                        onProgress(percent)
                    }
                }

                activity.runOnUiThread {
                    onReadyToInstall()

                    // Se não tiver permissão para instalar fontes desconhecidas no Android 8+, abre a tela para o usuário habilitar
                    if (!canInstallPackages(activity)) {
                        openInstallPermissionSettings(activity)
                    }

                    // Dispara a Intent de instalação do pacote baixado
                    val installIntent = createInstallIntent(activity, destination)
                    activity.startActivity(installIntent)
                }
            } catch (e: Throwable) {
                android.util.Log.e("IdleStreamUpdater", "Erro no download ou instalação do APK: ${e.message}", e)
                activity.runOnUiThread {
                    onError(e.message ?: "Erro desconhecido ao baixar atualização.")
                }
            }
        }.start()
    }
}

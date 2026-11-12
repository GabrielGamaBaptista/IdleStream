package com.idlestream.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

object BatteryOptimizationHelper {

    fun isBatteryOptimizationIgnored(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            return powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: true
        }
        return true
    }

    fun canDrawOverlays(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return try {
                Settings.canDrawOverlays(context)
            } catch (_: Throwable) {
                false
            }
        }
        return true
    }

    fun hasNotificationPermission(context: Context): Boolean {
        val notificationsEnabled = try {
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        } catch (_: Throwable) {
            true
        }
        if (!notificationsEnabled) return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        }
        return true
    }

    @SuppressLint("BatteryLife")
    fun requestIgnoreBatteryOptimization(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                // Fallback para as configurações de bateria gerais caso o fabricante bloqueie o intent direto
                openBatterySettingsFallback(context)
            }
        }
    }

    fun requestOverlayPermission(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                return
            } catch (_: Exception) {
            }
        }
        openAppBatterySettings(context)
    }

    fun openAppBatterySettings(context: Context) {
        try {
            val appSettingsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(appSettingsIntent)
        } catch (_: Exception) {
            openBatterySettingsFallback(context)
        }
    }

    private fun openBatterySettingsFallback(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            try {
                val appSettingsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(appSettingsIntent)
            } catch (ignored: Exception) {
            }
        }
    }

    data class OemGuidanceSpec(
        val oemKey: String,
        val title: String,
        val steps: List<String>
    )

    fun resolveOemGuidanceSpec(manufacturerRaw: String): OemGuidanceSpec {
        val lower = manufacturerRaw.trim().lowercase()
        val (oemKey, title, steps) = when {
            lower.contains("xiaomi") || lower.contains("redmi") || lower.contains("poco") -> Triple(
                "xiaomi",
                "Xiaomi / Redmi / POCO (HyperOS / MIUI)",
                listOf(
                    "Em Configurações do App > Economia de bateria: selecione 'Sem restrições'.",
                    "Habilite 'Início automático' (Autostart) / 'Execução em segundo plano'.",
                    "Na tela de Apps Recentes, segure o IdleStream e toque no cadeado para travar na memória."
                )
            )
            lower.contains("samsung") -> Triple(
                "samsung",
                "Samsung (One UI)",
                listOf(
                    "Em Informações do App > Bateria: selecione 'Irrestrito'.",
                    "Em Assistência do aparelho > Bateria > Limites de uso em segundo plano: garanta que 'Suspender apps não usados' não inclua o IdleStream."
                )
            )
            lower.contains("motorola") -> Triple(
                "motorola",
                "Motorola",
                listOf(
                    "Em Informações do App > Uso da bateria: selecione 'Irrestrito'.",
                    "Desative 'Gerenciar app se não for usado' e verifique 'Bateria adaptável' se houver quedas noturnas."
                )
            )
            lower.contains("oppo") || lower.contains("realme") || lower.contains("oneplus") -> Triple(
                "oppo_realme_oneplus",
                "OPPO / Realme / OnePlus",
                listOf(
                    "Em Uso de bateria: habilite 'Permitir atividade em segundo plano' e 'Auto-inicialização'.",
                    "Trave o IdleStream na tela de Apps Recentes."
                )
            )
            lower.contains("huawei") || lower.contains("honor") -> Triple(
                "huawei",
                "Huawei / Honor",
                listOf(
                    "Em Bateria > Inicialização de aplicativo: mude para Gerenciar manualmente.",
                    "Ative 'Auto-inicializar', 'Início secundário' e 'Executar em segundo plano'."
                )
            )
            else -> Triple(
                "generic",
                "Configuração recomendada (${manufacturerRaw.ifBlank { "Android" }})",
                listOf(
                    "Em Configurações do App > Bateria: defina como 'Sem restrições' / 'Irrestrito'.",
                    "Mantenha as permissões de Notificações sempre ativadas."
                )
            )
        }
        return OemGuidanceSpec(oemKey, title, steps)
    }

    fun buildOemGuidance(manufacturerRaw: String): JSONObject {
        val spec = resolveOemGuidanceSpec(manufacturerRaw)
        val stepsArray = JSONArray()
        for (step in spec.steps) {
            stepsArray.put(step)
        }
        return JSONObject().apply {
            put("manufacturer", manufacturerRaw)
            put("oemKey", spec.oemKey)
            put("title", spec.title)
            put("steps", stepsArray)
        }
    }

    fun getOemBatteryGuidanceJson(context: Context): String {
        val mfg = Build.MANUFACTURER ?: "Android"
        return buildOemGuidance(mfg)
            .apply {
                put("batteryOptimizationIgnored", isBatteryOptimizationIgnored(context))
                put("canDrawOverlays", canDrawOverlays(context))
                put("hasNotificationPermission", hasNotificationPermission(context))
            }
            .toString()
    }
}

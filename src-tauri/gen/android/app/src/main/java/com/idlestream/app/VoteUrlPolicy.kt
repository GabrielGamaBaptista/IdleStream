package com.idlestream.app

import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder

/**
 * Política pura de URLs, whitelist de domínios, OAuth select_account e cálculo de cooldown (24h 01m)
 * para a seção de votos diários do TopIdle no Android.
 * Espelho exato de src-tauri/src/votes/policy.rs e testável em JUnit puro na JVM.
 */
object VoteUrlPolicy {
    const val DEFAULT_TOPIDLE_GAME_URL = "https://topidle.com/jogo/pokeidle-io-5f9969"
    const val VOTE_COOLDOWN_SECONDS = 86_460L // 24 horas + 1 minuto

    private val GOOGLE_AUTH_HOSTS = setOf(
        "accounts.google.com",
        "accounts.youtube.com",
        "myaccount.google.com",
        "gds.google.com",
        "apis.google.com",
        "consent.google.com",
        "consent.youtube.com"
    )

    val VOTE_OBSERVER_JS = """
        (function () {
          try {
            const host = (window.location && window.location.hostname ? window.location.hostname : '').toLowerCase();
            if (!host || (host !== 'topidle.com' && !host.endsWith('.topidle.com'))) return;
            if (window.__idlestreamVoteObserverInstalled) return;
            window.__idlestreamVoteObserverInstalled = true;

            let hinted = false;
            let userInteracted = false;

            const markInteraction = () => {
              userInteracted = true;
            };
            window.addEventListener('pointerdown', markInteraction, true);
            window.addEventListener('keydown', markInteraction, true);
            window.addEventListener('submit', markInteraction, true);

            const VOTE_SUCCESS_PATTERNS = [
              /voto\s+(?:registrado|computado|confirmado|enviado)/i,
              /obrigado\s+por\s+votar/i,
              /vote\s+(?:recorded|confirmed|submitted|counted)/i,
              /thank\s+you\s+for\s+voting/i,
              /thanks\s+for\s+voting/i,
              /voc[e\u00ea]\s+j[a\u00e1]\s+votou/i,
              /already\s+voted/i
            ];

            function emitHint(reason) {
              if (hinted) return;
              hinted = true;
              try {
                if (window.IdleStreamVoteBridge && typeof window.IdleStreamVoteBridge.onVoteDetectedHint === 'function') {
                  window.IdleStreamVoteBridge.onVoteDetectedHint(reason);
                  return;
                }
              } catch (_) {}

              try {
                const orig = document.title || 'TopIdle';
                document.title = '__IDLESTREAM_VOTE_HINT__|' + reason + '|' + orig;
                setTimeout(() => {
                  if (document.title.startsWith('__IDLESTREAM_VOTE_HINT__|')) {
                    document.title = orig;
                  }
                }, 80);
              } catch (_) {}
            }

            function inspectDomForVoteSuccess() {
              if (hinted) return;
              try {
                const text = (document.body && document.body.innerText) ? document.body.innerText : '';
                if (!text) return;
                for (const rx of VOTE_SUCCESS_PATTERNS) {
                  if (rx.test(text)) {
                    emitHint(userInteracted ? 'vote_confirmed_after_interaction' : 'cooldown_already_active');
                    break;
                  }
                }
              } catch (_) {}
            }

            if (typeof window.fetch === 'function') {
              const rawFetch = window.fetch.bind(window);
              window.fetch = async function (...args) {
                const res = await rawFetch(...args);
                try {
                  const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
                  const method = ((args[1] && args[1].method) || (args[0] && args[0].method) || 'GET').toUpperCase();
                  if (res.ok && method === 'POST' && /\/vote|votar/i.test(reqUrl)) {
                    emitHint('vote_post_ok');
                  }
                } catch (_) {}
                return res;
              };
            }

            function attachObserver() {
              setTimeout(inspectDomForVoteSuccess, 900);
              if (document.body) {
                const observer = new MutationObserver(() => {
                  if (!hinted) {
                    setTimeout(inspectDomForVoteSuccess, 250);
                  }
                });
                observer.observe(document.body, { childList: true, subtree: true, characterData: true });
              }
            }

            if (document.readyState === 'loading') {
              window.addEventListener('DOMContentLoaded', attachObserver);
            } else {
              attachObserver();
            }
          } catch (_) {}
        })();
    """.trimIndent()

    @JvmStatic
    fun resolveProfileName(
        accountId: String,
        linkedGameSlotId: String?,
        shareGameProfile: Boolean
    ): String {
        if (shareGameProfile && !linkedGameSlotId.isNullOrBlank()) {
            return "slot_${linkedGameSlotId.trim()}"
        }
        return "vote_$accountId"
    }

    @JvmStatic
    fun buildVoteTargetUrl(baseUrl: String, playerIdentifier: String): String {
        val raw = baseUrl.trim()
        val normalized = when {
            raw.isEmpty() -> DEFAULT_TOPIDLE_GAME_URL
            raw.contains("://") -> raw
            else -> "https://${raw.trimStart('/')}"
        }

        val uri = try {
            URI(normalized)
        } catch (e: Exception) {
            throw IllegalArgumentException("URL de voto inválida: ${e.message}")
        }

        val scheme = uri.scheme?.lowercase() ?: ""
        if (scheme != "https") {
            throw IllegalArgumentException("Somente URLs HTTPS do TopIdle são permitidas nesta seção.")
        }

        val host = uri.host?.lowercase()
            ?: throw IllegalArgumentException("Domínio inválido na URL de voto.")

        if (host != "topidle.com" && !host.endsWith(".topidle.com")) {
            throw IllegalArgumentException("Domínio não permitido '$host': o navegador de votos aceita apenas topidle.com.")
        }

        val path = if (uri.rawPath.isNullOrEmpty() || uri.rawPath == "/") {
            "/jogo/pokeidle-io-5f9969"
        } else {
            uri.rawPath
        }

        val pairs = mutableListOf<Pair<String, String>>()
        val rawQuery = uri.rawQuery
        if (!rawQuery.isNullOrEmpty()) {
            for (part in rawQuery.split("&")) {
                if (part.isEmpty()) continue
                val eq = part.indexOf('=')
                val k = if (eq >= 0) URLDecoder.decode(part.substring(0, eq), "UTF-8") else URLDecoder.decode(part, "UTF-8")
                val v = if (eq >= 0) URLDecoder.decode(part.substring(eq + 1), "UTF-8") else ""
                if (!k.equals("playerIdentifier", ignoreCase = true)) {
                    pairs.add(k to v)
                }
            }
        }

        val cleanPlayer = playerIdentifier.trim()
        if (cleanPlayer.isNotEmpty()) {
            pairs.add("playerIdentifier" to cleanPlayer)
        }

        val finalQuery = if (pairs.isEmpty()) {
            null
        } else {
            pairs.joinToString("&") { (k, v) ->
                "${URLEncoder.encode(k, "UTF-8")}=${URLEncoder.encode(v, "UTF-8")}".replace("+", "%20")
            }
        }

        val authority = buildString {
            append(host)
            if (uri.port != -1) {
                append(":").append(uri.port)
            }
        }

        return buildString {
            append("https://").append(authority).append(path)
            if (!finalQuery.isNullOrEmpty()) {
                append("?").append(finalQuery)
            }
            if (!uri.rawFragment.isNullOrEmpty()) {
                append("#").append(uri.rawFragment)
            }
        }
    }

    @JvmStatic
    fun isAllowedVoteNavigation(urlStr: String?, isPopup: Boolean = false): Boolean {
        if (urlStr.isNullOrBlank()) return false
        val trimmed = urlStr.trim()
        if (isPopup && trimmed == "about:blank") {
            return true
        }

        val uri = try {
            URI(trimmed)
        } catch (_: Exception) {
            return false
        }

        if (uri.scheme?.lowercase() != "https") {
            return false
        }

        val host = uri.host?.lowercase() ?: return false
        val path = uri.rawPath ?: ""

        if (host == "topidle.com" || host.endsWith(".topidle.com")) {
            return true
        }

        if (host in GOOGLE_AUTH_HOSTS) {
            return true
        }

        if (host == "challenges.cloudflare.com" ||
            host == "hcaptcha.com" ||
            host.endsWith(".hcaptcha.com") ||
            host == "recaptcha.net" ||
            host.endsWith(".recaptcha.net") ||
            host.endsWith(".gstatic.com")
        ) {
            return true
        }

        if ((host == "www.google.com" || host == "google.com") && path.startsWith("/recaptcha")) {
            return true
        }

        return false
    }

    @JvmStatic
    fun isGoogleAuthUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val uri = try {
            URI(url.trim())
        } catch (_: Exception) {
            return false
        }
        val host = uri.host?.lowercase() ?: return false
        if (host != "accounts.google.com") return false

        val lower = url.lowercase()
        val isOAuthEndpoint = lower.contains("/o/oauth2/") ||
            lower.contains("/oauth2/") ||
            lower.contains("/signin/oauth")
        val hasOAuthParams = lower.contains("response_type=") ||
            (lower.contains("client_id=") && lower.contains("redirect_uri="))

        val isInternalGoogleNav = lower.contains("/oauthchooseaccount") ||
            lower.contains("/signin/v2/challenge") ||
            lower.contains("/signin/challenge") ||
            lower.contains("/gsi/")

        return (isOAuthEndpoint || hasOAuthParams) && !isInternalGoogleNav
    }

    @JvmStatic
    fun ensureSelectAccountPrompt(url: String): String {
        if (!isGoogleAuthUrl(url)) return url
        val promptRegex = Regex("""([?&])prompt=([^&#]*)""", RegexOption.IGNORE_CASE)
        val match = promptRegex.find(url)

        return if (match != null) {
            val prefix = match.groupValues[1]
            val currentPrompt = match.groupValues[2]
            val decodedPrompt = try {
                URLDecoder.decode(currentPrompt, "UTF-8")
            } catch (_: Exception) {
                currentPrompt
            }

            if (decodedPrompt.contains("select_account", ignoreCase = true)) {
                url
            } else {
                val newPrompt = if (decodedPrompt.isBlank()) {
                    "select_account"
                } else {
                    "select_account%20$currentPrompt"
                }
                url.replaceRange(match.range, "${prefix}prompt=$newPrompt")
            }
        } else {
            val hashIdx = url.indexOf('#')
            if (hashIdx != -1) {
                val beforeHash = url.substring(0, hashIdx)
                val afterHash = url.substring(hashIdx)
                val sep = if (beforeHash.contains("?")) "&" else "?"
                "${beforeHash}${sep}prompt=select_account${afterHash}"
            } else {
                val sep = if (url.contains("?")) "&" else "?"
                "${url}${sep}prompt=select_account"
            }
        }
    }

    @JvmStatic
    fun nextVoteTimestampSeconds(lastVotedAtSec: Long): Long {
        return lastVotedAtSec + VOTE_COOLDOWN_SECONDS
    }

    @JvmStatic
    fun remainingCooldownSeconds(lastVotedAtSec: Long?, nowSec: Long): Long {
        if (lastVotedAtSec == null) return 0L
        val readyAt = nextVoteTimestampSeconds(lastVotedAtSec)
        return if (nowSec >= readyAt) 0L else readyAt - nowSec
    }
}

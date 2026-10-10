package com.lockdown.mdm

/**
 * Recognizes addresses whose host is a raw public IP (e.g. `103.119.217.84/video`), which
 * skip DNS entirely - so Private DNS / NextDNS never sees them and can't block them. Used by
 * [BrowserGuardAccessibilityService] on the browser's address bar.
 *
 * Covers what browsers accept as an IPv4 host (the WHATWG URL parser): dotted decimal, plus
 * the disguised forms - a single number (`http://1735907668`), hex (`0x67.0x77.0xd9.0x54`),
 * octal (`0147.0167.0331.0124`) and fewer than four parts (`103.119.55636`) - and bracketed
 * IPv6 (`[2001:db8::1]`). Local/private addresses (router pages, localhost) are allowed.
 *
 * To avoid blocking plain searches, the disguised forms only count with an explicit scheme
 * (`http://2024` is an IP, a typed `2024` is a search); dotted four-part IPv4 and bracketed
 * IPv6 count either way, since browsers show them without a scheme in the address bar.
 */
object IpUrlDetector {

    /** Whether [text] (an address bar's content) is an address with a public raw-IP host. */
    fun isPublicIpUrl(text: String): Boolean {
        val trimmed = text.trim()
        if (trimmed.isEmpty() || trimmed.any { it.isWhitespace() }) return false

        val scheme = Regex("^[a-zA-Z][a-zA-Z0-9+.-]*://").find(trimmed)
        val rest = if (scheme != null) trimmed.substring(scheme.value.length) else trimmed
        val authority = rest.substringBefore('/').substringBefore('?').substringBefore('#')
        val hostPort = authority.substringAfterLast('@')

        if (hostPort.startsWith("[")) {
            val host = hostPort.substringAfter('[').substringBefore(']')
            return host.contains(':') && isIpv6(host) && !isLocalIpv6(host)
        }

        val host = hostPort.substringBefore(':').trimEnd('.')
        val ipv4 = parseIpv4(host) ?: return false
        val explicit = scheme != null
        val plainDotted = host.split('.').let { parts ->
            parts.size == 4 && parts.all { it.isNotEmpty() && it.all(Char::isDigit) && !(it.length > 1 && it[0] == '0') }
        }
        if (!explicit && !plainDotted) return false
        return !isLocalIpv4(ipv4)
    }

    /** WHATWG IPv4 host parsing: 1-4 parts, each decimal, `0x` hex or `0` octal. */
    internal fun parseIpv4(host: String): Long? {
        if (host.isEmpty()) return null
        val parts = host.split('.')
        if (parts.size > 4 || parts.any { it.isEmpty() }) return null
        val numbers = parts.map { parsePart(it) ?: return null }
        // Every part but the last is one byte; the last fills the remaining bytes.
        if (numbers.dropLast(1).any { it > 255 }) return null
        val lastLimit = 1L shl (8 * (5 - numbers.size))
        if (numbers.last() >= lastLimit) return null
        var value = numbers.last()
        numbers.dropLast(1).forEachIndexed { index, part -> value += part shl (8 * (3 - index)) }
        return value
    }

    private fun parsePart(part: String): Long? {
        val (digits, radix) = when {
            part.startsWith("0x") || part.startsWith("0X") -> part.substring(2) to 16
            part.length > 1 && part.startsWith("0") -> part.substring(1) to 8
            else -> part to 10
        }
        if (digits.isEmpty()) return if (radix == 16) 0 else null
        if (digits.length > 12) return null
        return digits.toLongOrNull(radix)
    }

    private fun isLocalIpv4(ip: Long): Boolean {
        val a = (ip shr 24) and 0xff
        val b = (ip shr 16) and 0xff
        return a == 0L || a == 10L || a == 127L ||
            (a == 169L && b == 254L) ||
            (a == 172L && b in 16L..31L) ||
            (a == 192L && b == 168L) ||
            (a == 100L && b in 64L..127L) // carrier-grade NAT
    }

    private fun isIpv6(host: String): Boolean =
        host.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' || it == ':' || it == '.' } &&
            host.count { it == ':' } in 2..7

    private fun isLocalIpv6(host: String): Boolean {
        val lower = host.lowercase()
        return lower == "::1" || lower == "::" ||
            lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") ||
            lower.startsWith("fc") || lower.startsWith("fd")
    }
}

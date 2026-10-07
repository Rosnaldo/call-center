package com.lockdown.mdm

/**
 * Custom domain blocklist, kept isolated from [Constants] so it can be edited/grown on its own
 * without touching unrelated config. Not wired into any DNS path yet - once the VPN-based DNS
 * interception (currently only used as the Android <10 fallback, see [LocalVpnService] /
 * [DnsOverTlsForwarder]) is extended to run on this device too, the intended behavior is:
 * every query is checked against [DOMAINS] first (blocked locally, e.g. NXDOMAIN) and only
 * forwarded to NextDNS ([Constants.LOCKED_PRIVATE_DNS_HOST]) if it doesn't match.
 *
 * Matching semantics (for whatever eventually reads this list): a domain here blocks itself and
 * every subdomain - e.g. "example.com" also blocks "www.example.com" and "ads.example.com".
 */
object DnsDenyList {
    val DOMAINS = setOf<String>(
        // "example.com",
    )
}

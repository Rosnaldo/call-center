package com.lockdown.mdm

/**
 * Terms that, if typed into a monitored browser's address/search bar (see
 * [BrowserGuardAccessibilityService]), trigger an immediate suspend of that browser. Kept
 * isolated from other config for the same reason as [DnsDenyList] - grows independently.
 *
 * Matching is case-insensitive substring match against whatever the user is actively typing
 * (not the loaded page's content - only real-time edits to the address/search field itself).
 */
object UrlTermDenyList {
    val TERMS = setOf(
        "semi",
        "bokup",
        "atashira"
    )
}

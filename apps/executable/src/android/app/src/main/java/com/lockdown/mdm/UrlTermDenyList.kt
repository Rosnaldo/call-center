package com.lockdown.mdm

import android.content.Context

/**
 * Terms that, if typed into a monitored browser's address/search bar (see
 * [BrowserGuardAccessibilityService]), trigger an immediate suspend of that browser. Kept
 * isolated from other config for the same reason as [DnsDenyList] - grows independently.
 *
 * Matching is case-insensitive substring match against whatever the user is actively typing
 * (not the loaded page's content - only real-time edits to the address/search field itself).
 *
 * Empty by default: terms come from the chatbot config (see [ProvisioningConfig.blockedTerms]).
 */
object UrlTermDenyList {
    val TERMS = emptySet<String>()

    // The built-in terms plus any configured in the chatbot (see ProvisioningConfig).
    fun deniedTerms(context: Context): Set<String> =
        TERMS + (ProvisioningConfig.get(context)?.blockedTerms ?: emptySet())
}

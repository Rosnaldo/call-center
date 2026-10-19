package com.lockdown.mdm

import android.content.Context

/**
 * Terms that, if typed into a monitored browser's address/search bar (see
 * [BrowserGuardAccessibilityService]), trigger an immediate suspend of that browser. Kept
 * isolated from other config for the same reason as [DnsDenyList] - grows independently.
 *
 * Matching is case-insensitive and by whole word against whatever the user is actively typing
 * (not the loaded page's content - only real-time edits to the address/search field itself):
 * "semi" matches "semi", "Semi nua", "semi-nua" and "q=semi+nua", but not "seminario" nor
 * "semi2" - no letter (accented ones included) or digit may touch it on either side.
 *
 * Empty by default: terms come from the chatbot config (see [ProvisioningConfig.blockedTerms]).
 */
object UrlTermDenyList {
    val TERMS = emptySet<String>()

    // The built-in terms plus any configured in the chatbot (see ProvisioningConfig).
    fun deniedTerms(context: Context): Set<String> =
        TERMS + (ProvisioningConfig.get(context)?.blockedTerms ?: emptySet())

    // Whether `text` holds any of the denied terms as a whole word.
    fun matches(context: Context, text: String): Boolean = patternsFor(deniedTerms(context)).any { it.containsMatchIn(text) }

    // Compiled once per term list (checked on every keystroke), again when the config changes it.
    @Volatile private var cached: Pair<Set<String>, List<Regex>> = emptySet<String>() to emptyList()

    private fun patternsFor(terms: Set<String>): List<Regex> {
        val (cachedTerms, patterns) = cached
        if (cachedTerms == terms) return patterns
        return terms.map(::wholeWord).also { cached = terms to it }
    }

    // `\b` would treat accented letters as boundaries ("semiótica" would match), so the sides are
    // checked for any Unicode letter or digit. The term is escaped: configured terms may hold "."
    // and "-", which would otherwise be regex syntax.
    fun wholeWord(term: String): Regex =
        Regex("(?<![\\p{L}\\p{N}])" + Regex.escape(term) + "(?![\\p{L}\\p{N}])", RegexOption.IGNORE_CASE)
}

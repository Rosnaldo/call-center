package com.lockdown.mdm

/**
 * Browser packages [BrowserGuardAccessibilityService] watches. Not exhaustive - covers the
 * common ones (Chrome and its channels, stock/AOSP browser, this device's preinstalled Mi
 * Browser, Firefox, Samsung Internet, Edge, Opera, Brave). Add more here as needed; the service
 * itself doesn't need to know a package's exact address-bar resource id, since it matches any
 * focused, editable text field's content instead of a specific view.
 */
object MonitoredBrowsers {
    val PACKAGES = setOf(
        "com.android.chrome",
        "com.chrome.beta",
        "com.chrome.dev",
        "com.chrome.canary",
        "com.android.browser",
        "com.mi.globalbrowser",
        "org.mozilla.firefox",
        "com.sec.android.app.sbrowser",
        "com.microsoft.emmx",
        "com.opera.browser",
        "com.brave.browser",
    )

    /**
     * View ids of each browser's address bar, read after a page loads (a clicked link or a
     * redirect isn't typed). Best effort: browsers rename them in redesigns, and a missing id
     * only loses this after-load check - typed text is still checked for every browser.
     */
    val URL_BAR_IDS: Map<String, List<String>> = mapOf(
        "com.android.chrome" to listOf("url_bar"),
        "com.chrome.beta" to listOf("url_bar"),
        "com.chrome.dev" to listOf("url_bar"),
        "com.chrome.canary" to listOf("url_bar"),
        "com.brave.browser" to listOf("url_bar"),
        "com.microsoft.emmx" to listOf("url_bar"),
        "org.mozilla.firefox" to listOf("mozac_browser_toolbar_url_view", "url_bar_title"),
        "com.sec.android.app.sbrowser" to listOf("location_bar_edit_text"),
        "com.opera.browser" to listOf("url_field"),
        "com.mi.globalbrowser" to listOf("url"),
        "com.android.browser" to listOf("url"),
    )
}

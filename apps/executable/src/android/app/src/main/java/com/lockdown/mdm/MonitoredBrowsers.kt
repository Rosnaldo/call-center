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
}

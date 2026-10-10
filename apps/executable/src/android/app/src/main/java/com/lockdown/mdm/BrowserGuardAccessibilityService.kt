package com.lockdown.mdm

import android.accessibilityservice.AccessibilityService
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent

/**
 * Watches the browsers in [MonitoredBrowsers] and suspends one immediately (via
 * [PolicyEnforcer.blockAppNow]) when its address/search bar holds:
 * - a term from [UrlTermDenyList], in text the user types;
 * - an address whose host is a raw public IP (see [IpUrlDetector]), typed or shown after a
 *   page loads (a clicked link or redirect). Those skip DNS, so Private DNS can't block them.
 *
 * Typed text comes from any focused, editable field (the address/search bar, in practice -
 * accessibility_service_config.xml restricts which packages this service even receives events
 * from). The after-load check reads the address bar by view id ([MonitoredBrowsers.URL_BAR_IDS]),
 * throttled, since content-change events fire constantly while a page renders.
 *
 * Deliberately does NOT try to close just the current tab: there is no reliable, version- and
 * browser-independent way to do that through the Accessibility API (it would mean simulating
 * browser-specific UI gestures that break on every UI redesign). Suspending the whole browser is
 * the same mechanism ScheduleEnforcer already uses elsewhere in this app, and is far more
 * robust - the tradeoff (accepted when this was built) is that it blocks browsing entirely
 * rather than just the one flagged tab, until an admin runs unsuspend_app.
 *
 * Never reads the loaded page's own content, so a webpage that happens to mention a denied
 * term or an IP does not trigger this.
 */
class BrowserGuardAccessibilityService : AccessibilityService() {

    // Last address-bar read per browser, for the throttle.
    private val lastAddressBarCheck = mutableMapOf<String, Long>()

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        if (packageName !in MonitoredBrowsers.PACKAGES) return

        val blocked = when (event.eventType) {
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED, AccessibilityEvent.TYPE_VIEW_FOCUSED ->
                extractTypedText(event)?.let { isDeniedTerm(it) || IpUrlDetector.isPublicIpUrl(it) } ?: false
            else -> addressBarText(packageName)?.let(IpUrlDetector::isPublicIpUrl) ?: false
        }
        if (blocked) PolicyEnforcer.blockAppNow(applicationContext, packageName)
    }

    private fun isDeniedTerm(text: String): Boolean {
        val normalized = text.lowercase()
        return UrlTermDenyList.TERMS.any { term -> normalized.contains(term.lowercase()) }
    }

    private fun extractTypedText(event: AccessibilityEvent): String? {
        val source = event.source
        if (source != null) {
            if (source.isEditable && !source.text.isNullOrEmpty()) {
                return source.text.toString()
            }
        }
        // Fallback for events that don't carry a live source node (e.g. the node has already
        // been recycled by the platform by the time this runs).
        return event.text.joinToString(" ").takeIf { it.isNotBlank() }
    }

    // The address bar's current text, at most every ADDRESS_BAR_CHECK_MS per browser.
    private fun addressBarText(packageName: String): String? {
        val ids = MonitoredBrowsers.URL_BAR_IDS[packageName] ?: return null
        val now = SystemClock.elapsedRealtime()
        if (now - (lastAddressBarCheck[packageName] ?: 0L) < ADDRESS_BAR_CHECK_MS) return null
        lastAddressBarCheck[packageName] = now

        val root = rootInActiveWindow ?: return null
        for (id in ids) {
            val text = root.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
                .firstNotNullOfOrNull { node -> node.text?.toString()?.takeIf { it.isNotBlank() } }
            if (text != null) return text
        }
        return null
    }

    override fun onInterrupt() {}

    private companion object {
        const val ADDRESS_BAR_CHECK_MS = 500L
    }
}

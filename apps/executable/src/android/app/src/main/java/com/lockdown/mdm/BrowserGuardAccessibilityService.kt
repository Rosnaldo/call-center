package com.lockdown.mdm

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

/**
 * Watches the browsers in [MonitoredBrowsers] for text typed into any focused, editable field
 * (the address/search bar, in practice - accessibility_service_config.xml restricts which
 * packages this service even receives events from). On a match against [UrlTermDenyList], the
 * browser is suspended immediately via [PolicyEnforcer.blockAppNow].
 *
 * Deliberately does NOT try to close just the current tab: there is no reliable, version- and
 * browser-independent way to do that through the Accessibility API (it would mean simulating
 * browser-specific UI gestures that break on every UI redesign). Suspending the whole browser is
 * the same mechanism ScheduleEnforcer already uses elsewhere in this app, and is far more
 * robust - the tradeoff (accepted when this was built) is that it blocks browsing entirely
 * rather than just the one flagged tab, until an admin runs unsuspend_app.
 *
 * Only sees text actually being typed/edited by the user (TYPE_VIEW_TEXT_CHANGED /
 * TYPE_VIEW_FOCUSED on an editable node) - never the loaded page's own content, so a webpage
 * that happens to mention a denied term does not trigger this.
 */
class BrowserGuardAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        if (packageName !in MonitoredBrowsers.PACKAGES) return
        if (UrlTermDenyList.TERMS.isEmpty()) return

        val typedText = extractTypedText(event) ?: return
        val normalized = typedText.lowercase()
        val matched = UrlTermDenyList.TERMS.any { term -> normalized.contains(term.lowercase()) }
        if (matched) {
            PolicyEnforcer.blockAppNow(applicationContext, packageName)
        }
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

    override fun onInterrupt() {}
}

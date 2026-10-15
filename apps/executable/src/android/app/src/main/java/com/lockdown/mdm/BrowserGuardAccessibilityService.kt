package com.lockdown.mdm

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Watches the browsers in [MonitoredBrowsers] and kills one (see [killBrowser] /
 * [PolicyEnforcer.killAppNow]) when its address/search bar holds:
 * - a blocked term (from the chatbot config; see [UrlTermDenyList]). This is NOT acted on
 *   per keystroke (that would kill the browser mid-word, before the user even searches, and
 *   trip on substrings of innocent words).
 *   Instead the term is remembered while the user types and the kill fires when they leave the
 *   address bar - i.e. submit the search, at which point input focus moves off the editable
 *   field as the results load. Reading the committed URL instead does not work: once a search
 *   loads, Chrome shows only the domain in the address bar, hiding the query.
 * - an address whose host is a raw public IP (see [IpUrlDetector]), typed or shown after a
 *   page loads (a clicked link or redirect). Those skip DNS, so Private DNS can't block them;
 *   there is nothing to wait for, so a raw IP is killed immediately.
 *
 * Typed text comes from any focused, editable field (the address/search bar, in practice -
 * accessibility_service_config.xml restricts which packages this service even receives events
 * from). The after-load check reads the address bar by view id ([MonitoredBrowsers.URL_BAR_IDS]),
 * throttled, since content-change events fire constantly while a page renders.
 *
 * Deliberately does NOT try to close just the current tab: there is no reliable, version- and
 * browser-independent way to do that through the Accessibility API (it would mean simulating
 * browser-specific UI gestures that break on every UI redesign). Instead the browser first goes
 * back (GLOBAL_ACTION_BACK) - so the tab it restores on reopen is the previous page, not the
 * flagged one - and then the whole browser is force-stopped: sent to the background
 * (GLOBAL_ACTION_HOME) and then killed. Unlike a schedule
 * block (ScheduleEnforcer), it is NOT suspended, so the user can reopen the browser right away -
 * the tradeoff is that this tears down the whole browser (all tabs), not just the flagged one,
 * and only aborts the current session rather than preventing a retry.
 *
 * Never reads the loaded page's own content, so a webpage that happens to mention a denied
 * term or an IP does not trigger this.
 */
class BrowserGuardAccessibilityService : AccessibilityService() {

    // Last address-bar read per browser, for the throttle.
    private val lastAddressBarCheck = mutableMapOf<String, Long>()

    // Per browser: whether the address bar currently holds a denied term (set while typing,
    // consumed on submit), the query text at the moment the term was seen (to tell a submit from
    // continued typing), and whether an editable field was focused at the last event (to detect
    // the submit, i.e. the transition from "editing the address bar" to "not").
    private val pendingTerm = mutableMapOf<String, Boolean>()
    private val pendingQuery = mutableMapOf<String, String>()
    private val inputFocused = mutableMapOf<String, Boolean>()

    // Browsers with a kill in flight, so events arriving during the back/home delays (the
    // address bar still shows the flagged IP or term) don't trigger it again.
    private val killing = mutableSetOf<String>()

    // Posts the delayed kill (see killBrowser) on the service's main thread.
    private val handler = Handler(Looper.getMainLooper())

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        if (packageName !in MonitoredBrowsers.PACKAGES) return

        val rawIp = blockRawIpEnabled()
        val isTyping = event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_VIEW_FOCUSED

        // Raw IPs are killed immediately, whether typed or reached through a link.
        val rawIpHit = if (isTyping) {
            rawIp && (extractTypedText(event)?.let(IpUrlDetector::isPublicIpUrl) ?: false)
        } else {
            rawIp && (addressBarText(packageName)?.let(IpUrlDetector::isPublicIpUrl) ?: false)
        }
        if (rawIpHit) {
            killBrowser(packageName)
            return
        }

        // Remember whether the address bar holds a denied term, but don't act yet - only when
        // the search is submitted (below). Updated solely from live edits to the editable field.
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            val source = event.source
            if (source?.isEditable == true && !source.text.isNullOrEmpty()) {
                val query = source.text.toString()
                if (isDeniedTerm(query)) {
                    pendingTerm[packageName] = true
                    pendingQuery[packageName] = query
                } else {
                    pendingTerm[packageName] = false
                }
            }
        }

        // Submit detection. A denied term was remembered while typing (above); fire the kill once
        // the user commits the search, and clear so re-entering the bar starts fresh. Two
        // independent signals, either is enough:
        //   - Input focus leaves the editable address bar. Works for browsers that release input
        //     focus on submit, but NOT Chrome: its omnibox is a persistently editable field that
        //     keeps accessibility input-focus after a search loads, so this transition never fires
        //     there (and killBrowser was never reached - the bug this guards against).
        //   - A window-state change (results page / next page loading, keyboard dismissed on
        //     submit) where the address bar no longer shows the query we flagged. Typing emits
        //     TYPE_VIEW_TEXT_CHANGED / content-changed, not state-changed, and while the user keeps
        //     editing the bar still holds the query - so this still does not kill mid-word. Once a
        //     search commits the bar shows the domain (e.g. google.com), hiding the query, so a
        //     changed/absent bar text at a state change means the search was submitted.
        val editableFocused = rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.isEditable == true
        val wasEditableFocused = inputFocused[packageName] ?: false
        inputFocused[packageName] = editableFocused

        if (pendingTerm[packageName] == true) {
            val submittedViaFocus = wasEditableFocused && !editableFocused
            val submittedViaWindow = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
                readAddressBar(packageName) != pendingQuery[packageName]
            if (submittedViaFocus || submittedViaWindow) {
                pendingTerm[packageName] = false
                pendingQuery.remove(packageName)
                killBrowser(packageName)
            }
        }
    }

    // Goes back one page (so the browser's saved tab state no longer points at the flagged page),
    // then sends the browser to the background (HOME) and force-stops it. Each step is delayed:
    // the browser needs time to navigate back and persist its tabs, killBackgroundProcesses is a
    // no-op on a process that is still foreground, and HOME needs a moment to background the app.
    private fun killBrowser(packageName: String) {
        if (!killing.add(packageName)) return
        performGlobalAction(GLOBAL_ACTION_BACK)
        handler.postDelayed({
            performGlobalAction(GLOBAL_ACTION_HOME)
            handler.postDelayed({
                PolicyEnforcer.killAppNow(applicationContext, packageName)
                killing.remove(packageName)
            }, KILL_DELAY_MS)
        }, BACK_DELAY_MS)
    }

    // Raw-IP blocking is on unless the chatbot config turned it off (also on for
    // configless builds).
    private fun blockRawIpEnabled(): Boolean = ProvisioningConfig.get(applicationContext)?.blockRawIp ?: true

    private fun isDeniedTerm(text: String): Boolean {
        val normalized = text.lowercase()
        return UrlTermDenyList.deniedTerms(applicationContext).any { term -> normalized.contains(term.lowercase()) }
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

    // The address bar's current text, at most every ADDRESS_BAR_CHECK_MS per browser (throttled
    // because content-change events fire constantly while a page renders).
    private fun addressBarText(packageName: String): String? {
        val now = SystemClock.elapsedRealtime()
        if (now - (lastAddressBarCheck[packageName] ?: 0L) < ADDRESS_BAR_CHECK_MS) return null
        lastAddressBarCheck[packageName] = now
        return readAddressBar(packageName)
    }

    // The address bar's current text by view id, unthrottled. Used by the submit check, which
    // runs only on the infrequent window-state change rather than per content-change event.
    private fun readAddressBar(packageName: String): String? {
        val ids = MonitoredBrowsers.URL_BAR_IDS[packageName] ?: return null
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
        // Gap between going back and sending the browser HOME, so it navigates back and saves
        // its tabs before being killed (otherwise it may restore the flagged page on reopen).
        const val BACK_DELAY_MS = 400L
        // Gap between sending the browser HOME and killing it, so it is backgrounded first.
        const val KILL_DELAY_MS = 300L
    }
}

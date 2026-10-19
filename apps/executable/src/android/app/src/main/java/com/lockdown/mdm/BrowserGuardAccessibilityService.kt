package com.lockdown.mdm

import android.accessibilityservice.AccessibilityService
import android.os.Build
import android.os.Bundle
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
 * browser-specific UI gestures that break on every UI redesign). Instead the flagged tab is
 * blanked: about:blank is typed into its address bar and submitted, so the tab the browser
 * restores on reopen is blank, not the flagged page (killing the process doesn't close tabs:
 * browsers restore them all). A browser whose address bar can't be found or submitted goes back
 * (GLOBAL_ACTION_BACK) instead. Then the browser is sent to the background (GLOBAL_ACTION_HOME)
 * and killed. Unlike a schedule block (ScheduleEnforcer), it is NOT suspended, so the user can
 * reopen the browser right away - the tradeoff is that this only aborts the current session
 * rather than preventing a retry.
 *
 * Never reads the loaded page's own content, so a webpage that happens to mention a denied
 * term or an IP does not trigger this.
 */
class BrowserGuardAccessibilityService : AccessibilityService() {

    // Last address-bar read per browser, for the throttle.
    private val lastAddressBarCheck = mutableMapOf<String, Long>()

    // Per browser: whether a typed field (the address bar, or a search box in the page) holds a
    // denied term (set while typing, consumed on submit), the address bar's text at the moment
    // the term was seen (to tell a submit, which changes it, from continued typing), and whether
    // an editable field was focused at the last event (to detect the submit, i.e. the transition
    // from "editing the address bar" to "not").
    private val pendingTerm = mutableMapOf<String, Boolean>()
    private val pendingBar = mutableMapOf<String, String>()
    private val inputFocused = mutableMapOf<String, Boolean>()

    // Browsers with a kill in flight, so events arriving during the back/home delays (the
    // address bar still shows the flagged IP or term) don't trigger it again.
    private val killing = mutableSetOf<String>()

    // Posts the delayed kill (see killBrowser) on the service's main thread.
    private val handler = Handler(Looper.getMainLooper())

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        if (packageName !in MonitoredBrowsers.PACKAGES) return
        // TEMP debug: trace what the browser emits around a search submit.
        run {
            val s = event.source
            val f = rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            android.util.Log.d("BrowserGuardDbg", "${AccessibilityEvent.eventTypeToString(event.eventType)} " +
                "src=${s?.viewIdResourceName} editable=${s?.isEditable} focused=${s?.isFocused} text=${s?.text} " +
                "evText=${event.text} before=${event.beforeText} from=${event.fromIndex} rm=${event.removedCount} add=${event.addedCount} " +
                "inputFocus=${f?.viewIdResourceName}/${f?.isEditable} bar=${readAddressBar(packageName)} pending=${pendingTerm[packageName]}")
        }

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
                    readAddressBar(packageName)?.let { pendingBar[packageName] = it } ?: pendingBar.remove(packageName)
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
        //   - The address bar no longer shows what it did when the term was seen: the search
        //     loaded. Typed in the address bar, it held the query, and a committed search shows the
        //     results' address instead (e.g. google.com/search?q=..., or just the domain). Typed in
        //     a search box in the page (google.com's own), it held the page's address, which the
        //     results page changes - and that box never takes input focus nor changes the window,
        //     so this is its only signal. While the user keeps typing, the bar holds the same text
        //     (each keystroke in the address bar records it again, above), so this does not kill
        //     mid-word. Checked on content changes too: a search in the page loads in place.
        val editableFocused = rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.isEditable == true
        val wasEditableFocused = inputFocused[packageName] ?: false
        inputFocused[packageName] = editableFocused

        if (pendingTerm[packageName] == true) {
            val submittedViaFocus = wasEditableFocused && !editableFocused
            val isWindowChange = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
                event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            val flaggedBar = pendingBar[packageName]
            val submittedViaAddressBar = isWindowChange && flaggedBar != null &&
                readAddressBar(packageName)?.let { it != flaggedBar } == true
            if (submittedViaFocus || submittedViaAddressBar) {
                pendingTerm[packageName] = false
                pendingBar.remove(packageName)
                killBrowser(packageName)
            }
        }
    }

    // Blanks the flagged tab (see blankTab), then sends the browser to the background (HOME) and
    // force-stops it. Each step is delayed: the browser needs time to load the blank page and
    // persist its tabs, killBackgroundProcesses is a no-op on a process that is still foreground,
    // and HOME needs a moment to background the app.
    private fun killBrowser(packageName: String) {
        if (!killing.add(packageName)) return
        blankTab(packageName) { blanked ->
            // Not blanked: at least go back, so the restored tab is the previous page.
            if (!blanked) performGlobalAction(GLOBAL_ACTION_BACK)
            handler.postDelayed({
                performGlobalAction(GLOBAL_ACTION_HOME)
                handler.postDelayed({
                    PolicyEnforcer.killAppNow(applicationContext, packageName)
                    killing.remove(packageName)
                }, KILL_DELAY_MS)
            }, if (blanked) BLANK_LOAD_DELAY_MS else BACK_DELAY_MS)
        }
    }

    // Opens about:blank in the current tab, replacing the flagged page: focuses the address bar,
    // types it and submits it - with the IME's enter on Android 11+, else by clicking the
    // browser's own "about:blank" suggestion under the bar (there is no enter action before
    // API 30). Calls `done` with whether it was submitted.
    private fun blankTab(packageName: String, done: (Boolean) -> Unit) {
        val bar = findAddressBar(packageName) ?: return done(false)
        bar.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        handler.postDelayed({
            // Focusing may swap the bar for an editing view (Chrome's omnibox): read it again.
            val field = rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.takeIf { it.isEditable }
                ?: findAddressBar(packageName)
            val args = Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, BLANK_PAGE)
            }
            if (field == null || !field.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return@postDelayed done(false)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                done(field.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id))
                return@postDelayed
            }
            // The suggestions show up after the text changes.
            handler.postDelayed({ done(clickBlankSuggestion()) }, SUGGESTIONS_DELAY_MS)
        }, FOCUS_DELAY_MS)
    }

    // Clicks a suggestion reading about:blank: the first clickable node (or ancestor) of a
    // non-editable node with that text, i.e. not the address bar itself.
    private fun clickBlankSuggestion(): Boolean {
        val root = rootInActiveWindow ?: return false
        for (node in root.findAccessibilityNodeInfosByText(BLANK_PAGE)) {
            if (node.isEditable) continue
            var target: AccessibilityNodeInfo? = node
            while (target != null && !target.isClickable) target = target.parent
            if (target?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true) return true
        }
        return false
    }

    // The address bar's node, by view id.
    private fun findAddressBar(packageName: String): AccessibilityNodeInfo? {
        val ids = MonitoredBrowsers.URL_BAR_IDS[packageName] ?: return null
        val root = rootInActiveWindow ?: return null
        return ids.firstNotNullOfOrNull { id -> root.findAccessibilityNodeInfosByViewId("$packageName:id/$id").firstOrNull() }
    }

    // Raw-IP blocking is on unless the chatbot config turned it off (also on for
    // configless builds).
    private fun blockRawIpEnabled(): Boolean = ProvisioningConfig.get(applicationContext)?.blockRawIp ?: true

    private fun isDeniedTerm(text: String): Boolean = UrlTermDenyList.matches(applicationContext, text)

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
        const val BLANK_PAGE = "about:blank"
        // Gap between clicking the address bar and typing, so it is focused for editing.
        const val FOCUS_DELAY_MS = 300L
        // Gap between typing about:blank and clicking its suggestion, so the list shows it.
        const val SUGGESTIONS_DELAY_MS = 500L
        // Gap between submitting about:blank and sending the browser HOME, so it loads the blank
        // page and saves its tabs before being killed (otherwise it restores the flagged page).
        const val BLANK_LOAD_DELAY_MS = 800L
        // Same, after going back instead.
        const val BACK_DELAY_MS = 400L
        // Gap between sending the browser HOME and killing it, so it is backgrounded first.
        const val KILL_DELAY_MS = 300L
    }
}

package com.lockdown.mdm

import android.content.Context
import android.os.Build
import android.util.Log
import java.security.MessageDigest

/**
 * Shared dispatch logic for every admin command, regardless of transport (broadcast intent or
 * file-dropped command - see AdbControlReceiver and ControlChannelService). Every command is
 * rejected unless the sha-256 of [password] matches [Constants.CONTROL_PASSWORD_SHA256].
 *
 * Commands:
 *   status          - dump current policy state
 *   unlock_dns      - remove the private-DNS lock so the user/adb can change it
 *   lock_dns        - re-apply the DNS lock (arg = optional new hostname, defaults to the
 *                     configured one)
 *   unlock_installs - lift the install/update lock: allow sideloading (incl. `adb install`/
 *                     `adb install -r`, which bypass the unknown-sources consent flow
 *                     entirely) and let any app stay installed. Required before *any* APK can
 *                     be installed or updated on the device, including this app's own APK -
 *                     see PolicyEnforcer.applyInstallPolicy for why that also means Play
 *                     Store's own background updates for allowlisted apps pause while locked
 *   lock_installs   - go back to allowlist-only enforcement and block all installs/updates
 *                     again (the default state)
 *   add_app         - arg = package name to add to the allowlist
 *   remove_app      - arg = package name to remove from the allowlist (also uninstalls it
 *                     immediately if present)
 *   list_apps       - dump the current allowlist
 *   list_installed  - dump every non-system app PolicyEnforcer's own PackageManager query
 *                     currently sees installed (diagnostic: compare against list_apps and
 *                     against `adb shell pm list packages` to catch package-visibility gaps)
 *   unsuspend_app   - arg = package name; clears a suspension regardless of its cause -
 *                     both a schedule window and BrowserGuardAccessibilityService (see
 *                     UrlTermDenyList) use plain suspension, so this releases either
 *   set_schedule    - arg = "<package>:<HH:MM>-<HH:MM>[@<days>]", e.g. "com.taxis99:15:00-18:00"
 *                     or "com.google.android.youtube:00:00-00:00@weekend" - the app is usable
 *                     only inside that window (suspended outside it, via
 *                     DevicePolicyManager.setPackagesSuspended - no uninstall, no data loss,
 *                     reversible instantly). Supports overnight windows (22:00-02:00); an equal
 *                     start/end (00:00-00:00) means all day. The optional "@<days>" suffix
 *                     restricts which days the window applies on at all (any other day the app
 *                     stays suspended regardless of time): "weekend", "weekday"/"weekdays",
 *                     "all"/"daily", or a comma list of 3-letter abbreviations (sun,mon,tue,wed,
 *                     thu,fri,sat). Omitting it applies every day, as before.
 *   clear_schedule  - arg = package name; removes its schedule and unsuspends it
 *   list_schedules  - dump configured schedules
 */
object CommandProcessor {

    fun process(context: Context, password: String?, cmd: String?, arg: String?): String {
        if (!isPasswordValid(password)) {
            Log.w(Constants.LOG_TAG, "Rejected admin command: bad password")
            return "ERROR: invalid password"
        }

        if (!PolicyEnforcer.isDeviceOwner(context) && cmd != "status") {
            return "ERROR: app is not device owner, policy changes have no effect"
        }

        val result = when (cmd) {
            "status" -> statusReport(context)
            "unlock_dns" -> {
                PolicyEnforcer.unlockDns(context)
                if (PolicyEnforcer.isDnsLockSupported()) "OK: private DNS unlocked"
                else "OK: VPN-based DNS fallback disabled (native lock unsupported on API ${Build.VERSION.SDK_INT})"
            }
            "lock_dns" -> {
                val host = arg?.takeIf { it.isNotBlank() } ?: AllowlistStore.dnsHost(context)
                PolicyEnforcer.lockDns(context, host)
                if (PolicyEnforcer.isDnsLockSupported()) "OK: private DNS locked to $host"
                else "OK: native lock unsupported on API ${Build.VERSION.SDK_INT}, " +
                    "enforcing $host via locked always-on VPN fallback instead"
            }
            "unlock_installs" -> { PolicyEnforcer.unlockInstalls(context); "OK: install restrictions lifted" }
            "lock_installs" -> {
                PolicyEnforcer.lockInstalls(context)
                PolicyEnforcer.sweepDisallowedApps(context)
                "OK: install allowlist enforced"
            }
            "add_app" -> {
                if (arg.isNullOrBlank()) "ERROR: missing arg=<package name>"
                else {
                    AllowlistStore.addPackage(context, arg)
                    PolicyEnforcer.updateUninstallProtection(context)
                    "OK: $arg added to allowlist"
                }
            }
            "remove_app" -> {
                if (arg.isNullOrBlank()) "ERROR: missing arg=<package name>"
                else {
                    AllowlistStore.removePackage(context, arg)
                    PolicyEnforcer.updateUninstallProtection(context)
                    PolicyEnforcer.enforceSinglePackage(context, arg)
                    "OK: $arg removed from allowlist"
                }
            }
            "list_apps" -> AllowlistStore.allowedPackages(context).sorted().joinToString("\n")
            "list_installed" -> PolicyEnforcer.installedNonSystemPackages(context).sorted().joinToString("\n")
            "unsuspend_app" -> {
                if (arg.isNullOrBlank()) "ERROR: missing arg=<package name>"
                else {
                    try {
                        val manager = context.getSystemService(Context.DEVICE_POLICY_SERVICE)
                            as android.app.admin.DevicePolicyManager
                        manager.setPackagesSuspended(
                            android.content.ComponentName(context, AdminReceiver::class.java),
                            arrayOf(arg),
                            false
                        )
                        "OK: $arg unsuspended"
                    } catch (e: Exception) {
                        "ERROR: unsuspend failed: ${e.message}"
                    }
                }
            }
            "set_schedule" -> {
                val sep = arg?.indexOf(':') ?: -1
                if (arg.isNullOrBlank() || sep <= 0) {
                    "ERROR: expected arg=<package>:<HH:MM>-<HH:MM>[@<days>], " +
                        "e.g. com.taxis99:15:00-18:00 or com.google.android.youtube:00:00-00:00@weekend"
                } else {
                    val pkg = arg.substring(0, sep)
                    val rest = arg.substring(sep + 1)
                    val atIdx = rest.indexOf('@')
                    val range = if (atIdx >= 0) rest.substring(0, atIdx) else rest
                    val daysText = if (atIdx >= 0) rest.substring(atIdx + 1) else null
                    val window = ScheduleStore.parseWindowRange(range)
                    val days = daysText?.let { ScheduleStore.parseDays(it) }
                    if (window == null) {
                        "ERROR: bad time range '$range', expected HH:MM-HH:MM"
                    } else if (daysText != null && days == null) {
                        "ERROR: bad days spec '$daysText', expected weekend/weekday/all or " +
                            "comma list of sun,mon,tue,wed,thu,fri,sat"
                    } else {
                        val finalWindow = window.copy(days = days ?: ScheduleStore.ALL_DAYS)
                        ScheduleStore.setSchedule(context, pkg, finalWindow)
                        ScheduleEnforcer.enforce(context)
                        "OK: $pkg scheduled $finalWindow"
                    }
                }
            }
            "clear_schedule" -> {
                if (arg.isNullOrBlank()) "ERROR: missing arg=<package name>"
                else {
                    ScheduleStore.clearSchedule(context, arg)
                    try {
                        val manager = context.getSystemService(Context.DEVICE_POLICY_SERVICE)
                            as android.app.admin.DevicePolicyManager
                        manager.setPackagesSuspended(
                            android.content.ComponentName(context, AdminReceiver::class.java),
                            arrayOf(arg),
                            false
                        )
                    } catch (e: Exception) {
                        Log.w(Constants.LOG_TAG, "unsuspend on clear_schedule failed: ${e.message}")
                    }
                    "OK: $arg schedule cleared and unsuspended"
                }
            }
            "list_schedules" -> {
                val schedules = ScheduleStore.allSchedules(context)
                if (schedules.isEmpty()) "(no schedules configured)"
                else schedules.entries.sortedBy { it.key }.joinToString("\n") { (pkg, window) -> "$pkg: $window" }
            }
            else -> "ERROR: unknown cmd '$cmd'"
        }

        Log.i(Constants.LOG_TAG, "cmd=$cmd arg=$arg -> $result")
        return result
    }

    private fun statusReport(context: Context): String = buildString {
        appendLine("deviceOwner=${PolicyEnforcer.isDeviceOwner(context)}")
        appendLine("androidApi=${Build.VERSION.SDK_INT}")
        appendLine("dnsLockSupportedOnThisDevice=${PolicyEnforcer.isDnsLockSupported()}")
        appendLine("dnsLocked=${AllowlistStore.isDnsLocked(context)}")
        appendLine("dnsHost=${AllowlistStore.dnsHost(context)}")
        appendLine("installsLocked=${AllowlistStore.isInstallsLocked(context)}")
        appendLine("allowedApps=${AllowlistStore.allowedPackages(context).sorted().joinToString(",")}")
        val schedules = ScheduleStore.allSchedules(context)
        append(
            "schedules=" + if (schedules.isEmpty()) "(none)"
            else schedules.entries.sortedBy { it.key }.joinToString(",") { (pkg, w) -> "$pkg=$w" }
        )
    }

    private fun isPasswordValid(password: String?): Boolean {
        if (password == null) return false
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(password.toByteArray(Charsets.UTF_8))
        val hex = digest.joinToString("") { "%02x".format(it) }
        return hex.equals(Constants.CONTROL_PASSWORD_SHA256, ignoreCase = true)
    }
}

package com.lockdown.mdm

import android.app.ActivityManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.UserManager
import android.provider.Settings
import android.util.Log

/**
 * All privileged, device-owner-only policy changes live here. Everything this object does
 * requires the app to already be the active Device Owner (set once via
 * `adb shell dpm set-device-owner com.lockdown.mdm/.AdminReceiver` on a device with no
 * accounts configured yet).
 */
object PolicyEnforcer {

    private fun adminComponent(context: Context) =
        ComponentName(context, AdminReceiver::class.java)

    private fun dpm(context: Context): DevicePolicyManager =
        context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

    fun isDeviceOwner(context: Context): Boolean =
        dpm(context).isDeviceOwnerApp(context.packageName)

    /**
     * Device-owner control of Private DNS (setGlobalPrivateDnsModeSpecifiedHost) does not
     * exist at all before Android 10 (API 29) - the method is simply absent from the
     * framework, so calling it throws NoSuchMethodError. DISALLOW_CONFIG_PRIVATE_DNS (the
     * restriction that greys out the field in Settings) additionally requires Android 11
     * (API 30) to be enforced, but the DNS host itself can be set from API 29 onward.
     */
    fun isDnsLockSupported(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

    /** Runs once, right after the app becomes device owner. */
    fun activateLockdown(context: Context) {
        if (!isDeviceOwner(context)) return
        applyOrganizationName(context)
        applyDnsPolicy(context, AllowlistStore.isDnsLocked(context))
        applyInstallPolicy(context, AllowlistStore.isInstallsLocked(context))
        sweepDisallowedApps(context)
        enableBrowserGuard(context)
        startControlChannel(context)
    }

    /** Runs on every boot to make sure policy survived and to catch anything installed offline. */
    fun reapplyPolicy(context: Context) {
        if (!isDeviceOwner(context)) return
        applyOrganizationName(context)
        applyDnsPolicy(context, AllowlistStore.isDnsLocked(context))
        applyInstallPolicy(context, AllowlistStore.isInstallsLocked(context))
        sweepDisallowedApps(context)
        ScheduleEnforcer.enforce(context)
        enableBrowserGuard(context)
        startControlChannel(context)
    }

    /**
     * Names the managing organization after the app and the configuration version typed in
     * the chatbot (see ProvisioningConfig), e.g. "Lockdown MDM 1.2.0". Android shows it in
     * Settings (Security / "This device is managed by ..." in the device admin info), so the
     * installed configuration can be checked without opening the app.
     */
    fun applyOrganizationName(context: Context) {
        val appName = context.getString(R.string.app_name)
        val version = ProvisioningConfig.get(context)?.appVersion
        try {
            dpm(context).setOrganizationName(
                adminComponent(context),
                if (version != null) "$appName $version" else appName,
            )
        } catch (e: SecurityException) {
            Log.w(Constants.LOG_TAG, "Could not set the organization name", e)
        }
    }

    /**
     * Silently turns on BrowserGuardAccessibilityService (see UrlTermDenyList) without the
     * normal user-facing Settings > Accessibility consent flow. A device owner can NOT do this
     * through setSecureSetting - it is refused with "Device owners cannot update
     * enabled_accessibility_services" (confirmed on a real device) - so the app writes the
     * setting itself, using WRITE_SECURE_SETTINGS granted over adb by the installer
     * (`pm grant com.lockdown.mdm android.permission.WRITE_SECURE_SETTINGS`). Called by the
     * watchdog too, so the guard is switched back on if it's turned off in Settings.
     * setPermittedAccessibilityServices keeps any other accessibility service from being enabled.
     */
    fun enableBrowserGuard(context: Context) {
        if (!isDeviceOwner(context)) return
        val component = ComponentName(context, BrowserGuardAccessibilityService::class.java)
        val flatComponent = component.flattenToString()
        try {
            dpm(context).setPermittedAccessibilityServices(adminComponent(context), listOf(context.packageName))
            if (context.checkSelfPermission(android.Manifest.permission.WRITE_SECURE_SETTINGS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                Log.w(Constants.LOG_TAG, "enableBrowserGuard: WRITE_SECURE_SETTINGS not granted (run the installer)")
                return
            }
            val resolver = context.contentResolver
            val enabledServices = Settings.Secure.getString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
            if (!enabledServices.split(':').contains(flatComponent)) {
                val updated = if (enabledServices.isBlank()) flatComponent else "$enabledServices:$flatComponent"
                Settings.Secure.putString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, updated)
            }
            if (Settings.Secure.getInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0) != 1) {
                Settings.Secure.putInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 1)
            }
        } catch (e: Exception) {
            Log.w(Constants.LOG_TAG, "enableBrowserGuard failed: ${e.message}")
        }
    }

    /**
     * Immediately kills [packageName] - used by BrowserGuardAccessibilityService the moment a
     * denied term is typed into a browser. Unlike the schedule system (see ScheduleEnforcer),
     * this does NOT suspend the app: it force-stops it so the current search/page is torn down,
     * but the app is left launchable so the user can reopen it normally (no admin unsuspend
     * needed). killBackgroundProcesses only kills a process that is already in the background, so
     * the caller must send the app there first (GLOBAL_ACTION_HOME) before calling this.
     * Needs KILL_BACKGROUND_PROCESSES (a normal, install-time permission).
     */
    fun killAppNow(context: Context, packageName: String) {
        try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            am.killBackgroundProcesses(packageName)
            Log.i(Constants.LOG_TAG, "Killed $packageName: denied term detected in address bar")
        } catch (e: Exception) {
            Log.w(Constants.LOG_TAG, "killAppNow($packageName) failed: ${e.message}")
        }
    }

    /** Starts the file-drop admin control channel (see ControlChannelService). */
    fun startControlChannel(context: Context) {
        try {
            context.startForegroundService(Intent(context, ControlChannelService::class.java))
        } catch (e: Exception) {
            Log.e(Constants.LOG_TAG, "Failed to start ControlChannelService: ${e.message}")
        }
    }

    // ---------------------------------------------------------------------
    // Private DNS
    // ---------------------------------------------------------------------

    fun lockDns(context: Context, host: String) {
        AllowlistStore.setDnsHost(context, host)
        AllowlistStore.setDnsLocked(context, true)
        applyDnsPolicy(context, true)
    }

    fun unlockDns(context: Context) {
        AllowlistStore.setDnsLocked(context, false)
        applyDnsPolicy(context, false)
    }

    private fun applyDnsPolicy(context: Context, locked: Boolean) {
        if (!isDeviceOwner(context)) return
        val manager = dpm(context)
        val admin = adminComponent(context)

        // Blocks configuring VPN from Settings entirely when set by a device owner - including,
        // per the platform docs, "configuring always-on VPN in the Settings app". This is what
        // actually removes the "Forget VPN" option for our own always-on VPN fallback
        // (setAlwaysOnVpnPackage's lockdownEnabled flag alone did not hide it on a real test
        // device). It also closes the more obvious bypass: without it, a user could just
        // install and configure a different VPN app to route around our DNS filtering entirely,
        // regardless of whether our own VPN can be removed.
        if (locked) {
            manager.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN)
        } else {
            manager.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN)
        }

        if (!isDnsLockSupported()) {
            Log.i(
                Constants.LOG_TAG,
                "Native Private DNS control needs Android 10+ (API 29); this device is API " +
                    "${Build.VERSION.SDK_INT}, using the VPN-based DNS fallback instead"
            )
            applyVpnDnsFallback(context, locked)
            return
        }
        if (locked) {
            val host = AllowlistStore.dnsHost(context)
            val result = manager.setGlobalPrivateDnsModeSpecifiedHost(admin, host)
            Log.i(Constants.LOG_TAG, "setGlobalPrivateDnsModeSpecifiedHost($host) result=$result")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                manager.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_PRIVATE_DNS)
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                manager.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_PRIVATE_DNS)
            }
        }
    }

    /**
     * Fallback used on API < 29: routes DNS through [LocalVpnService] and locks it in place
     * with DevicePolicyManager.setAlwaysOnVpnPackage(lockdownEnabled = true), which a device
     * owner can set without any user consent dialog and which the user cannot turn off from
     * Settings.
     */
    private fun applyVpnDnsFallback(context: Context, locked: Boolean) {
        val manager = dpm(context)
        val admin = adminComponent(context)
        if (locked) {
            try {
                manager.setAlwaysOnVpnPackage(admin, context.packageName, true)
            } catch (e: Exception) {
                Log.e(Constants.LOG_TAG, "setAlwaysOnVpnPackage failed: ${e.message}")
            }
            context.startService(Intent(context, LocalVpnService::class.java))
        } else {
            try {
                manager.setAlwaysOnVpnPackage(admin, null, false)
            } catch (e: Exception) {
                Log.e(Constants.LOG_TAG, "clearing always-on VPN failed: ${e.message}")
            }
            context.stopService(Intent(context, LocalVpnService::class.java))
        }
    }

    // ---------------------------------------------------------------------
    // Install / uninstall lockdown
    // ---------------------------------------------------------------------

    fun lockInstalls(context: Context) {
        AllowlistStore.setInstallsLocked(context, true)
        applyInstallPolicy(context, true)
    }

    fun unlockInstalls(context: Context) {
        AllowlistStore.setInstallsLocked(context, false)
        applyInstallPolicy(context, false)
    }

    private fun applyInstallPolicy(context: Context, locked: Boolean) {
        if (!isDeviceOwner(context)) return
        val manager = dpm(context)
        val admin = adminComponent(context)

        val unknownSourcesRestriction =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
                UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES_GLOBALLY
            else
                UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES

        if (locked) {
            // Force all installs through the Play Store; the allowlist sweep then decides
            // which of those installs are actually allowed to remain.
            manager.addUserRestriction(admin, unknownSourcesRestriction)
        } else {
            manager.clearUserRestriction(admin, unknownSourcesRestriction)
        }
        // DISALLOW_INSTALL_APPS is NOT used: it blocks every install and update from every
        // source (Play Store included - Android has no per-package or per-source variant), so
        // allowlisted apps could never be installed while locked. `adb install`/`adb install -r`
        // ignore the unknown-sources restriction above, but anything they install that isn't
        // allowlisted is removed by the sweep, and replacing this app's own APK needs the
        // release signing key (a differently signed update is refused with
        // INSTALL_FAILED_UPDATE_INCOMPATIBLE, and a device owner can't be uninstalled first).
        // Explicitly cleared because older builds set it while locked.
        manager.clearUserRestriction(admin, UserManager.DISALLOW_INSTALL_APPS)
        // Explicitly cleared (not just "no longer set") so an install that already applied it
        // via an older build - which blocked this app's own silent uninstalls of disallowed
        // apps, see updateUninstallProtection - gets fixed automatically, not just future ones.
        manager.clearUserRestriction(admin, UserManager.DISALLOW_UNINSTALL_APPS)
        updateUninstallProtection(context)
    }

    /**
     * Blocks the user from manually uninstalling *allowed* apps, using per-package
     * setUninstallBlocked - NOT the broad DISALLOW_UNINSTALL_APPS user restriction, which was
     * found, on a real device, to also block this app's own silent PackageInstaller.uninstall()
     * calls for *disallowed* apps: every silent-removal attempt failed with
     * DELETE_FAILED_USER_RESTRICTED, defeating the actual allowlist enforcement (a
     * newly-installed disallowed app was detected and repeatedly targeted for removal but never
     * actually removed). setUninstallBlocked is scoped per-package and doesn't have this
     * problem. Called whenever the allowlist or the install-lock state changes.
     */
    fun updateUninstallProtection(context: Context) {
        if (!isDeviceOwner(context)) return
        val manager = dpm(context)
        val admin = adminComponent(context)
        val locked = AllowlistStore.isInstallsLocked(context)
        for (app in context.packageManager.getInstalledApplications(0)) {
            if (app.packageName == context.packageName) continue
            val shouldBlock = locked && AllowlistStore.isAllowed(context, app.packageName)
            try {
                manager.setUninstallBlocked(admin, app.packageName, shouldBlock)
            } catch (e: Exception) {
                Log.w(Constants.LOG_TAG, "setUninstallBlocked(${app.packageName}) failed: ${e.message}")
            }
        }
    }

    // ---------------------------------------------------------------------
    // Allowlist enforcement
    // ---------------------------------------------------------------------

    /** Removes every currently-installed, non-system app that is not on the allowlist. */
    fun sweepDisallowedApps(context: Context) {
        for (packageName in installedNonSystemPackages(context)) {
            if (!AllowlistStore.isAllowed(context, packageName)) {
                uninstallPackage(context, packageName)
            }
        }
    }

    /** Diagnostic: every non-system package this app's own PackageManager query currently sees. */
    fun installedNonSystemPackages(context: Context): List<String> {
        val pm = context.packageManager
        val installed = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        return installed
            .filter { !isSystemApp(it) && it.packageName != context.packageName }
            .map { it.packageName }
    }

    fun enforceSinglePackage(context: Context, packageName: String) {
        if (packageName == context.packageName) return
        if (AllowlistStore.isAllowed(context, packageName)) return
        val pm = context.packageManager
        val info = try {
            pm.getApplicationInfo(packageName, 0)
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }
        if (info != null && isSystemApp(info)) return
        uninstallPackage(context, packageName)
    }

    private fun isSystemApp(info: ApplicationInfo): Boolean =
        (info.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0

    fun uninstallPackage(context: Context, packageName: String) {
        if (!isDeviceOwner(context)) {
            Log.w(Constants.LOG_TAG, "Not device owner, cannot silently uninstall $packageName")
            return
        }
        Log.i(Constants.LOG_TAG, "Removing disallowed package $packageName")
        val statusIntent = Intent(context, UninstallStatusReceiver::class.java).apply {
            action = UninstallStatusReceiver.ACTION
            putExtra(UninstallStatusReceiver.EXTRA_PACKAGE, packageName)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            packageName.hashCode(),
            statusIntent,
            flags
        )
        try {
            context.packageManager.packageInstaller.uninstall(packageName, pendingIntent.intentSender)
        } catch (e: Exception) {
            Log.e(Constants.LOG_TAG, "Failed to uninstall $packageName: ${e.message}")
        }
    }
}

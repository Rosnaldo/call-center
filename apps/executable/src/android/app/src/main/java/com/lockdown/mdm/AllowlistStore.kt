package com.lockdown.mdm

import android.content.Context

/**
 * Persists the mutable policy state (allowed packages, DNS-lock flag, install-lock flag)
 * across reboots. Only [AdbControlReceiver] is allowed to mutate this after first boot.
 */
object AllowlistStore {
    private const val PREFS = "lockdown_policy"
    private const val KEY_ALLOWED = "allowed_packages"
    private const val KEY_DNS_LOCKED = "dns_locked"
    private const val KEY_DNS_HOST = "dns_host"
    private const val KEY_INSTALLS_LOCKED = "installs_locked"
    private const val PLAY_STORE = "com.android.vending"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // The chatbot's choices embedded in the APK (see ProvisioningConfig), else Constants.
    // The Play Store is always allowed so it keeps working.
    private fun defaultAllowedPackages(context: Context): Set<String> =
        ProvisioningConfig.get(context)?.allowedApps?.plus(PLAY_STORE)
            ?: Constants.DEFAULT_ALLOWED_PACKAGES

    fun allowedPackages(context: Context): Set<String> {
        val p = prefs(context)
        val defaults = defaultAllowedPackages(context)
        if (!p.contains(KEY_ALLOWED)) {
            p.edit().putStringSet(KEY_ALLOWED, defaults).apply()
            return defaults
        }
        return p.getStringSet(KEY_ALLOWED, defaults) ?: defaults
    }

    fun isAllowed(context: Context, packageName: String): Boolean =
        packageName == context.packageName || allowedPackages(context).contains(packageName)

    fun addPackage(context: Context, packageName: String) {
        val updated = allowedPackages(context).toMutableSet().apply { add(packageName) }
        prefs(context).edit().putStringSet(KEY_ALLOWED, updated).apply()
    }

    fun removePackage(context: Context, packageName: String) {
        val updated = allowedPackages(context).toMutableSet().apply { remove(packageName) }
        prefs(context).edit().putStringSet(KEY_ALLOWED, updated).apply()
    }

    // Locked by default, unless the provisioning config says the device has no private DNS.
    fun isDnsLocked(context: Context): Boolean {
        val config = ProvisioningConfig.get(context)
        return prefs(context).getBoolean(KEY_DNS_LOCKED, config == null || config.privateDnsHost != null)
    }

    fun setDnsLocked(context: Context, locked: Boolean) {
        prefs(context).edit().putBoolean(KEY_DNS_LOCKED, locked).apply()
    }

    fun dnsHost(context: Context): String {
        val default = ProvisioningConfig.get(context)?.privateDnsHost ?: Constants.LOCKED_PRIVATE_DNS_HOST
        return prefs(context).getString(KEY_DNS_HOST, default) ?: default
    }

    fun setDnsHost(context: Context, host: String) {
        prefs(context).edit().putString(KEY_DNS_HOST, host).apply()
    }

    fun isInstallsLocked(context: Context): Boolean =
        prefs(context).getBoolean(KEY_INSTALLS_LOCKED, true)

    fun setInstallsLocked(context: Context, locked: Boolean) {
        prefs(context).edit().putBoolean(KEY_INSTALLS_LOCKED, locked).apply()
    }
}

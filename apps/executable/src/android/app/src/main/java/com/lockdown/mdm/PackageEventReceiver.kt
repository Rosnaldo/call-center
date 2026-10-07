package com.lockdown.mdm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class PackageEventReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_PACKAGE_ADDED) return
        // Ignore app updates (re-install of an already-present app), only react to new installs.
        if (intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return
        val packageName = intent.data?.schemeSpecificPart ?: return
        PolicyEnforcer.enforceSinglePackage(context, packageName)
    }
}

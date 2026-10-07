package com.lockdown.mdm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log

class UninstallStatusReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION = "com.lockdown.mdm.UNINSTALL_STATUS"
        const val EXTRA_PACKAGE = "package_name"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, Int.MIN_VALUE)
        val pkg = intent.getStringExtra(EXTRA_PACKAGE)
        val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        if (status == PackageInstaller.STATUS_SUCCESS) {
            Log.i(Constants.LOG_TAG, "Uninstalled disallowed package $pkg")
        } else {
            Log.w(Constants.LOG_TAG, "Uninstall of $pkg returned status=$status message=$message")
        }
    }
}

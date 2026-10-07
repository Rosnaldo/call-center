package com.lockdown.mdm

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import kotlin.concurrent.thread

class AdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(Constants.LOG_TAG, "Device admin enabled, applying lockdown policy")
        // setGlobalPrivateDnsModeSpecifiedHost performs a network operation internally, so it
        // cannot run on the main thread (NetworkOnMainThreadException) - goAsync() keeps the
        // process alive past onReceive() returning while that work finishes on another thread.
        val pendingResult = goAsync()
        thread(name = "AdminReceiverPolicyApply") {
            try {
                PolicyEnforcer.activateLockdown(context)
            } finally {
                pendingResult.finish()
            }
        }
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(Constants.LOG_TAG, "Device admin disabled, lockdown policy no longer enforced")
    }
}

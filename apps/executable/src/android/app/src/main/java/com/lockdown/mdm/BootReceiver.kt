package com.lockdown.mdm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlin.concurrent.thread

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return
        // setGlobalPrivateDnsModeSpecifiedHost performs a network operation internally, so it
        // cannot run on the main thread (NetworkOnMainThreadException) - goAsync() keeps the
        // process alive past onReceive() returning while that work finishes on another thread.
        val pendingResult = goAsync()
        thread(name = "BootReceiverPolicyApply") {
            try {
                PolicyEnforcer.reapplyPolicy(context)
            } finally {
                pendingResult.finish()
            }
        }
    }
}

package com.lockdown.mdm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Secondary control channel, driven via an adb broadcast:
 *
 *   adb shell am broadcast -a com.lockdown.mdm.ADMIN_ACTION \
 *       -n com.lockdown.mdm/.AdbControlReceiver \
 *       --es password <password> --es cmd <command> [--es arg <value>]
 *
 * NOTE: once this app is Device Owner, some Android builds block shell from directly
 * invoking components inside a device-owner-protected package (hardening meant to stop adb
 * from bypassing an MDM's own restrictions). When that happens this receiver silently never
 * gets invoked - use [ControlChannelService]'s file-drop channel instead, which every device
 * this app has been tested on can still reach. See CommandProcessor for the actual commands.
 */
class AdbControlReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Constants.ADB_ACTION) return

        val password = intent.getStringExtra(Constants.EXTRA_PASSWORD)
        val cmd = intent.getStringExtra(Constants.EXTRA_CMD)
        val arg = intent.getStringExtra(Constants.EXTRA_ARG)

        setResultData(CommandProcessor.process(context, password, cmd, arg))
    }
}

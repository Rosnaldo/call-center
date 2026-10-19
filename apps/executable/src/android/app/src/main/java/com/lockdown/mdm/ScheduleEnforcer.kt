package com.lockdown.mdm

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.util.Log
import java.util.Calendar

/**
 * Suspends/unsuspends scheduled apps based on the current time of day, via
 * DevicePolicyManager.setPackagesSuspended - the standard Android mechanism for temporarily
 * blocking an app without uninstalling it. A suspended app stays installed and visible; trying
 * to open it shows the system's own "this app isn't available right now" dialog. No network
 * access is required for this to work, unlike a DNS/VPN-based approach.
 *
 * Suspension alone still lets a scheduled-off app post notifications, which can put a red
 * badge dot on its (greyed-out) launcher icon - a visible sign of activity that contradicts the
 * point of "only the grey icon, nothing else". So on API 33+ (when notifications became a
 * runtime permission) this also denies POST_NOTIFICATIONS while suspended, and restores it to
 * the platform default (not force-granted - respects whatever the user themselves chose) once
 * the app's window opens back up.
 */
object ScheduleEnforcer {
    private const val POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS"

    /**
     * The chatbot's schedules (ProvisioningConfig.appSchedules), with the ones set over adb
     * (ScheduleStore) taking an app's place: commands sent later override the config.
     */
    fun allSchedules(context: Context): Map<String, AccessSchedule> =
        (ProvisioningConfig.get(context)?.appSchedules ?: emptyMap()) + ScheduleStore.allSchedules(context)

    // The apps scheduled at the last check, so one whose schedule is gone (a new config without
    // it) is released instead of staying suspended for good.
    private const val STATE_PREFS = "lockdown_schedule_state"
    private const val KEY_SCHEDULED = "scheduled"

    fun enforce(context: Context) {
        if (!PolicyEnforcer.isDeviceOwner(context)) return
        val schedules = allSchedules(context)
        val prefs = context.getSharedPreferences(STATE_PREFS, Context.MODE_PRIVATE)
        val previous = prefs.getStringSet(KEY_SCHEDULED, emptySet()) ?: emptySet()
        if (schedules.isEmpty() && previous.isEmpty()) return

        val manager = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, AdminReceiver::class.java)

        val released = previous - schedules.keys
        for (pkg in released) {
            try {
                manager.setPackagesSuspended(admin, arrayOf(pkg), false)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    manager.setPermissionGrantState(admin, pkg, POST_NOTIFICATIONS, DevicePolicyManager.PERMISSION_GRANT_STATE_DEFAULT)
                }
                Log.i(Constants.LOG_TAG, "Released $pkg: no schedule anymore")
            } catch (e: Exception) {
                Log.w(Constants.LOG_TAG, "Releasing $pkg failed: ${e.message}")
            }
        }
        if (released.isNotEmpty() || !previous.containsAll(schedules.keys)) {
            prefs.edit().putStringSet(KEY_SCHEDULED, schedules.keys.toSet()).apply()
        }
        if (schedules.isEmpty()) return

        val calendar = Calendar.getInstance()
        val nowMinute = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE)
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)

        for ((pkg, window) in schedules) {
            val allowedNow = window.contains(nowMinute, dayOfWeek)
            try {
                val failed = manager.setPackagesSuspended(admin, arrayOf(pkg), !allowedNow)
                if (!failed.isNullOrEmpty()) {
                    Log.w(Constants.LOG_TAG, "setPackagesSuspended($pkg, suspend=${!allowedNow}) rejected: ${failed.joinToString()}")
                }
            } catch (e: Exception) {
                Log.w(Constants.LOG_TAG, "setPackagesSuspended($pkg, suspend=${!allowedNow}) failed: ${e.message}")
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                try {
                    val grantState = if (allowedNow) {
                        DevicePolicyManager.PERMISSION_GRANT_STATE_DEFAULT
                    } else {
                        DevicePolicyManager.PERMISSION_GRANT_STATE_DENIED
                    }
                    manager.setPermissionGrantState(admin, pkg, POST_NOTIFICATIONS, grantState)
                } catch (e: Exception) {
                    Log.w(Constants.LOG_TAG, "setPermissionGrantState($pkg, POST_NOTIFICATIONS) failed: ${e.message}")
                }
            }
        }
    }
}

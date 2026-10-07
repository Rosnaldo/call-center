package com.lockdown.mdm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import java.io.File
import kotlin.concurrent.thread

/**
 * Primary control channel. Polls a command file dropped via:
 *
 *   adb push command.txt /sdcard/Android/data/com.lockdown.mdm/files/command.txt
 *
 * File format (one "key=value" per line): password=..., cmd=..., arg=... (arg optional).
 * The result is written to result.txt in the same directory, readable via:
 *
 *   adb shell cat /sdcard/Android/data/com.lockdown.mdm/files/result.txt
 *
 * This exists because adb/shell can be blocked from directly starting activities, services or
 * sending explicit broadcasts to components inside a device-owner-protected package on some
 * Android builds (confirmed on a real Android 9 device during development) - a hardening
 * measure meant to stop adb from bypassing an MDM's own restrictions. Plain file transfer via
 * `adb push`/`adb pull` goes through a different path and is not affected, so it is used as
 * the primary, always-reliable transport; AdbControlReceiver's broadcast is kept as a
 * secondary path for devices/OS versions that don't block it.
 */
class ControlChannelService : Service() {

    @Volatile private var running = false
    private var pollThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (running) return START_STICKY
        running = true
        startForegroundNotification()
        pollThread = thread(start = true, name = "LockdownControlPoll") { pollLoop() }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        pollThread?.interrupt()
        super.onDestroy()
    }

    private fun pollLoop() {
        val dir = externalFilesDirOrNull() ?: run {
            Log.e(Constants.LOG_TAG, "ControlChannelService: no external files dir available")
            return
        }
        val commandFile = File(dir, Constants.CONTROL_COMMAND_FILE)
        val resultFile = File(dir, Constants.CONTROL_RESULT_FILE)
        var lastWatchdogRun = 0L

        while (running) {
            try {
                if (commandFile.exists()) {
                    val fields = parseCommandFile(commandFile)
                    // Delete first so a command is never processed twice even if this crashes.
                    commandFile.delete()
                    val result = CommandProcessor.process(
                        this,
                        fields["password"],
                        fields["cmd"],
                        fields["arg"]
                    )
                    resultFile.writeText(result)
                }
            } catch (e: Exception) {
                Log.w(Constants.LOG_TAG, "ControlChannelService poll error: ${e.message}")
            }

            try {
                ScheduleEnforcer.enforce(this)
            } catch (e: Exception) {
                Log.w(Constants.LOG_TAG, "ScheduleEnforcer error: ${e.message}")
            }

            val now = System.currentTimeMillis()
            if (now - lastWatchdogRun >= Constants.WATCHDOG_INTERVAL_MS) {
                lastWatchdogRun = now
                try {
                    PolicyEnforcer.reapplyPolicy(this)
                } catch (e: Exception) {
                    Log.w(Constants.LOG_TAG, "Watchdog reapplyPolicy error: ${e.message}")
                }
            }

            try {
                Thread.sleep(Constants.CONTROL_POLL_INTERVAL_MS)
            } catch (e: InterruptedException) {
                break
            }
        }
    }

    private fun parseCommandFile(file: File): Map<String, String> =
        file.readLines()
            .mapNotNull { line ->
                val idx = line.indexOf('=')
                if (idx <= 0) null else line.substring(0, idx).trim() to line.substring(idx + 1).trim()
            }
            .toMap()

    private fun externalFilesDirOrNull(): File? = try {
        getExternalFilesDir(null)?.apply { mkdirs() }
    } catch (e: Exception) {
        null
    }

    private fun startForegroundNotification() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                Constants.CONTROL_NOTIFICATION_CHANNEL,
                "Device lockdown control channel",
                NotificationManager.IMPORTANCE_MIN
            )
            manager?.createNotificationChannel(channel)
        }
        val notification = Notification.Builder(this, Constants.CONTROL_NOTIFICATION_CHANNEL)
            .setContentTitle("Lockdown MDM")
            .setContentText("Listening for admin commands")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build()
        startForeground(Constants.CONTROL_NOTIFICATION_ID, notification)
    }
}

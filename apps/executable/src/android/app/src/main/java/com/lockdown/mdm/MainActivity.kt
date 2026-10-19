package com.lockdown.mdm

import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.lockdown.mdm.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.schedulesButton.setOnClickListener { showAppSchedules() }
        binding.blockedTermsButton.setOnClickListener { showBlockedTerms() }

        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun refreshStatus() {
        val isOwner = PolicyEnforcer.isDeviceOwner(this)
        binding.statusText.text = buildString {
            val configVersion = ProvisioningConfig.get(this@MainActivity)?.appVersion
            appendLine("Configuration version: ${configVersion ?: "none"}")
            appendLine("Device owner active: $isOwner")
            // Private DNS only shows up when configured (locked natively or via the VPN fallback).
            if (AllowlistStore.isDnsLocked(this@MainActivity)) {
                if (!PolicyEnforcer.isDnsLockSupported()) {
                    appendLine("Private DNS lock: via VPN fallback (native API needs Android 10+)")
                }
                val host = AllowlistStore.dnsHost(this@MainActivity)
                if (host != Constants.LOCKED_PRIVATE_DNS_HOST) appendLine("Private DNS host: $host")
            }
            append("Install allowlist enforced: ${AllowlistStore.isInstallsLocked(this@MainActivity)}")
        }
        binding.schedulesButton.visibility =
            if (ScheduleEnforcer.allSchedules(this).isEmpty()) View.GONE else View.VISIBLE
        binding.blockedTermsButton.visibility =
            if (UrlTermDenyList.deniedTerms(this).isEmpty()) View.GONE else View.VISIBLE
        showAllowedApps()
    }

    // Lists the allowed apps, the ones still to install first, each with an Install button
    // opening its Play Store page. Refreshed in onResume, so it updates after an install.
    private fun showAllowedApps() {
        val container = binding.allowlistContainer
        container.removeAllViews()
        val packages = AllowlistStore.allowedPackages(this) - PLAY_STORE - packageName
        val (installed, missing) = packages.sorted().partition { isInstalled(it) }
        for (pkg in missing + installed) container.addView(appRow(pkg, pkg in installed))
    }

    private fun appRow(pkg: String, installed: Boolean): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(4), 0, dp(4))
        }
        row.addView(TextView(this).apply {
            text = if (installed) "${appLabel(pkg)}\n$pkg" else pkg
            setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_primary))
            textSize = 14f
        }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(
            if (installed) TextView(this).apply {
                text = "Installed"
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_primary))
                textSize = 13f
            } else MaterialButton(this).apply {
                text = "Install"
                setOnClickListener { openPlayStore(pkg) }
            }
        )
        return row
    }

    private fun isInstalled(pkg: String): Boolean = try {
        packageManager.getPackageInfo(pkg, 0)
        true
    } catch (e: PackageManager.NameNotFoundException) {
        false
    }

    private fun appLabel(pkg: String): String = try {
        packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (e: PackageManager.NameNotFoundException) {
        pkg
    }

    // The Play Store app when it can open the page, else the Play Store website.
    private fun openPlayStore(pkg: String) {
        val market = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$pkg")).setPackage(PLAY_STORE)
        try {
            startActivity(market)
        } catch (e: ActivityNotFoundException) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$pkg")))
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    // Each scheduled app (by name) and the times it may be used, a line per day; the days a
    // chatbot schedule leaves out are blocked, said so on a last line.
    private fun showAppSchedules() {
        val schedules = ScheduleEnforcer.allSchedules(this).entries.sortedBy { appLabel(it.key).lowercase() }
        val text = schedules.joinToString("\n\n") { (pkg, schedule) ->
            val lines = schedule.toString().split("; ").map { "  " + it.replaceFirstChar(Char::uppercase) }
            val blockedRest = schedule is AppSchedule && schedule.days.isNotEmpty() && schedule.days.size < ScheduleStore.ALL_DAYS.size
            appLabel(pkg) + "\n" + (if (blockedRest) lines + "  Other days: blocked" else lines).joinToString("\n")
        }
        AlertDialog.Builder(this)
            .setTitle("App schedules")
            .setMessage(text)
            .setNegativeButton("Close", null)
            .show()
    }

    private fun showBlockedTerms() {
        val terms = UrlTermDenyList.deniedTerms(this).sorted()
        AlertDialog.Builder(this)
            .setTitle("Blocked search terms")
            .setMessage(terms.joinToString("\n"))
            .setNegativeButton("Close", null)
            .show()
    }

    private companion object {
        const val PLAY_STORE = "com.android.vending"
    }
}

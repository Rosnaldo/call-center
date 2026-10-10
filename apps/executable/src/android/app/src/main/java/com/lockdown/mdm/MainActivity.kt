package com.lockdown.mdm

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.lockdown.mdm.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.setupButton.setOnClickListener { showSetupCommand() }
        binding.refreshButton.setOnClickListener { refreshStatus() }

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
            if (!PolicyEnforcer.isDnsLockSupported()) {
                appendLine("Private DNS lock: via VPN fallback (native API needs Android 10+)")
            } else {
                appendLine("Private DNS locked: ${AllowlistStore.isDnsLocked(this@MainActivity)}")
            }
            appendLine("Private DNS host: ${AllowlistStore.dnsHost(this@MainActivity)}")
            append("Install allowlist enforced: ${AllowlistStore.isInstallsLocked(this@MainActivity)}")
        }
        binding.allowlistText.text = AllowlistStore.allowedPackages(this)
            .sorted()
            .joinToString("\n")
    }

    private fun showSetupCommand() {
        val command = "adb shell dpm set-device-owner ${packageName}/.AdminReceiver"
        AlertDialog.Builder(this)
            .setTitle("Device-owner setup command")
            .setMessage(
                "Run this from a PC with adb, on a device that has no accounts added yet " +
                    "(factory reset or fresh profile):\n\n$command\n\n" +
                    "This is a one-time step. After that, DNS lock, install lockdown and " +
                    "the allowlist are all managed exclusively through password-protected " +
                    "adb commands sent to this app."
            )
            .setPositiveButton("Copy") { _, _ ->
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("adb command", command))
            }
            .setNegativeButton("Close", null)
            .show()
    }
}

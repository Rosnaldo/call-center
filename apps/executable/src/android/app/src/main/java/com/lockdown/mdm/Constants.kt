package com.lockdown.mdm

object Constants {
    const val LOG_TAG = "LockdownMDM"

    const val LOCKED_PRIVATE_DNS_HOST = "b33522.dns.nextdns.io"

    // SHA-256 of the adb control password. Never store the raw password.
    const val CONTROL_PASSWORD_SHA256 =
        "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"

    const val ADB_ACTION = "com.lockdown.mdm.ADMIN_ACTION"
    const val EXTRA_PASSWORD = "password"
    const val EXTRA_CMD = "cmd"
    const val EXTRA_ARG = "arg"

    // VPN-based DNS fallback, used on Android versions below 10 (API 29) where
    // DevicePolicyManager has no API for locking Private DNS at all.
    const val VPN_LOCAL_ADDRESS = "10.111.222.2"
    const val VPN_FAKE_DNS_SERVER = "10.111.222.1"
    const val VPN_PREFIX_LENGTH = 32
    const val DOT_PORT = 853
    const val VPN_NOTIFICATION_CHANNEL = "lockdown_dns_vpn"
    const val VPN_NOTIFICATION_ID = 1

    // File-drop control channel (see ControlChannelService). Used because adb/shell can be
    // blocked from directly invoking components inside a device-owner-protected package on
    // some Android builds, but `adb push`/`adb pull` are unaffected.
    const val CONTROL_COMMAND_FILE = "command.txt"
    const val CONTROL_RESULT_FILE = "result.txt"
    const val CONTROL_POLL_INTERVAL_MS = 2000L
    const val CONTROL_NOTIFICATION_CHANNEL = "lockdown_control"
    const val CONTROL_NOTIFICATION_ID = 2

    // How often the watchdog re-asserts policy (DNS lock, install lock, allowlist sweep)
    // regardless of whether anything asked it to. Needed because on at least one real device,
    // Android's Settings UI let the user clear a device-owner-configured always-on VPN despite
    // lockdownEnabled=true - the OS's own "can't be changed by the user" guarantee didn't hold.
    // Re-running the whole policy application on a short interval bounds how long any such
    // tampering can persist, independent of whatever the OS should have prevented.
    const val WATCHDOG_INTERVAL_MS = 15_000L

    val DEFAULT_ALLOWED_PACKAGES = setOf(
        "com.nu.production",                       // Nubank
        "com.google.android.apps.maps",             // Google Maps
        "com.taxis99",                               // 99
        "com.whatsapp",                              // WhatsApp
        "com.x8bit.bitwarden",                       // Bitwarden
        "com.openai.chatgpt",                        // ChatGPT
        "com.google.android.apps.authenticator2",    // Google Authenticator
        "br.com.doctoralia",                         // Doctoralia
        "br.gov.serpro.cnhe",                        // CNH Digital
        "br.gov.meugovbr",                           // gov.br
        "br.gov.dataprev.meuinss",                   // Meu INSS
        "com.hellotalk",                             // HelloTalk
        "br.org.missao.militante",                   // Missão Militante
        "com.android.vending",                       // Play Store itself must stay installable/usable
        "com.google.android.youtube"                 // YouTube
    )
}

package com.lockdown.mdm

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Params collected by the chatbot, which the executable service writes into this APK
 * (apps/executable/src/apk-config.ts) without rebuilding or re-signing it: a JSON value
 * stored under [CONFIG_BLOCK_ID] in the APK Signing Block. That block sits outside what
 * APK Signature Scheme v2/v3 signs, so the signature stays valid.
 *
 * They seed [AllowlistStore]'s defaults; commands sent later still override them. An APK
 * without the block (e.g. built by generate_apk.sh) falls back to [Constants].
 *
 * [appVersion] is the configuration's version as typed in the chatbot (e.g. 1.2.0). The
 * APK's own versionName can't carry it (changing the manifest means re-signing), so the
 * app shows it itself (see MainActivity and PolicyEnforcer.applyOrganizationName).
 */
data class ProvisioningConfig(
    val privateDnsHost: String?,
    val allowedApps: Set<String>?,
    val appVersion: String?,
) {
    companion object {
        // Must match CONFIG_BLOCK_ID in apk-config.ts.
        private const val CONFIG_BLOCK_ID = 0x444f4346 // "DOCF"
        private const val SIGNING_BLOCK_MAGIC = "APK Sig Block 42"
        private const val EOCD_SIZE = 22
        private const val EOCD_SIGNATURE = 0x06054b50

        @Volatile
        private var cached: ProvisioningConfig? = null
        @Volatile
        private var loaded = false

        fun get(context: Context): ProvisioningConfig? {
            if (!loaded) {
                cached = try {
                    readBlock(context.applicationInfo.sourceDir)?.let(::parse)
                } catch (e: Exception) {
                    Log.w(Constants.LOG_TAG, "Could not read the provisioning config", e)
                    null
                }
                loaded = true
            }
            return cached
        }

        private fun parse(json: String): ProvisioningConfig {
            val obj = JSONObject(json)
            val host = if (obj.isNull("privateDnsHost")) null else obj.getString("privateDnsHost")
            val apps = if (obj.isNull("allowedApps")) {
                null
            } else {
                val array = obj.getJSONArray("allowedApps")
                (0 until array.length()).map(array::getString).toSet()
            }
            // Absent in configs made before the chatbot asked for it.
            val appVersion = if (obj.isNull("appVersion")) null else obj.getString("appVersion")
            return ProvisioningConfig(host, apps, appVersion)
        }

        private fun readBlock(apkPath: String): String? = RandomAccessFile(apkPath, "r").use { file ->
            val length = file.length()
            // The zip comment is empty in a built APK, so the EOCD is the last 22 bytes.
            val eocd = read(file, length - EOCD_SIZE, EOCD_SIZE)
            if (eocd.getInt(0) != EOCD_SIGNATURE) return null
            val centralDirOffset = eocd.getInt(16).toLong() and 0xffffffffL

            // Signing block: [size: u64][pairs][size: u64][magic], ending at the central directory.
            val footer = read(file, centralDirOffset - 24, 24)
            val magic = ByteArray(16).also { footer.position(8); footer.get(it) }
            if (String(magic, Charsets.US_ASCII) != SIGNING_BLOCK_MAGIC) return null
            // The size fields count everything after the leading one.
            val blockSize = footer.getLong(0)
            val pairs = read(file, centralDirOffset - blockSize, (blockSize - 24).toInt())

            // Pairs: [length: u64][id: u32][value: length - 4 bytes]
            while (pairs.remaining() >= 12) {
                val pairLength = pairs.long
                val id = pairs.int
                val valueLength = (pairLength - 4).toInt()
                if (id == CONFIG_BLOCK_ID) {
                    val value = ByteArray(valueLength).also { pairs.get(it) }
                    return String(value, Charsets.UTF_8)
                }
                pairs.position(pairs.position() + valueLength)
            }
            null
        }

        private fun read(file: RandomAccessFile, offset: Long, size: Int): ByteBuffer {
            val bytes = ByteArray(size)
            file.seek(offset)
            file.readFully(bytes)
            return ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        }
    }
}

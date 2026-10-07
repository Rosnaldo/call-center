package com.lockdown.mdm

import android.net.Network
import android.net.VpnService
import android.util.Log
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import javax.net.ssl.SSLSocketFactory

/**
 * Forwards a single raw DNS message to [host] over DNS-over-TLS (RFC 7858) and returns the
 * raw response message. The connection is protected via [VpnService.protect] so it is not
 * itself captured by the VPN tunnel it belongs to (required for correctness once the always-on
 * VPN lockdown flag is active - see LocalVpnService).
 *
 * The connection is made to a hardcoded IP, never by resolving [host] through the normal system
 * resolver: this app's own process ends up using its own VPN's DNS server for plain hostname
 * lookups, which would try to resolve this very host through the tun this function is serving -
 * a circular dependency that always fails. [host] is only used for TLS SNI/hostname
 * verification, which NextDNS (and DoT providers generally) use to route to the right profile
 * regardless of which anycast IP was dialed.
 */
object DnsOverTlsForwarder {

    // NextDNS's anycast DoT/DoH edge IPs - identical for every profile; the profile id lives
    // only in the SNI hostname. Two are tried in case one is unreachable from this network.
    private val NEXTDNS_ANYCAST_IPS = listOf("45.90.28.0", "45.90.30.0")

    fun forward(vpnService: VpnService, underlyingNetwork: Network?, host: String, query: ByteArray): ByteArray? {
        for (ip in NEXTDNS_ANYCAST_IPS) {
            val response = forwardTo(vpnService, underlyingNetwork, ip, host, query)
            if (response != null) return response
        }
        return null
    }

    private fun forwardTo(vpnService: VpnService, underlyingNetwork: Network?, ip: String, sniHost: String, query: ByteArray): ByteArray? {
        var plainSocket: Socket? = null
        return try {
            plainSocket = Socket().apply {
                soTimeout = 5000
            }
            if (!PacketUtils.bindOrProtect(vpnService, underlyingNetwork, plainSocket)) {
                Log.w(Constants.LOG_TAG, "bindOrProtect failed for DoT socket to $ip")
            }
            val address = InetAddress.getByAddress(sniHost, parseIpv4(ip))
            plainSocket.connect(InetSocketAddress(address, Constants.DOT_PORT), 5000)

            val tlsSocket = (SSLSocketFactory.getDefault() as SSLSocketFactory)
                .createSocket(plainSocket, sniHost, Constants.DOT_PORT, true)
            tlsSocket.soTimeout = 5000

            val out = DataOutputStream(tlsSocket.getOutputStream())
            val input = DataInputStream(tlsSocket.getInputStream())

            // RFC 7858 framing: 2-byte big-endian length prefix, then the raw DNS message.
            out.writeShort(query.size)
            out.write(query)
            out.flush()

            val responseLength = input.readUnsignedShort()
            val response = ByteArray(responseLength)
            input.readFully(response)
            tlsSocket.close()
            Log.i(Constants.LOG_TAG, "DoT forward to $sniHost via $ip OK (${query.size}B query -> ${response.size}B response)")
            response
        } catch (e: Exception) {
            Log.w(Constants.LOG_TAG, "DoT forward to $sniHost via $ip failed: ${e.message}")
            null
        } finally {
            try { plainSocket?.close() } catch (_: Exception) {}
        }
    }

    private fun parseIpv4(ip: String): ByteArray =
        ip.split(".").map { it.toInt().toByte() }.toByteArray()
}

package com.lockdown.mdm

import android.net.Network
import android.net.VpnService
import android.util.Log
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread

/**
 * Transparent pass-through for non-DNS UDP traffic. Each distinct (client port, destination)
 * flow gets a real DatagramSocket bound to the underlying network; a dedicated thread reads
 * responses back and wraps them into reply packets written to the tun. This is what lets the
 * DNS-only interception coexist with a full default-route (0.0.0.0/0) VPN without breaking
 * every other UDP-based app feature.
 */
class UdpRelay(
    private val vpnService: VpnService,
    private val output: FileOutputStream,
    private val underlyingNetwork: Network?
) {

    private class Session(val socket: DatagramSocket, val clientPort: Int, val destIp: ByteArray, val destPort: Int) {
        @Volatile var lastActivity = System.currentTimeMillis()
    }

    private val sessions = ConcurrentHashMap<String, Session>()

    fun handle(srcIp: ByteArray, dstIp: ByteArray, srcPort: Int, dstPort: Int, payload: ByteArray) {
        val key = "$srcPort:${PacketUtils.ipToString(dstIp)}:$dstPort"
        val session = sessions.getOrPut(key) {
            val socket = DatagramSocket()
            if (!PacketUtils.bindOrProtect(vpnService, underlyingNetwork, socket)) {
                Log.w(Constants.LOG_TAG, "bindOrProtect failed for UDP $key")
            }
            val session = Session(socket, srcPort, dstIp, dstPort)
            startResponder(key, session, srcIp)
            session
        }
        session.lastActivity = System.currentTimeMillis()
        try {
            val destAddress = InetAddress.getByAddress(dstIp)
            session.socket.send(DatagramPacket(payload, payload.size, destAddress, dstPort))
        } catch (e: Exception) {
            Log.w(Constants.LOG_TAG, "UDP relay send failed for $key: ${e.message}")
            sessions.remove(key)
            try { session.socket.close() } catch (_: Exception) {}
        }
    }

    private fun startResponder(key: String, session: Session, clientIp: ByteArray) {
        thread(name = "UdpRelay-$key") {
            val buf = ByteArray(65535)
            try {
                while (!session.socket.isClosed) {
                    val packet = DatagramPacket(buf, buf.size)
                    session.socket.receive(packet)
                    session.lastActivity = System.currentTimeMillis()
                    val reply = PacketUtils.buildUdpPacket(
                        srcIp = session.destIp,
                        dstIp = clientIp,
                        srcPort = session.destPort,
                        dstPort = session.clientPort,
                        payload = packet.data.copyOf(packet.length)
                    )
                    synchronized(output) { output.write(reply) }
                }
            } catch (e: Exception) {
                // Socket closed or errored - session is ending.
            } finally {
                sessions.remove(key)
            }
        }
    }

    fun cleanupIdleSessions(maxIdleMs: Long = 120_000) {
        val now = System.currentTimeMillis()
        sessions.entries.removeAll { (_, s) ->
            val idle = now - s.lastActivity > maxIdleMs
            if (idle) try { s.socket.close() } catch (_: Exception) {}
            idle
        }
    }

    fun closeAll() {
        sessions.values.forEach { try { it.socket.close() } catch (_: Exception) {} }
        sessions.clear()
    }
}

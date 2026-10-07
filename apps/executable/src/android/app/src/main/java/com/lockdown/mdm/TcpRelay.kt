package com.lockdown.mdm

import android.net.Network
import android.net.VpnService
import android.util.Log
import java.io.FileOutputStream
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import kotlin.random.Random

/**
 * Minimal TCP relay: terminates the client's TCP connection locally (a real 3-way handshake),
 * opens a real, protected socket to the destination, and shuttles bytes both ways.
 *
 * This does not implement a general-purpose TCP/IP stack. It deliberately skips
 * retransmission/reordering handling on the client-facing side, which is safe here because
 * packets injected into this tun are delivered to the client app entirely inside this device's
 * own kernel - there is no lossy "wire" between us and the client, so the usual reasons a real
 * TCP stack needs that machinery don't apply on that side. The real destination's own TCP stack
 * (via the real Socket) already provides reliability on the other side. Not handled: TCP
 * options beyond MSS, out-of-order client segments, congestion control - acceptable for typical
 * phone app traffic, not appropriate for a general VPN client.
 *
 * Must be called from a single thread per tun (see LocalVpnService) for the client -> server
 * direction, since writing a TCP byte stream out of order would corrupt it; only the
 * server -> client direction runs on its own per-session thread, which needs no ordering
 * coordination with anything but itself.
 */
class TcpRelay(
    private val vpnService: VpnService,
    private val output: FileOutputStream,
    private val connectExecutor: ExecutorService,
    private val underlyingNetwork: Network?
) {

    private class Session(
        val clientPort: Int,
        val destIp: ByteArray,
        val destPort: Int,
        val clientIp: ByteArray
    ) {
        @Volatile var socket: Socket? = null
        var clientNextSeq: Long = 0 // next seq number expected from the client == our ack value
        var localSeq: Long = 0 // our own next seq number to send
        @Volatile var lastActivity = System.currentTimeMillis()
        val lock = Object()
    }

    private val sessions = ConcurrentHashMap<String, Session>()

    fun handle(packet: ByteArray, ihl: Int, srcIp: ByteArray, dstIp: ByteArray) {
        val tcpOffset = ihl
        if (packet.size < tcpOffset + 20) return
        val srcPort = PacketUtils.readU16(packet, tcpOffset)
        val dstPort = PacketUtils.readU16(packet, tcpOffset + 2)
        val seq = PacketUtils.readU32(packet, tcpOffset + 4)
        val dataOffsetByte = packet[tcpOffset + 12].toInt()
        val headerLen = ((dataOffsetByte shr 4) and 0x0F) * 4
        val flags = packet[tcpOffset + 13].toInt() and 0xFF
        val payloadOffset = tcpOffset + headerLen
        val payload = if (payloadOffset in 0..packet.size) packet.copyOfRange(payloadOffset, packet.size) else ByteArray(0)

        val key = "$srcPort:${PacketUtils.ipToString(dstIp)}:$dstPort"

        if (flags and PacketUtils.TcpFlags.RST != 0) {
            sessions.remove(key)?.let { closeSession(it) }
            return
        }

        if (flags and PacketUtils.TcpFlags.SYN != 0) {
            if (sessions.containsKey(key)) return // ignore retransmitted SYN for a connecting session
            val session = Session(srcPort, dstIp, dstPort, srcIp)
            session.clientNextSeq = (seq + 1) and 0xFFFFFFFFL
            session.localSeq = Random.nextInt().toLong() and 0xFFFFFFFFL
            sessions[key] = session
            connectAndRelay(key, session)
            return
        }

        val session = sessions[key] ?: return
        session.lastActivity = System.currentTimeMillis()

        if (flags and PacketUtils.TcpFlags.FIN != 0) {
            synchronized(session.lock) {
                session.clientNextSeq = (session.clientNextSeq + payload.size + 1) and 0xFFFFFFFFL
                sendAck(session)
            }
            try { session.socket?.shutdownOutput() } catch (_: Exception) {}
            return
        }

        if (payload.isNotEmpty()) {
            val sock = session.socket
            if (sock == null) return
            try {
                sock.getOutputStream().write(payload)
                synchronized(session.lock) {
                    session.clientNextSeq = (session.clientNextSeq + payload.size) and 0xFFFFFFFFL
                    sendAck(session)
                }
            } catch (e: Exception) {
                Log.w(Constants.LOG_TAG, "TCP relay write failed for $key: ${e.message}")
                sessions.remove(key)
                closeSession(session)
            }
        }
    }

    private fun connectAndRelay(key: String, session: Session) {
        connectExecutor.execute {
            try {
                val socket = Socket()
                if (!PacketUtils.bindOrProtect(vpnService, underlyingNetwork, socket)) {
                    Log.w(Constants.LOG_TAG, "bindOrProtect failed for $key, aborting connect")
                    throw java.io.IOException("bindOrProtect failed")
                }
                socket.connect(InetSocketAddress(InetAddress.getByAddress(session.destIp), session.destPort), 8000)
                session.socket = socket

                synchronized(session.lock) {
                    val synAck = PacketUtils.buildTcpPacket(
                        srcIp = session.destIp, dstIp = session.clientIp,
                        srcPort = session.destPort, dstPort = session.clientPort,
                        seq = session.localSeq, ack = session.clientNextSeq,
                        flags = PacketUtils.TcpFlags.SYN or PacketUtils.TcpFlags.ACK,
                        payload = ByteArray(0),
                        mss = 1460
                    )
                    session.localSeq = (session.localSeq + 1) and 0xFFFFFFFFL
                    synchronized(output) { output.write(synAck) }
                }

                val buf = ByteArray(4096)
                val input = socket.getInputStream()
                while (true) {
                    val n = try { input.read(buf) } catch (e: Exception) { -1 }
                    if (n < 0) break
                    if (n == 0) continue
                    synchronized(session.lock) {
                        val data = PacketUtils.buildTcpPacket(
                            srcIp = session.destIp, dstIp = session.clientIp,
                            srcPort = session.destPort, dstPort = session.clientPort,
                            seq = session.localSeq, ack = session.clientNextSeq,
                            flags = PacketUtils.TcpFlags.ACK or PacketUtils.TcpFlags.PSH,
                            payload = buf.copyOf(n)
                        )
                        session.localSeq = (session.localSeq + n) and 0xFFFFFFFFL
                        synchronized(output) { output.write(data) }
                    }
                    session.lastActivity = System.currentTimeMillis()
                }

                synchronized(session.lock) {
                    val fin = PacketUtils.buildTcpPacket(
                        srcIp = session.destIp, dstIp = session.clientIp,
                        srcPort = session.destPort, dstPort = session.clientPort,
                        seq = session.localSeq, ack = session.clientNextSeq,
                        flags = PacketUtils.TcpFlags.FIN or PacketUtils.TcpFlags.ACK,
                        payload = ByteArray(0)
                    )
                    session.localSeq = (session.localSeq + 1) and 0xFFFFFFFFL
                    synchronized(output) { output.write(fin) }
                }
            } catch (e: Exception) {
                Log.w(Constants.LOG_TAG, "TCP relay connect failed for $key: ${e.message}")
                synchronized(session.lock) {
                    val rst = PacketUtils.buildTcpPacket(
                        srcIp = session.destIp, dstIp = session.clientIp,
                        srcPort = session.destPort, dstPort = session.clientPort,
                        seq = session.localSeq, ack = session.clientNextSeq,
                        flags = PacketUtils.TcpFlags.RST,
                        payload = ByteArray(0)
                    )
                    synchronized(output) { output.write(rst) }
                }
            } finally {
                sessions.remove(key)
                closeSession(session)
            }
        }
    }

    private fun sendAck(session: Session) {
        val ack = PacketUtils.buildTcpPacket(
            srcIp = session.destIp, dstIp = session.clientIp,
            srcPort = session.destPort, dstPort = session.clientPort,
            seq = session.localSeq, ack = session.clientNextSeq,
            flags = PacketUtils.TcpFlags.ACK,
            payload = ByteArray(0)
        )
        synchronized(output) { output.write(ack) }
    }

    private fun closeSession(session: Session) {
        try { session.socket?.close() } catch (_: Exception) {}
    }

    fun cleanupIdleSessions(maxIdleMs: Long = 180_000) {
        val now = System.currentTimeMillis()
        sessions.entries.removeAll { (_, s) ->
            val idle = now - s.lastActivity > maxIdleMs
            if (idle) closeSession(s)
            idle
        }
    }

    fun closeAll() {
        sessions.values.forEach { closeSession(it) }
        sessions.clear()
    }
}

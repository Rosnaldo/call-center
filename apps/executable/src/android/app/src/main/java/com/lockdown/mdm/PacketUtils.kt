package com.lockdown.mdm

/** Shared IPv4/UDP/TCP packet construction for the VPN relay. IPv4 only. */
object PacketUtils {

    /**
     * VpnService.protect() is a Binder IPC call that, on at least one real device tested during
     * development, reliably fails when called concurrently from multiple threads at once (the
     * same thread was observed to succeed on one call and fail moments later on another - a
     * race in the underlying implementation, not anything about which thread/pool calls it).
     * Serializing every protect() call through this lock avoids ever issuing two at once, which
     * eliminated the failures in testing. A page opening dozens of parallel connections just
     * means dozens of quick, sequential Binder round trips here instead of a burst - cheap
     * enough not to matter.
     */
    private val protectLock = Any()

    fun protectWithRetry(vpnService: android.net.VpnService, socket: java.net.Socket, attempts: Int = 3): Boolean {
        repeat(attempts) { attempt ->
            val result = synchronized(protectLock) { vpnService.protect(socket) }
            if (result) return true
            if (attempt < attempts - 1) try { Thread.sleep(30) } catch (_: InterruptedException) {}
        }
        android.util.Log.w(Constants.LOG_TAG, "protect() failed after $attempts serialized attempts (TCP)")
        return false
    }

    fun protectWithRetry(vpnService: android.net.VpnService, socket: java.net.DatagramSocket, attempts: Int = 3): Boolean {
        repeat(attempts) { attempt ->
            val result = synchronized(protectLock) { vpnService.protect(socket) }
            if (result) return true
            if (attempt < attempts - 1) try { Thread.sleep(30) } catch (_: InterruptedException) {}
        }
        android.util.Log.w(Constants.LOG_TAG, "protect() failed after $attempts serialized attempts (UDP)")
        return false
    }

    /**
     * Preferred over [protectWithRetry]: explicitly binds the socket to the real underlying
     * network via Network.bindSocket(), a more explicit/modern API for the same purpose
     * (excluding this socket from the VPN's own routing) that does not share whatever is flaky
     * about protect()'s implementation on some devices. Falls back to protect() if no
     * underlying network is known.
     */
    fun bindOrProtect(vpnService: android.net.VpnService, network: android.net.Network?, socket: java.net.Socket): Boolean {
        if (network != null) {
            try {
                network.bindSocket(socket)
                return true
            } catch (e: Exception) {
                android.util.Log.w(Constants.LOG_TAG, "Network.bindSocket (TCP) failed: ${e.message}, falling back to protect()")
            }
        }
        return protectWithRetry(vpnService, socket)
    }

    fun bindOrProtect(vpnService: android.net.VpnService, network: android.net.Network?, socket: java.net.DatagramSocket): Boolean {
        if (network != null) {
            try {
                network.bindSocket(socket)
                return true
            } catch (e: Exception) {
                android.util.Log.w(Constants.LOG_TAG, "Network.bindSocket (UDP) failed: ${e.message}, falling back to protect()")
            }
        }
        return protectWithRetry(vpnService, socket)
    }

    object TcpFlags {
        const val FIN = 0x01
        const val SYN = 0x02
        const val RST = 0x04
        const val PSH = 0x08
        const val ACK = 0x10
        const val URG = 0x20
    }

    private fun checksum(data: ByteArray): Int {
        var sum = 0
        var i = 0
        while (i + 1 < data.size) {
            sum += ((data[i].toInt() and 0xFF) shl 8) or (data[i + 1].toInt() and 0xFF)
            i += 2
        }
        if (i < data.size) {
            sum += (data[i].toInt() and 0xFF) shl 8
        }
        while (sum shr 16 != 0) {
            sum = (sum and 0xFFFF) + (sum shr 16)
        }
        return sum.inv() and 0xFFFF
    }

    fun buildIpv4Header(protocol: Int, srcIp: ByteArray, dstIp: ByteArray, payloadLength: Int): ByteArray {
        val totalLength = 20 + payloadLength
        val header = ByteArray(20)
        header[0] = 0x45
        header[2] = ((totalLength shr 8) and 0xFF).toByte()
        header[3] = (totalLength and 0xFF).toByte()
        header[6] = 0x40.toByte() // don't fragment
        header[8] = 64 // TTL
        header[9] = protocol.toByte()
        System.arraycopy(srcIp, 0, header, 12, 4)
        System.arraycopy(dstIp, 0, header, 16, 4)
        val cs = checksum(header)
        header[10] = ((cs shr 8) and 0xFF).toByte()
        header[11] = (cs and 0xFF).toByte()
        return header
    }

    fun buildUdpPacket(srcIp: ByteArray, dstIp: ByteArray, srcPort: Int, dstPort: Int, payload: ByteArray): ByteArray {
        val udpLength = 8 + payload.size
        val udp = ByteArray(udpLength)
        udp[0] = ((srcPort shr 8) and 0xFF).toByte()
        udp[1] = (srcPort and 0xFF).toByte()
        udp[2] = ((dstPort shr 8) and 0xFF).toByte()
        udp[3] = (dstPort and 0xFF).toByte()
        udp[4] = ((udpLength shr 8) and 0xFF).toByte()
        udp[5] = (udpLength and 0xFF).toByte()
        // UDP checksum left as 0 - optional for IPv4 (RFC 768).
        System.arraycopy(payload, 0, udp, 8, payload.size)
        return buildIpv4Header(17, srcIp, dstIp, udpLength) + udp
    }

    /** [mss], when given, is only meaningful on SYN/SYN-ACK segments. */
    fun buildTcpPacket(
        srcIp: ByteArray,
        dstIp: ByteArray,
        srcPort: Int,
        dstPort: Int,
        seq: Long,
        ack: Long,
        flags: Int,
        payload: ByteArray,
        mss: Int? = null
    ): ByteArray {
        val optionsLength = if (mss != null) 4 else 0
        val headerLength = 20 + optionsLength
        val tcpLength = headerLength + payload.size
        val tcp = ByteArray(tcpLength)
        tcp[0] = ((srcPort shr 8) and 0xFF).toByte()
        tcp[1] = (srcPort and 0xFF).toByte()
        tcp[2] = ((dstPort shr 8) and 0xFF).toByte()
        tcp[3] = (dstPort and 0xFF).toByte()
        tcp[4] = ((seq shr 24) and 0xFF).toByte()
        tcp[5] = ((seq shr 16) and 0xFF).toByte()
        tcp[6] = ((seq shr 8) and 0xFF).toByte()
        tcp[7] = (seq and 0xFF).toByte()
        tcp[8] = ((ack shr 24) and 0xFF).toByte()
        tcp[9] = ((ack shr 16) and 0xFF).toByte()
        tcp[10] = ((ack shr 8) and 0xFF).toByte()
        tcp[11] = (ack and 0xFF).toByte()
        tcp[12] = ((headerLength / 4) shl 4).toByte()
        tcp[13] = flags.toByte()
        val window = 65535
        tcp[14] = ((window shr 8) and 0xFF).toByte()
        tcp[15] = (window and 0xFF).toByte()
        if (mss != null) {
            tcp[20] = 2 // option kind: MSS
            tcp[21] = 4 // option length
            tcp[22] = ((mss shr 8) and 0xFF).toByte()
            tcp[23] = (mss and 0xFF).toByte()
        }
        System.arraycopy(payload, 0, tcp, headerLength, payload.size)

        // TCP checksum covers a pseudo-header (src/dst IP, protocol, TCP length) + the segment.
        val pseudo = ByteArray(12 + tcpLength)
        System.arraycopy(srcIp, 0, pseudo, 0, 4)
        System.arraycopy(dstIp, 0, pseudo, 4, 4)
        pseudo[9] = 6 // TCP protocol number
        pseudo[10] = ((tcpLength shr 8) and 0xFF).toByte()
        pseudo[11] = (tcpLength and 0xFF).toByte()
        System.arraycopy(tcp, 0, pseudo, 12, tcpLength)
        val cs = checksum(pseudo)
        tcp[16] = ((cs shr 8) and 0xFF).toByte()
        tcp[17] = (cs and 0xFF).toByte()

        return buildIpv4Header(6, srcIp, dstIp, tcpLength) + tcp
    }

    fun readU16(data: ByteArray, offset: Int): Int =
        ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)

    fun readU32(data: ByteArray, offset: Int): Long =
        ((data[offset].toLong() and 0xFF) shl 24) or
            ((data[offset + 1].toLong() and 0xFF) shl 16) or
            ((data[offset + 2].toLong() and 0xFF) shl 8) or
            (data[offset + 3].toLong() and 0xFF)

    fun ipToString(ip: ByteArray): String = ip.joinToString(".") { (it.toInt() and 0xFF).toString() }
}

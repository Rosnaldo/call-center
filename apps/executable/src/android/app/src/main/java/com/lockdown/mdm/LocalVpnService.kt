package com.lockdown.mdm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/**
 * Fallback DNS lockdown for Android versions below 10 (API 29), where
 * DevicePolicyManager has no API at all for controlling Private DNS.
 *
 * The VPN captures the full default route (0.0.0.0/0) - an earlier, narrower version that
 * only routed the fake DNS address through the tun was found, on a real device, to still make
 * this VPN the OS's preferred default network for general traffic (VPNs are scored above
 * physical networks), which broke every non-DNS connection with no fallback to the real
 * network. Capturing everything and relaying it ourselves (see [UdpRelay], [TcpRelay]) is the
 * only way to keep general connectivity working while still being able to see and redirect DNS
 * traffic. DNS queries get answered locally over DNS-over-TLS to [Constants.LOCKED_PRIVATE_DNS_HOST]
 * (see [DnsOverTlsForwarder]); everything else is relayed transparently to its real destination.
 *
 * Combined with DevicePolicyManager.setAlwaysOnVpnPackage(..., lockdownEnabled = true) set by
 * PolicyEnforcer, the user cannot disable or bypass this from Settings.
 */
class LocalVpnService : VpnService() {

    private var tunInterface: ParcelFileDescriptor? = null
    private var readerThread: Thread? = null
    private lateinit var executor: ExecutorService
    private var udpRelay: UdpRelay? = null
    private var tcpRelay: TcpRelay? = null
    private var underlyingNetwork: Network? = null
    @Volatile private var running = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (running) return START_STICKY
        // Set before spawning the reader thread, not after: on a heavily-loaded device the
        // reader thread's first `while (running)` check can otherwise run before this line
        // does, exiting the whole read loop before it processes a single packet - found live,
        // logged as "VPN tun read loop exited (running=false)" moments after establishment.
        running = true
        startForegroundNotification()
        establishTunnel()
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        readerThread?.interrupt()
        try { executor.shutdownNow() } catch (_: Exception) {}
        udpRelay?.closeAll()
        tcpRelay?.closeAll()
        try { tunInterface?.close() } catch (_: Exception) {}
        tunInterface = null
        super.onDestroy()
    }

    /**
     * The real (non-VPN) network to bind our own outgoing sockets to - see [PacketUtils.bindOrProtect].
     * `VpnService.protect()` was found, on a real device, to unreliably fail even for sockets
     * that plainly worked moments later via an identical call site (same VpnService instance,
     * same thread pool, same destination) - Network.bindSocket() is a more explicit, modern
     * alternative for the same purpose that doesn't share whatever is flaky in protect()'s
     * implementation on that device.
     */
    private fun findUnderlyingNetwork(): Network? {
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return null
            cm.allNetworks.firstOrNull { network ->
                val caps = cm.getNetworkCapabilities(network) ?: return@firstOrNull false
                !caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) &&
                    caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            }
        } catch (e: Exception) {
            Log.w(Constants.LOG_TAG, "findUnderlyingNetwork failed: ${e.message}, falling back to protect()")
            null
        }
    }

    private fun establishTunnel() {
        underlyingNetwork = findUnderlyingNetwork()
        Log.i(Constants.LOG_TAG, "Underlying network for VPN uplink: $underlyingNetwork")

        val builder = Builder()
            .setSession("Lockdown DNS")
            .addAddress(Constants.VPN_LOCAL_ADDRESS, Constants.VPN_PREFIX_LENGTH)
            .addRoute("0.0.0.0", 0)
            .addDnsServer(Constants.VPN_FAKE_DNS_SERVER)
            .setMtu(1500)
            .setBlocking(true)
        underlyingNetwork?.let { builder.setUnderlyingNetworks(arrayOf(it)) }

        tunInterface = try {
            builder.establish()
        } catch (e: Exception) {
            Log.e(Constants.LOG_TAG, "Failed to establish VPN DNS tunnel: ${e.message}")
            null
        }

        val fd = tunInterface ?: return
        executor = Executors.newCachedThreadPool()
        readerThread = thread(start = true, name = "LockdownDnsTunReader") {
            runReadLoop(fd)
        }
        Log.i(Constants.LOG_TAG, "VPN DNS fallback active, forwarding to ${Constants.LOCKED_PRIVATE_DNS_HOST}")
    }

    private fun runReadLoop(fd: ParcelFileDescriptor) {
        val input = FileInputStream(fd.fileDescriptor)
        val output = FileOutputStream(fd.fileDescriptor)
        val udpRelay = UdpRelay(this, output, underlyingNetwork).also { udpRelay = it }
        val tcpRelay = TcpRelay(this, output, executor, underlyingNetwork).also { tcpRelay = it }
        val buffer = ByteArray(32767)
        var consecutiveErrors = 0
        var lastCleanup = System.currentTimeMillis()

        while (running) {
            val length = try {
                val n = input.read(buffer)
                consecutiveErrors = 0
                n
            } catch (e: Exception) {
                if (!running) break
                consecutiveErrors++
                Log.w(Constants.LOG_TAG, "Tun read error (#$consecutiveErrors): ${e.message}", e)
                if (consecutiveErrors >= 20) {
                    Log.e(Constants.LOG_TAG, "Too many consecutive tun read errors, giving up on DNS fallback")
                    break
                }
                try { Thread.sleep(200) } catch (_: InterruptedException) { break }
                continue
            }
            if (length <= 0) continue
            val packet = buffer.copyOf(length)
            dispatch(packet, output, udpRelay, tcpRelay)

            val now = System.currentTimeMillis()
            if (now - lastCleanup > 30_000) {
                udpRelay.cleanupIdleSessions()
                tcpRelay.cleanupIdleSessions()
                lastCleanup = now
            }
        }
        udpRelay.closeAll()
        tcpRelay.closeAll()
        Log.w(Constants.LOG_TAG, "VPN tun read loop exited (running=$running)")
    }

    /**
     * TCP is handled synchronously, right here on the read-loop thread, because writing a TCP
     * byte stream out of order to the real destination socket would corrupt it - the executor
     * pool used for DNS/UDP has no per-flow ordering guarantee. UDP and DNS are independent
     * request/response exchanges, so dispatching them onto the pool (to avoid a slow DoT round
     * trip blocking the read loop) is safe.
     */
    private fun dispatch(packet: ByteArray, output: FileOutputStream, udpRelay: UdpRelay, tcpRelay: TcpRelay) {
        if (packet.isEmpty()) return
        val version = (packet[0].toInt() shr 4) and 0x0F
        if (version != 4) return // IPv6 not handled by this fallback

        val ihl = (packet[0].toInt() and 0x0F) * 4
        if (packet.size < ihl + 4) return
        val protocol = packet[9].toInt() and 0xFF
        val srcIp = packet.copyOfRange(12, 16)
        val dstIp = packet.copyOfRange(16, 20)

        when (protocol) {
            17 -> { // UDP
                if (packet.size < ihl + 8) return
                val udpOffset = ihl
                val srcPort = PacketUtils.readU16(packet, udpOffset)
                val dstPort = PacketUtils.readU16(packet, udpOffset + 2)
                val udpLength = PacketUtils.readU16(packet, udpOffset + 4)
                val payloadOffset = udpOffset + 8
                val payloadLength = (udpLength - 8).coerceAtLeast(0).coerceAtMost(packet.size - payloadOffset)
                if (payloadLength <= 0) return
                val payload = packet.copyOfRange(payloadOffset, payloadOffset + payloadLength)
                if (dstPort == 53) {
                    executor.execute {
                        try {
                            handleDns(srcIp, dstIp, srcPort, payload, output)
                        } catch (e: Exception) {
                            Log.w(Constants.LOG_TAG, "DNS handling error: ${e.message}")
                        }
                    }
                } else {
                    executor.execute {
                        try {
                            udpRelay.handle(srcIp, dstIp, srcPort, dstPort, payload)
                        } catch (e: Exception) {
                            Log.w(Constants.LOG_TAG, "UDP relay error: ${e.message}")
                        }
                    }
                }
            }
            6 -> { // TCP
                try {
                    tcpRelay.handle(packet, ihl, srcIp, dstIp)
                } catch (e: Exception) {
                    Log.w(Constants.LOG_TAG, "TCP relay error: ${e.message}")
                }
            }
            else -> return // ICMP and others not relayed; Android apps can't open raw ICMP sockets anyway.
        }
    }

    private fun handleDns(srcIp: ByteArray, dstIp: ByteArray, srcPort: Int, dnsQuery: ByteArray, output: FileOutputStream) {
        Log.i(Constants.LOG_TAG, "DNS query captured: ${dnsQuery.size}B from port $srcPort")
        val response = DnsOverTlsForwarder.forward(this, underlyingNetwork, Constants.LOCKED_PRIVATE_DNS_HOST, dnsQuery) ?: return
        val reply = PacketUtils.buildUdpPacket(
            srcIp = dstIp, // swapped: we reply *from* the fake DNS server
            dstIp = srcIp,
            srcPort = 53,
            dstPort = srcPort,
            payload = response
        )
        Log.i(Constants.LOG_TAG, "Writing ${reply.size}B DNS reply back to tun for port $srcPort")
        synchronized(output) { output.write(reply) }
    }

    private fun startForegroundNotification() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                Constants.VPN_NOTIFICATION_CHANNEL,
                "Device DNS lockdown",
                NotificationManager.IMPORTANCE_MIN
            )
            manager?.createNotificationChannel(channel)
        }
        val notification = Notification.Builder(this, Constants.VPN_NOTIFICATION_CHANNEL)
            .setContentTitle("Lockdown MDM")
            .setContentText("Enforcing locked DNS policy")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build()
        startForeground(Constants.VPN_NOTIFICATION_ID, notification)
    }
}

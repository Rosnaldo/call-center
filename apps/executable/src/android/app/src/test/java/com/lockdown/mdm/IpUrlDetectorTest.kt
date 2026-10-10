package com.lockdown.mdm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class IpUrlDetectorTest {

    private fun blocked(text: String) = assertTrue(text, IpUrlDetector.isPublicIpUrl(text))
    private fun allowed(text: String) = assertFalse(text, IpUrlDetector.isPublicIpUrl(text))

    @Test
    fun blocksDottedIpv4WithOrWithoutScheme() {
        blocked("103.119.217.84")
        blocked("103.119.217.84/video/1?x=2")
        blocked("http://103.119.217.84")
        blocked("https://103.119.217.84:8443/path")
        blocked("http://user@103.119.217.84/")
        blocked("103.119.217.84.")
    }

    @Test
    fun blocksDisguisedIpv4WithScheme() {
        blocked("http://1735907668") // 103.119.217.84 as one number
        blocked("http://0x67.0x77.0xd9.0x54")
        blocked("http://0147.0167.0331.0124")
        blocked("http://103.119.55636")
    }

    @Test
    fun blocksPublicIpv6() {
        blocked("http://[2001:db8::1]/")
        blocked("[2606:4700:4700::1111]")
    }

    @Test
    fun allowsLocalAddresses() {
        allowed("192.168.0.1")
        allowed("http://10.0.0.1/admin")
        allowed("127.0.0.1:8080")
        allowed("172.20.1.1")
        allowed("http://[::1]/")
        allowed("http://[fe80::1]/")
    }

    @Test
    fun allowsDomainsAndSearches() {
        allowed("google.com")
        allowed("https://www.example.com/103.119.217.84")
        allowed("2024") // a typed number is a search, not http://0.0.7.232
        allowed("103.119") // still being typed
        allowed("android 1.2.3.4")
        allowed("")
        allowed("256.1.1.1")
    }

    @Test
    fun parsesIpv4LikeBrowsers() {
        assertEquals(0x677e3f54L, IpUrlDetector.parseIpv4("103.126.63.84"))
        assertEquals(1736955220L, IpUrlDetector.parseIpv4("1736955220"))
        assertEquals(null, IpUrlDetector.parseIpv4("1.2.3.4.5"))
        assertEquals(null, IpUrlDetector.parseIpv4("1.256.3.4"))
    }
}

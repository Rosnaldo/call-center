# Lockdown MDM

An Android Device Owner app that locks down a phone to an organization's policy:

- Private DNS pinned to `b33522.dns.nextdns.io` and locked so the user can't change it.
- Play Store stays usable, but only a fixed allowlist of apps is permitted — anything else
  gets silently uninstalled the moment it's installed.
- All of the above can only be changed via a password-protected admin channel driven from a PC
  via `adb`.

Built and validated end-to-end on a real device (Moto E6 Plus, Android 9 / API 28) — see
**Verified on real hardware** below for exactly what was tested and what it looked like.

## What was built

A full Android Studio/Gradle project implementing this as a **Device Owner** app (the
standard Android mechanism for exactly this kind of lockdown — parental control / corporate
kiosk apps use the same APIs). It compiles and produces real, installable APKs
(`output/LockdownMDM-release.apk` and `output/LockdownMDM-debug.apk`).

How it enforces each requirement:

- **DNS lock** — on Android 10+ (API 29), sets Private DNS to `b33522.dns.nextdns.io` via
  `DevicePolicyManager.setGlobalPrivateDnsModeSpecifiedHost`, then applies the
  `DISALLOW_CONFIG_PRIVATE_DNS` restriction (Android 11+/API 30) so the field is greyed out in
  Settings. **On Android 9 (API 28), neither of those APIs exists at all** — there is a
  VPN-based fallback for that case, see below.
- **App allowlist** — Play Store stays usable; `PackageEventReceiver` watches every install and
  silently uninstalls anything not in the allowlist (the apps listed in `Constants.kt`, plus
  the Play Store package itself so it can keep functioning). Sideloading is also blocked
  (`DISALLOW_INSTALL_UNKNOWN_SOURCES[_GLOBALLY]`), and on top of that **all installs and
  updates are blocked outright** (`DISALLOW_INSTALL_APPS`) — the unknown-sources restriction
  alone doesn't cover `adb install`/`adb install -r`, which bypass it entirely, so without this
  second restriction the app's own APK could be silently replaced via adb with no password
  involved. Both restrictions lift only via the password-gated `unlock_installs` command (see
  below), which is what makes *any* APK install or update — including updates to this app
  itself — require the password. The trade-off: allowlisted apps also stop getting silent Play
  Store updates while locked, since Android has no way to scope either restriction to a single
  package or source.
- **Admin control channel** — `CommandProcessor` holds the actual command logic (password
  check + dispatch), reachable two ways:
  - **`ControlChannelService`** (primary) — polls a command file dropped via `adb push`,
    writes the result to a result file for `adb pull`/`cat`. This exists because, once the app
    is Device Owner, some Android builds block `adb`/shell from directly starting activities,
    services, or sending explicit broadcasts to its components — confirmed on the test device
    via `dumpsys activity broadcasts` (broadcasts to it never got dispatched, `dispatchClockTime`
    stuck at epoch). Plain file transfer via `adb push`/`pull` is a different code path and is
    unaffected.
  - **`AdbControlReceiver`** (secondary) — the original broadcast-based channel, kept for
    devices/OS versions that don't block it.
  - Commands: `status`, `unlock_dns`/`lock_dns` (optional `arg=<host>`),
    `unlock_installs`/`lock_installs`, `add_app`/`remove_app` (`arg=<package>`), `list_apps`.

### VPN-based DNS fallback (Android < 10 / API < 29)

`LocalVpnService` establishes a `VpnService` tunnel that captures the **full default route**
(`0.0.0.0/0`). An earlier version tried a narrower route (only the fake DNS server address),
on the theory that a VPN can selectively intercept just DNS while leaving everything else
alone — but on a real device this still made the VPN the OS's preferred *default* network
for general traffic (VPNs are scored above physical networks), with no route for anything but
the DNS address, which broke every other connection with no fallback to the real network.
Capturing everything and relaying it ourselves is the only way to keep general connectivity
working while still redirecting DNS:

- **DNS** (`DnsOverTlsForwarder`) — UDP:53 packets are parsed, forwarded to
  `b33522.dns.nextdns.io` over **DNS-over-TLS** (RFC 7858), and the answer wrapped back into a
  reply packet. It connects directly to NextDNS's anycast IPs (`45.90.28.0` / `45.90.30.0`)
  rather than resolving the hostname through the normal system resolver, because this app's own
  DNS lookups would otherwise route through its own VPN — a circular dependency that always
  fails.
- **Everything else** (`TcpRelay`, `UdpRelay`) — transparently relayed to its real destination:
  TCP terminates the client's connection locally (a real 3-way handshake) and opens a real
  socket to the destination, shuttling bytes both ways; UDP gets a real per-flow socket the
  same way. Neither implements a general-purpose TCP/IP stack (no retransmission/reordering
  logic, no congestion control) — safe to skip because packets injected into the tun are
  delivered to the client app entirely inside this device's own kernel, not over a lossy wire.

`DevicePolicyManager.setAlwaysOnVpnPackage(..., lockdownEnabled = true)` locks it in place; a
device owner can set this without a user consent dialog and the user cannot disable it from
Settings.

**Binding outgoing sockets**: every real socket the relay opens has to be excluded from the
VPN's own `0.0.0.0/0` route, or its own traffic loops back into the tunnel. The standard API
for this is `VpnService.protect()` — but on the real test device it was found to be
**unreliable**: the exact same call (same `VpnService` instance, same thread pool, same
destination), calling `DnsOverTlsForwarder`'s already-working code from a different call site,
would return `false` consistently, even with retries and serialization. Fixed by binding
sockets directly to the real underlying network instead — `Network.bindSocket()`
(`PacketUtils.bindOrProtect`, falls back to `protect()` if no network is found) — a more
explicit, modern API for the same purpose that doesn't share whatever is flaky in `protect()`'s
implementation on this device (a MediaTek-customized `ConnectivityService`, per the crash log
seen fixing the permission this needs).

## Verified on real hardware

Tested live on a Motorola Moto E6 Plus (Android 9, API 28) via `adb`:

- Device Owner provisioning (`dpm set-device-owner`) — confirmed active via
  `dumpsys device_policy`.
- Allowlist enforcement — pre-existing non-allowlisted apps (Google Docs/Sheets/Slides,
  Magazines) were automatically targeted for silent removal on every boot, and a freshly
  installed disallowed app (a game, installed live via Play Store during testing) was detected
  and removed correctly. Earlier revisions of this doc blamed persistent `DELETE_FAILED_USER_RESTRICTED`
  failures on OEM protection of those specific packages - that was wrong. It was
  `DISALLOW_UNINSTALL_APPS`, a restriction this app itself was setting to stop the user
  manually uninstalling *allowed* apps, which turned out to also block this app's own silent
  removal of *disallowed* ones - confirmed when the freshly-installed game hit the exact same
  error and stayed installed indefinitely, un-removable, despite being repeatedly targeted.
  Fixed by switching to `DevicePolicyManager.setUninstallBlocked()` (a per-package block, set
  only on allowed apps) instead of the broad restriction, which doesn't have this problem -
  the existing `Uninstalled disallowed package ...` log lines now actually mean it worked.
- VPN DNS + full relay — confirmed the complete pipeline with **real apps** in the foreground
  (Chrome loading `example.com` and a Google search, Google Maps), not just `adb shell`
  commands (shell/system UIDs are excluded from per-app VPN routing, so testing from
  `adb shell ping` gives a false negative/positive either way). Pages load fully over HTTPS;
  Maps reaches Google's real backend. DNS queries are captured, forwarded over DNS-over-TLS to
  NextDNS, and answered:
  ```
  DNS query captured: 41B from port 51042
  DoT forward to b33522.dns.nextdns.io via 45.90.28.0 OK (41B query -> 81B response)
  Writing 109B DNS reply back to tun for port 47777
  ```
- Five bugs found and fixed only by testing on real hardware (none would show up in a
  build/compile check), roughly in the order they surfaced:
  1. **Crash**: the DNS-lock code path called a `DevicePolicyManager` method that doesn't exist
     before API 29 — fine at compile time (compiles against API 34), `NoSuchMethodError` at
     runtime on this API 28 device. Fixed with an `isDnsLockSupported()` guard.
  2. **Silent regression**: an early narrow-route VPN design let DNS work but silently broke
     all other connectivity (Chrome: `ERR_NETWORK_ACCESS_DENIED`) because the VPN became the
     OS's default network without providing general routing. Fixed by capturing the full route
     and relaying everything ourselves (`TcpRelay`/`UdpRelay`).
  3. **Circular dependency**: the DoT forwarder resolved its upstream hostname through the
     normal system resolver, which routed through this app's own VPN — needing itself to
     already work to resolve the address it needed to connect to. Fixed by dialing NextDNS's
     anycast IP directly and using the hostname only for TLS SNI.
  4. **Silent thread death**: the tun-reading thread exited permanently on its first transient
     read error instead of retrying, leaving the VPN looking "connected" at the OS level while
     doing nothing.
  5. **Unreliable `protect()`**: real TCP connections timed out consistently even though the
     identical `protect()` call succeeded reliably elsewhere. Traced (via literal identity-hash
     logging across call sites) to `VpnService.protect()` itself being flaky on this device's
     MediaTek-customized connectivity stack, not to anything about which code called it. Fixed
     by binding sockets to the real network directly (`Network.bindSocket()`) instead.

Not yet exercised live: the native (non-fallback) DNS lock path, since that requires an
Android 10+ device and only Android 9 hardware was available for testing. The allowlist and
control-channel logic are identical on that path; only the two `DevicePolicyManager` calls
differ (guarded by `PolicyEnforcer.isDnsLockSupported()`), so risk there is low but unverified.

## How you'd use it

### 1. One-time setup

The device must have **no accounts added yet** (factory reset or fresh profile) — this is an
Android platform requirement for becoming Device Owner, not something this app controls.

```
adb install output/LockdownMDM-release.apk
adb shell dpm set-device-owner com.lockdown.mdm/.AdminReceiver
```

This immediately locks DNS (or starts the VPN fallback on API < 29) and starts allowlist
enforcement. A reboot (or first unlock after one — Android won't deliver `BOOT_COMPLETED` to a
non-direct-boot-aware app like this one until the device has been unlocked at least once) also
re-applies everything via `BootReceiver`.

### 2. Changing settings later (password `1234`)

Primary channel — drop a command file, read back the result:

```
cat > command.txt <<EOF
password=1234
cmd=add_app
arg=com.spotify.music
EOF
adb push command.txt /sdcard/Android/data/com.lockdown.mdm/files/command.txt
sleep 3
adb shell cat /sdcard/Android/data/com.lockdown.mdm/files/result.txt
```

Secondary channel (works on devices that don't block shell → device-owner-component access):

```
adb shell am broadcast -a com.lockdown.mdm.ADMIN_ACTION -n com.lockdown.mdm/.AdbControlReceiver \
    --es password 1234 --es cmd status
```

Full command list: `status`, `unlock_dns`, `lock_dns` (optional `arg=<host>`),
`unlock_installs`, `lock_installs`, `add_app` (`arg=<package>`),
`remove_app` (`arg=<package>`), `list_apps`,
`set_schedule` (`arg=<package>:<HH:MM>-<HH:MM>[@<days>]`),
`clear_schedule` (`arg=<package>`), `list_schedules`.

Example - restrict 99 (`com.taxis99`) to 15:00-18:00 daily:

```
cat > command.txt <<EOF
password=1234
cmd=set_schedule
arg=com.taxis99:15:00-18:00
EOF
adb push command.txt /sdcard/Android/data/com.lockdown.mdm/files/command.txt
```

The optional `@<days>` suffix restricts which days the window even applies on (any other day
the app stays suspended all day, regardless of the time range): `weekend`, `weekday`/`weekdays`,
`all`/`daily`, or a comma list of 3-letter abbreviations (`sun,mon,tue,wed,thu,fri,sat`). An
equal start/end time (`00:00-00:00`) means "all day", since `HH:MM` can't otherwise express a
full 24h span - combine it with `@weekend` to allow an app only on Saturday/Sunday, all day.

Example - allow YouTube (`com.google.android.youtube`) only on weekends:

```
cat > command.txt <<EOF
password=1234
cmd=set_schedule
arg=com.google.android.youtube:00:00-00:00@weekend
EOF
adb push command.txt /sdcard/Android/data/com.lockdown.mdm/files/command.txt
```

### 3. Rebuilding

```
./generate_apk.sh
```

Optionally override at build time without touching source permanently:

```
DNS_HOST=custom.dns.example ADMIN_PASSWORD=secret ./generate_apk.sh
```

The script patches `Constants.kt`, builds, then restores the original source — only the
password's SHA-256 hash ends up embedded in the APK, never the plaintext.

### 4. Time-based app schedules

`ScheduleStore` + `ScheduleEnforcer` restrict an allowed app to a daily time window (e.g. 99 /
`com.taxis99` usable only 15:00-18:00). Outside the window the app is *suspended* via
`DevicePolicyManager.setPackagesSuspended` - the standard Android mechanism for temporarily
blocking an app without touching its data:

- The app stays installed, its icon stays on the launcher (shown greyed out).
- Tapping it shows Android's own device-owner dialog: **"Can't open this app - If you have
  questions, contact your IT admin."** No custom UI needed.
- Reversible instantly, no data loss, no network required.

Other blocking approaches considered and rejected:
- **`setApplicationHidden`** - removes the icon entirely, as if uninstalled. Works, but gives
  the user no indication it's a schedule rather than a removal.
- **Uninstall/reinstall on a timer** - loses app data, depends on Play Store/network being
  available at the exact moment, slow, unreliable. Rejected outright.
- **Per-app network/DNS blocking during off-hours** - would need to change what the VPN routes
  per app and re-establish the tunnel, is Android-version-dependent (the native DNS lock path
  on API 29+ doesn't use a VPN at all), and doesn't stop an app that still works from cache/
  offline. Suspension is simpler and version-independent.

`ScheduleEnforcer.enforce()` runs on every `ControlChannelService` poll tick (every 2s) and once
at boot via `PolicyEnforcer.reapplyPolicy()`, so a device that boots up mid-restricted-window
starts correctly suspended immediately, and both suspend/unsuspend transitions were confirmed
live within a couple of seconds of the boundary.

### 5. Content filtering (adult content, etc.)

Not something this app implements in code — it doesn't need to. Every DNS query on the device
already goes through the NextDNS profile `b33522`, so category-based filtering is a NextDNS
dashboard setting, applying instantly and device-wide (every app, every in-app WebView, not
just a browser):

1. https://my.nextdns.io/b33522/parentalControl
2. Toggle on **Adult Content** (and any other categories wanted — Safe Search enforcement for
   Google/Bing/YouTube is also available there)

This matters more than it might seem: Chrome (or whatever browser ships with the device) is a
**pre-installed system app**, and the allowlist enforcement deliberately never uninstalls
system apps (removing one could break the OS - see `PolicyEnforcer.isSystemApp`). So a browser
stays on the device regardless of the allowlist, and the NextDNS-side filter is the actual
mechanism doing the blocking, not an optional extra.

### 6. Tamper resistance

Two layers, found necessary by testing on real hardware - `setAlwaysOnVpnPackage(...,
lockdownEnabled = true)` alone was not enough:

- **`DISALLOW_CONFIG_VPN`** (`PolicyEnforcer.applyDnsPolicy`) - a device-owner user restriction
  that, per the platform docs, "also blocks configuring always-on VPN in the Settings app".
  Without it, the phone's Settings > VPN screen still showed a working "Forget VPN" option
  despite `lockdownEnabled=true`. With it, opening VPN settings at all now shows Android's
  standard device-owner block dialog: "Action not allowed - If you have questions, contact your
  IT admin." Confirmed live. This also closes a more obvious bypass: without it, a user could
  just configure a *different* VPN app to route around the DNS filtering entirely, independent
  of whether our own VPN can be removed.
- **Watchdog** - belt-and-suspenders for whatever the restriction above doesn't catch (e.g. if
  it's cleared some other way, or on an OS/OEM build where it doesn't hold either).
  `ControlChannelService`'s poll loop re-runs `PolicyEnforcer.reapplyPolicy()` (re-locks DNS,
  re-applies install restrictions, re-sweeps the allowlist) every
  `Constants.WATCHDOG_INTERVAL_MS` (15s), independent of any command being sent. Confirmed live
  by manually clearing the `always_on_vpn_app` secure setting via `adb` and watching it get
  restored automatically within one cycle. This bounds tampering to a short window rather than
  making it impossible - a user with `adb`/developer-options access repeatedly clearing it
  faster than the interval could still maintain a gap.

## Known constraints

- Device Owner can only be set on a device with no Google/other accounts configured — an
  Android platform rule. If the target phone already has an account, it needs a factory reset
  first.
- `BOOT_COMPLETED` (and generally any component of this app) won't fire until the device has
  been unlocked once after boot — this app isn't direct-boot-aware. Not fixable without adding
  direct-boot-aware components, which would need to handle running before credential-encrypted
  storage is available.
- The VPN DNS fallback only intercepts UDP-based DNS (the overwhelming majority of real-world
  DNS traffic). An app doing DNS-over-TCP directly to port 53 would have that connection
  relayed like any other TCP traffic - straight to the fake DNS address, which isn't a real
  host, so it would fail to connect rather than being answered. Accepted as a rare, documented
  gap rather than adding TCP:53 as a second special case.
- `TcpRelay`/`UdpRelay` are a minimal relay, not a general-purpose TCP/IP stack: no
  retransmission or reordering handling on the client-facing side (not needed - see the VPN
  fallback section above for why), no TCP options beyond MSS, no IPv6.
- A device owner app cannot be silently removed via `adb uninstall`/`pm uninstall`/`pm clear`
  (confirmed: all three refuse with a "protected package" or `DEVICE_POLICY_MANAGER` error).
  Decommissioning requires either the app relinquishing itself
  (`DevicePolicyManager.clearDeviceOwnerApp`, not currently wired to a command) or a factory
  reset. That built-in protection only covers *uninstall*, though — `adb install -r` (an
  in-place update) is a different code path that the OS does **not** block for a device-owner
  package on its own; that's why `DISALLOW_INSTALL_APPS` (see the app allowlist section above)
  is needed to require the password before an update can land too.


adb -s da994377 install -r output/LockdownMDM-release.apk
adb -s da994377 shell dpm set-device-owner com.lockdown.mdm/.Adm
#!/bin/sh
# router-setup.sh
# Run this ONCE via SSH on a freshly flashed OpenWrt router.
# Sets up the captive portal, firewall rules, and cron job.
#
# Usage:
#   scp -r router-files/* root@192.168.1.1:/
#   ssh root@192.168.1.1 'sh /tmp/router-setup.sh'
#
# Or paste this whole script into an SSH session.

set -e
echo "==> VoucherWave Router Setup"

# ── 1. Set permissions ───────────────────────────────────────────
chmod +x /www/cgi-bin/redeem
chmod +x /usr/bin/add-vouchers.sh
chmod +x /usr/bin/check-sessions.sh
chmod +x /usr/bin/voucher-status.sh
echo "    [ok] Permissions set"

# ── 2. Create empty vouchers file ───────────────────────────────
touch /etc/wifi_vouchers
echo "    [ok] Vouchers file ready"

# ── 3. Firewall rules ────────────────────────────────────────────
# Allow DNS + DHCP (devices need IP and can resolve router)
# Allow router web server (port 80 = captive portal)
# Block all forwarded traffic by default

cat >> /etc/firewall.user << 'FWEOF'

# === VoucherWave captive portal ===
# Allow DHCP and DNS so clients get an IP and see the portal
iptables -I INPUT -p udp --dport 67 -j ACCEPT
iptables -I INPUT -p udp --dport 53 -j ACCEPT
iptables -I INPUT -p tcp --dport 53 -j ACCEPT
# Allow captive portal web server
iptables -I INPUT -p tcp --dport 80 -j ACCEPT
# Block all internet forwarding by default (voucher opens it per-MAC)
iptables -A FORWARD -j DROP
FWEOF

/etc/init.d/firewall restart
echo "    [ok] Firewall rules applied"

# ── 4. DNS redirect — all domains → router IP ───────────────────
# This makes captive portal detection work on iOS/Android/Windows
uci set dhcp.@dnsmasq[0].address='/#/192.168.1.1'
uci commit dhcp
/etc/init.d/dnsmasq restart
echo "    [ok] DNS redirect configured"

# ── 5. Enable CGI on uhttpd ─────────────────────────────────────
uci set uhttpd.main.interpreter='.sh=/bin/sh'
uci commit uhttpd
/etc/init.d/uhttpd restart
echo "    [ok] CGI enabled on uhttpd"

# ── 6. Cron job — check sessions every 5 minutes ────────────────
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/bin/check-sessions.sh") \
    | sort -u | crontab -
/etc/init.d/cron enable
/etc/init.d/cron start
echo "    [ok] Cron job installed"

echo ""
echo "==> Setup complete. Router is ready."
echo "    Connect a device to WiFi and open any webpage to test."

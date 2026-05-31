#!/bin/sh
# /usr/bin/voucher-status.sh
# Returns JSON with voucher and session counts.
# Called remotely by the VoucherWave Node.js app via SSH.

VOUCHERS_FILE="/etc/wifi_vouchers"
SESSIONS_DIR="/tmp/wifi_sessions"

UNUSED=$(grep -c ":unused$" "$VOUCHERS_FILE" 2>/dev/null || echo 0)
USED=$(grep -c ":used$"     "$VOUCHERS_FILE" 2>/dev/null || echo 0)
ACTIVE=$(ls "$SESSIONS_DIR" 2>/dev/null | wc -l | tr -d ' ')

echo "{\"unused\":$UNUSED,\"used\":$USED,\"active\":$ACTIVE}"

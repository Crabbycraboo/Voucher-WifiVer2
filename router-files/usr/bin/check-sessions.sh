#!/bin/sh
# /usr/bin/check-sessions.sh
# Run by cron every 5 minutes to disconnect expired sessions.
# Add to /etc/crontabs/root:
#   */5 * * * * /usr/bin/check-sessions.sh

SESSIONS_DIR="/tmp/wifi_sessions"
SESSION_DURATION=7200   # 2 hours in seconds

[ -d "$SESSIONS_DIR" ] || exit 0

NOW=$(date +%s)

for SESSION_FILE in "${SESSIONS_DIR}"/*; do
    [ -f "$SESSION_FILE" ] || continue

    MAC=$(basename "$SESSION_FILE")
    START=$(cat "$SESSION_FILE" 2>/dev/null)
    [ -z "$START" ] && continue

    ELAPSED=$(( NOW - START ))

    if [ "$ELAPSED" -ge "$SESSION_DURATION" ]; then
        logger -t wifi-voucher "Session expired for $MAC (${ELAPSED}s)"

        # Remove iptables rule
        iptables -D FORWARD -m mac --mac-source "$MAC" -j ACCEPT 2>/dev/null

        # Kick device off WiFi (forces reconnect → sees portal again)
        iw dev wlan0 station del "$MAC" 2>/dev/null

        # Clean up session file
        rm -f "$SESSION_FILE"
    fi
done

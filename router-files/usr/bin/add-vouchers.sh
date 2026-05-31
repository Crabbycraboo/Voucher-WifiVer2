#!/bin/sh
# /usr/bin/add-vouchers.sh
# Called remotely by the VoucherWave Node.js app via SSH.
# Usage: add-vouchers.sh CODE1 CODE2 CODE3 ...

VOUCHERS_FILE="/etc/wifi_vouchers"

for CODE in "$@"; do
    CODE=$(echo "$CODE" | tr '[:lower:]' '[:upper:]')
    if ! grep -q "^${CODE}:" "$VOUCHERS_FILE" 2>/dev/null; then
        echo "${CODE}:unused" >> "$VOUCHERS_FILE"
        echo "Added: $CODE"
    else
        echo "Skipped (duplicate): $CODE"
    fi
done

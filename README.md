# VoucherWave — Cafe WiFi Voucher Manager

A lightweight Node.js dashboard for generating and pushing timed WiFi voucher codes to OpenWrt routers.

## Stack
- **Backend**: Node.js + Express
- **SSH**: node-ssh (pushes codes to routers remotely)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)

---

## Local Setup

```bash
npm install
cp .env.example .env
# Edit .env with your router details and admin password
npm run dev
```

Open `http://localhost:3000`

---

## Deployment

### ✅ Railway (Recommended)

Railway is the right choice here — **Vercel won't work** because:
- Vercel is serverless (functions time out at 10s, SSH connections need persistent processes)
- Vercel has no persistent filesystem
- `node-ssh` needs a real Node.js server process

**Deploy to Railway:**

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Go to **Variables** tab and add each value from `.env.example`:
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `ROUTERS` (paste the full JSON array)
5. Railway auto-detects Node.js and runs `npm start`
6. Your app is live at `https://your-app.up.railway.app`

> Railway free tier: 500 hours/month. $5/month hobby plan for always-on.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Password to log into the dashboard |
| `SESSION_SECRET` | Random string for session signing |
| `PORT` | Set automatically by Railway |
| `ROUTERS` | JSON array of router configs (see below) |

### ROUTERS format

```json
[
  {
    "id": "cafe-01",
    "name": "Branch 1 - Makati",
    "host": "203.0.113.10",
    "username": "root",
    "password": "routerpassword"
  },
  {
    "id": "cafe-02",
    "name": "Branch 2 - BGC",
    "host": "203.0.113.11",
    "username": "root",
    "privateKeyPath": "/etc/ssh/id_rsa"
  }
]
```

---

## Router Reachability

Your Node.js app needs to reach the routers via SSH. Options:

### Option A — Reverse SSH Tunnel (simplest, no extra packages)
Add to `/etc/rc.local` on each router:
```sh
ssh -fNR 2201:localhost:22 your-server-user@your-server.com -o ServerAliveInterval=60 &
```
Then connect via `localhost:2201` in your router config.

### Option B — Wireguard VPN
Install `wireguard` on routers + your Railway server. More reliable for production.

### Option C — Direct IP (if routers have public IPs)
Just use the router's public IP directly. Works if your ISP gives static IPs.

---

## Router Scripts Required

Each deployed router needs these scripts from the main setup guide:
- `/usr/bin/add-vouchers.sh` — accepts new codes
- `/usr/bin/voucher-status.sh` — returns JSON status

---

## Project Structure

```
wifi-voucher/
├── server.js          # Express entry point
├── routes/
│   └── api.js         # All API endpoints
├── lib/
│   ├── ssh.js         # SSH router communication
│   └── vouchers.js    # Code generation
├── public/
│   └── index.html     # Frontend dashboard
├── .env.example       # Config template
└── package.json
```

---

## Router Files (`router-files/`)

These go on each OpenWrt router you deploy to a cafe.

### File map

```
router-files/
├── router-setup.sh          ← run once after flashing
├── www/
│   ├── index.html           ← customer captive portal page
│   └── cgi-bin/
│       └── redeem           ← voucher validation CGI script
└── usr/bin/
    ├── add-vouchers.sh      ← called by Railway app via SSH
    ├── voucher-status.sh    ← called by Railway app via SSH
    └── check-sessions.sh   ← run by cron every 5 min
```

### Deploy to a new router

```bash
# 1. Copy all router files to the router
scp -r router-files/www/*      root@192.168.1.1:/www/
scp -r router-files/usr/*      root@192.168.1.1:/usr/
scp router-files/router-setup.sh root@192.168.1.1:/tmp/

# 2. SSH in and run setup (only once)
ssh root@192.168.1.1 'sh /tmp/router-setup.sh'

# 3. Done — connect a phone to WiFi and open any URL to test
```

### How the customer flow works

```
Customer connects to WiFi
        ↓
Opens any URL in browser
        ↓
DNS returns 192.168.1.1 for all domains
iptables redirects port 80 → router web server
        ↓
Customer sees /www/index.html (the voucher entry page)
        ↓
Enters code → browser calls /cgi-bin/redeem
        ↓
redeem script checks /etc/wifi_vouchers
marks code :used, records MAC + timestamp in /tmp/wifi_sessions
adds iptables ACCEPT rule for that MAC
        ↓
Customer is online. Timer counts down in browser.
        ↓
Every 5 min: check-sessions.sh checks elapsed time
At 2 hours: removes iptables rule, kicks device off WiFi
Customer sees portal again if they try to browse
```

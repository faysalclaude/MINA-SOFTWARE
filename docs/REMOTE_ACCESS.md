# Remote Access (outside school WiFi) — Tailscale, free

By default, MINA TEACHER only works when a device is on the **same WiFi**
as the server PC. This guide adds free, secure access from anywhere (a
parent checking from home, you checking from mobile data) — without paying
for anything or opening risky ports on your router.

## Why Tailscale

- **Free** for personal/small-team use, no credit card.
- Creates a private network between your devices — nothing is exposed to
  the public internet, no port-forwarding, no static IP needed.
- Once set up, the server gets a stable address like `100.x.x.x` that
  works from anywhere with internet, exactly like being on the school WiFi.

## Setup (do this once)

### 1. On the server PC (the one running `npm start`)

1. Go to https://tailscale.com/download and install Tailscale for your OS.
2. Open Tailscale, sign in (Google/Microsoft/GitHub account — free).
3. It will show a Tailscale IP address like `100.101.102.103`. Note it down.

### 2. On each device that needs remote access (your phone, a parent's phone)

1. Install the **Tailscale app** (Android/iOS/Windows/Mac — all free).
2. Sign in with **the same account**, or have the server owner invite them
   as a member of the same "tailnet" (Tailscale's Admin Console →
   Users → Invite).
3. Once connected, open a browser and go to:
   http://<server-tailscale-ip>:4000

   using the address from step 1 above — e.g. `http://100.101.102.103:4000`.

That's it — this now works from any WiFi or mobile data connection, not
just the school network.

## Notes

- The server PC must be **on and running** (`npm start`) for remote access
  to work, same as for local WiFi access — Tailscale doesn't change that.
- You can invite parents individually from the Tailscale Admin Console
  without giving them access to anything else on your network.
- If you'd rather not require every parent to install an app, the
  alternative is a **Cloudflare Tunnel**, which gives a public HTTPS link
  anyone can open in a plain browser — more convenient for parents, but a
  bit more setup on the server side. Ask if you want this guide instead/also.

# 💧 Tap & Drink — Water Reminder PWA

A minimal, beautiful water intake tracker built with **Next.js 14 (App Router)**, **Tailwind CSS**, **Dexie (IndexedDB)**, and **Web Push (VAPID)**.

## Features

| Feature | Detail |
|---|---|
| 🍾 One-tap logging | 250 ml per tap, stored locally in IndexedDB |
| 📊 Daily progress | Arc ring + fill animation on the bottle |
| ⏰ Smart reminders | Background push if you haven't logged in N minutes |
| ⚙️ Settings | Daily goal (1.5–3.5 L) + reminder interval (30–120 min) |
| 📱 PWA | Installable, offline-capable via Service Worker |
| 🔔 Web Push | VAPID push from the Next.js API — works even when tab is closed |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate VAPID keys
npm run gen:vapid
# → Copy the three lines into .env.local

# 3. Create .env.local
cp .env.local.example .env.local
# paste in your VAPID keys

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome / Edge and click **Install** in the address bar.

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your public key>
VAPID_PRIVATE_KEY=<your private key>
VAPID_SUBJECT=mailto:you@example.com
```

> **Note:** Push notifications work without VAPID keys — the app falls back to the browser Notification API (works while the tab is open or backgrounded). VAPID enables true background push.

---

## Architecture

```
app/
  page.tsx              ← Single-screen UI
  layout.tsx            ← SW registration + meta
  globals.css           ← Ocean theme, animations
  api/
    vapid-public-key/   ← Expose public key to client
    push/subscribe/     ← Store PushSubscription (in-memory, swap for DB)
    push/send/          ← Send reminder to all subscribers

components/
  DrinkButton.tsx       ← SVG bottle with fill + ripple
  ProgressArc.tsx       ← SVG progress ring
  SettingsPanel.tsx     ← Slide-up drawer

lib/
  db.ts                 ← Dexie schema + helpers
  vapid.ts              ← web-push VAPID config
  usePushReminder.ts    ← Reminder timer + subscription hook

public/
  sw.js                 ← Service worker (cache + push handler)
  manifest.json         ← PWA manifest
```

---

## Reminder Flow

```
User taps bottle
  └─► logDrink() saved to IndexedDB
  └─► recordActivity() resets countdown timer

Timer fires (e.g. 60 min since last tap)
  └─► POST /api/push/send  (server sends VAPID push)
  └─► Fallback: browser Notification API

Service Worker receives push
  └─► showNotification()
  └─► "Log 250 ml" action → postMessage → handleTap()
```

---

## Production Notes

- **Subscriptions** are stored in-memory (`Map`) — replace `app/api/push/subscribe/route.ts` with a real DB for persistence across server restarts.
- **PWA icons** — replace `/public/icons/icon-192.png` and `icon-512.png` with real PNGs.
- **Periodic background sync** — for true no-server reminders on supported browsers, register a `periodicsync` event in `sw.js`.

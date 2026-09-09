# Shared Care Log — Setup Guide

A transparent co-parenting tracker for both parents:

- **Poo log** — one tap on open, with time-since-last front and center
- **Custody calendar** — month view showing whose day it is, plus poo markers
- **Requests** — swaps, supplies, pickups, with acknowledge/done statuses
- **History** — a permanent, append-only feed of everything both parents do

## Design principles (read this first)

This app is deliberately **not** disguised as anything. It's a shared tool
both parents use with **identical access**:

- Every entry is labeled with who logged it, plus when it was recorded.
- Poo entries and history events are **append-only**: they can be flagged
  as mistakes (shown crossed out) but never edited or deleted. The database
  rules below enforce this server-side — neither parent, including whoever
  set the app up, can rewrite history.
- Custody days can be reassigned (schedules change), but every change is
  logged to the permanent history feed.

Being open about who built it plus tamper-evident records is what makes the
data credible to the other parent — and to anyone else who ever looks at it.
If your situation may end up in mediation or court, consider a recognized
neutral service (OurFamilyWizard, TalkingParents, AppClose) instead of or
alongside this.

## Files

- `index.html` → the whole app (works on phones; Material 3 design)
- `SETUP.md`   → this guide

## Demo mode vs live mode

Out of the box the app runs in **DEMO mode** (badge in the top bar): data is
stored only in the browser on that device. That's fine for trying it out.
To actually share data between both parents, connect Firebase below — the
badge switches to **SHARED**.

---

## Step 1 — Firebase setup

1. Go to https://console.firebase.google.com
2. Create a new project (e.g. `care-log`) — use a **separate project** from
   any other apps you run (don't reuse the PSP production project)
3. Go to **Realtime Database** → Create database → locked mode
4. Go to **Project Settings** → **General** → "Your apps" → **</>** (Web
   app) → Register app → copy the `firebaseConfig` values

## Step 2 — Add the config

Open `index.html`, find the `window.firebaseConfig` block near the top, and
replace the `REPLACE_*` placeholders with your values (including
`databaseURL` from the Realtime Database page).

## Step 3 — Database rules (this is what makes it append-only)

In **Realtime Database → Rules**, paste:

```json
{
  "rules": {
    "coparenting": {
      ".read": true,
      "settings": { ".write": true },
      "custody":  { "$day": { ".write": true } },
      "poops": {
        "$id": {
          ".write": "!data.exists()",
          "voided": { ".write": "!data.exists()" }
        }
      },
      "events": {
        "$id": { ".write": "!data.exists()" }
      },
      "requests": {
        "$id": {
          ".write": "!data.exists()",
          "status":  { ".write": true },
          "updates": { "$uid": { ".write": "!data.exists()" } }
        }
      }
    }
  }
}
```

What this enforces, for **everyone** including the person who set it up:

- A poo entry, history event, or request message can be **created once and
  never changed or deleted** (`.write` only when no data exists yet).
- The only thing you can add to an existing poo entry is a one-time
  `voided` flag — the entry stays visible, crossed out.
- Custody days and request statuses stay editable, but the app writes a
  history event for every change, and those events are immutable.

> Note: anyone with the URL can read/write within these rules. For two
> parents sharing a private link that's usually acceptable; if you want
> real accounts, add Firebase Authentication and change `true` to
> `auth != null` in the rules above.

## Step 4 — Deploy

Any static host works:

- **Netlify**: drag the `coparenting-tracker` folder into
  https://app.netlify.com/drop, or add it as a site from this repo with
  publish directory `coparenting-tracker`
- Or GitHub Pages, Firebase Hosting, etc.

Send the URL to the other parent. On first open, each of you picks who you
are (names are editable in Settings ⚙️, along with your son's name); every
entry from that device is then labeled with that name.

## Step 5 — Add to home screen

On a phone, use "Add to Home Screen" in the browser menu so it opens like
an app — straight to the log-poo button.

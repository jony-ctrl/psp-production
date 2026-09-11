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

## Step 3 — Enable sign-in

In the Firebase console: **Authentication** → **Get started** →
**Sign-in method** → enable **Email/Password** (just the first toggle;
leave "Email link" off).

Each parent creates their own account in the app (email + password) and
then claims their side of the record — Mom or Dad. A side can only ever
be claimed by one account, and the claim is permanent.

## Step 4 — Database rules (append-only + accounts)

In **Realtime Database → Rules**, paste:

```json
{
  "rules": {
    "coparenting": {
      ".read": "auth != null && root.child('coparenting').child('members').child(auth.uid).exists()",
      "roles": {
        ".read": "auth != null",
        "$role": {
          ".write": "auth != null && !data.exists() && newData.val() === auth.uid && ($role === 'A' || $role === 'B')"
        }
      },
      "members": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && !data.exists() && root.child('coparenting').child('roles').child(newData.child('role').val()).val() === auth.uid"
        }
      },
      "settings": {
        ".write": "auth != null && root.child('coparenting').child('members').child(auth.uid).exists()"
      },
      "custody": {
        "$day": {
          ".write": "auth != null && root.child('coparenting').child('members').child(auth.uid).exists()"
        }
      },
      "poops": {
        "$id": {
          ".write": "auth != null && !data.exists() && newData.child('by').val() === root.child('coparenting').child('members').child(auth.uid).child('role').val()",
          "voided": {
            ".write": "auth != null && !data.exists() && newData.child('by').val() === root.child('coparenting').child('members').child(auth.uid).child('role').val()"
          }
        }
      },
      "events": {
        "$id": {
          ".write": "auth != null && !data.exists() && newData.child('by').val() === root.child('coparenting').child('members').child(auth.uid).child('role').val()"
        }
      },
      "requests": {
        "$id": {
          ".write": "auth != null && !data.exists() && newData.child('by').val() === root.child('coparenting').child('members').child(auth.uid).child('role').val()",
          "status": {
            ".write": "auth != null && root.child('coparenting').child('members').child(auth.uid).exists()"
          },
          "updates": {
            "$upd": {
              ".write": "auth != null && !data.exists() && newData.child('by').val() === root.child('coparenting').child('members').child(auth.uid).child('role').val()"
            }
          }
        }
      }
    }
  }
}
```

What this enforces, for **everyone** including the person who set it up:

- Only the two claimed accounts can read or write the record at all.
- A poo entry, history event, or request message can be **created once and
  never changed or deleted** (`.write` only when no data exists yet).
- **Attribution is server-enforced**: an entry's "who logged this" field
  must match the role of the signed-in account writing it — Mom's account
  cannot create entries labeled as Dad's, or vice versa.
- The only thing you can add to an existing poo entry is a one-time
  `voided` flag — the entry stays visible, crossed out.
- Custody days and request statuses stay editable by either parent, but
  the app writes a history event for every change, and those events are
  immutable.
- Each side (Mom/Dad) can be claimed by exactly one account, once, and
  an account can't claim a side as someone else.

## Step 5 — Deploy

Any static host works:

- **Netlify**: drag the `coparenting-tracker` folder into
  https://app.netlify.com/drop, or add it as a site from this repo with
  publish directory `coparenting-tracker`
- Or GitHub Pages, Firebase Hosting, etc.

Send the URL to the other parent. On first open, each of you creates an
account (email + password) and claims your side of the record — permanently.
Names are editable in Settings ⚙️, along with your son's name; every entry
is labeled with the name of the account that made it.

## Step 6 — Add to home screen

On a phone, use "Add to Home Screen" in the browser menu so it opens like
an app — straight to the log-poo button.

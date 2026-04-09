# PSP Production Tracker — Setup Guide

## Files
- `index.html`       → Floor logging page (workers use this)
- `dashboard.html`   → Manager dashboard with charts (password protected)
- `netlify.toml`     → Netlify config

---

## Step 1 — Firebase Setup

1. Go to https://console.firebase.google.com
2. Create a new project (e.g. "psp-production")
3. Go to **Firestore Database** → Create database → Start in production mode
4. Add this security rule so only authenticated writes are allowed
   (or keep test mode open during setup, then lock it down)

### Firestore Security Rules (recommended)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /production_logs/{doc} {
      allow read, write: if true; // tighten after testing
    }
  }
}
```

5. Go to **Project Settings** → **General** → scroll to "Your apps"
6. Click **</>** (Web app) → Register app
7. Copy the firebaseConfig object values

---

## Step 2 — Add Firebase Config

Open **both** `index.html` and `dashboard.html`.
Find this block in each and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "REPLACE_API_KEY",
  authDomain: "REPLACE_AUTH_DOMAIN",
  projectId: "REPLACE_PROJECT_ID",
  storageBucket: "REPLACE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_MESSAGING_SENDER_ID",
  appId: "REPLACE_APP_ID"
};
```

---

## Step 3 — Set Dashboard Password

In `dashboard.html`, find this line and change the password:

```js
const DASHBOARD_PASSWORD = "psp2024"; // ← change this
```

---

## Step 4 — Update Employee Names

In `index.html`, find the `EMPLOYEES` array and update with your actual sewer names:

```js
const EMPLOYEES = [
  "Ana Gabriela","Beatriz","Carmen", ...
];
```

---

## Step 5 — Deploy to Netlify

1. Go to https://app.netlify.com
2. Drag and drop the entire `psp-production` folder onto the Netlify deploy area
   (or connect your GitHub repo)
3. Done — your site is live!

---

## Firestore Index Note

The dashboard query uses two `orderBy` fields with a `where` clause.
Firebase will prompt you in the console to create a composite index on first load.
Click the link in the error and it will create it automatically.

Index needed: `production_logs` → `date` (ASC) + `timestamp` (DESC)

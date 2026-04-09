// netlify/functions/calendar.js
// Fetches upcoming events from Google Calendar using service account JWT auth
// Deployed as a Netlify serverless function — keeps private key off the client

const https = require("https");
const crypto = require("crypto");

const CALENDAR_ID = "c_dg0t80ti2g081afln3eomam260@group.calendar.google.com";

// Service account credentials (stored as Netlify env vars)
const SA_EMAIL    = process.env.GOOGLE_SA_EMAIL;
const SA_KEY_RAW  = process.env.GOOGLE_SA_KEY; // PEM string with literal \n

function base64url(buf) {
  return buf.toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function makeJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(Buffer.from(JSON.stringify({
    iss:   SA_EMAIL,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now
  })));

  const sigInput = `${header}.${payload}`;
  const key = SA_KEY_RAW.replace(/\\n/g, "\n");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(sigInput);
  const sig = base64url(sign.sign(key));

  return `${sigInput}.${sig}`;
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body);
    const opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": data.length
      }
    };
    const req = https.request(url, opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => resolve(JSON.parse(raw)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => resolve(JSON.parse(raw)));
    }).on("error", reject);
  });
}

exports.handler = async () => {
  try {
    // 1. Get access token
    const jwt = makeJWT();
    const tokenRes = await post(
      "https://oauth2.googleapis.com/token",
      `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    );

    if (!tokenRes.access_token) {
      return { statusCode: 500, body: JSON.stringify({ error: "Token fetch failed", detail: tokenRes }) };
    }

    // 2. Fetch upcoming events (next 30 days)
    const now    = new Date().toISOString();
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const calUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`
      + `?timeMin=${encodeURIComponent(now)}`
      + `&timeMax=${encodeURIComponent(future)}`
      + `&singleEvents=true&orderBy=startTime&maxResults=20`;

    const events = await get(calUrl, tokenRes.access_token);

    // Debug: return raw response if no items
    if (!events.items) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ debug: true, rawResponse: events, calendarId: CALENDAR_ID })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify(events.items || [])
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

# CSRF - Variant 1: GET-based Forged Action

**Course:** Cyber Security (IT-30001), Autumn Semester 2026 - IIIT Allahabad
**Category:** Cross-Site Request Forgery (CSRF)
**Variant:** Variant 1 - GET-based forged action
**Target action:** forced change of a logged-in user's account email (under *Login & security*)

A small Node.js web app, **ShopBase**, deliberately vulnerable to GET-based
CSRF, an attacker page that exploits it, and a one-flag mitigation that blocks
the same attack.

> **Zero dependencies.** Built-in Node modules only - no `npm install`. Needs
> Node.js (v18+; tested on v22).

---

## Ownership declaration (Table 3)

| Member name | Roll number | Category | Variant implemented |
|-------------|-------------|----------|---------------------|
| Karan Kandhare | IIT2024032 | CSRF | Variant 1 - GET-based forged action |

> Replace with your name and roll number before submitting.

---

## Project structure

```
.
├── app/
│   └── server.js               ShopBase app (vulnerable + mitigated via SECURE)
├── attacker/
│   ├── evil.html               the exploit page (click-to-claim)
│   └── attacker-server.js      serves evil.html cross-origin on port 4000
├── scripts/                    Windows one-click helpers (double-click to run)
│   ├── 1-start-attacker.bat
│   ├── 2-start-vulnerable-app.bat
│   └── 3-start-secure-app.bat
├── package.json
├── README.md                   this file
└── WRITEUP.md                  full Table 2 (a-e) answer + viva prep + line map
```

---

## Run it

Two modes from the same code, switched by the `SECURE` environment variable.
Run from the project root:

| Command | Mode | Behaviour |
|---------|------|-----------|
| `node app/server.js` | Vulnerable | no CSRF protection |
| `SECURE=1 node app/server.js` (PowerShell: `$env:SECURE=1; node app/server.js`) | Mitigated | synchronizer token required |

Attacker site (separate terminal; different port = different origin):

```
node attacker/attacker-server.js      # http://localhost:4000/evil.html
```

On Windows you can instead double-click the helpers in `scripts/`
(1 = attacker site, 2 = vulnerable app, 3 = mitigated app).

Demo account (pre-filled on the login form): **priya / password123**

---

## Demonstrating the exploit (item b)

1. Start the app vulnerable: `node app/server.js`
2. Start the attacker site: `node attacker/attacker-server.js`
3. Browser -> `http://localhost:3000`, log in as priya. Note the email under
   **Login & security**: `priya@shopbase.com`.
4. In the same browser (session cookie live), open `http://localhost:4000/evil.html`
   and click **Claim reward**.
5. The page shows a "processing -> reward added" flow; meanwhile the forged
   request has fired. Reload `http://localhost:3000/account` -> the email is now
   `attacker@evil.com`.

The Claim button runs:

```js
new Image().src = 'http://localhost:3000/account/update-email?email=attacker@evil.com';
```

A cross-site GET; the browser attaches priya's ShopBase session cookie
automatically, so the server treats it as genuine.

---

## Table 2 summary

- **(a) Vulnerable implementation** - `app/server.js`, route `GET /account/update-email`: updates the email straight from the query string, authorised only by the session cookie. No token, no method restriction, no origin check.
- **(b) Working exploit** - `attacker/evil.html` (served cross-origin on port 4000); clicking **Claim reward** fires the forged GET via a JS `Image()` request.
- **(c) Root cause** - a state-changing action accepted over GET with only the session cookie as proof - no proof the user *intended* the request.
- **(d) Mitigation** - synchronizer (anti-CSRF) token: run `SECURE=1`; the same payload now returns **403** and the email is unchanged.
- **(e) Other mitigations (theory)** - SameSite cookies, re-authentication for sensitive actions, avoiding state-changing GET requests.

Full details, exact payloads, mitigation explanation, line-number map, and
likely viva questions are in **WRITEUP.md**.

---

> Educational use only. Test against your own instance of this app, never any
> third-party system.

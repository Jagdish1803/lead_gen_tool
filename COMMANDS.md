# Commands — run each in its own terminal

> ⚠️ Your PC struggles with heavy Node processes. **Rule: run ONE thing at a
> time.** Never run a build and a server together. Use `npm run start` (light),
> NOT `npm run dev` (heavy).

## 1. Run the web app  ← the main one

**Light way (recommended for your PC).** A production build already exists, so
just start the server:

```
npm run start
```

Then open **http://localhost:3000**. Press **Ctrl+C** to stop.

- Uses very little CPU/RAM (no compiler, no file watcher).
- Safe to leave running while you click around.

**If you (or I) changed the code**, rebuild first — run this ALONE, wait for it
to finish, then `npm run start`:

```
npm run build
```

**Avoid this** (heaviest — this is what froze your PC):

```
npm run dev
```

Only use `npm run dev` if you're actively editing code and need live reload,
and close other apps first.

## 2. WhatsApp worker  ← separate terminal, only when connecting/sending

```
npm run worker
```

- Keeps a WhatsApp connection open and sends queued messages at the paced rate.
- First run shows a QR — scan it from the **dedicated** phone
  (WhatsApp → Linked Devices). The QR also appears on the Settings page.
- Press **Ctrl+C** to stop. Auth is saved, so next start won't need a re-scan.
- Only run this when you actually want to send. Don't run it at the same time
  as a build.

## 3. Database utilities (quick, run and exit)

```
npm run db:check        # test the database connection
npm run db:apply        # (re)create tables from supabase/schema.sql
```

## 4. Reset test data (quick, run and exit)

```
npm run reset:pipeline  # keep the businesses, clear audits+messages,
                        # set them back to 'found' (re-test audit→write
                        # without spending SerpApi credits)

npm run reset           # full wipe: remove all businesses, searches,
                        # audits, messages (start from a fresh search)
```

Both switch sending OFF and reset the daily counter.

---

## Typical local test session

1. Terminal A: `npm run start` → open http://localhost:3000
2. Click **Search** (e.g. "Dental Clinic" / "Mumbai") → leads appear
3. Click **Audit … pending** → wait → issues appear on Leads
4. Click **Write … drafts** → wait → AI messages appear on Leads
5. (Optional) Terminal B: `npm run worker` → scan QR on Settings →
   turn **Sending ON** in Settings → messages trickle out
6. Ctrl+C each terminal when done

Keep it to **one heavy step at a time** and your PC will be fine.

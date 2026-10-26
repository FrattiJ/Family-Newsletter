# The Family Newsletter

A small private website where anyone in the family can post news. Each story
is saved to a newspaper-style page and emailed out to everybody at once.

Two things to do on the site, and nothing else to learn:

- **Write a Story** — a headline, a date, a photo and the write-up.
- **The Newsletter** — every story, newest first, grouped by month.

Only people who know the family password can get in, and only the addresses
listed in `family.json` ever receive an email.

---

## Trying it on your own computer

You can run the whole thing locally with no accounts and nothing to sign up
for. Stories are kept in a `.data` folder, and as long as `SMTP_USER` is
blank, emails are written to `.data/outbox` as files instead of being sent
to anyone.

```bash
npm install && npm run dev
```

Then open <http://localhost:3000>. The local password is `familynews`
(set in `.env.local`).

There are a few sample stories in there so the page isn't empty. To start
with a clean slate, delete the `.data` folder.

---

## Adding and removing family members

Open `family.json`. It looks like this:

```json
{
  "newsletterName": "For all my Peeps",
  "tagline": "News, notes and happenings from all of us",
  "members": [
    { "name": "Jacob", "email": "you@example.com", "receivesEmail": true }
  ]
}
```

- `name` is what they tap on the "Who's here today?" screen, and what gets
  printed under the headline when they write something.
- `email` is where their copy of the newsletter is sent.
- `receivesEmail: false` lets somebody read and post without getting emails.

Add a line per relative. After changing this file you need to deploy again
(see below) for the change to show up on the live site.

---

## Putting it online

Everything below is free. No domain name is needed, and nothing asks for a
card. Do these in order.

> **On free addresses.** A Vercel address like `peeps.vercel.app` is a fine
> home for the site itself. It cannot be used to *send* email, though,
> because that needs DNS records on a domain you control, and `vercel.app`
> belongs to Vercel. Sending through Gmail in step 2 sidesteps this
> entirely. GitHub Pages is a different matter: it only serves fixed files
> and cannot run the login or the publishing, so it will not work for this
> site at all.

### 1. Supabase — where stories and photos live

A hosted site cannot keep files on disk, so stories move to Supabase.

1. Make a free account at <https://supabase.com> and create a project.
2. Open **SQL Editor → New query**, paste the whole of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. That creates the
   stories table and a private bucket for photos.
3. Go to **Project Settings → API** and copy two things: the **Project URL**
   and the **`service_role`** key.

> The `service_role` key is a master key. It only ever goes in the hosting
> settings below — never in `family.json` and never in a message to anyone.

### 2. Gmail — sending the emails, free

The site sends through an ordinary email account over SMTP. Gmail is the
easiest option: it costs nothing, needs no domain of your own, and the
newsletter arrives from an address your family already recognises, which
helps it stay out of spam folders.

You need an **app password**, not your normal Gmail password:

1. Turn on 2-Step Verification at
   <https://myaccount.google.com/security> if it isn't on already.
   Google only offers app passwords once it is.
2. Go to <https://myaccount.google.com/apppasswords>, name it
   something like "Family newsletter", and create it.
3. Copy the 16-character code it shows you. That is your `SMTP_PASSWORD`.
   Treat it like a password, because it is one.

Free Gmail allows around 500 messages a day, which is far more than a
family newsletter will ever need.

> **Any SMTP service works here.** If you would rather not use Gmail, free
> alternatives such as Brevo or Mailjet let you send from a single verified
> address without owning a domain. Point `SMTP_HOST`, `SMTP_PORT`,
> `SMTP_USER` and `SMTP_PASSWORD` at them instead; nothing else changes.

### 3. Vercel — running the site

1. Push this folder to GitHub.
2. At <https://vercel.com>, **Add New → Project**, and pick that repository.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `FAMILY_PASSWORD` | the password you'll give the family |
   | `SESSION_SECRET` | a long random string (see below) |
   | `SITE_URL` | `https://your-site.vercel.app` |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | your full Gmail address |
   | `SMTP_PASSWORD` | the app password from step 2 |
   | `EMAIL_FROM` | `For all my Peeps <you@gmail.com>` |
   | `SUPABASE_URL` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |

   For `SESSION_SECRET`, run this and paste the result:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Deploy. Once it's up, set `SITE_URL` to the real address if it changed,
   and redeploy so the links inside the emails point to the right place.

---

## How the "only my family" part works

- **Getting in.** One shared password, checked on the server. Every page
  redirects to the login screen without it. The login is remembered for two
  months so relatives aren't constantly typing it.
- **Guessing it.** Repeated wrong attempts from the same connection are
  slowed down after ten tries.
- **The emails.** They go only to the addresses in `family.json`. Everyone
  gets their own copy, so nobody sees anyone else's address.
- **The photos.** Stored in a private bucket and served through the site, so
  a logged-out stranger with the link gets nothing. Emailed copies carry a
  long unguessable token for that one photo, because email apps can't log in.
- **Search engines.** The site asks not to be indexed.

The one thing to be careful about: a shared password is only as private as
the people who have it. If it gets out, change `FAMILY_PASSWORD` in Vercel
and redeploy — everyone will simply be asked for the new one.

---

## Where things are

| Path | What it does |
| --- | --- |
| `family.json` | Who's in the family and what the paper is called |
| `app/(family)/newsletter` | The newspaper page |
| `app/(family)/write` | The story composer |
| `app/actions` | Login and publishing, which run on the server |
| `lib/email.ts` | The email design and sending (any SMTP service) |
| `lib/store/` | Where stories go: `.data` locally, Supabase when deployed |
| `proxy.ts` | The gate that keeps everything behind the password |
| `supabase/schema.sql` | Run once when setting up Supabase |

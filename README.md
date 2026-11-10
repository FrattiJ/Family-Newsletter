# The Family Newsletter

A small private website where anyone in the family can post news. Each story
is saved to a newspaper-style page and emailed out to everybody at once.

Two things to do on the site, and nothing else to learn:

- **Write a Story** — a headline, a date, a photo and the write-up.
- **The Newsletter** — every story, newest first, grouped by month.

Only people who know the family password can get in, and only the addresses
on the family list ever receive an email.

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
(set in `.env.local`). Until you create your own `family.json` (see below),
it uses the sample names in `family.example.json`.

There are a few sample stories in there so the page isn't empty. To start
with a clean slate, delete the `.data` folder.

---

## Adding and removing family members

The family list holds everyone's email address, so it is **never committed to
GitHub**. It lives in two places, and both should hold the same list:

| Where | Used by | How to change it |
| --- | --- | --- |
| `FAMILY_CONFIG` in Vercel | The live site | Vercel → your project → **Settings → Environment Variables** |
| `family.json` on your computer | Running it locally | Edit the file (it is gitignored) |

The list looks like this (the same shape as
[`family.example.json`](family.example.json)):

```json
{
  "newsletterName": "For all my Peeps",
  "tagline": "News, notes and happenings from all of us",
  "members": [
    { "name": "Jacob", "email": "you@example.com", "receivesEmail": true,
      "owner": true },
    { "name": "Grandma", "email": "grandma@example.com", "receivesEmail": true }
  ]
}
```

- `name` is what they tap on the "Who's here today?" screen, and what gets
  printed under the headline when they write something.
- `email` is where their copy of the newsletter is sent.
- `receivesEmail: false` lets somebody read and post without getting emails.
- `owner: true` lets that person remove anybody's story, not only their own.
  Leave it off for everybody else.

### When a relative wants to join

1. Open your local `family.json` and add a line for them inside `members`,
   with a comma after the line before it. Keep the name short and the way the
   family knows them, since that's what they'll tap to sign in.
2. In Vercel, open **Settings → Environment Variables**, find
   `FAMILY_CONFIG`, choose **Edit**, and paste in the *whole* updated
   `family.json`. Save.
3. Go to **Deployments**, open the menu on the latest one, and choose
   **Redeploy**. The new name appears on the site once it finishes, usually
   within a minute or two.
4. Text them the site address and the family password.

To remove someone, delete their line and do steps 2 and 3 again. Their past
stories stay on the newsletter.

If the site ever fails to deploy with "No family list found" or
"FAMILY_CONFIG is not valid JSON", the variable is missing or has a typo,
often a missing comma or quote. Paste it into <https://jsonlint.com> to find
the problem.

To start fresh on a new computer, copy `family.example.json` to `family.json`
and fill it in.

---

## Taking a story down

Under each story there is a small **Remove this story** link, but only on
stories signed with your own name — so nobody can delete someone else's news
by mistake. Anyone marked `owner` on the family list sees it on every story and
can tidy up for a relative who cannot manage it themselves.

It asks once before doing anything, so a stray tap on a phone is harmless.
The story disappears from the newsletter straight away. An email that has
already gone out cannot be unsent.

Nothing is truly erased: the story is marked as removed and hidden, and the
row stays in the database. If somebody deletes the wrong thing, it can be put
back by clearing that mark in the Supabase table editor:

```sql
update public.articles set deleted_at = null where title = 'The headline';
```

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
> settings below, never in a file in this project and never in a message to anyone.

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
   | `FAMILY_CONFIG` | the whole of your `family.json` (see [Adding and removing family members](#adding-and-removing-family-members)) |

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
- **The emails.** They go only to the addresses on the family list. Everyone
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
| `family.example.json` | The shape of the family list; copy it to `family.json` (gitignored) |
| `app/(family)/newsletter` | The newspaper page |
| `app/(family)/write` | The story composer |
| `app/actions` | Login and publishing, which run on the server |
| `lib/email.ts` | The email design and sending (any SMTP service) |
| `lib/store/` | Where stories go: `.data` locally, Supabase when deployed |
| `proxy.ts` | The gate that keeps everything behind the password |
| `supabase/schema.sql` | Run once when setting up Supabase |

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
for. Stories are kept in a `.data` folder, and emails are written to
`.data/outbox` as files instead of being sent to anyone.

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

Three accounts, all free at this size. Do them in order.

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

### 2. Resend — sending the emails

1. Make a free account at <https://resend.com> (3,000 emails a month free).
2. **API Keys → Create API Key**, and copy it.
3. To start, you can send from `onboarding@resend.dev`, which works right
   away but can only email *your own* address. To email the whole family you
   need to add a domain under **Domains** and use an address at it, such as
   `news@ourfamily.com`.

### 3. Vercel — running the site

1. Push this folder to GitHub.
2. At <https://vercel.com>, **Add New → Project**, and pick that repository.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `FAMILY_PASSWORD` | the password you'll give the family |
   | `SESSION_SECRET` | a long random string (see below) |
   | `SITE_URL` | `https://your-site.vercel.app` |
   | `RESEND_API_KEY` | from step 2 |
   | `EMAIL_FROM` | `Family News <news@yourdomain.com>` |
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
| `lib/email.ts` | The email design and sending |
| `lib/store/` | Where stories go: `.data` locally, Supabase when deployed |
| `proxy.ts` | The gate that keeps everything behind the password |
| `supabase/schema.sql` | Run once when setting up Supabase |

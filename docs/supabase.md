# Supabase setup

The site runs without Supabase. Until it is connected, the public pages use the built-in content in `src/data/` (articles, team, policies), the contact form offers WhatsApp instead, and admin sign-in is disabled.

## 1. Create the project and add keys

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (Project Settings → API). Add the same variables in Vercel.

## 2. Create the tables

Run the SQL files in [`supabase/migrations`](../supabase/migrations) in filename order in the dashboard's SQL Editor, or apply all pending migrations with the CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## 3. Load the existing content

Run [`supabase/seed.sql`](../supabase/seed.sql) in the SQL Editor. It inserts the 10 knowledge articles, the team cards and the two policies. It is safe to run again; existing rows are left alone.

From then on the database is the source of truth: edit articles in `/admin/blog`, not in `src/data/knowledgeArticles.ts`. To regenerate the seed after changing the built-in content:

```bash
npx tsx --tsconfig tsconfig.json scripts/generate-supabase-seed.ts
```

## 4. Create an admin

1. Authentication → Users → **Add user**, with an email and password. Under Authentication → Sign In / Providers, turn off **Allow new users to sign up** so nobody else can create an account.
2. In the SQL Editor:

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'you@feedsport.co.zw';
```

3. Sign in at `/login`.

## What is stored where

| Table | Written by | Read by |
| --- | --- | --- |
| `articles` | Admins (`/admin/blog`) | Everyone (published only); admins see drafts |
| `team_members` | Admins (`/admin/team`) | Everyone |
| `policies` | Admins (`/admin/policies`) | Everyone |
| `contact_inquiries` | Visitors (contact form) | Admins (`/admin/inquiries`) |
| `newsletter_subscriptions` | Visitors (Knowledge Centre) | Admins (`/admin/subscribers`) |
| `products` | Admins | Everyone; invoice creation pulls the current catalogue price |
| `invoices` | Admins (`/admin/invoices`) | Admins; line items retain product and price snapshots |
| `admin_users` | SQL only | Admins |

Row-level security enforces all of the above in the database; the publishable key is safe to expose.

Public pages are static and refresh within an hour, or immediately when an admin saves.

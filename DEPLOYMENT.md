# Middle Beats Platform — Complete Deployment Guide

## OVERVIEW
This guide walks you through deploying the full Middle Beats artist portal.
Estimated time: 45–60 minutes.

---

## STEP 1 — Run the Database Schema in Supabase

1. Go to https://supabase.com and open your `middle-beats` project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase/schema.sql` from this project
5. Copy the entire contents and paste into the SQL editor
6. Click **Run** (green button)
7. You should see "Success. No rows returned"

---

## STEP 2 — Get Your Supabase Service Role Key

1. In Supabase, go to **Settings → API**
2. Under "Project API keys", find **service_role** (secret)
3. Click "Reveal" and copy it
4. You'll need this in Step 5

---

## STEP 3 — Set Up Resend for Emails

1. Go to https://resend.com and sign up / log in
2. Click **Domains** → **Add Domain**
3. Enter: `middle-beats.com`
4. You'll get DNS records to add — copy them
5. Go to your domain registrar (wherever middle-beats.com is registered)
6. Add the DNS records Resend gives you (usually 3 records)
7. Back in Resend, click **Verify** (takes 1–24 hours)
8. Once verified, go to **API Keys** → **Create API Key**
9. Name it "Middle Beats Production" → Create
10. Copy the key (starts with `re_`)

---

## STEP 4 — Set Up GitHub Repository

1. Go to https://github.com and log in
2. Click **+** → **New repository**
3. Name: `middle-beats`
4. Set to **Private**
5. Click **Create repository**
6. On your computer, open Terminal and run:

```bash
cd /path/to/middle-beats   # wherever you saved the project files
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/middle-beats.git
git push -u origin main
```

---

## STEP 5 — Deploy to Vercel

1. Go to https://vercel.com and log in
2. Click **Add New → Project**
3. Import your `middle-beats` GitHub repository
4. Vercel will auto-detect it as a Next.js project
5. Before clicking Deploy, click **Environment Variables** and add these:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://egmxbqnjaxeussavbgkw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...ZCo` (your anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (your service role key from Step 2) |
| `RESEND_API_KEY` | (your Resend API key from Step 3) |
| `RESEND_FROM_EMAIL` | `noreply@middle-beats.com` |
| `RESEND_FROM_NAME` | `Middle Beats` |
| `NEXT_PUBLIC_APP_URL` | `https://middle-beats.com` |

6. Click **Deploy**
7. Wait ~2 minutes for the build to complete

---

## STEP 6 — Connect Your Domain (middle-beats.com)

1. In Vercel, go to your project → **Settings → Domains**
2. Click **Add Domain**
3. Enter: `middle-beats.com`
4. Also add: `www.middle-beats.com`
5. Vercel will give you DNS records (usually an A record and CNAME)
6. Go to your domain registrar and add those DNS records
7. Wait 10–60 minutes for DNS to propagate
8. Visit https://middle-beats.com — it should show the login page ✅

---

## STEP 7 — Create Your Admin Account

1. Go to your Supabase project → **Authentication → Users**
2. Click **Invite user**
3. Enter your email address
4. Check your email and accept the invite
5. Set your password
6. Now go to **SQL Editor** and run this to make yourself admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

7. Visit https://middle-beats.com → log in with your email
8. You'll be redirected to the Admin Dashboard ✅

---

## STEP 8 — Add Your First Artist

1. In the admin dashboard, click **Artists → Add Artist**
2. Fill in the artist name, email, etc.
3. Click **Create Artist & Send Welcome Email**
4. The artist receives a welcome email with their login credentials
5. They log in at https://middle-beats.com and see only their data ✅

---

## STEP 9 — Upload Your First Reports

1. In admin, click **Upload Reports**
2. Drag your CSV files (Other Music Platforms or Anghami format)
3. Click **Process Reports**
4. Records are matched to artists by name automatically
5. Artists can now see their data in their dashboard ✅

---

## DAILY WORKFLOW

Every month when you receive reports:
1. Admin → Upload Reports → drop CSV files → Process
2. Admin → Statements → select period + artists → Generate
3. Admin → Statements → Send to Artist (emails them automatically)
4. Artists log in and see updated data + download PDF statements

---

## TROUBLESHOOTING

**Login not working:**
- Check Supabase → Authentication → make sure email confirmations are disabled for invited users
- Go to Supabase → Authentication → Settings → disable "Enable email confirmations"

**Emails not sending:**
- Check Resend dashboard for errors
- Make sure your domain DNS records are verified in Resend

**Artists not matched after upload:**
- Artist name in CSV must match exactly (or closely) what you entered in the system
- Check admin upload results — unmatched names are shown in yellow

**Build fails on Vercel:**
- Check all environment variables are set correctly
- Check the Vercel build logs for the specific error

---

## SUPPORT FILES

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Run once in Supabase SQL Editor |
| `.env.local` | Local development only — never commit this |
| `src/lib/supabase/` | Database connection code |
| `src/lib/email.ts` | Email templates |
| `src/lib/csv-parser.ts` | CSV normalization logic |
| `src/middleware.ts` | Auth + route protection |
| `src/app/admin/` | Admin panel pages |
| `src/app/artist/` | Artist portal pages |
| `src/app/api/` | Backend API routes |

---

## SECURITY NOTES

- The `service_role` key is extremely powerful — never expose it in client code
- Row Level Security (RLS) is enabled — artists literally cannot query other artists' data
- All routes are protected by middleware
- Passwords are managed by Supabase Auth (bcrypt hashed, never stored in plain text)

---

Built for Middle Beats · middle-beats.com

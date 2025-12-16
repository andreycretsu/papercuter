# Papercuts (web + Chrome extension)

This repo contains:
- `apps/web`: a small Next.js app to create Papercuts (Name + rich Description + screenshot)
- `apps/extension`: a Chrome extension (WXT + React) to capture a selected area and create a Papercut

## Storage (shared, multi-device)

Papercuts are stored in shared services so multiple people/devices can use it:
- **Metadata** (name/description/screenshot URL): **Supabase Postgres**
- **Images** (screenshots): **Cloudinary**

Cloudinary has a free plan that uses monthly “credits” (roughly, you can trade them between storage/bandwidth/transformations). One common way to think about it is **~25 GB storage OR ~25 GB monthly bandwidth** on the free plan, depending how you spend credits.

## Run the web app

From repo root:

```bash
npm install
npm run dev:web
```

Open `http://localhost:3000`.

### Configure Supabase + Cloudinary

Cursor blocks committing `.env*` files here, so we provide an example file:
- `apps/web/env.example`

Create `apps/web/.env.local` on your machine (not committed) and copy variables from `apps/web/env.example`.

Security note: don’t paste secrets into chats/screenshots. If you already did, rotate them in Cloudinary/Supabase.

#### Supabase setup

1. Create a Supabase project
2. In **Project Settings → API**, copy:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (the `sb_secret_...` key; keep server-only; never expose in the browser)
3. Create the `papercuts` table (SQL below)

#### Cloudinary setup

1. Create a Cloudinary account
2. From dashboard copy:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

#### SQL: create the `papercuts` table

Run this in Supabase SQL editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.papercuts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description_html text not null default '',
  screenshot_url text,
  created_at timestamptz not null default now()
);

create index if not exists papercuts_created_at_idx on public.papercuts (created_at desc);
```

## Use the form (focus mode)

Click **New papercut** → full-screen “focus mode” modal opens.

Description supports:
- basic formatting (bold/italic/list)
- links
- paste or drag & drop images (they upload and insert full-width)

## Run the extension (dev)

In another terminal:

```bash
npm run dev:ext
```

WXT will build the extension here:
- `apps/extension/.output/chrome-mv3-dev`

Note: the extension dev server runs on port **3002** to avoid clashing with the web app (which runs on **3000**).

### Load into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select folder: `apps/extension/.output/chrome-mv3-dev`

### Capture flow

Either:
- Open the extension popup → fill optional fields → **Capture selected area**
or
- Use shortcut **Ctrl/⌘ + Shift + S**

Then:
- drag to select an area
- it will upload the image to the web app and create the Papercut

## Jira (later)

There’s a placeholder endpoint:
- `POST /api/jira/create-issue` → returns **501 Not Implemented**

Next step will be adding Jira auth + issue creation + screenshot attachments.



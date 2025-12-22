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

## Deploy (web app)

The web app can be deployed to Vercel. Auto-deploy is enabled via GitHub Actions in `.github/workflows/deploy-vercel.yml`.

In your GitHub repo settings, add these **Secrets and variables → Actions → Secrets**:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

After that, every push to `main` will deploy `apps/web` to Vercel.

#### Cloudinary setup

1. Create a Cloudinary account
2. From dashboard copy:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

#### Extension API key (recommended)

The app will auto-generate a persistent API key (stored in Supabase). You can view/copy/rotate it in the web app UI.
Then paste it into the extension popup “API key” field.

This prevents random websites from calling your `/api/uploads` and `/api/papercuts` endpoints.

#### SQL: create the `app_settings` table (needed for API key)

Run this in Supabase SQL editor:

```sql
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
```

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

## Run the extension (recommended: single “real” extension)

Build once:

```bash
npm run build:ext
```

Then load this folder (this is the **only one you should load**):
- `apps/extension/.output/chrome-mv3`

### Load into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select folder: `apps/extension/.output/chrome-mv3`

If you previously loaded the `chrome-mv3-dev` folder, remove that extension entry from Chrome — keep only one.

## Extension dev mode (only if you’re actively coding it)

Dev mode runs a hot-reload server and produces a separate dev build folder.

```bash
npm run dev:ext
```

Dev folder (only for hot reload):
- `apps/extension/.output/chrome-mv3-dev`

### Capture flow

Either:
- Open the extension popup → fill optional fields → **Capture selected area**
or
- Use shortcut **Ctrl/⌘ + Shift + S**

Then:
- drag to select an area
- it will upload the image to the web app and create the Papercut

## Jira Integration

The app can create Jira issues from papercuts. This works with both standard Jira projects and Jira Product Discovery.

### Setup

1. Create or use a Jira service account (e.g., `papercuts-bot@yourcompany.com`) with permission to create issues in your project
2. Generate a Jira API token for that account at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Add these environment variables to your deployment:

```bash
JIRA_DOMAIN=yourcompany.atlassian.net
JIRA_EMAIL=papercuts-bot@yourcompany.com  # Service account email
JIRA_API_TOKEN=your-api-token              # Service account token
```

3. Restart your application

**Note:** The service account creates all issues, but each issue description starts with "Reported by: [actual user's email]" to preserve creator identity.

### Usage

1. Open any papercut detail page
2. Click the three-dots menu (⋮) in the top right
3. Select "Create Jira Issue"
4. Choose a Jira project from the dropdown (projects are fetched dynamically)
5. Click "Create Issue"
6. A new Jira task will be created with:
   - Summary: papercut name
   - Description: papercut description with module and type metadata
   - Attachment: screenshot (if available)
5. You'll get a toast notification with a link to the created Jira issue

### How it works

- **API Endpoint**: `POST /api/jira/create-issue`
- **Authentication**: Basic Auth using email + API token
- **Field Mapping**:
  - Papercut name → Jira summary
  - Creator email → "Reported by" in description (preserves user identity)
  - Papercut description → Jira description (with module/type metadata)
  - Screenshot URL → Jira attachment (downloaded and uploaded)
- **Issue Type**: Creates as "Task" by default (customizable in code)
- **Creator Tracking**: Each issue shows the actual papercut creator's email, even though a service account creates the issue



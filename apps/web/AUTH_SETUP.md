# Authentication Setup - NextAuth.js v4 with Database

This app uses NextAuth.js v4 (stable) with database-backed authentication for secure, multi-user support.

## Quick Start

### 1. Set Up Supabase Users Table

Before running the app, create the users table in Supabase:

1. Go to your Supabase project → **SQL Editor**
2. Run the SQL from `supabase-migrations/create-users-table.sql`

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

### 2. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```
NEXTAUTH_SECRET=<your-generated-secret>
```

### 3. Set Your URLs

For local development:
```
NEXTAUTH_URL=http://localhost:3000
```

For production (add to Vercel):
```
NEXTAUTH_URL=https://your-domain.vercel.app
```

### 4. Add Supabase Credentials

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SECRET_KEY=your-supabase-service-role-key
```

## Vercel Environment Variables

Add these to Vercel → Settings → Environment Variables:

1. `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
2. `NEXTAUTH_URL` - Your production domain (e.g., `https://your-app.vercel.app`)
3. `SUPABASE_URL` - Your Supabase project URL
4. `SUPABASE_SECRET_KEY` - Your Supabase service role key
5. `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
6. `CLOUDINARY_API_KEY` - Your Cloudinary API key
7. `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

**IMPORTANT:** Remove any old `PAPERCUTS_EMAIL` and `PAPERCUTS_PASSWORD` variables from Vercel!

## Security Features

✅ **Database-Backed Users** - Each user has their own account
✅ **Password Hashing** - SHA-256 hashing (Edge Runtime compatible)
✅ **JWT Sessions** - Secure, stateless authentication
✅ **Protected Routes** - Middleware guards all pages
✅ **CSRF Protection** - Built-in with NextAuth
✅ **Edge Runtime Compatible** - Works on Vercel Edge
✅ **30-Day Sessions** - Automatic refresh
✅ **Row Level Security** - Supabase RLS protects user data
✅ **No Default Credentials** - Users must sign up

## User Management

### Creating Your First User

1. Deploy the app with the users table created
2. Navigate to `/signup` in your browser
3. Create your account with email and password (min 8 characters)
4. Sign in at `/login`

### User Authentication Flow

1. Users sign up at `/signup` with email and password
2. Password is hashed using SHA-256 before storage
3. Users sign in at `/login`
4. NextAuth creates a JWT session valid for 30 days
5. All routes except `/login` and `/signup` require authentication

## Production Security Checklist

- [x] No default credentials in code
- [x] Passwords stored as hashes only
- [x] Database-backed multi-user support
- [x] Row Level Security enabled
- [ ] Set strong `NEXTAUTH_SECRET` (32+ random characters)
- [ ] Set correct `NEXTAUTH_URL` to your production domain
- [ ] Users table created in Supabase
- [ ] All environment variables added to Vercel
- [ ] Old `PAPERCUTS_EMAIL`/`PAPERCUTS_PASSWORD` removed from Vercel

## Why This Approach?

- ✅ **Production-ready** - Stable NextAuth v4
- ✅ **Multi-user** - Database-backed authentication
- ✅ **Secure** - Hashed passwords, no exposed credentials
- ✅ **Edge Compatible** - SHA-256 works on Edge Runtime
- ✅ **Scalable** - Supports unlimited users
- ✅ **Self-service** - Users can sign up themselves
- ✅ **No secrets in UI** - No default credentials displayed

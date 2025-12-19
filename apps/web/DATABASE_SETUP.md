# Database Setup for Authentication

## Creating the Users Table in Supabase

Before deploying the app, you need to create the `users` table in your Supabase database.

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-migrations/create-users-table.sql`
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## What the Migration Creates

The migration creates:

1. **users table** with:
   - `id` (UUID, primary key)
   - `email` (unique, not null)
   - `password_hash` (SHA-256 hashed password)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

2. **Index** on email for faster lookups

3. **Row Level Security (RLS)** policies:
   - Users can only read their own data
   - Anyone can sign up (insert new users)

## Environment Variables

Only these environment variables are needed (no more hardcoded credentials):

```bash
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-domain.com
SUPABASE_URL=your-supabase-url
SUPABASE_SECRET_KEY=your-supabase-service-role-key
```

## Security Features

- Passwords are hashed using SHA-256 (Edge Runtime compatible)
- No default credentials displayed anywhere
- Users must sign up to create an account
- Each user has their own account
- Row Level Security prevents unauthorized data access

## First User Setup

1. Deploy the app with the users table created
2. Go to `/signup` to create your first account
3. Sign in at `/login` with your new credentials
4. No default admin account exists - you create your own

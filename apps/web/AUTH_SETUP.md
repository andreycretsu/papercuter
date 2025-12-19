# Authentication Setup

This app uses NextAuth.js v5 for secure authentication with bcrypt password hashing.

## Quick Start

### 1. Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```
AUTH_SECRET=<your-generated-secret>
```

### 2. Set Password Hash (Optional)

The default password is `papercuts2024`. To use a custom password:

```bash
node scripts/generate-password-hash.js your-custom-password
```

Copy the generated hash to `.env.local`:
```
PAPERCUTS_PASSWORD_HASH=<generated-hash>
```

### 3. Default Credentials

**Email:** `admin@papercuts.dev`
**Password:** `papercuts2024`

## Security Features

✅ **Password Hashing** - Passwords are hashed with bcrypt (10 rounds)
✅ **JWT Sessions** - Secure, server-side session management
✅ **Protected Routes** - Middleware protects all routes automatically
✅ **30-Day Sessions** - Long-lived sessions with automatic refresh

## Adding More Users

Edit `apps/web/src/auth.ts` and add users to the `users` array:

```typescript
const users = [
  {
    id: "1",
    email: "admin@papercuts.dev",
    name: "Admin",
    passwordHash: "$2b$10$...", // Use generate-password-hash.js
  },
  {
    id: "2",
    email: "user@example.com",
    name: "User",
    passwordHash: "$2b$10$...",
  },
];
```

## Upgrading to Database Authentication

For production with multiple users, replace the in-memory users array with a database query:

```typescript
async authorize(credentials) {
  // Query your database
  const user = await db.user.findUnique({
    where: { email: credentials.email }
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(
    credentials.password,
    user.passwordHash
  );

  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
```

## Why NextAuth.js?

- ✅ Industry standard authentication library
- ✅ Built-in CSRF protection
- ✅ Secure session management
- ✅ Easy to extend (OAuth, magic links, etc.)
- ✅ Active maintenance and security updates

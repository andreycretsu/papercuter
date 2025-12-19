# Authentication Setup - NextAuth.js v4

This app uses NextAuth.js v4 (stable) for reliable, production-ready authentication.

## Quick Start

### 1. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```
NEXTAUTH_SECRET=<your-generated-secret>
```

### 2. Set Your Production URL

For local development:
```
NEXTAUTH_URL=http://localhost:3000
```

For production (add to Vercel):
```
NEXTAUTH_URL=https://your-domain.vercel.app
```

### 3. Set Credentials

Default login credentials (change in production!):

```bash
PAPERCUTS_EMAIL=admin@papercuts.dev
PAPERCUTS_PASSWORD=papercuts2024
```

## Vercel Environment Variables

Add these to Vercel → Settings → Environment Variables:

1. `NEXTAUTH_SECRET` = `KW6En9gwGH9n5lsJSvULkvyAp82TyombO+WHXMLjDMU=`
2. `NEXTAUTH_URL` = `https://your-app.vercel.app`
3. `PAPERCUTS_EMAIL` = `admin@papercuts.dev`
4. `PAPERCUTS_PASSWORD` = `papercuts2024` (change this!)

## Security Features

✅ **JWT Sessions** - Secure, stateless authentication
✅ **Protected Routes** - Middleware guards all pages
✅ **CSRF Protection** - Built-in with NextAuth
✅ **Edge Runtime Compatible** - Works on Vercel Edge
✅ **30-Day Sessions** - Automatic refresh

## Changing Password

Simply update the environment variable:

```bash
PAPERCUTS_PASSWORD=your-new-secure-password
```

## Production Security Checklist

- [ ] Change `PAPERCUTS_PASSWORD` from default
- [ ] Use strong password (16+ characters)
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Generate new `NEXTAUTH_SECRET` (don't reuse this one)
- [ ] Consider adding 2FA for production
- [ ] Rotate secrets regularly

## Why NextAuth v4?

- ✅ Production-stable (not beta)
- ✅ Edge Runtime compatible
- ✅ No bcrypt dependency issues
- ✅ Widely used and tested
- ✅ Active maintenance

## Upgrading to Database Auth

For production with multiple users, replace the credential check with a database query:

```typescript
async authorize(credentials) {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email }
  });

  if (!user) return null;

  const valid = await compare(credentials.password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
```

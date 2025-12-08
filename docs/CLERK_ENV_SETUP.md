# Clerk Environment Variables Setup for Vercel

The deployment is failing because Clerk environment variables are missing. You have two options:

## Option 1: Set up Clerk (Recommended for production)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or use an existing one
3. Get your keys from the API Keys section
4. Add them to Vercel:

```bash
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Paste your publishable key when prompted (pk_test_...)

vercel env add CLERK_SECRET_KEY  
# Paste your secret key when prompted (sk_test_...)

# Then deploy again
vercel --prod
```

## Option 2: Use placeholder values (Development only)

If you want to deploy without Clerk authentication temporarily:

```bash
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# When prompted, enter: pk_test_placeholder

vercel env add CLERK_SECRET_KEY
# When prompted, enter: sk_test_placeholder

# Then deploy again
vercel --prod
```

**Note:** With placeholder values, authentication won't work, but the app will deploy successfully.

## Already set in Vercel?

Check your environment variables:
```bash
vercel env ls
```

If they're set but still failing, ensure they're enabled for "Production" environment.

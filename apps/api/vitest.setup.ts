/* Test env: the API's env schema fails fast, but tests never talk to real
   services (Clerk and the DB are mocked), so dummies satisfy it on any machine,
   including the CI `checks` job which has no .env.local. ??= keeps real values
   when a developer exports them. */

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.CLERK_SECRET_KEY ??= "sk_test_dummy";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_dummy";
process.env.SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "dummy";

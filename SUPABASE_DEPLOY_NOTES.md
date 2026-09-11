# DocBit Supabase deployment notes

This build is the hardened Supabase version of DocBit.

## Apply migrations

Run from the project root:

```bash
supabase login
supabase link --project-ref leucizmgjvdaljytovpf
supabase db push
```

Do **not** run `supabase db reset` against the development project.

The migration sequence is:

- `20260902000100_docbit_initial.sql` — core schema, RLS and storage policies
- `20260902000200_grant_api_table_privileges.sql` — authenticated PostgREST grants
- `20260902000300_docbit_hardening.sql` — RLS helper hardening, plan limits, atomic processing usage, seats and counter synchronization
- `20260902000400_billing_constraints.sql` — least-privilege grants, billing integrity, monthly usage periods and project/file counter hardening

## Required Netlify variables

Public/browser variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`

Server-only variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Never expose `SUPABASE_SERVICE_ROLE_KEY` or Razorpay secret variables as `VITE_*` values.

## Razorpay note

The checkout flow validates the plan, amount, order notes, payment signature and payment record server-side before granting the selected paid plan.

The current checkout creates a paid plan period from a Razorpay order. It is **not** a recurring Razorpay Subscription object yet. Recurring auto-renewal should be enabled only after Razorpay Subscription Plan IDs are configured and the subscription-specific checkout/webhook lifecycle is added.


### v19.9.1
Run the new migration after the earlier migrations: `20260902000800_plan_limits_and_file_hardening.sql`. It fixes PostgreSQL integer overflow in byte limits, aligns collaboration seats with the product plans, and hardens project-file insert/update limits. Do not reset the database.

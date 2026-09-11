# DocBit

DocBit is a browser-first data preparation workspace for Excel, CSV and JSON. The editing engine stays local in the browser; files are persisted only when a user saves them into a project.

## Stack
- React + TypeScript + Vite
- Supabase Auth
- Supabase PostgreSQL + Row Level Security
- Supabase Storage
- Netlify Functions for trusted account, team and billing operations
- Razorpay-ready paid billing endpoints

## Supabase setup
1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Install the Supabase CLI and link the project:
   `supabase login`
   `supabase link --project-ref YOUR_PROJECT_REF`
4. Apply the schema and policies:
   `supabase db push`
5. In Supabase Authentication, enable Email/Password.
6. For Google login, enable Google under Authentication → Providers and set the authorized redirect URL to your production site and local development URL as appropriate.
7. Add Netlify environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for trusted Functions. Never expose the service role key as `VITE_*`.

The migration creates the DocBit tables, indexes, RLS policies and private project-file storage bucket plus public profile-media bucket.

## Storage model
- `project-files` is private and protected by project ownership/membership policies.
- `profile-media` is public for profile image rendering; uploads are restricted to the authenticated user's avatar path.
- Original uploads and saved working-document versions are separate objects.

## Account/security
- Email/password authentication
- Google OAuth with first-time full-name onboarding
- Profile photo
- Password change with current-password verification
- Password recovery
- Account deactivation/recovery
- Permanent account deletion
- Session/device records with browser and IP-derived location metadata

## Project model
Projects contain files directly. There is intentionally no artificial default Root folder and no folder-management feature. Owners can rename/delete projects and manage Editor/Member access. Editors can upload/edit/export; Members are download-only.

## Environment
Browser variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`

Server-only variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Never commit secrets.


## v19.9 hardening
- Plan collaboration: Free/Starter have no team seats; Pro includes 50 editors and 500 users; Pro Plus includes unlimited editors and users.
- Server plan byte limits use bigint-safe arithmetic.
- Header Upload opens the device picker directly.
- Project upload/save paths validate plan file/row limits and roll back failed storage writes.
- Workspace header includes live storage usage.

## DocBit 2026 product model

DocBit is a focused data-preparation workflow rather than an online spreadsheet clone:

**Upload → Analyze → Prepare → Transform → Review → Save → Reuse → Export / Report**

The application uses the hierarchy **Account → Workspace → Project → Files/Datasets → Processing/Versions → Reports/Exports**. Workspaces are generic organizational boundaries; no industry-specific entities are required.

### Customer-facing capacity

| Plan | Workspaces | Projects | Storage | Max file | Processing sessions/month | Editors | Users | PDF branding | Ads |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Free | 1 | 10 | 250 MB | 25 MB | 10 | — | — | — | Included |
| Starter | 3 | 50 | 2 GB | 100 MB | 50 | — | — | Included | Ad-free |
| Pro | 10 | 100 | 10 GB | 500 MB | 1,000 | 50 | 500 | Included | Ad-free |
| Pro Plus | 50 | 1,000 | 50 GB | 1 GB | 10,000 | Unlimited | Unlimited | Included | Ad-free |

Rows are not a customer-facing entitlement. Technical parser and browser-safety thresholds may still reject pathological datasets safely.

### Security model

Workspace membership and project assignment are separate. Supabase RLS is authoritative for workspace, project, file, template and activity access. Plan changes are performed by trusted billing operations; browser sessions cannot directly change `profiles.plan`.

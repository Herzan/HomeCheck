# HomeCheck — Manage. Maintain. Relax.
Next.js 14 + Supabase (auth, Postgres, storage, Edge Functions). Renter and Homeowner login.

## Setup
1. Create a Supabase project; run `supabase/schema.sql` then `supabase/seasonal.sql` in the SQL editor (existing databases only need `seasonal.sql`).
2. `cp .env.example .env.local` and fill in URL + anon key (Auth > disable email confirm for quick testing).
3. `npm install && npm run dev` → http://localhost:3000
4. Optional: deploy `supabase/functions/send-reminders` (set RESEND_API_KEY) and schedule it daily for email backup.

## Features
- **Login**: Renter / Homeowner tabs; role saved in `profiles`. Renters can flag tasks as landlord responsibility; owners get replace-vs-repair flags.
- **Custom schedule**: adding an appliance auto-creates tasks from `task_templates` (adjusted for humid climate / filter type); editable.
- **Warranties & receipts**: photo → on-device OCR (Tesseract.js; Google ML Kit is the equivalent for Flutter) → parsed vendor/date/amount/product/warranty → confirm → expiry + reminders at 60 & 14 days. Confidence < 75% or missing fields → cloud fallback `/api/ocr` (Claude API if `ANTHROPIC_API_KEY` set, otherwise regex).
- **Providers**: per-trade list; rating on each service record updates the average automatically.
- **Reminders**: scheduled Edge Function emails due tasks and warranty alerts.
- **Calendar**: .ics export of tasks and warranty expiries.
- **Analytics**: monthly/category/appliance costs via SQL views (Recharts), plus "costs more to repair than replace" flag (≥50% of replacement cost).
- **Seasonal checklists**: spring/summer/fall/winter (either hemisphere) or tropical dry/rainy. Tick items per season and year, or add unfinished ones to Tasks with the season's end date as due date.
- **Notifications**: 🔔 bell for overdue / due-in-7-days tasks, warranties expiring within 60 days (urgent at 14) and unfinished seasonal items, plus a "Needs attention" card on Overview. Optional browser notifications while the app is open; email via the Edge Function covers the rest.

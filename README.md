# Attendly

College attendance management for two sections: **FSC Pre-Medical** and **FSC Pre-Engineering**.
One administrator registers students, marks attendance by section and date, and views dashboards, reports and history.

**Stack:** Vite + React, Supabase (Postgres + Auth), deployed on Vercel.

## Screens
- **Dashboard** – today's status per section, overall rate, last 7 days, lowest attendance.
- **Students** – register, edit, delete (shows how many attendance records go with a student).
- **Attendance** – mark Present, Absent or Leave per section and date, edit past days, unsaved-changes protection. "Mark remaining as Present" fills only students not marked yet and never changes an existing mark; Save is still required.
- **Reports** – per-section totals, daily lists, date-wise records, per-student history and percentage.
- **History** – filter all records by section, date range, status and name/roll number, with paging. **Export CSV** downloads every record matching the current filters (all pages), ready for Excel/Sheets. Names that start with `=`, `+`, `-` or `@` are neutralised so they cannot run as spreadsheet formulas.

All numbers are calculated from saved attendance rows (database views). Nothing is stored as a total.

## Setup
1. `cp .env.example .env` and fill in the Supabase project URL and **publishable (anon) key**.
2. `npm install`
3. `npm run dev` (local) or `npm run build` (production build in `dist/`).
4. On Vercel, set the same two variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Never put a Supabase `service_role` key or any secret in this app or its environment variables. Only the public anon key is used.

## Database (Supabase)
Tables: `sections`, `students`, `attendance`, `admins`. Views: `section_summary`, `daily_summary`, `student_summary`, `section_rate`, `attendance_history`.

Rules enforced by the database:
- One attendance record per student per date.
- Status is `present`, `absent` or `leave`. **Leave is excused**: it counts as a marked day but is not counted as present or absent, so attendance % = present ÷ (present + absent).
- Attendance section must match the student's section.
- No attendance for future dates (Pakistan time).
- Roll numbers are unique (ignoring case) and names/roll numbers have no leading or trailing spaces.
- A student with attendance cannot change section (history is not rewritten).
- Deleting a student deletes that student's attendance.

## Security model
- Row Level Security is on for every table. Only accounts listed in `public.admins` can read or change data.
- Logged-out visitors have no table privileges at all. Logged-in non-admins see nothing and get an "Access denied" screen.
- `private.is_admin()` is the security-definer check and lives outside the API-exposed schema.
- `vercel.json` sets a Content-Security-Policy and other security headers.

### Add or remove an administrator
Create the user in Supabase → Authentication → Users, then run in the SQL editor:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'new-admin@example.com';
-- remove: delete from public.admins where user_id = (select id from auth.users where email = '...');
```

### Dashboard settings (cannot be set from code)
- Authentication → Sign In / Providers → Email: turn **off** "Allow new users to sign up".
- Authentication → Password security: turn on leaked-password protection (paid plans).

## Tests
`npm test` runs the logic tests (attendance marking, dashboard maths, history filters and paging, student sorting, password rules).

## Operating notes
- Supabase **free** projects pause after about a week without activity and have no downloadable automatic backups. For real use, move to a paid plan, and keep a backup by using History → All time → Export CSV regularly.
- Changing the admin password: use **Change password** at the bottom of the app.

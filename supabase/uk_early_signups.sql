begin;

create table public.uk_early_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'zeepup-uk',
  notification_sent boolean not null default false,
  created_at timestamptz not null default now(),

  constraint uk_early_signups_email_format
    check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create unique index uk_early_signups_email_unique
on public.uk_early_signups (lower(email));

alter table public.uk_early_signups enable row level security;

-- Browser roles have no table privileges or RLS policies. Only the secret key
-- used inside the Edge Function can access signup records.
revoke all on table public.uk_early_signups from anon, authenticated;

comment on table public.uk_early_signups is
  'UK early-access signups submitted through the uk-early-signup Edge Function.';

commit;

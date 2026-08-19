begin;

create table public.referral_signups (
  id uuid primary key default gen_random_uuid(),
  referrer_name text not null,
  referrer_email text not null,
  friend_email text not null,
  status text not null default 'pending',
  source text not null default 'referral-italia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint referral_signups_name_length_check
    check (char_length(btrim(referrer_name)) >= 2),
  constraint referral_signups_referrer_email_format_check
    check (referrer_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint referral_signups_friend_email_format_check
    check (friend_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint referral_signups_different_emails_check
    check (referrer_email <> friend_email),
  constraint referral_signups_status_check
    check (status in ('pending', 'sent', 'accepted', 'rewarded', 'cancelled')),
  constraint referral_signups_source_check
    check (source = 'referral-italia'),
  constraint referral_signups_referrer_friend_unique
    unique (referrer_email, friend_email)
);

create or replace function public.normalize_referral_signup()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.referrer_name := btrim(new.referrer_name);
  new.referrer_email := lower(btrim(new.referrer_email));
  new.friend_email := lower(btrim(new.friend_email));
  new.source := btrim(new.source);
  new.updated_at := now();
  return new;
end;
$$;

create trigger normalize_referral_signup_before_write
before insert or update on public.referral_signups
for each row
execute function public.normalize_referral_signup();

alter table public.referral_signups enable row level security;

revoke all on table public.referral_signups from anon, authenticated;
grant insert on table public.referral_signups to anon, authenticated;

create policy "Anonymous visitors can submit pending referrals"
on public.referral_signups
for insert
to anon
with check (
  status = 'pending'
  and source = 'referral-italia'
  and referrer_email <> friend_email
);

create policy "Authenticated visitors can submit pending referrals"
on public.referral_signups
for insert
to authenticated
with check (
  status = 'pending'
  and source = 'referral-italia'
  and referrer_email <> friend_email
);

comment on table public.referral_signups is
  'Referral invitations submitted from the ZeepUp referral-italia page.';

commit;

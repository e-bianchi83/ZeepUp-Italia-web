begin;

create table public.uk_partner_registrations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  source text not null default 'zeepup_uk_partner_interest',
  partner_type text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  role text not null,
  trading_name text not null,
  town_city text not null,
  local_authority text not null,
  home_address_line_1 text,
  home_address_line_2 text,
  home_address_town_city text,
  home_address_county text,
  home_address_postcode text,
  venue_address_line_1 text,
  venue_address_line_2 text,
  venue_address_town_city text,
  venue_address_county text,
  venue_address_postcode text,
  application_data jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  status text not null default 'submitted',
  applicant_email_sent boolean not null default false,
  internal_email_sent boolean not null default false,
  email_last_error text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uk_partner_registrations_source_check
    check (source = 'zeepup_uk_partner_interest'),
  constraint uk_partner_registrations_partner_type_check
    check (partner_type in ('home_chef', 'chef_venue')),
  constraint uk_partner_registrations_status_check
    check (status in ('submitted', 'reviewing', 'contacted', 'approved', 'declined', 'archived')),
  constraint uk_partner_registrations_email_format
    check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint uk_partner_registrations_application_object
    check (jsonb_typeof(application_data) = 'object'),
  constraint uk_partner_registrations_documents_object
    check (jsonb_typeof(documents) = 'object')
);

create index uk_partner_registrations_created_at_idx
on public.uk_partner_registrations (created_at desc);

create index uk_partner_registrations_email_idx
on public.uk_partner_registrations (lower(email));

create index uk_partner_registrations_status_idx
on public.uk_partner_registrations (status, created_at desc);

alter table public.uk_partner_registrations enable row level security;

-- Browser roles cannot read or write applications. The Edge Function uses the
-- hosted service-role key, which is never exposed to the website.
revoke all on table public.uk_partner_registrations from anon, authenticated;

comment on table public.uk_partner_registrations is
  'UK home-chef and food-partner applications submitted through the secure uk-partner-registration Edge Function.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'uk-partner-documents',
  'uk-partner-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;

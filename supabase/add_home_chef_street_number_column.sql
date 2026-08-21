begin;

alter table public.home_chef_registration_italia
  add column if not exists street_number text;

comment on column public.home_chef_registration_italia.street_number is
  'Street or building number supplied by the Italian home-chef applicant.';

commit;

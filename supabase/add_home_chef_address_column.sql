begin;

alter table public.home_chef_registration_italia
  add column if not exists address text;

comment on column public.home_chef_registration_italia.address is
  'Street address supplied by the Italian home-chef applicant.';

commit;

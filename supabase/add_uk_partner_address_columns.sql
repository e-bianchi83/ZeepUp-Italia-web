begin;

alter table public.uk_partner_registrations
  add column if not exists home_address_line_1 text,
  add column if not exists home_address_line_2 text,
  add column if not exists home_address_town_city text,
  add column if not exists home_address_county text,
  add column if not exists home_address_postcode text,
  add column if not exists venue_address_line_1 text,
  add column if not exists venue_address_line_2 text,
  add column if not exists venue_address_town_city text,
  add column if not exists venue_address_county text,
  add column if not exists venue_address_postcode text;

update public.uk_partner_registrations
set
  home_address_line_1 = coalesce(home_address_line_1, nullif(application_data ->> 'home_address_line_1', '')),
  home_address_line_2 = coalesce(home_address_line_2, nullif(application_data ->> 'home_address_line_2', '')),
  home_address_town_city = coalesce(home_address_town_city, nullif(application_data ->> 'home_address_town_city', '')),
  home_address_county = coalesce(home_address_county, nullif(application_data ->> 'home_address_county', '')),
  home_address_postcode = coalesce(home_address_postcode, nullif(application_data ->> 'home_kitchen_postcode', '')),
  venue_address_line_1 = coalesce(venue_address_line_1, nullif(application_data ->> 'venue_address_line_1', '')),
  venue_address_line_2 = coalesce(venue_address_line_2, nullif(application_data ->> 'venue_address_line_2', '')),
  venue_address_town_city = coalesce(venue_address_town_city, nullif(application_data ->> 'venue_address_town_city', '')),
  venue_address_county = coalesce(venue_address_county, nullif(application_data ->> 'venue_address_county', '')),
  venue_address_postcode = coalesce(venue_address_postcode, nullif(application_data ->> 'venue_postcode', ''))
where
  home_address_line_1 is null
  or home_address_line_2 is null
  or home_address_town_city is null
  or home_address_county is null
  or home_address_postcode is null
  or venue_address_line_1 is null
  or venue_address_line_2 is null
  or venue_address_town_city is null
  or venue_address_county is null
  or venue_address_postcode is null;

comment on column public.uk_partner_registrations.home_address_line_1 is 'Home-chef kitchen address: building number/name and street.';
comment on column public.uk_partner_registrations.home_address_line_2 is 'Optional home-chef apartment, building or locality.';
comment on column public.uk_partner_registrations.home_address_town_city is 'Home-chef kitchen post town or city.';
comment on column public.uk_partner_registrations.home_address_county is 'Optional home-chef county.';
comment on column public.uk_partner_registrations.home_address_postcode is 'Home-chef kitchen UK postcode.';
comment on column public.uk_partner_registrations.venue_address_line_1 is 'Venue address: building number/name and street.';
comment on column public.uk_partner_registrations.venue_address_line_2 is 'Optional venue unit, building or locality.';
comment on column public.uk_partner_registrations.venue_address_town_city is 'Venue post town or city.';
comment on column public.uk_partner_registrations.venue_address_county is 'Optional venue county.';
comment on column public.uk_partner_registrations.venue_address_postcode is 'Venue UK postcode.';

commit;

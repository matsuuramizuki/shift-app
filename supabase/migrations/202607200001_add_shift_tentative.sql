alter table public.shifts
add column if not exists is_tentative boolean not null default false;

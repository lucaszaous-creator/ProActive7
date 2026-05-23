-- Wave 5: campos profissionais da nutricionista RT.
alter table public.profiles
  add column if not exists crn text,
  add column if not exists phone text;

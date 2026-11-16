-- Sign in with Google: an account may have a password, a Google identity, or both.
alter table public.accounts alter column password_hash drop not null;
alter table public.accounts add column if not exists google_sub text unique;
alter table public.accounts add constraint accounts_has_credential
  check (password_hash is not null or google_sub is not null);

-- Companion colour chosen during onboarding (preset id, see lib/pets.ts PET_COLORS).
alter table public.pets add column if not exists color text not null default 'original'
  check (color in ('original', 'dawn', 'bloom', 'sunny', 'grove', 'tide'));

-- Twelve companions replace the three prototype species (see lib/pets.ts PET_SPECIES).
-- Existing pets are mapped: axolotl -> dragon, sprout -> rabbit, fox -> tiger.
alter table public.pets alter column species drop default;
alter table public.pets alter column species type text using species::text;

update public.pets
set species = case species when 'axolotl' then 'dragon' when 'sprout' then 'rabbit' when 'fox' then 'tiger' else species end;

drop type public.pet_species;
create type public.pet_species as enum (
  'mouse', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'
);

alter table public.pets alter column species type public.pet_species using species::public.pet_species;
alter table public.pets alter column species set default 'rabbit';
alter table public.pets alter column name set default 'Peach';

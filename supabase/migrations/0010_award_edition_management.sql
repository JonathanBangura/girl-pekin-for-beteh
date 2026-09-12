-- 0010_award_edition_management.sql
-- Girl Pikin For Betteh Foundation
-- Adds an explicit ceremony-event link to award editions.
-- Existing event -> award_edition relationships remain valid.

begin;

alter table public.award_editions
  add column if not exists ceremony_event_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'award_editions_ceremony_event_fk'
  ) then
    alter table public.award_editions
      add constraint award_editions_ceremony_event_fk
      foreign key (ceremony_event_id)
      references public.events(id)
      on delete set null;
  end if;
end $$;

create index if not exists award_editions_ceremony_event_idx
  on public.award_editions(ceremony_event_id);

create or replace function public.validate_award_edition_ceremony_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  linked_edition_id uuid;
begin
  if new.ceremony_event_id is null then
    return new;
  end if;

  select e.award_edition_id
    into linked_edition_id
  from public.events e
  where e.id = new.ceremony_event_id;

  if not found then
    raise exception 'Ceremony event % does not exist', new.ceremony_event_id;
  end if;

  if linked_edition_id is distinct from new.id then
    raise exception
      'Ceremony event % must belong to award edition %',
      new.ceremony_event_id,
      new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists award_editions_validate_ceremony_event
  on public.award_editions;

create trigger award_editions_validate_ceremony_event
before insert or update of ceremony_event_id
on public.award_editions
for each row execute function public.validate_award_edition_ceremony_event();

commit;

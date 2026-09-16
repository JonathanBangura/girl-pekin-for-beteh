-- 0020_awards_nominee_rls_recursion_hotfix.sql
-- Fixes PostgreSQL 42P17:
-- "infinite recursion detected in policy for relation award_editions"
--
-- Root cause:
-- editions_nominee_read queried public.nominees directly.
-- nominees_public_read queries public.award_editions.
-- That creates the RLS cycle:
-- award_editions -> nominees -> award_editions.
--
-- Use SECURITY DEFINER helper functions for nominee ownership checks so
-- the policy check does not recursively invoke nominees RLS.

begin;

create or replace function public.is_my_nominee_edition(
  requested_award_edition_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.nominees n
    where n.award_edition_id = requested_award_edition_id
      and n.auth_user_id = auth.uid()
  );
$$;

revoke all
on function public.is_my_nominee_edition(uuid)
from public, anon;

grant execute
on function public.is_my_nominee_edition(uuid)
to authenticated;


create or replace function public.is_my_nominee_category(
  requested_category_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.nominees n
    where n.category_id = requested_category_id
      and n.auth_user_id = auth.uid()
  );
$$;

revoke all
on function public.is_my_nominee_category(uuid)
from public, anon;

grant execute
on function public.is_my_nominee_category(uuid)
to authenticated;


drop policy if exists editions_nominee_read
on public.award_editions;

create policy editions_nominee_read
on public.award_editions
for select
to authenticated
using (
  public.is_my_nominee_edition(id)
);


drop policy if exists categories_nominee_read
on public.award_categories;

create policy categories_nominee_read
on public.award_categories
for select
to authenticated
using (
  public.is_my_nominee_category(id)
);

commit;

-- 0004_nominee_portal_access.sql
-- Allows an authenticated nominee to read the edition/category attached to
-- their own linked nominee record.

begin;

drop policy if exists editions_nominee_read on public.award_editions;
create policy editions_nominee_read
on public.award_editions
for select
to authenticated
using (
  exists (
    select 1
    from public.nominees n
    where n.award_edition_id = award_editions.id
      and n.auth_user_id = auth.uid()
  )
);

drop policy if exists categories_nominee_read on public.award_categories;
create policy categories_nominee_read
on public.award_categories
for select
to authenticated
using (
  exists (
    select 1
    from public.nominees n
    where n.category_id = award_categories.id
      and n.auth_user_id = auth.uid()
  )
);

commit;

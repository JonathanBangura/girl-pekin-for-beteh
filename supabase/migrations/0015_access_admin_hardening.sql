-- 0015_access_admin_hardening.sql
-- Makes profile suspension/disablement effective across permission checks.
-- No role definitions are changed.

begin;

create or replace function public.has_role(
  requested_role_code text,
  requested_scope_type text default null,
  requested_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles pr on pr.id = ur.user_id
    where ur.user_id = auth.uid()
      and pr.status = 'active'
      and r.code = requested_role_code
      and (
        ur.scope_id is null
        or (
          requested_scope_type is not null
          and requested_scope_id is not null
          and ur.scope_type = requested_scope_type
          and ur.scope_id = requested_scope_id
        )
      )
  );
$$;

create or replace function public.has_permission(
  requested_permission_code text,
  requested_scope_type text default null,
  requested_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    join public.profiles pr on pr.id = ur.user_id
    where ur.user_id = auth.uid()
      and pr.status = 'active'
      and p.code = requested_permission_code
      and (
        ur.scope_id is null
        or (
          requested_scope_type is not null
          and requested_scope_id is not null
          and ur.scope_type = requested_scope_type
          and ur.scope_id = requested_scope_id
        )
      )
  );
$$;

create or replace function public.current_role_codes()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct r.code order by r.code),
    array[]::text[]
  )
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.profiles pr on pr.id = ur.user_id
  where ur.user_id = auth.uid()
    and ur.scope_id is null
    and pr.status = 'active';
$$;

grant execute on function public.has_role(text, text, uuid)
  to authenticated;
grant execute on function public.has_permission(text, text, uuid)
  to authenticated;
grant execute on function public.current_role_codes()
  to authenticated;

commit;

-- Phase 9 Users/Roles/Audit read-only verification.

-- 1. Permission helpers should require active profiles.
select pg_get_functiondef(
  'public.has_permission(text,text,uuid)'::regprocedure
) as has_permission_definition;

select pg_get_functiondef(
  'public.has_role(text,text,uuid)'::regprocedure
) as has_role_definition;

-- 2. Current role assignments.
select
  p.full_name,
  p.status as profile_status,
  r.code as role_code,
  r.name as role_name,
  ur.scope_type,
  ur.scope_id,
  ur.created_at
from public.user_roles ur
join public.profiles p on p.id = ur.user_id
join public.roles r on r.id = ur.role_id
order by p.full_name, r.name, ur.scope_type;

-- 3. There must always be at least one ACTIVE global Super Admin.
select
  count(*) as active_global_super_admins
from public.user_roles ur
join public.roles r on r.id = ur.role_id
join public.profiles p on p.id = ur.user_id
where r.code = 'super_admin'
  and ur.scope_type = 'global'
  and ur.scope_id is null
  and p.status = 'active';

-- Expected: >= 1

-- 4. Duplicate assignments should not exist.
select
  user_id,
  role_id,
  scope_type,
  scope_id,
  count(*) as assignment_count
from public.user_roles
group by user_id, role_id, scope_type, scope_id
having count(*) > 1;

-- Expected: no rows

-- 5. Staff access audit activity.
select
  action,
  entity_type,
  entity_id,
  actor_user_id,
  old_data,
  new_data,
  metadata,
  created_at
from public.audit_logs
where action in (
  'staff_user_invited',
  'staff_profile_updated',
  'staff_user_status_changed',
  'user_role_assigned',
  'user_role_removed'
)
order by created_at desc
limit 50;

-- 6. Suspended/disabled users.
select
  id,
  full_name,
  status,
  updated_at
from public.profiles
where status in ('suspended', 'disabled')
order by updated_at desc;

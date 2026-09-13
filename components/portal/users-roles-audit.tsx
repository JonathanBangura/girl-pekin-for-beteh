import Link from 'next/link'
import {
  assignUserRole,
  inviteStaffUser,
  removeUserRole,
  setStaffStatus,
  updateStaffProfile,
} from '@/lib/access/actions'
import {
  getAuditLogData,
  getUsersAndRolesData,
} from '@/lib/access/data'

function humanize(value?: string | null) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    )
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function AccessNotice({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  const error = params.error

  if (error) {
    const messages: Record<string, string> = {
      missing_invite_fields:
        'Enter a valid email address and full name.',
      invite_failed:
        'The invitation could not be sent.',
      role_assignment_failed:
        'The user exists, but the role assignment failed.',
      missing_profile_fields:
        'Full name is required.',
      profile_update_failed:
        'The staff profile could not be updated.',
      invalid_status:
        'That account status is invalid.',
      cannot_suspend_self:
        'You cannot suspend or disable your own account.',
      last_super_admin:
        'This change would remove or disable the last active Super Admin.',
      status_update_failed:
        'The account status could not be updated.',
      missing_role_fields:
        'Select a user and role.',
      role_not_found:
        'The selected role no longer exists.',
      invalid_scope:
        'The selected access scope is invalid.',
      scope_not_found:
        'The selected access scope no longer exists.',
      role_scope_invalid:
        'That role cannot be assigned to the selected scope.',
      nominee_role_managed_elsewhere:
        'Nominee Portal access is managed from the nominee-account workflow, not Staff Users & Roles.',
      assignment_not_found:
        'The role assignment could not be found.',
      cannot_remove_own_super_admin:
        'You cannot remove your own global Super Admin role.',
      role_remove_failed:
        'The role assignment could not be removed.',
      '23505':
        'That role is already assigned to this user at the selected scope.',
    }

    return (
      <div className="live-form-message error">
        {messages[error] ||
          'The user-access change could not be completed.'}
      </div>
    )
  }

  if (params.invited === '1') {
    return (
      <div className="live-form-message success">
        Staff invitation created successfully.
        {params.warning === 'role_assignment_failed'
          ? ' The invitation succeeded, but review the user and assign the role manually.'
          : ''}
      </div>
    )
  }

  if (
    params.updated === '1' ||
    params.status_updated === '1' ||
    params.role_assigned === '1' ||
    params.role_removed === '1'
  ) {
    return (
      <div className="live-form-message success">
        User access updated successfully.
      </div>
    )
  }

  return null
}

function ScopeOptions({
  data,
}: {
  data: Awaited<ReturnType<typeof getUsersAndRolesData>>
}) {
  return (
    <>
      <option value="global">Global · entire platform</option>

      {data.editions.map((edition) => {
        const award = data.awards.find(
          (item) => item.id === edition.award_id,
        )

        return (
          <option
            key={`edition:${edition.id}`}
            value={`award_edition:${edition.id}`}
          >
            Award Edition · {award?.name ?? 'Award'} ·{' '}
            {edition.edition_label} · {edition.year}
          </option>
        )
      })}

      {data.events.map((event) => (
        <option
          key={`event:${event.id}`}
          value={`event:${event.id}`}
        >
          Event · {event.title}
        </option>
      ))}
    </>
  )
}

export async function UsersRolesManagementPage({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  const data = await getUsersAndRolesData()
  const staffRoles = data.roles.filter(
    (role) => role.code !== 'nominee',
  )

  const activeCount = data.profiles.filter(
    (profile) => profile.status === 'active',
  ).length

  const suspendedCount = data.profiles.filter(
    (profile) =>
      profile.status === 'suspended' ||
      profile.status === 'disabled',
  ).length

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Administration / Access
          </span>
          <h1>Users & Roles</h1>
          <p>
            Invite staff, manage platform access and assign
            global or operationally scoped roles.
          </p>
        </div>

        <Link className="button secondary" href="/admin/audit">
          Audit Logs
        </Link>
      </div>

      <AccessNotice params={params} />

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Users</span>
          <strong>{data.profiles.length}</strong>
          <small>Authentication profiles</small>
        </article>
        <article>
          <span>Active</span>
          <strong>{activeCount}</strong>
          <small>Permissions enabled</small>
        </article>
        <article>
          <span>Suspended / Disabled</span>
          <strong>{suspendedCount}</strong>
          <small>Permissions blocked</small>
        </article>
        <article>
          <span>System roles</span>
          <strong>{data.roles.length}</strong>
          <small>Controlled role definitions</small>
        </article>
      </div>

      <details className="panel live-create-panel">
        <summary>Invite Staff User</summary>

        <form
          action={inviteStaffUser}
          className="live-admin-form mobile-admin-form"
        >
          <label>
            Full name
            <input name="full_name" required />
          </label>

          <label>
            Email
            <input name="email" type="email" required />
          </label>

          <label>
            Phone
            <input name="phone" type="tel" />
          </label>

          <label>
            Initial role
            <select name="role_id" defaultValue="">
              <option value="">
                Invite without role
              </option>
              {staffRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="full">
            Initial scope
            <select name="scope_ref" defaultValue="global">
              <ScopeOptions data={data} />
            </select>
            <small>
              Finance, Content, Auditor and Super Admin are
              global roles. Awards roles may be scoped to an
              Award Edition; Event and Check-In roles may be
              scoped to an Event.
            </small>
          </label>

          <div className="full">
            <button className="button" type="submit">
              Send Staff Invitation
            </button>
          </div>
        </form>
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Staff access</h2>
            <span className="live-data-badge">
              LIVE ACCESS DATA
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Roles</th>
                <th>Last sign-in</th>
                <th>Manage</th>
              </tr>
            </thead>

            <tbody>
              {data.profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <strong>
                      {profile.full_name || 'Unnamed user'}
                    </strong>
                    <small>{profile.email || 'No email'}</small>
                    <small>{profile.phone || 'No phone'}</small>
                  </td>

                  <td>
                    <span
                      className={`pill ${
                        profile.status === 'active'
                          ? 'teal'
                          : 'coral'
                      }`}
                    >
                      {humanize(profile.status)}
                    </span>
                    {!profile.email_confirmed_at ? (
                      <small>Email not confirmed</small>
                    ) : null}
                  </td>

                  <td>
                    {profile.assignments.length ? (
                      profile.assignments.map((assignment) => (
                        <div key={assignment.id}>
                          <strong>
                            {assignment.role?.name ??
                              'Unknown role'}
                          </strong>
                          <small>
                            {humanize(
                              assignment.scope_type,
                            )}{' '}
                            · {assignment.scope_label}
                          </small>
                        </div>
                      ))
                    ) : (
                      <span>No role assigned</span>
                    )}
                  </td>

                  <td>
                    {dateTime(profile.last_sign_in_at)}
                  </td>

                  <td>
                    <details className="live-row-editor wide mobile-row-editor">
                      <summary>Manage</summary>

                      <div className="live-row-form mobile-row-form">
                        <form
                          action={updateStaffProfile}
                          className="live-row-form"
                        >
                          <input
                            type="hidden"
                            name="user_id"
                            value={profile.id}
                          />

                          <label>
                            Full name
                            <input
                              name="full_name"
                              defaultValue={profile.full_name}
                              required
                            />
                          </label>

                          <label>
                            Phone
                            <input
                              name="phone"
                              defaultValue={profile.phone ?? ''}
                            />
                          </label>

                          <button
                            className="button compact"
                            type="submit"
                          >
                            Save Profile
                          </button>
                        </form>

                        <form
                          action={setStaffStatus}
                          className="live-row-form"
                        >
                          <input
                            type="hidden"
                            name="user_id"
                            value={profile.id}
                          />

                          <label>
                            Account status
                            <select
                              name="status"
                              defaultValue={profile.status}
                            >
                              <option value="active">
                                Active
                              </option>
                              <option value="suspended">
                                Suspended
                              </option>
                              <option value="disabled">
                                Disabled
                              </option>
                            </select>
                          </label>

                          <button
                            className="button secondary compact"
                            type="submit"
                          >
                            Update Status
                          </button>
                        </form>

                        <form
                          action={assignUserRole}
                          className="live-row-form"
                        >
                          <input
                            type="hidden"
                            name="user_id"
                            value={profile.id}
                          />

                          <label>
                            Add role
                            <select name="role_id" required>
                              <option value="">
                                Select role
                              </option>
                              {staffRoles.map((role) => (
                                <option
                                  key={role.id}
                                  value={role.id}
                                >
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            Scope
                            <select
                              name="scope_ref"
                              defaultValue="global"
                            >
                              <ScopeOptions data={data} />
                            </select>
                          </label>

                          <button
                            className="button compact"
                            type="submit"
                          >
                            Assign Role
                          </button>
                        </form>

                        {profile.assignments
                          .filter(
                            (assignment) =>
                              assignment.role?.code !==
                              'nominee',
                          )
                          .map((assignment) => (
                            <form
                              action={removeUserRole}
                              key={assignment.id}
                              className="live-row-form"
                            >
                              <input
                                type="hidden"
                                name="assignment_id"
                                value={assignment.id}
                              />

                              <div>
                                <strong>
                                  Remove{' '}
                                  {assignment.role?.name ??
                                    'role'}
                                </strong>
                                <small>
                                  {assignment.scope_label}
                                </small>
                              </div>

                              <button
                                className="button secondary compact"
                                type="submit"
                              >
                                Remove Role
                              </button>
                            </form>
                          ))}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.profiles.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="live-empty-state compact">
                      <strong>No users found.</strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Role Matrix
            </span>
            <h2>System role permissions</h2>
          </div>
        </div>

        <p className="live-empty-copy">
          System role definitions are read-only here. Change role
          definitions through controlled migrations, while user
          assignments are managed above.
        </p>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th>Permissions</th>
              </tr>
            </thead>

            <tbody>
              {data.roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <strong>{role.name}</strong>
                    <small>{role.code}</small>
                  </td>
                  <td>{role.description || '—'}</td>
                  <td>
                    {role.permissions.length
                      ? role.permissions
                          .map(
                            (permission) =>
                              permission?.code,
                          )
                          .filter(Boolean)
                          .join(', ')
                      : 'No permissions'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Account lifecycle
            </span>
            <h2>Deletion is intentionally not exposed</h2>
          </div>
        </div>

        <p className="live-empty-copy">
          Suspend or disable staff instead of deleting identities
          that may be referenced by finance, results, ticketing or
          audit history.
        </p>
      </section>
    </div>
  )
}

function jsonPreview(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'object' &&
      Object.keys(value as Record<string, unknown>).length === 0)
  ) {
    return '—'
  }

  return JSON.stringify(value, null, 2)
}

export async function AuditLogsLivePage({
  filters,
}: {
  filters: {
    actor?: string
    action?: string
    entity?: string
    from?: string
    to?: string
  }
}) {
  const data = await getAuditLogData(filters)

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Administration / Audit
          </span>
          <h1>Audit Logs</h1>
          <p>
            Read-only operational history for administrative,
            finance, awards, results and access-control actions.
          </p>
        </div>

        <Link className="button secondary" href="/admin/users">
          Users & Roles
        </Link>
      </div>

      <form
        className="panel live-admin-form mobile-admin-form"
        method="get"
      >
        <label>
          Actor
          <select
            name="actor"
            defaultValue={filters.actor ?? ''}
          >
            <option value="">All actors</option>
            {data.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.full_name}
                {actor.email
                  ? ` · ${actor.email}`
                  : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          Action contains
          <input
            name="action"
            defaultValue={filters.action ?? ''}
            placeholder="e.g. result, payment, role"
          />
        </label>

        <label>
          Entity type
          <select
            name="entity"
            defaultValue={filters.entity ?? ''}
          >
            <option value="">All entity types</option>
            {data.entityTypes.map((entity) => (
              <option key={entity} value={entity}>
                {humanize(entity)}
              </option>
            ))}
          </select>
        </label>

        <label>
          From
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ''}
          />
        </label>

        <label>
          To
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ''}
          />
        </label>

        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">
            Apply Filters
          </button>
          <Link
            className="button secondary"
            href="/admin/audit"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Audit events</h2>
            <span className="live-data-badge">
              {data.logs.length} RESULTS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Changes</th>
              </tr>
            </thead>

            <tbody>
              {data.logs.map((log) => (
                <tr key={log.id}>
                  <td>{dateTime(log.created_at)}</td>

                  <td>
                    <strong>
                      {log.actor?.full_name ??
                        'System / service'}
                    </strong>
                    <small>{log.actor?.email ?? '—'}</small>
                  </td>

                  <td>
                    <strong>{humanize(log.action)}</strong>
                    <small>{log.action}</small>
                  </td>

                  <td>
                    <strong>
                      {humanize(log.entity_type)}
                    </strong>
                    <small>{log.entity_id ?? '—'}</small>
                  </td>

                  <td>
                    <details>
                      <summary>View details</summary>

                      <strong>Before</strong>
                      <pre>{jsonPreview(log.old_data)}</pre>

                      <strong>After</strong>
                      <pre>{jsonPreview(log.new_data)}</pre>

                      <strong>Metadata</strong>
                      <pre>{jsonPreview(log.metadata)}</pre>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.logs.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="live-empty-state compact">
                      <strong>
                        No audit events match these filters.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

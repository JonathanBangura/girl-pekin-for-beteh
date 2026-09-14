import Link from 'next/link'
import { Pill } from '@/components/public/public'
import {
  createNomineeAnnouncement,
  issueNomineeCeremonyPass,
  revokeNomineeCeremonyPass,
  setNomineeAnnouncementPublished,
  setNomineeResourcePublished,
  uploadNomineeResource,
} from '@/lib/nominee/admin-actions'
import { getNomineeCommunicationAdminData } from '@/lib/nominee/admin-data'

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

function fileSize(value?: number | null) {
  if (!value) return '—'
  if (value < 1024 * 1024) {
    return `${Math.max(
      1,
      Math.round(value / 1024),
    )} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function CommunicationNotice({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  if (params.error) {
    const messages: Record<string, string> = {
      missing_announcement_fields:
        'Announcement title and body are required.',
      invalid_priority:
        'The selected announcement priority is invalid.',
      announcement_not_found:
        'The announcement could not be found.',
      announcement_update_failed:
        'The announcement could not be updated.',
      missing_resource_fields:
        'Resource title and file are required.',
      invalid_resource_type:
        'The selected resource type is invalid.',
      invalid_resource_file:
        'Resources must be PDF, PNG, JPEG or WebP and no larger than 10 MB.',
      resource_upload_failed:
        'The file could not be uploaded to secure storage.',
      resource_create_failed:
        'The file uploaded but its resource record could not be created.',
      resource_not_found:
        'The resource could not be found.',
      resource_update_failed:
        'The resource publication state could not be updated.',
      missing_pass_fields:
        'Select both a nominee and ceremony event.',
      event_not_found:
        'The selected event could not be found.',
      pass_not_found:
        'The ceremony pass could not be found.',
      pass_issue_failed:
        'The ceremony pass could not be issued.',
      pass_already_exists:
        'This nominee already has an active ceremony pass for the selected event.',
      pass_requires_linked_account:
        'Link the nominee to a Nominee Portal account before issuing a ceremony pass.',
      pass_nominee_not_eligible:
        'Only approved or published nominees can receive a ceremony pass.',
      pass_event_mismatch:
        'The selected nominee and event do not belong to the same award edition.',
      pass_revoke_failed:
        'The ceremony pass could not be revoked.',
      '23505':
        'A duplicate record already exists.',
      '42501':
        'Your account does not have permission for this action.',
    }

    return (
      <div className="live-form-message error">
        {messages[params.error] ||
          'The nominee communication operation could not be completed.'}
      </div>
    )
  }

  if (
    params.announcement_created === '1' ||
    params.announcement_updated === '1'
  ) {
    return (
      <div className="live-form-message success">
        Announcement updated successfully.
      </div>
    )
  }

  if (
    params.resource_created === '1' ||
    params.resource_updated === '1'
  ) {
    return (
      <div className="live-form-message success">
        Nominee resource updated successfully.
      </div>
    )
  }

  if (params.pass_issued === '1') {
    return (
      <div className="live-form-message success">
        Complimentary nominee ceremony pass issued successfully.
      </div>
    )
  }

  if (params.pass_revoked === '1') {
    return (
      <div className="live-form-message success">
        Ceremony pass revoked. Its scanner ticket is now cancelled.
      </div>
    )
  }

  return null
}

export async function NomineeCommunicationAdminPage({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  const data = await getNomineeCommunicationAdminData(
    params.edition,
  )

  const edition = data.selectedEdition

  if (!edition) {
    return (
      <div className="portal-content v2-admin-page">
        <div className="v2-admin-page-head">
          <div>
            <span className="v2-admin-eyebrow">
              Communication
            </span>
            <h1>Nominee Communication</h1>
            <p>
              Your account does not currently manage an award
              edition available for nominee communication.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const eligibleNominees = data.nominees.filter(
    (nominee) =>
      ['approved', 'published'].includes(nominee.status) &&
      Boolean(nominee.auth_user_id),
  )

  const manageableEvents = data.events.filter(
    (event) => event.can_issue_pass,
  )



  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Administration / Nominees
          </span>
          <h1>Nominee Communication</h1>
          <p>
            Publish nominee announcements and private resources,
            and issue real scanner-compatible ceremony passes.
          </p>
        </div>

        <Link
          className="button secondary"
          href="/admin/awards/nominees"
        >
          Manage Nominees
        </Link>
      </div>

      <CommunicationNotice params={params} />

      <form className="panel live-admin-form" method="get">
        <label className="full">
          Award edition
          <select
            name="edition"
            defaultValue={edition.id}
          >
            {data.editions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.award?.name ?? 'Award'} ·{' '}
                {item.edition_label} · {item.year}
              </option>
            ))}
          </select>
        </label>

        <div className="full">
          <button
            className="button secondary"
            type="submit"
          >
            Load Edition
          </button>
        </div>
      </form>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Announcements</span>
          <strong>{data.announcements.length}</strong>
          <small>
            {
              data.announcements.filter(
                (item) => item.is_published,
              ).length
            }{' '}
            published
          </small>
        </article>

        <article>
          <span>Resources</span>
          <strong>{data.resources.length}</strong>
          <small>
            {
              data.resources.filter(
                (item) => item.is_published,
              ).length
            }{' '}
            published
          </small>
        </article>

        <article>
          <span>Portal nominees</span>
          <strong>{eligibleNominees.length}</strong>
          <small>Approved/published + linked</small>
        </article>

        <article>
          <span>Active passes</span>
          <strong>
            {
              data.passes.filter(
                (pass) => pass.status === 'active',
              ).length
            }
          </strong>
          <small>Scanner-compatible</small>
        </article>
      </div>

      {edition.can_manage_edition ? (
        <details className="panel live-create-panel">
        <summary>Create Nominee Announcement</summary>

        <form
          action={createNomineeAnnouncement}
          className="live-admin-form mobile-admin-form"
        >
          <input
            type="hidden"
            name="award_edition_id"
            value={edition.id}
          />

          <label className="full">
            Title
            <input name="title" required />
          </label>

          <label>
            Priority
            <select
              name="priority"
              defaultValue="information"
            >
              <option value="information">
                Information
              </option>
              <option value="important">
                Important
              </option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label>
            Expires at
            <input
              name="expires_at"
              type="datetime-local"
            />
          </label>

          <label className="full">
            Message
            <textarea
              name="body"
              rows={6}
              required
            />
          </label>

          <label className="live-check full">
            <input
              name="is_published"
              type="checkbox"
            />
            Publish immediately
          </label>

          <div className="full">
            <button className="button" type="submit">
              Create Announcement
            </button>
          </div>
        </form>
        </details>
      ) : null}

      {edition.can_manage_edition ? (
        <details className="panel live-create-panel">
        <summary>Upload Nominee Resource</summary>

        <form
          action={uploadNomineeResource}
          className="live-admin-form mobile-admin-form"
        >
          <input
            type="hidden"
            name="award_edition_id"
            value={edition.id}
          />

          <label>
            Title
            <input name="title" required />
          </label>

          <label>
            Resource type
            <select
              name="resource_type"
              defaultValue="document"
            >
              <option value="document">
                Document
              </option>
              <option value="campaign_asset">
                Campaign Asset
              </option>
              <option value="ceremony">
                Ceremony Resource
              </option>
            </select>
          </label>

          <label className="full">
            Description
            <textarea
              name="description"
              rows={3}
            />
          </label>

          <label>
            File
            <input
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              required
            />
          </label>

          <label>
            Expires at
            <input
              name="expires_at"
              type="datetime-local"
            />
          </label>

          <label className="live-check full">
            <input
              name="is_published"
              type="checkbox"
            />
            Publish immediately
          </label>

          <div className="full">
            <button className="button" type="submit">
              Upload Secure Resource
            </button>
          </div>
        </form>
        </details>
      ) : null}

      {!edition.can_manage_edition ? (
        <section className="panel">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">
                Event access only
              </span>
              <h2>Ceremony pass operations</h2>
            </div>
          </div>
          <p className="live-empty-copy">
            Your access to this edition comes from Event Manager
            permissions. Announcement and resource publishing
            remains restricted to award/nomination managers.
          </p>
        </section>
      ) : null}

      <details className="panel live-create-panel">
        <summary>Issue Nominee Ceremony Pass</summary>

        {manageableEvents.length ? (
          <form
            action={issueNomineeCeremonyPass}
            className="live-admin-form mobile-admin-form"
          >
            <input
              type="hidden"
              name="award_edition_id"
              value={edition.id}
            />

            <label>
              Nominee
              <select name="nominee_id" required>
                <option value="">Select nominee</option>
                {eligibleNominees.map((nominee) => (
                  <option
                    key={nominee.id}
                    value={nominee.id}
                  >
                    {nominee.full_name} ·{' '}
                    {nominee.nominee_code}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ceremony event
              <select name="event_id" required>
                <option value="">Select event</option>
                {manageableEvents.map((event) => (
                  <option
                    key={event.id}
                    value={event.id}
                  >
                    {event.title} ·{' '}
                    {dateTime(event.starts_at)}
                  </option>
                ))}
              </select>
            </label>

            <div className="full">
              <button className="button" type="submit">
                Issue Complimentary Pass
              </button>
            </div>
          </form>
        ) : (
          <div className="live-empty-state compact">
            <strong>
              You do not have Event Manager access to an event
              in this edition.
            </strong>
            <p>
              Ceremony passes are event access credentials, so
              they can only be issued by a user with
              `events.manage` for that event.
            </p>
          </div>
        )}
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Announcements</h2>
            <span className="live-data-badge">
              LIVE DATA
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Announcement</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Published</th>
                <th>Expires</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.announcements.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </td>
                  <td>{humanize(item.priority)}</td>
                  <td>
                    <Pill
                      tone={
                        item.is_published
                          ? 'teal'
                          : ''
                      }
                    >
                      {item.is_published
                        ? 'Published'
                        : 'Draft'}
                    </Pill>
                  </td>
                  <td>{dateTime(item.published_at)}</td>
                  <td>{dateTime(item.expires_at)}</td>
                  <td>
                    <form
                      action={
                        setNomineeAnnouncementPublished
                      }
                    >
                      <input
                        type="hidden"
                        name="announcement_id"
                        value={item.id}
                      />
                      <input
                        type="hidden"
                        name="publish"
                        value={
                          item.is_published
                            ? 'false'
                            : 'true'
                        }
                      />
                      <button
                        className="button secondary compact"
                        type="submit"
                      >
                        {item.is_published
                          ? 'Unpublish'
                          : 'Publish'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {!data.announcements.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="live-empty-state compact">
                      <strong>
                        No announcements created yet.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Nominee resources</h2>
            <span className="live-data-badge">
              PRIVATE STORAGE
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Type</th>
                <th>File</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.resources.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>
                      {item.description || '—'}
                    </small>
                  </td>
                  <td>
                    {humanize(item.resource_type)}
                  </td>
                  <td>
                    <a
                      className="text-button"
                      href={`/api/nominee/resources/${item.id}`}
                    >
                      {item.original_filename || 'Download'}
                    </a>
                    <small>
                      {fileSize(item.file_size_bytes)}
                    </small>
                  </td>
                  <td>
                    <Pill
                      tone={
                        item.is_published
                          ? 'teal'
                          : ''
                      }
                    >
                      {item.is_published
                        ? 'Published'
                        : 'Draft'}
                    </Pill>
                  </td>
                  <td>
                    <form
                      action={setNomineeResourcePublished}
                    >
                      <input
                        type="hidden"
                        name="resource_id"
                        value={item.id}
                      />
                      <input
                        type="hidden"
                        name="publish"
                        value={
                          item.is_published
                            ? 'false'
                            : 'true'
                        }
                      />
                      <button
                        className="button secondary compact"
                        type="submit"
                      >
                        {item.is_published
                          ? 'Unpublish'
                          : 'Publish'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {!data.resources.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="live-empty-state compact">
                      <strong>
                        No nominee resources uploaded yet.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Ceremony passes</h2>
            <span className="live-data-badge">
              SCANNER READY
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Nominee</th>
                <th>Event</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.passes.map((pass) => (
                <tr key={pass.id}>
                  <td>
                    <strong>
                      {pass.nominee?.full_name ||
                        'Unknown nominee'}
                    </strong>
                    <small>
                      {pass.nominee?.nominee_code || '—'}
                    </small>
                  </td>
                  <td>
                    {pass.event?.title || '—'}
                  </td>
                  <td>
                    <Pill
                      tone={
                        pass.status === 'active'
                          ? 'teal'
                          : 'coral'
                      }
                    >
                      {humanize(pass.status)}
                    </Pill>
                  </td>
                  <td>{dateTime(pass.issued_at)}</td>
                  <td>
                    {pass.status === 'active' &&
                    data.events.some(
                      (event) =>
                        event.id === pass.event_id &&
                        event.can_issue_pass,
                    ) ? (
                      <form
                        action={
                          revokeNomineeCeremonyPass
                        }
                        className="live-row-form"
                      >
                        <input
                          type="hidden"
                          name="pass_id"
                          value={pass.id}
                        />
                        <input
                          type="hidden"
                          name="event_id"
                          value={pass.event_id}
                        />
                        <input
                          type="hidden"
                          name="award_edition_id"
                          value={edition.id}
                        />
                        <input
                          name="reason"
                          placeholder="Optional reason"
                        />
                        <button
                          className="button secondary compact"
                          type="submit"
                        >
                          Revoke Pass
                        </button>
                      </form>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}

              {!data.passes.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="live-empty-state compact">
                      <strong>
                        No ceremony passes issued yet.
                      </strong>
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
              Access model
            </span>
            <h2>
              Nominee passes use the same event scanner
            </h2>
          </div>
        </div>

        <p className="live-empty-copy">
          Each issued nominee pass creates one zero-value
          complimentary ticket and no payment record. Revenue
          reports are therefore unaffected, while the existing
          one-time scanner validation remains authoritative.
        </p>
      </section>
    </div>
  )
}

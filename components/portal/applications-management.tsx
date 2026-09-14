import Link from 'next/link'
import { transitionNomineeApplication } from '@/lib/applications/actions'
import { getApplicationsManagementData } from '@/lib/applications/data'

function humanize(value?: string | null) {
  if (!value) return '—'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function dateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

export async function ApplicationsManagementPage({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  const data = await getApplicationsManagementData({
    requestedEditionId: params.edition,
    requestedStatus: params.status,
  })

  if (!data.selectedEdition) {
    return (
      <div className="portal-content v2-admin-page">
        <div className="v2-admin-page-head">
          <div>
            <span className="v2-admin-eyebrow">Awards / Applications</span>
            <h1>Applications</h1>
            <p>No award edition is available to your review role.</p>
          </div>
        </div>
      </div>
    )
  }

  const messages: Record<string, string> = {
    missing_fields: 'The application action is incomplete.',
    not_found: 'The nominee application could not be found.',
    invalid_transition: 'That workflow transition is not allowed from the current state.',
    reject_note_required: 'Enter a rejection reason before rejecting the application.',
    transition_failed: 'The application status could not be updated.',
  }

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Applications</span>
          <h1>Nomination Review</h1>
          <p>
            Review submitted nominee records before they become approved nominees.
            Approval does not publish a nominee automatically.
          </p>
        </div>
        <Link className="button secondary" href="/admin/awards/nominees">
          Nominees
        </Link>
      </div>

      {params.error ? (
        <div className="live-form-message error">
          {messages[params.error] || 'The review action could not be completed.'}
        </div>
      ) : null}

      {params.updated === '1' ? (
        <div className="live-form-message success">
          Application workflow updated successfully.
        </div>
      ) : null}

      <form className="panel live-admin-form mobile-admin-form" method="get">
        <label>
          Award edition
          <select name="edition" defaultValue={data.selectedEdition.id}>
            {data.editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.award?.name ?? 'Award'} · {edition.edition_label} · {edition.year}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select name="status" defaultValue={params.status ?? ''}>
            <option value="">All review states</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </label>

        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">Apply Filters</button>
          <Link
            className="button secondary"
            href={`/admin/awards/applications?edition=${data.selectedEdition.id}`}
          >
            Clear Status
          </Link>
        </div>
      </form>

      <div className="v2-admin-stats mobile-admin-stats">
        <article><span>Submitted</span><strong>{data.counts.submitted}</strong><small>Awaiting review</small></article>
        <article><span>Under review</span><strong>{data.counts.under_review}</strong><small>In progress</small></article>
        <article><span>Approved</span><strong>{data.counts.approved}</strong><small>Ready for nominee publication workflow</small></article>
        <article><span>Rejected</span><strong>{data.counts.rejected}</strong><small>Can be reopened</small></article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>{data.selectedEdition.edition_label} · {data.selectedEdition.year}</h2>
            <span className="live-data-badge">{data.applications.length} RECORDS</span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Applicant / Nominee</th>
                <th>Category</th>
                <th>Status</th>
                <th>Timeline</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {data.applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>{application.full_name}</strong>
                    <small>{application.nominee_code}</small>
                    <small>{application.institution || 'No institution'}</small>
                  </td>
                  <td>{application.category?.name ?? '—'}</td>
                  <td>{humanize(application.status)}</td>
                  <td>
                    <small>Submitted: {dateTime(application.submitted_at)}</small>
                    <small>Review: {dateTime(application.review_started_at)}</small>
                    <small>Decision: {dateTime(application.reviewed_at)}</small>
                  </td>
                  <td>
                    <details className="live-row-editor wide mobile-row-editor">
                      <summary>Open Review</summary>

                      <div className="live-management-stack">
                        <div>
                          <strong>Biography / Application Information</strong>
                          <p className="live-empty-copy">
                            {application.bio || 'No biography/application summary has been entered.'}
                          </p>
                        </div>

                        {application.review_note ? (
                          <div>
                            <strong>Latest review note</strong>
                            <p className="live-empty-copy">{application.review_note}</p>
                          </div>
                        ) : null}

                        {application.history.length ? (
                          <details>
                            <summary>Review history ({application.history.length})</summary>
                            {application.history.map((entry) => (
                              <p key={entry.id} className="live-empty-copy">
                                {dateTime(entry.created_at)} · {humanize(entry.from_status)} → {humanize(entry.to_status)}
                                {entry.note ? ` · ${entry.note}` : ''}
                              </p>
                            ))}
                          </details>
                        ) : null}

                        <form action={transitionNomineeApplication} className="live-admin-form mobile-admin-form">
                          <input type="hidden" name="nominee_id" value={application.id} />
                          <input type="hidden" name="award_edition_id" value={data.selectedEdition.id} />

                          <label className="full">
                            Review note
                            <textarea
                              name="note"
                              rows={3}
                              placeholder={
                                application.status === 'under_review'
                                  ? 'Required when rejecting; optional for approval/withdrawal.'
                                  : 'Optional workflow note.'
                              }
                            />
                          </label>

                          <div className="full live-inline-actions">
                            {application.status === 'submitted' ? (
                              <>
                                <button className="button compact" name="action" value="start_review" type="submit">
                                  Start Review
                                </button>
                                <button className="button secondary compact" name="action" value="withdraw" type="submit">
                                  Mark Withdrawn
                                </button>
                              </>
                            ) : null}

                            {application.status === 'under_review' ? (
                              <>
                                <button className="button compact" name="action" value="approve" type="submit">
                                  Approve
                                </button>
                                <button className="button secondary compact" name="action" value="reject" type="submit">
                                  Reject
                                </button>
                                <button className="button secondary compact" name="action" value="withdraw" type="submit">
                                  Mark Withdrawn
                                </button>
                              </>
                            ) : null}

                            {application.status === 'rejected' ? (
                              <button className="button compact" name="action" value="reopen" type="submit">
                                Reopen Review
                              </button>
                            ) : null}
                          </div>
                        </form>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.applications.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="live-empty-state compact">
                      <strong>No applications match this filter.</strong>
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
            <span className="v2-admin-eyebrow">Workflow boundary</span>
            <h2>Approval is not publication</h2>
          </div>
        </div>
        <p className="live-empty-copy">
          Applications move through Submitted → Under Review → Approved/Rejected.
          Approved records continue to the Nominees workspace, where publication
          and nominee-portal linking are handled separately.
        </p>
      </section>
    </div>
  )
}

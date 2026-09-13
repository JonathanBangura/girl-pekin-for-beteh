import Link from 'next/link'
import {
  approveResults,
  freezeResults,
  publishResults,
  reconcileResults,
  setResultWinner,
  startResultsReview,
} from '@/lib/results/actions'
import { getResultsAdminData } from '@/lib/results/admin-data'

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

function WorkflowNotice({
  done,
  error,
}: {
  done?: string
  error?: string
}) {
  if (error) {
    const messages: Record<string, string> = {
      missing_edition: 'Select an award edition first.',
      missing_fields:
        'The results action is missing required information.',
      reconciliation_blocked:
        'Reconciliation is blocked by one or more critical payment/vote integrity issues. Resolve them before continuing.',
      approval_blocked:
        'Approval is blocked by unresolved critical reconciliation issues.',
      publication_blocked:
        'Publication is blocked by unresolved critical reconciliation issues.',
      snapshot_stale:
        'The vote ledger changed after the results snapshot. Re-run reconciliation before approval or publication.',
      winners_incomplete:
        'A winner must be explicitly selected for every eligible public category before approval.',
      no_eligible_categories:
        'There are no eligible public categories to certify. Review categories and nominee publication status first.',
      winner_update_failed:
        'The winner selection could not be saved.',
      '42501':
        'Your account does not have permission to manage results.',
    }

    return (
      <div className="live-form-message error">
        {messages[error] ||
          'The results operation could not be completed.'}
      </div>
    )
  }

  if (done) {
    const labels: Record<string, string> = {
      freeze_award_results:
        'Voting results are frozen. Continue with reconciliation.',
      reconcile_award_results:
        'Reconciliation passed and a fresh vote snapshot was created. No winner was selected automatically.',
      start_award_results_review:
        'Results Review has started. Select each category winner manually.',
      approve_award_results:
        'Results have been approved and are ready for publication.',
      publish_award_results:
        'Results have been published.',
      winner_updated:
        'Winner selection updated.',
    }

    return (
      <div className="live-form-message success">
        {labels[done] || 'Results workflow updated.'}
      </div>
    )
  }

  return null
}

function Step({
  label,
  active,
  complete,
}: {
  label: string
  active?: boolean
  complete?: boolean
}) {
  return (
    <span
      className={`pill ${
        complete ? 'teal' : active ? 'gold' : ''
      }`}
    >
      {label}
    </span>
  )
}

export async function ResultsCertificationPage({
  editionId,
  done,
  error,
}: {
  editionId?: string
  done?: string
  error?: string
}) {
  const data = await getResultsAdminData(editionId)

  if (!data.selectedEdition) {
    return (
      <div className="portal-content v2-admin-page">
        <div className="v2-admin-page-head">
          <div>
            <span className="v2-admin-eyebrow">
              Awards / Results
            </span>
            <h1>Results Certification</h1>
            <p>
              Create an award edition before results can be
              certified.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const edition = data.selectedEdition
  const certification = data.certification
  const status = certification?.status ?? null

  const criticalIssues = data.issues.filter(
    (issue: any) => issue.severity === 'critical',
  )
  const warningIssues = data.issues.filter(
    (issue: any) => issue.severity === 'warning',
  )

  const categories = data.categories.map((category: any) => ({
    ...category,
    entries: data.entries.filter(
      (entry: any) => entry.category_id === category.id,
    ),
  }))

  const frozen =
    Boolean(certification) &&
    ['frozen', 'reconciled', 'review', 'approved', 'published'].includes(
      status ?? '',
    )
  const reconciled =
    Boolean(certification) &&
    ['reconciled', 'review', 'approved', 'published'].includes(
      status ?? '',
    )
  const reviewed =
    Boolean(certification) &&
    ['review', 'approved', 'published'].includes(status ?? '')
  const approved =
    Boolean(certification) &&
    ['approved', 'published'].includes(status ?? '')
  const published = status === 'published'

  const publicResultsHref = edition.award?.slug
    ? `/awards/${edition.award.slug}/results`
    : '/results'

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Awards / Results
          </span>
          <h1>Results Certification</h1>
          <p>
            Close, freeze, reconcile, review, approve and publish
            results without automatically declaring the vote leader
            as winner.
          </p>
        </div>

        {published ? (
          <Link
            className="button"
            href={publicResultsHref}
            target="_blank"
          >
            View Public Results
          </Link>
        ) : null}
      </div>

      <WorkflowNotice done={done} error={error} />

      <form className="panel live-admin-form" method="get">
        <label className="full">
          Award edition
          <select
            name="edition"
            defaultValue={edition.id}
          >
            {data.editions.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.award?.name ?? 'Award'} ·{' '}
                {item.edition_label} · {item.year}
              </option>
            ))}
          </select>
        </label>

        <div className="full">
          <button className="button secondary" type="submit">
            Load edition
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Certification workflow
            </span>
            <h2>
              {edition.award?.name ?? 'Award'} ·{' '}
              {edition.edition_label} · {edition.year}
            </h2>
          </div>
        </div>

        <div className="v2-admin-page-actions">
          <Step
            label="1 · Voting Closed"
            complete={[
              'voting_closed',
              'results_review',
              'results_published',
            ].includes(edition.status)}
            active={edition.status === 'voting_open'}
          />
          <Step
            label="2 · Frozen"
            complete={frozen}
            active={
              edition.status === 'voting_closed' && !frozen
            }
          />
          <Step
            label="3 · Reconciled"
            complete={reconciled}
            active={status === 'frozen'}
          />
          <Step
            label="4 · Review"
            complete={reviewed}
            active={status === 'reconciled'}
          />
          <Step
            label="5 · Approved"
            complete={approved}
            active={status === 'review'}
          />
          <Step
            label="6 · Published"
            complete={published}
            active={status === 'approved'}
          />
        </div>

        <div className="v2-admin-stats mobile-admin-stats">
          <article>
            <span>Edition status</span>
            <strong>{humanize(edition.status)}</strong>
            <small>
              Voting closed:{' '}
              {dateTime(edition.voting_ends_at)}
            </small>
          </article>

          <article>
            <span>Leaderboard</span>
            <strong>
              {humanize(edition.leaderboard_visibility)}
            </strong>
            <small>
              Frozen:{' '}
              {dateTime(edition.leaderboard_frozen_at)}
            </small>
          </article>

          <article>
            <span>Certification</span>
            <strong>{humanize(status)}</strong>
            <small>
              Snapshot:{' '}
              {dateTime(certification?.snapshot_at)}
            </small>
          </article>

          <article>
            <span>Winner selections</span>
            <strong>
              {data.selectedWinnerCount}/
              {data.requiredCategoryCount}
            </strong>
            <small>Eligible public categories</small>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Integrity checks
            </span>
            <h2>Reconciliation status</h2>
          </div>
        </div>

        {criticalIssues.length === 0 &&
        warningIssues.length === 0 ? (
          <div className="live-form-message success">
            No current payment/vote integrity exceptions were
            detected for this edition.
          </div>
        ) : (
          <div className="live-table-wrap mobile-table-wrap">
            <table className="live-admin-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Issue</th>
                  <th>Count</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {data.issues.map((issue: any) => (
                  <tr key={issue.issue_code}>
                    <td>
                      <span
                        className={`pill ${
                          issue.severity === 'critical'
                            ? 'coral'
                            : 'gold'
                        }`}
                      >
                        {humanize(issue.severity)}
                      </span>
                    </td>
                    <td>{humanize(issue.issue_code)}</td>
                    <td>{issue.issue_count}</td>
                    <td>{issue.issue_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {criticalIssues.length ? (
          <p className="live-empty-copy">
            Resolve critical issues under{' '}
            <Link href="/admin/finance/reconciliation">
              Finance → Reconciliation
            </Link>{' '}
            before creating or approving the results snapshot.
          </p>
        ) : null}

        {data.snapshotStale ? (
          <div className="live-form-message error">
            Vote-ledger activity occurred after the current snapshot.
            Re-run reconciliation before approval/publication. Re-run
            reconciliation clears current winner selections.
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Controlled actions
            </span>
            <h2>Next workflow action</h2>
          </div>
        </div>

        {edition.status === 'voting_open' ? (
          <div className="live-empty-state compact">
            <strong>Voting is still open.</strong>
            <p>
              Close voting first. Results cannot be frozen while the
              edition is in Voting Open.
            </p>
            <Link
              className="button secondary"
              href="/admin/awards/editions"
            >
              Go to Editions
            </Link>
          </div>
        ) : null}

        {edition.status === 'voting_closed' && !certification ? (
          <form action={freezeResults}>
            <input
              type="hidden"
              name="edition_id"
              value={edition.id}
            />
            <button className="button" type="submit">
              Freeze Results
            </button>
          </form>
        ) : null}

        {status === 'frozen' ? (
          <form action={reconcileResults}>
            <input
              type="hidden"
              name="edition_id"
              value={edition.id}
            />
            <button
              className="button"
              type="submit"
              disabled={criticalIssues.length > 0}
            >
              Run Reconciliation & Create Snapshot
            </button>
          </form>
        ) : null}

        {status === 'reconciled' ? (
          <div className="v2-admin-page-actions">
            <form action={startResultsReview}>
              <input
                type="hidden"
                name="edition_id"
                value={edition.id}
              />
              <button className="button" type="submit">
                Start Results Review
              </button>
            </form>

            <form action={reconcileResults}>
              <input
                type="hidden"
                name="edition_id"
                value={edition.id}
              />
              <button
                className="button secondary"
                type="submit"
              >
                Refresh Reconciliation Snapshot
              </button>
            </form>
          </div>
        ) : null}

        {status === 'review' ? (
          <div className="v2-admin-page-actions">
            <form action={approveResults}>
              <input
                type="hidden"
                name="edition_id"
                value={edition.id}
              />
              <button
                className="button"
                type="submit"
                disabled={
                  data.selectedWinnerCount !==
                    data.requiredCategoryCount ||
                  data.snapshotStale ||
                  criticalIssues.length > 0
                }
              >
                Approve Results
              </button>
            </form>

            <form action={reconcileResults}>
              <input
                type="hidden"
                name="edition_id"
                value={edition.id}
              />
              <button
                className="button secondary"
                type="submit"
              >
                Re-run Reconciliation
              </button>
            </form>
          </div>
        ) : null}

        {status === 'approved' ? (
          <form action={publishResults}>
            <input
              type="hidden"
              name="edition_id"
              value={edition.id}
            />
            <button
              className="button"
              type="submit"
              disabled={
                data.snapshotStale ||
                criticalIssues.length > 0
              }
            >
              Publish Certified Results
            </button>
          </form>
        ) : null}

        {published ? (
          <div className="live-form-message success">
            Certified results are public. Winner selections are now
            read-only.
          </div>
        ) : null}
      </section>

      {certification && data.entries.length ? (
        <section className="panel">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">
                Certified snapshot
              </span>
              <h2>
                Category results and manual winner selection
              </h2>
            </div>
          </div>

          <p className="live-empty-copy">
            Vote rank is evidence for review; it does not
            automatically determine the winner. A Results Manager
            must explicitly select each winner.
          </p>

          {categories.map((category: any) => (
            <details
              className="live-create-panel"
              key={category.id}
              open={status === 'review'}
            >
              <summary>
                {category.name} ·{' '}
                {
                  category.entries.filter(
                    (entry: any) => entry.eligible,
                  ).length
                }{' '}
                eligible nominee(s)
              </summary>

              <div className="live-table-wrap mobile-table-wrap">
                <table className="live-admin-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Nominee</th>
                      <th>Votes</th>
                      <th>Eligibility</th>
                      <th>Decision</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {category.entries.map((entry: any) => (
                      <tr key={entry.id}>
                        <td>#{entry.snapshot_rank}</td>
                        <td>
                          <strong>
                            {entry.nominee?.full_name ??
                              entry.nominee_name_snapshot ??
                              'Unknown nominee'}
                          </strong>
                          <small>
                            {entry.nominee?.nominee_code ??
                              entry.nominee_code_snapshot ??
                              entry.nominee_id}
                          </small>
                          <small>
                            {entry.nominee?.institution ||
                              entry.institution_snapshot ||
                              '—'}
                          </small>
                        </td>
                        <td>
                          {Number(
                            entry.snapshot_votes,
                          ).toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              entry.eligible
                                ? 'teal'
                                : 'coral'
                            }`}
                          >
                            {entry.eligible
                              ? 'Eligible'
                              : humanize(
                                  entry.nominee_status_snapshot,
                                )}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              entry.decision === 'winner'
                                ? 'gold'
                                : ''
                            }`}
                          >
                            {humanize(entry.decision)}
                          </span>
                          {entry.decision_note ? (
                            <small>
                              {entry.decision_note}
                            </small>
                          ) : null}
                        </td>
                        <td>
                          {status === 'review' &&
                          entry.eligible ? (
                            <form
                              action={setResultWinner}
                              className="live-row-form"
                            >
                              <input
                                type="hidden"
                                name="edition_id"
                                value={edition.id}
                              />
                              <input
                                type="hidden"
                                name="category_id"
                                value={category.id}
                              />
                              <input
                                type="hidden"
                                name="nominee_id"
                                value={entry.nominee_id}
                              />
                              <input
                                type="hidden"
                                name="is_winner"
                                value={
                                  entry.decision ===
                                  'winner'
                                    ? 'false'
                                    : 'true'
                                }
                              />

                              {entry.decision !==
                              'winner' ? (
                                <label>
                                  Decision note
                                  <input
                                    name="decision_note"
                                    placeholder="Optional review note"
                                  />
                                </label>
                              ) : null}

                              <button
                                className={
                                  entry.decision ===
                                  'winner'
                                    ? 'button secondary compact'
                                    : 'button compact'
                                }
                                type="submit"
                              >
                                {entry.decision ===
                                'winner'
                                  ? 'Clear Winner'
                                  : 'Select Winner'}
                              </button>
                            </form>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}

                    {!category.entries.length ? (
                      <tr>
                        <td colSpan={6}>
                          No snapshot entries for this
                          category.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </section>
      ) : null}
    </div>
  )
}

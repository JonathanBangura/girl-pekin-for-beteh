import {
  createAward,
  createAwardEdition,
  updateAward,
  updateAwardEdition,
} from '@/lib/admin/award-edition-actions'
import {
  getAwardManagementData,
  getEditionManagementData,
} from '@/lib/admin/award-edition-data'

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function dateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toLocalInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

function Notice({
  created,
  updated,
  error,
}: {
  created?: string
  updated?: string
  error?: string
}) {
  if (error) {
    const messages: Record<string, string> = {
      missing_fields: 'Please complete all required fields.',
      invalid_status: 'That lifecycle status is not available from this screen.',
      invalid_slug: 'Please enter a valid award name or slug.',
      active_editions: 'Archive the award’s active editions before archiving the award.',
      invalid_datetime: 'One of the date/time values is invalid.',
      invalid_voting_window: 'Voting close must be later than voting open.',
      voting_window_required:
        'Voting start and end are required before an edition can be placed in Voting Open.',
      voting_requires_public:
        'An edition must be public before its status can be Voting Open.',
      invalid_leaderboard_state: 'The leaderboard state is invalid.',
      award_unavailable: 'The selected award is unavailable or archived.',
      event_not_found: 'The selected ceremony event could not be found.',
      event_in_use: 'That event is already linked to another award edition.',
      event_link_failed: 'The event could not be linked to this edition.',
      ceremony_link_failed:
        'The edition was created, but the ceremony event link could not be saved.',
      '23505':
        'A record with the same unique value already exists. One award can only have one edition per year.',
    }

    return (
      <div className="live-form-message error">
        {messages[error] || 'The requested change could not be completed.'}
      </div>
    )
  }

  if (created === '1') {
    return <div className="live-form-message success">Record created successfully.</div>
  }

  if (updated === '1') {
    return <div className="live-form-message success">Changes saved successfully.</div>
  }

  return null
}

const awardStatusOptions = [
  ['draft', 'Draft'],
  ['published', 'Published'],
  ['archived', 'Archived'],
] as const

const editionStatusOptions = [
  ['draft', 'Draft'],
  ['published', 'Published'],
  ['nominations_open', 'Nominations Open'],
  ['review', 'Review'],
  ['voting_open', 'Voting Open'],
  ['voting_closed', 'Voting Closed'],
  ['archived', 'Archived'],
] as const

const resultManagedStatuses = new Set(['results_review', 'results_published'])

export async function AwardsManagementPage({
  created,
  updated,
  error,
}: {
  created?: string
  updated?: string
  error?: string
}) {
  const data = await getAwardManagementData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards Management</span>
          <h1>Awards</h1>
          <p>
            Manage permanent award programmes. Editions, categories and nominees sit
            beneath these records.
          </p>
        </div>
      </div>

      <Notice created={created} updated={updated} error={error} />

      <details className="panel live-create-panel">
        <summary>Create Award</summary>
        <form action={createAward} className="live-admin-form mobile-admin-form">
          <label>
            Award name
            <input name="name" required placeholder="Official award name" />
          </label>
          <label>
            URL slug
            <input name="slug" placeholder="Leave blank to generate from name" />
          </label>
          <label className="full">
            Summary
            <textarea name="summary" rows={2} />
          </label>
          <label className="full">
            Description
            <textarea name="description" rows={4} />
          </label>
          <label>
            Status
            <select name="status" defaultValue="draft">
              {awardStatusOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="full">
            <button className="button" type="submit">Create Award</button>
          </div>
        </form>
      </details>

      <div className="v2-admin-stats mobile-admin-stats">
        <article><span>Awards</span><strong>{data.awards.length}</strong><small>All records</small></article>
        <article>
          <span>Published</span>
          <strong>{data.awards.filter((award) => award.status === 'published').length}</strong>
          <small>Public award records</small>
        </article>
        <article><span>Editions</span><strong>{data.editions.length}</strong><small>Across all awards</small></article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr><th>Award</th><th>Status</th><th>Editions</th><th>Latest edition</th><th>Manage</th></tr>
            </thead>
            <tbody>
              {data.awards.map((award) => (
                <tr key={award.id}>
                  <td><strong>{award.name}</strong><small>{award.summary || award.slug}</small></td>
                  <td>{humanize(award.status)}</td>
                  <td>{award.edition_count}</td>
                  <td>{award.latest_edition ? `${award.latest_edition.edition_label} · ${award.latest_edition.year}` : '—'}</td>
                  <td>
                    <details className="live-row-editor wide mobile-row-editor">
                      <summary>Edit</summary>
                      <form action={updateAward} className="live-row-form mobile-row-form">
                        <input type="hidden" name="award_id" value={award.id} />
                        <label>Award name<input name="name" defaultValue={award.name} required /></label>
                        <label>URL slug<input name="slug" defaultValue={award.slug} required /></label>
                        <label className="full">Summary<textarea name="summary" rows={2} defaultValue={award.summary ?? ''} /></label>
                        <label className="full">Description<textarea name="description" rows={4} defaultValue={award.description ?? ''} /></label>
                        <label>
                          Status
                          <select name="status" defaultValue={award.status}>
                            {awardStatusOptions.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </label>
                        <button className="button compact" type="submit">Save changes</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
              {!data.awards.length && (
                <tr><td colSpan={5}><div className="live-empty-state compact"><strong>No awards created yet.</strong></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export async function EditionsManagementPage({
  created,
  updated,
  error,
}: {
  created?: string
  updated?: string
  error?: string
}) {
  const data = await getEditionManagementData()
  const currentYear = new Date().getUTCFullYear()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Editions</span>
          <h1>Award Editions</h1>
          <p>
            Control each award cycle, voting window, leaderboard visibility and
            ceremony relationship.
          </p>
        </div>
      </div>

      <Notice created={created} updated={updated} error={error} />

      <details className="panel live-create-panel">
        <summary>Create Edition</summary>
        {data.awards.length ? (
          <form action={createAwardEdition} className="live-admin-form mobile-admin-form">
            <label>
              Award
              <select name="award_id" required>
                <option value="">Select award</option>
                {data.awards.map((award) => <option key={award.id} value={award.id}>{award.name}</option>)}
              </select>
            </label>
            <label>Year<input name="year" type="number" min="2000" max="2200" defaultValue={currentYear} required /></label>
            <label>Edition number<input name="edition_number" type="number" min="1" placeholder="e.g. 6" /></label>
            <label>Edition label<input name="edition_label" required placeholder="e.g. 6th Edition" /></label>
            <label className="full">Theme<input name="theme" placeholder="Optional edition theme" /></label>
            <label className="full">Description<textarea name="description" rows={4} /></label>
            <label>
              Lifecycle status
              <select name="status" defaultValue="draft">
                {editionStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Leaderboard
              <select name="leaderboard_visibility" defaultValue="hidden">
                <option value="hidden">Hidden</option>
                <option value="visible">Visible</option>
                <option value="frozen">Frozen</option>
              </select>
            </label>
            <label>Voting opens<input name="voting_starts_at" type="datetime-local" /></label>
            <label>Voting closes<input name="voting_ends_at" type="datetime-local" /></label>
            <label className="full">
              Ceremony event
              <select name="ceremony_event_id" defaultValue="">
                <option value="">No ceremony event linked yet</option>
                {data.events
                  .filter((event) => event.award_edition_id === null)
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}{event.starts_at ? ` · ${dateTime(event.starts_at)}` : ''}
                    </option>
                  ))}
              </select>
              <small>Events already assigned to another edition are not available here.</small>
            </label>
            <label className="live-check"><input name="is_public" type="checkbox" />Public edition</label>
            <div className="full"><button className="button" type="submit">Create Edition</button></div>
          </form>
        ) : (
          <div className="live-empty-state compact"><strong>Create an award first.</strong><p>Every edition must belong to a permanent award record.</p></div>
        )}
      </details>

      <div className="v2-admin-stats mobile-admin-stats">
        <article><span>Editions</span><strong>{data.editions.length}</strong><small>All records</small></article>
        <article><span>Voting open</span><strong>{data.editions.filter((edition) => edition.status === 'voting_open').length}</strong><small>Current lifecycle state</small></article>
        <article><span>Public</span><strong>{data.editions.filter((edition) => edition.is_public).length}</strong><small>Visible editions</small></article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Edition</th><th>Award</th><th>Status</th><th>Voting window</th>
                <th>Leaderboard</th><th>Categories</th><th>Nominees</th><th>Ceremony</th><th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.editions.map((edition) => {
                const statusManagedByResults = resultManagedStatuses.has(edition.status)
                const eligibleEvents = data.events.filter(
                  (event) => event.award_edition_id === null || event.award_edition_id === edition.id,
                )

                return (
                  <tr key={edition.id}>
                    <td><strong>{edition.edition_label}</strong><small>{edition.year}</small></td>
                    <td>{edition.award?.name ?? '—'}</td>
                    <td>{humanize(edition.status)}<small>{edition.is_public ? 'Public' : 'Not public'}</small></td>
                    <td><strong>{dateTime(edition.voting_starts_at)}</strong><small>to {dateTime(edition.voting_ends_at)}</small></td>
                    <td>
                      {humanize(edition.leaderboard_visibility)}
                      {edition.leaderboard_frozen_at ? <small>Frozen {dateTime(edition.leaderboard_frozen_at)}</small> : null}
                    </td>
                    <td>{edition.category_count}</td>
                    <td>{edition.nominee_count}</td>
                    <td>
                      {edition.ceremony_event ? (
                        <><strong>{edition.ceremony_event.title}</strong><small>{dateTime(edition.ceremony_event.starts_at)}</small></>
                      ) : '—'}
                    </td>
                    <td>
                      <details className="live-row-editor wide mobile-row-editor">
                        <summary>Manage</summary>
                        <form action={updateAwardEdition} className="live-row-form mobile-row-form">
                          <input type="hidden" name="edition_id" value={edition.id} />
                          <label>
                            Award
                            <select name="award_id" defaultValue={edition.award_id} required>
                              {data.awards.map((award) => <option key={award.id} value={award.id}>{award.name}</option>)}
                            </select>
                          </label>
                          <label>Year<input name="year" type="number" min="2000" max="2200" defaultValue={edition.year} required /></label>
                          <label>Edition number<input name="edition_number" type="number" min="1" defaultValue={edition.edition_number ?? ''} /></label>
                          <label>Edition label<input name="edition_label" defaultValue={edition.edition_label} required /></label>
                          <label className="full">Theme<input name="theme" defaultValue={edition.theme ?? ''} /></label>
                          <label className="full">Description<textarea name="description" rows={4} defaultValue={edition.description ?? ''} /></label>

                          {statusManagedByResults ? (
                            <label>
                              Lifecycle status
                              <input value={`${humanize(edition.status)} · managed by Results`} readOnly />
                              <input type="hidden" name="status" value={edition.status} />
                            </label>
                          ) : (
                            <label>
                              Lifecycle status
                              <select name="status" defaultValue={edition.status}>
                                {editionStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </label>
                          )}

                          <label>
                            Leaderboard
                            <select name="leaderboard_visibility" defaultValue={edition.leaderboard_visibility}>
                              <option value="hidden">Hidden</option>
                              <option value="visible">Visible</option>
                              <option value="frozen">Frozen</option>
                            </select>
                          </label>
                          <label>Voting opens<input name="voting_starts_at" type="datetime-local" defaultValue={toLocalInput(edition.voting_starts_at)} /></label>
                          <label>Voting closes<input name="voting_ends_at" type="datetime-local" defaultValue={toLocalInput(edition.voting_ends_at)} /></label>
                          <label className="full">
                            Ceremony event
                            <select name="ceremony_event_id" defaultValue={edition.ceremony_event_id ?? ''}>
                              <option value="">No ceremony event linked</option>
                              {eligibleEvents.map((event) => (
                                <option key={event.id} value={event.id}>
                                  {event.title}{event.starts_at ? ` · ${dateTime(event.starts_at)}` : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="live-check"><input name="is_public" type="checkbox" defaultChecked={edition.is_public} />Public edition</label>
                          <button className="button compact" type="submit">Save changes</button>
                        </form>
                      </details>
                    </td>
                  </tr>
                )
              })}
              {!data.editions.length && (
                <tr><td colSpan={9}><div className="live-empty-state compact"><strong>No award editions created yet.</strong></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">Lifecycle rule</span>
            <h2>Results publication stays outside Edition management</h2>
          </div>
        </div>
        <p className="live-empty-copy">
          Edition management can prepare and close voting, but it cannot manually
          publish results. The later Results workflow remains responsible for
          reconciliation, review, approval and publication.
        </p>
      </section>
    </div>
  )
}

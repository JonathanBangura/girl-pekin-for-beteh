import { createCategory, createNominee } from '@/lib/admin/actions'
import {
  getAwardsLiveData,
  getCategoriesLiveData,
  getNomineesLiveData,
} from '@/lib/admin/live-data'

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function Message({
  created,
  error,
}: {
  created?: string
  error?: string
}) {
  if (created === '1') {
    return <div className="live-form-message success">Saved successfully.</div>
  }

  if (error) {
    return (
      <div className="live-form-message error">
        The record could not be saved. Please review the fields and try again.
      </div>
    )
  }

  return null
}

export async function AwardsLivePage() {
  const data = await getAwardsLiveData()
  const latestEdition = data.editions[0]

  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards Management</span>
          <h1>Awards</h1>
          <p>
            Live award and edition records from Supabase. Demo award rows have
            been removed from this workspace.
          </p>
        </div>
      </div>

      <div className="v2-admin-stats">
        <article>
          <span>Awards</span>
          <strong>{data.awards.length}</strong>
          <small>Live records</small>
        </article>
        <article>
          <span>Current edition</span>
          <strong>{latestEdition?.year ?? '—'}</strong>
          <small>{latestEdition?.edition_label ?? 'Not configured'}</small>
        </article>
        <article>
          <span>Nominees</span>
          <strong>{data.nomineeCount}</strong>
          <small>All editions</small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Award records</h2>
            <span className="live-data-badge">LIVE DATA</span>
          </div>
        </div>

        <div className="live-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Award</th>
                <th>Status</th>
                <th>Editions</th>
                <th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {data.awards.map((award) => {
                const editionCount = data.editions.filter(
                  (edition) => edition.award_id === award.id,
                ).length

                return (
                  <tr key={award.id}>
                    <td>
                      <strong>{award.name}</strong>
                      <small>{award.summary || award.slug}</small>
                    </td>
                    <td>
                      <span className="live-status">
                        {humanize(award.status)}
                      </span>
                    </td>
                    <td>{editionCount}</td>
                    <td>{formatDate(award.updated_at)}</td>
                  </tr>
                )
              })}

              {!data.awards.length && (
                <tr>
                  <td colSpan={4}>
                    <div className="live-empty-state compact">
                      <strong>No awards found.</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Award editions</h2>
            <span className="live-data-badge">LIVE DATA</span>
          </div>
        </div>

        <div className="live-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Edition</th>
                <th>Year</th>
                <th>Status</th>
                <th>Voting window</th>
                <th>Leaderboard</th>
                <th>Public</th>
              </tr>
            </thead>
            <tbody>
              {data.editions.map((edition) => (
                <tr key={edition.id}>
                  <td>
                    <strong>{edition.edition_label}</strong>
                  </td>
                  <td>{edition.year}</td>
                  <td>{humanize(edition.status)}</td>
                  <td>
                    {formatDate(edition.voting_starts_at)} –{' '}
                    {formatDate(edition.voting_ends_at)}
                  </td>
                  <td>{humanize(edition.leaderboard_visibility)}</td>
                  <td>{edition.is_public ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export async function EditionsLivePage() {
  const data = await getAwardsLiveData()

  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Editions</span>
          <h1>Editions</h1>
          <p>
            Review the real edition lifecycle, voting window and publication
            state.
          </p>
        </div>
      </div>

      <div className="v2-admin-stats">
        <article>
          <span>Total editions</span>
          <strong>{data.editions.length}</strong>
          <small>Live records</small>
        </article>
        <article>
          <span>Latest year</span>
          <strong>{data.editions[0]?.year ?? '—'}</strong>
          <small>{data.editions[0]?.edition_label ?? 'No edition'}</small>
        </article>
        <article>
          <span>Published / active</span>
          <strong>
            {
              data.editions.filter(
                (edition) =>
                  edition.status !== 'draft' && edition.status !== 'archived',
              ).length
            }
          </strong>
          <small>Current database state</small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="live-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Edition</th>
                <th>Year</th>
                <th>Status</th>
                <th>Voting opens</th>
                <th>Voting closes</th>
                <th>Leaderboard</th>
              </tr>
            </thead>
            <tbody>
              {data.editions.map((edition) => (
                <tr key={edition.id}>
                  <td>
                    <strong>{edition.edition_label}</strong>
                  </td>
                  <td>{edition.year}</td>
                  <td>{humanize(edition.status)}</td>
                  <td>{formatDate(edition.voting_starts_at)}</td>
                  <td>{formatDate(edition.voting_ends_at)}</td>
                  <td>{humanize(edition.leaderboard_visibility)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export async function CategoriesLivePage({
  created,
  error,
}: {
  created?: string
  error?: string
}) {
  const data = await getCategoriesLiveData()

  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Categories</span>
          <h1>Categories</h1>
          <p>
            Create and manage real categories for an award edition. No demo
            categories are shown.
          </p>
        </div>
      </div>

      <Message created={created} error={error} />

      <details className="panel live-create-panel">
        <summary>Add Category</summary>
        <form action={createCategory} className="live-admin-form">
          <label>
            Award edition
            <select name="award_edition_id" required>
              <option value="">Select edition</option>
              {data.editions.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.edition_label} · {edition.year}
                </option>
              ))}
            </select>
          </label>

          <label>
            Category name
            <input name="name" required placeholder="Enter category name" />
          </label>

          <label className="full">
            Description
            <textarea
              name="description"
              rows={3}
              placeholder="Optional category description"
            />
          </label>

          <label>
            Display order
            <input name="sort_order" type="number" min="0" defaultValue="0" />
          </label>

          <label className="live-check">
            <input name="is_active" type="checkbox" defaultChecked />
            Active
          </label>

          <label className="live-check">
            <input name="is_public" type="checkbox" defaultChecked />
            Public
          </label>

          <div className="full">
            <button className="button" type="submit">
              Save Category
            </button>
          </div>
        </form>
      </details>

      <div className="v2-admin-stats">
        <article>
          <span>Categories</span>
          <strong>{data.categories.length}</strong>
          <small>Live records</small>
        </article>
        <article>
          <span>Active</span>
          <strong>
            {data.categories.filter((category) => category.is_active).length}
          </strong>
          <small>Available for nominees</small>
        </article>
        <article>
          <span>Nominees</span>
          <strong>
            {data.categories.reduce(
              (total, category) => total + category.nominee_count,
              0,
            )}
          </strong>
          <small>Assigned to categories</small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="live-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Nominees</th>
                <th>Status</th>
                <th>Public</th>
                <th>Display order</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <strong>{category.name}</strong>
                    <small>{category.description || category.slug}</small>
                  </td>
                  <td>{category.nominee_count}</td>
                  <td>{category.is_active ? 'Active' : 'Inactive'}</td>
                  <td>{category.is_public ? 'Yes' : 'No'}</td>
                  <td>{category.sort_order}</td>
                </tr>
              ))}

              {!data.categories.length && (
                <tr>
                  <td colSpan={5}>
                    <div className="live-empty-state compact">
                      <strong>No categories have been created yet.</strong>
                      <p>
                        Use “Add Category” above before adding nominees.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export async function NomineesLivePage({
  created,
  error,
}: {
  created?: string
  error?: string
}) {
  const data = await getNomineesLiveData()

  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Nominees</span>
          <h1>Nominees</h1>
          <p>
            Live nominee records and vote-ledger totals. Demo nominee rows have
            been removed.
          </p>
        </div>
      </div>

      <Message created={created} error={error} />

      <details className="panel live-create-panel">
        <summary>Add Nominee</summary>

        {data.categories.length ? (
          <form action={createNominee} className="live-admin-form">
            <label>
              Award edition
              <select name="award_edition_id" required>
                <option value="">Select edition</option>
                {data.editions.map((edition) => (
                  <option key={edition.id} value={edition.id}>
                    {edition.edition_label} · {edition.year}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Category
              <select name="category_id" required>
                <option value="">Select category</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <small>
                Select a category that belongs to the selected edition.
              </small>
            </label>

            <label>
              Full name
              <input name="full_name" required />
            </label>

            <label>
              Nominee code
              <input
                name="nominee_code"
                required
                placeholder="e.g. 50MISA26..."
              />
            </label>

            <label className="full">
              Institution
              <input name="institution" />
            </label>

            <label className="full">
              Biography
              <textarea name="bio" rows={4} />
            </label>

            <label>
              Status
              <select name="status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="live-check">
              <input name="is_public" type="checkbox" />
              Public when published
            </label>

            <div className="full">
              <button className="button" type="submit">
                Save Nominee
              </button>
            </div>
          </form>
        ) : (
          <div className="live-empty-state compact">
            <strong>Create a category first.</strong>
            <p>
              Nominees must belong to a category in the same award edition.
            </p>
          </div>
        )}
      </details>

      <div className="v2-admin-stats">
        <article>
          <span>Total nominees</span>
          <strong>{data.nominees.length}</strong>
          <small>Live records</small>
        </article>
        <article>
          <span>Published</span>
          <strong>
            {data.nominees.filter((nominee) => nominee.status === 'published').length}
          </strong>
          <small>Visible when edition is public</small>
        </article>
        <article>
          <span>Pending review</span>
          <strong>
            {
              data.nominees.filter((nominee) =>
                ['submitted', 'under_review'].includes(nominee.status),
              ).length
            }
          </strong>
          <small>Operational queue</small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="live-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Nominee</th>
                <th>Code</th>
                <th>Category</th>
                <th>Institution</th>
                <th>Votes</th>
                <th>Status</th>
                <th>Public</th>
              </tr>
            </thead>
            <tbody>
              {data.nominees.map((nominee) => (
                <tr key={nominee.id}>
                  <td>
                    <strong>{nominee.full_name}</strong>
                  </td>
                  <td>{nominee.nominee_code}</td>
                  <td>{nominee.category_name}</td>
                  <td>{nominee.institution || '—'}</td>
                  <td>{nominee.total_votes.toLocaleString()}</td>
                  <td>{humanize(nominee.status)}</td>
                  <td>{nominee.is_public ? 'Yes' : 'No'}</td>
                </tr>
              ))}

              {!data.nominees.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="live-empty-state compact">
                      <strong>No nominees have been added yet.</strong>
                      <p>
                        This is expected because the seed intentionally created
                        no unverified nominees.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

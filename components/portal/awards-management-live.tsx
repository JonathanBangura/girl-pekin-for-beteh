import {
  changeNomineeStatus,
  createCategory,
  createNominee,
  linkNomineeUser,
  unlinkNomineeUser,
  updateCategory,
  updateNominee,
} from '@/lib/admin/actions'
import {
  getCategoryManagementData,
  getNomineeManagementData,
} from '@/lib/admin/phase4-data'

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Notice({
  created,
  updated,
  linked,
  error,
}: {
  created?: string
  updated?: string
  linked?: string
  error?: string
}) {
  if (created === '1') {
    return <div className="live-form-message success">Record created successfully.</div>
  }

  if (updated === '1') {
    return <div className="live-form-message success">Changes saved successfully.</div>
  }

  if (linked === '1') {
    return <div className="live-form-message success">Nominee account linked successfully.</div>
  }

  if (linked === '0') {
    return <div className="live-form-message success">Nominee account unlinked.</div>
  }

  if (error) {
    const messages: Record<string, string> = {
      auth_user_not_found:
        'No Supabase Auth user was found with that email. Create/invite the user first, then link the nominee.',
      category_mismatch:
        'The selected category does not belong to this nominee’s award edition.',
      missing_fields: 'Please complete all required fields.',
    }

    return (
      <div className="live-form-message error">
        {messages[error] ||
          'The requested change could not be completed. Please review the details and try again.'}
      </div>
    )
  }

  return null
}

export async function CategoriesManagementPage({
  created,
  updated,
  error,
}: {
  created?: string
  updated?: string
  error?: string
}) {
  const data = await getCategoryManagementData()

  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Categories</span>
          <h1>Categories</h1>
          <p>Create, edit, publish or deactivate real award categories.</p>
        </div>
      </div>

      <Notice created={created} updated={updated} error={error} />

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
            <input name="name" required />
          </label>

          <label className="full">
            Description
            <textarea name="description" rows={3} />
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
            <button className="button" type="submit">Save Category</button>
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
          <strong>{data.categories.filter((c) => c.is_active).length}</strong>
          <small>Available for use</small>
        </article>
        <article>
          <span>Assigned nominees</span>
          <strong>
            {data.categories.reduce((total, c) => total + c.nominee_count, 0)}
          </strong>
          <small>Across categories</small>
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
                <th>Order</th>
                <th>Manage</th>
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
                  <td>
                    <details className="live-row-editor">
                      <summary>Edit</summary>
                      <form action={updateCategory} className="live-row-form">
                        <input type="hidden" name="category_id" value={category.id} />
                        <label>
                          Name
                          <input name="name" defaultValue={category.name} required />
                        </label>
                        <label>
                          Description
                          <textarea
                            name="description"
                            rows={3}
                            defaultValue={category.description ?? ''}
                          />
                        </label>
                        <label>
                          Display order
                          <input
                            name="sort_order"
                            type="number"
                            min="0"
                            defaultValue={category.sort_order}
                          />
                        </label>
                        <label className="live-check">
                          <input
                            name="is_active"
                            type="checkbox"
                            defaultChecked={category.is_active}
                          />
                          Active
                        </label>
                        <label className="live-check">
                          <input
                            name="is_public"
                            type="checkbox"
                            defaultChecked={category.is_public}
                          />
                          Public
                        </label>
                        <button className="button compact" type="submit">
                          Save changes
                        </button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.categories.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="live-empty-state compact">
                      <strong>No categories created yet.</strong>
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

export async function NomineesManagementPage({
  created,
  updated,
  linked,
  error,
}: {
  created?: string
  updated?: string
  linked?: string
  error?: string
}) {
  const data = await getNomineeManagementData()

  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Nominees</span>
          <h1>Nominees</h1>
          <p>
            Manage real nominee records, publication state and nominee portal account links.
          </p>
        </div>
      </div>

      <Notice created={created} updated={updated} linked={linked} error={error} />

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
                {data.categories.filter((c) => c.is_active).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Full name
              <input name="full_name" required />
            </label>

            <label>
              Nominee code
              <input name="nominee_code" required />
            </label>

            <label className="full">
              Institution
              <input name="institution" />
            </label>

            <label className="full">
              Biography
              <textarea name="bio" rows={4} />
            </label>

            <label className="full">
              Photo URL
              <input
                name="photo_url"
                type="url"
                placeholder="Optional public image URL"
              />
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

            <label>
              Display order
              <input name="sort_order" type="number" min="0" defaultValue="0" />
            </label>

            <label className="live-check">
              <input name="is_public" type="checkbox" />
              Public when published
            </label>

            <div className="full">
              <button className="button" type="submit">Save Nominee</button>
            </div>
          </form>
        ) : (
          <div className="live-empty-state compact">
            <strong>Create a category first.</strong>
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
          <strong>{data.nominees.filter((n) => n.status === 'published').length}</strong>
          <small>Public directory eligible</small>
        </article>
        <article>
          <span>Portal linked</span>
          <strong>{data.nominees.filter((n) => n.auth_user_id).length}</strong>
          <small>Nominee Auth accounts</small>
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
                <th>Votes</th>
                <th>Status</th>
                <th>Portal</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.nominees.map((nominee) => (
                <tr key={nominee.id}>
                  <td>
                    <strong>{nominee.full_name}</strong>
                    <small>{nominee.institution || 'No institution'}</small>
                  </td>
                  <td>{nominee.nominee_code}</td>
                  <td>{nominee.category_name}</td>
                  <td>{nominee.total_votes.toLocaleString()}</td>
                  <td>{humanize(nominee.status)}</td>
                  <td>
                    {nominee.auth_user_id ? (
                      <>
                        <strong>Linked</strong>
                        {nominee.linked_email && <small>{nominee.linked_email}</small>}
                      </>
                    ) : (
                      'Not linked'
                    )}
                  </td>
                  <td>
                    <details className="live-row-editor wide">
                      <summary>Manage</summary>

                      <div className="live-management-stack">
                        <form action={updateNominee} className="live-row-form">
                          <input type="hidden" name="nominee_id" value={nominee.id} />

                          <label>
                            Full name
                            <input
                              name="full_name"
                              defaultValue={nominee.full_name}
                              required
                            />
                          </label>

                          <label>
                            Nominee code
                            <input
                              name="nominee_code"
                              defaultValue={nominee.nominee_code}
                              required
                            />
                          </label>

                          <label>
                            Category
                            <select
                              name="category_id"
                              defaultValue={nominee.category_id}
                              required
                            >
                              {data.categories
                                .filter(
                                  (category) =>
                                    category.award_edition_id === nominee.award_edition_id,
                                )
                                .map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                            </select>
                          </label>

                          <label>
                            Institution
                            <input
                              name="institution"
                              defaultValue={nominee.institution ?? ''}
                            />
                          </label>

                          <label className="full">
                            Biography
                            <textarea
                              name="bio"
                              rows={4}
                              defaultValue={nominee.bio ?? ''}
                            />
                          </label>

                          <label className="full">
                            Photo URL
                            <input
                              name="photo_url"
                              type="url"
                              defaultValue={nominee.photo_url ?? ''}
                            />
                          </label>

                          <label>
                            Status
                            <select name="status" defaultValue={nominee.status}>
                              <option value="draft">Draft</option>
                              <option value="submitted">Submitted</option>
                              <option value="under_review">Under Review</option>
                              <option value="approved">Approved</option>
                              <option value="published">Published</option>
                              <option value="suspended">Suspended</option>
                              <option value="disqualified">Disqualified</option>
                              <option value="withdrawn">Withdrawn</option>
                              <option value="archived">Archived</option>
                            </select>
                          </label>

                          <label>
                            Display order
                            <input
                              name="sort_order"
                              type="number"
                              min="0"
                              defaultValue={nominee.sort_order}
                            />
                          </label>

                          <label className="live-check">
                            <input
                              name="is_public"
                              type="checkbox"
                              defaultChecked={nominee.is_public}
                            />
                            Public when published
                          </label>

                          <div className="full live-inline-actions">
                            <button className="button compact" type="submit">
                              Save changes
                            </button>
                          </div>
                        </form>

                        <div className="live-quick-status">
                          <span>Quick status</span>

                          {nominee.status !== 'published' && (
                            <form action={changeNomineeStatus}>
                              <input type="hidden" name="nominee_id" value={nominee.id} />
                              <input type="hidden" name="status" value="published" />
                              <button className="button compact" type="submit">
                                Publish
                              </button>
                            </form>
                          )}

                          {nominee.status !== 'archived' && (
                            <form action={changeNomineeStatus}>
                              <input type="hidden" name="nominee_id" value={nominee.id} />
                              <input type="hidden" name="status" value="archived" />
                              <button className="button secondary compact" type="submit">
                                Archive
                              </button>
                            </form>
                          )}
                        </div>

                        {data.canManageUsers && (
                          <div className="live-link-account">
                            <span>Nominee portal account</span>

                            {nominee.auth_user_id ? (
                              <>
                                <p>
                                  Linked
                                  {nominee.linked_email
                                    ? ` to ${nominee.linked_email}`
                                    : ' to an Auth user'}
                                  .
                                </p>
                                <form action={unlinkNomineeUser}>
                                  <input
                                    type="hidden"
                                    name="nominee_id"
                                    value={nominee.id}
                                  />
                                  <button
                                    className="button secondary compact"
                                    type="submit"
                                  >
                                    Unlink account
                                  </button>
                                </form>
                              </>
                            ) : (
                              <form action={linkNomineeUser}>
                                <input
                                  type="hidden"
                                  name="nominee_id"
                                  value={nominee.id}
                                />
                                <label>
                                  Existing Supabase Auth email
                                  <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="nominee@example.com"
                                  />
                                </label>
                                <button
                                  className="button secondary compact"
                                  type="submit"
                                >
                                  Link nominee account
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.nominees.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="live-empty-state compact">
                      <strong>No nominees added yet.</strong>
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

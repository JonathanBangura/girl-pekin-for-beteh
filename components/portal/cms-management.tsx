import Link from 'next/link'
import {
  getContentManagementData,
  getProgramsManagementData,
} from '@/lib/cms/data'
import {
  saveGalleryItem,
  saveNewsPost,
  savePartner,
  saveProgram,
  saveSitePage,
  saveSiteSettings,
  updateContactSubmission,
} from '@/lib/cms/actions'

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

function Notice({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  if (params.error) {
    const messages: Record<string, string> = {
      invalid_page: 'The selected site page is invalid.',
      page_save_failed:
        'The site page could not be saved.',
      settings_save_failed:
        'The site settings could not be saved.',
      invalid_news:
        'News title and a valid status are required.',
      news_save_failed:
        'The news post could not be saved.',
      invalid_gallery:
        'Gallery title and a valid status are required.',
      gallery_image_required:
        'A gallery image is required.',
      gallery_save_failed:
        'The gallery item could not be saved.',
      invalid_partner:
        'Partner name and a valid status are required.',
      partner_save_failed:
        'The partner record could not be saved.',
      invalid_image:
        'Images must be PNG, JPEG or WebP and no larger than 5 MB.',
      image_upload_failed:
        'The image could not be uploaded.',
      invalid_contact_status:
        'The selected enquiry status is invalid.',
      contact_not_found:
        'The contact enquiry could not be found.',
      contact_update_failed:
        'The enquiry status could not be updated.',
      '23505':
        'A record with that slug or unique value already exists.',
    }

    return (
      <div className="live-form-message error">
        {messages[params.error] ||
          'The content operation could not be completed.'}
      </div>
    )
  }

  if (
    params.page_saved === '1' ||
    params.settings_saved === '1' ||
    params.news_saved === '1' ||
    params.gallery_saved === '1' ||
    params.partner_saved === '1' ||
    params.contact_updated === '1'
  ) {
    return (
      <div className="live-form-message success">
        Content updated successfully.
      </div>
    )
  }

  return null
}

function SitePageEditor({
  pageKey,
  label,
  page,
}: {
  pageKey: 'home' | 'about' | 'contact'
  label: string
  page?: any
}) {
  return (
    <details className="panel live-create-panel">
      <summary>
        {label} ·{' '}
        {page?.is_published ? 'Published' : 'Draft'}
      </summary>

      <form
        action={saveSitePage}
        className="live-admin-form mobile-admin-form"
      >
        <input
          type="hidden"
          name="page_key"
          value={pageKey}
        />

        <label>
          Eyebrow
          <input
            name="eyebrow"
            defaultValue={page?.eyebrow ?? ''}
            placeholder="Short section label"
          />
        </label>

        <label className="full">
          Page title
          <input
            name="title"
            defaultValue={page?.title ?? ''}
          />
        </label>

        <label className="full">
          Summary
          <textarea
            name="summary"
            rows={3}
            defaultValue={page?.summary ?? ''}
          />
        </label>

        <label className="full">
          Main body
          <textarea
            name="body"
            rows={6}
            defaultValue={page?.body ?? ''}
          />
        </label>

        <label className="full">
          Secondary body
          <textarea
            name="secondary_body"
            rows={5}
            defaultValue={page?.secondary_body ?? ''}
          />
        </label>

        <label>
          CTA label
          <input
            name="cta_label"
            defaultValue={page?.cta_label ?? ''}
          />
        </label>

        <label>
          CTA link
          <input
            name="cta_href"
            defaultValue={page?.cta_href ?? ''}
            placeholder="/programs"
          />
        </label>

        <label className="live-check full">
          <input
            name="is_published"
            type="checkbox"
            defaultChecked={page?.is_published ?? false}
          />
          Publish this page content
        </label>

        <div className="full">
          <button className="button" type="submit">
            Save {label}
          </button>
        </div>
      </form>
    </details>
  )
}

export async function ContentManagementLivePage({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  const data = await getContentManagementData()

  const pageMap = new Map(
    data.pages.map((page) => [page.page_key, page]),
  )

  const newContacts = data.contacts.filter(
    (item) => item.status === 'new',
  ).length

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Content Operations
          </span>
          <h1>Public Content</h1>
          <p>
            Manage the approved content that appears on the
            public website. Draft content remains invisible.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <Link
            className="button secondary"
            href="/admin/programs"
          >
            Programs
          </Link>
          <Link
            className="button secondary"
            href="/"
            target="_blank"
          >
            View Public Site
          </Link>
        </div>
      </div>

      <Notice params={params} />

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>News</span>
          <strong>{data.news.length}</strong>
          <small>
            {
              data.news.filter(
                (item) => item.status === 'published',
              ).length
            }{' '}
            published
          </small>
        </article>
        <article>
          <span>Gallery</span>
          <strong>{data.gallery.length}</strong>
          <small>
            {
              data.gallery.filter(
                (item) => item.status === 'published',
              ).length
            }{' '}
            published
          </small>
        </article>
        <article>
          <span>Partners</span>
          <strong>{data.partners.length}</strong>
          <small>
            {
              data.partners.filter(
                (item) => item.status === 'published',
              ).length
            }{' '}
            published
          </small>
        </article>
        <article>
          <span>New enquiries</span>
          <strong>{newContacts}</strong>
          <small>Contact form submissions</small>
        </article>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Core Pages
            </span>
            <h2>Homepage, About & Contact copy</h2>
          </div>
        </div>

        <p className="live-empty-copy">
          No official mission, leadership, impact or contact
          information is invented by the system. Publish only
          approved foundation content.
        </p>
      </section>

      <SitePageEditor
        pageKey="home"
        label="Homepage"
        page={pageMap.get('home')}
      />

      <SitePageEditor
        pageKey="about"
        label="About Page"
        page={pageMap.get('about')}
      />

      <SitePageEditor
        pageKey="contact"
        label="Contact Page"
        page={pageMap.get('contact')}
      />

      <details className="panel live-create-panel">
        <summary>Official Contact & Social Details</summary>

        <form
          action={saveSiteSettings}
          className="live-admin-form mobile-admin-form"
        >
          <label>
            Contact email
            <input
              type="email"
              name="contact_email"
              defaultValue={
                data.settings?.contact_email ?? ''
              }
            />
          </label>

          <label>
            Contact phone
            <input
              name="contact_phone"
              defaultValue={
                data.settings?.contact_phone ?? ''
              }
            />
          </label>

          <label className="full">
            Contact address
            <textarea
              name="contact_address"
              rows={3}
              defaultValue={
                data.settings?.contact_address ?? ''
              }
            />
          </label>

          <label>
            Instagram URL
            <input
              name="instagram_url"
              defaultValue={
                data.settings?.instagram_url ?? ''
              }
            />
          </label>

          <label>
            Facebook URL
            <input
              name="facebook_url"
              defaultValue={
                data.settings?.facebook_url ?? ''
              }
            />
          </label>

          <label>
            X URL
            <input
              name="x_url"
              defaultValue={data.settings?.x_url ?? ''}
            />
          </label>

          <div className="full">
            <button className="button" type="submit">
              Save Contact Details
            </button>
          </div>
        </form>
      </details>

      <details className="panel live-create-panel">
        <summary>Create News Post</summary>

        <form
          action={saveNewsPost}
          className="live-admin-form mobile-admin-form"
        >
          <label className="full">
            Title
            <input name="title" required />
          </label>

          <label>
            Slug
            <input
              name="slug"
              placeholder="Auto-generated if blank"
            />
          </label>

          <label>
            Status
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">
                Published
              </option>
              <option value="archived">
                Archived
              </option>
            </select>
          </label>

          <label className="full">
            Excerpt
            <textarea name="excerpt" rows={3} />
          </label>

          <label className="full">
            Body
            <textarea name="body" rows={8} />
          </label>

          <label>
            Cover image
            <input
              type="file"
              name="cover_image"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>

          <label>
            Sort order
            <input
              type="number"
              name="sort_order"
              defaultValue="0"
            />
          </label>

          <div className="full">
            <button className="button" type="submit">
              Save News Post
            </button>
          </div>
        </form>
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>News</h2>
            <span className="live-data-badge">
              {data.news.length} RECORDS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Status</th>
                <th>Published</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.news.map((post) => (
                <tr key={post.id}>
                  <td>
                    <strong>{post.title}</strong>
                    <small>/{post.slug}</small>
                  </td>
                  <td>{humanize(post.status)}</td>
                  <td>{dateTime(post.published_at)}</td>
                  <td>
                    <details className="live-row-editor wide">
                      <summary>Edit</summary>
                      <form
                        action={saveNewsPost}
                        className="live-admin-form mobile-admin-form"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={post.id}
                        />
                        <input
                          type="hidden"
                          name="existing_cover_image_url"
                          value={
                            post.cover_image_url ?? ''
                          }
                        />

                        <label className="full">
                          Title
                          <input
                            name="title"
                            defaultValue={post.title}
                            required
                          />
                        </label>

                        <label>
                          Slug
                          <input
                            name="slug"
                            defaultValue={post.slug}
                          />
                        </label>

                        <label>
                          Status
                          <select
                            name="status"
                            defaultValue={post.status}
                          >
                            <option value="draft">
                              Draft
                            </option>
                            <option value="published">
                              Published
                            </option>
                            <option value="archived">
                              Archived
                            </option>
                          </select>
                        </label>

                        <label className="full">
                          Excerpt
                          <textarea
                            name="excerpt"
                            rows={3}
                            defaultValue={
                              post.excerpt ?? ''
                            }
                          />
                        </label>

                        <label className="full">
                          Body
                          <textarea
                            name="body"
                            rows={7}
                            defaultValue={post.body ?? ''}
                          />
                        </label>

                        <label>
                          Replace cover image
                          <input
                            type="file"
                            name="cover_image"
                            accept="image/png,image/jpeg,image/webp"
                          />
                        </label>

                        <label>
                          Sort order
                          <input
                            type="number"
                            name="sort_order"
                            defaultValue={
                              post.sort_order ?? 0
                            }
                          />
                        </label>

                        <div className="full">
                          <button
                            className="button compact"
                            type="submit"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.news.length ? (
                <tr>
                  <td colSpan={4}>
                    No news posts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <details className="panel live-create-panel">
        <summary>Add Gallery Image</summary>

        <form
          action={saveGalleryItem}
          className="live-admin-form mobile-admin-form"
        >
          <label>
            Title
            <input name="title" required />
          </label>

          <label>
            Status
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">
                Published
              </option>
              <option value="archived">
                Archived
              </option>
            </select>
          </label>

          <label className="full">
            Caption
            <textarea name="caption" rows={3} />
          </label>

          <label>
            Image
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              required
            />
          </label>

          <label>
            Sort order
            <input
              type="number"
              name="sort_order"
              defaultValue="0"
            />
          </label>

          <div className="full">
            <button className="button" type="submit">
              Save Gallery Item
            </button>
          </div>
        </form>
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Gallery</h2>
            <span className="live-data-badge">
              {data.gallery.length} RECORDS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Status</th>
                <th>Order</th>
                <th>Manage</th>
              </tr>
            </thead>

            <tbody>
              {data.gallery.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.caption || '—'}</small>
                  </td>
                  <td>{humanize(item.status)}</td>
                  <td>{item.sort_order}</td>
                  <td>
                    <details className="live-row-editor wide">
                      <summary>Edit</summary>
                      <form
                        action={saveGalleryItem}
                        className="live-admin-form mobile-admin-form"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={item.id}
                        />
                        <input
                          type="hidden"
                          name="existing_image_url"
                          value={item.image_url}
                        />

                        <label>
                          Title
                          <input
                            name="title"
                            defaultValue={item.title}
                            required
                          />
                        </label>

                        <label>
                          Status
                          <select
                            name="status"
                            defaultValue={item.status}
                          >
                            <option value="draft">
                              Draft
                            </option>
                            <option value="published">
                              Published
                            </option>
                            <option value="archived">
                              Archived
                            </option>
                          </select>
                        </label>

                        <label className="full">
                          Caption
                          <textarea
                            name="caption"
                            rows={3}
                            defaultValue={
                              item.caption ?? ''
                            }
                          />
                        </label>

                        <label>
                          Replace image
                          <input
                            type="file"
                            name="image"
                            accept="image/png,image/jpeg,image/webp"
                          />
                        </label>

                        <label>
                          Sort order
                          <input
                            type="number"
                            name="sort_order"
                            defaultValue={item.sort_order}
                          />
                        </label>

                        <div className="full">
                          <button
                            className="button compact"
                            type="submit"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.gallery.length ? (
                <tr>
                  <td colSpan={4}>
                    No gallery items yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <details className="panel live-create-panel">
        <summary>Add Partner</summary>

        <form
          action={savePartner}
          className="live-admin-form mobile-admin-form"
        >
          <label>
            Name
            <input name="name" required />
          </label>

          <label>
            Partner type
            <input
              name="partner_type"
              placeholder="e.g. Supporting Partner"
            />
          </label>

          <label className="full">
            Description
            <textarea
              name="description"
              rows={3}
            />
          </label>

          <label>
            Website URL
            <input name="website_url" type="url" />
          </label>

          <label>
            Logo
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>

          <label>
            Status
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">
                Published
              </option>
              <option value="archived">
                Archived
              </option>
            </select>
          </label>

          <label>
            Sort order
            <input
              type="number"
              name="sort_order"
              defaultValue="0"
            />
          </label>

          <div className="full">
            <button className="button" type="submit">
              Save Partner
            </button>
          </div>
        </form>
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Partners</h2>
            <span className="live-data-badge">
              {data.partners.length} RECORDS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Type</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>

            <tbody>
              {data.partners.map((partner) => (
                <tr key={partner.id}>
                  <td>
                    <strong>{partner.name}</strong>
                    <small>
                      {partner.website_url || '—'}
                    </small>
                  </td>
                  <td>
                    {partner.partner_type || '—'}
                  </td>
                  <td>{humanize(partner.status)}</td>
                  <td>
                    <details className="live-row-editor wide">
                      <summary>Edit</summary>
                      <form
                        action={savePartner}
                        className="live-admin-form mobile-admin-form"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={partner.id}
                        />
                        <input
                          type="hidden"
                          name="existing_logo_url"
                          value={partner.logo_url ?? ''}
                        />

                        <label>
                          Name
                          <input
                            name="name"
                            defaultValue={partner.name}
                            required
                          />
                        </label>

                        <label>
                          Type
                          <input
                            name="partner_type"
                            defaultValue={
                              partner.partner_type ?? ''
                            }
                          />
                        </label>

                        <label className="full">
                          Description
                          <textarea
                            name="description"
                            rows={3}
                            defaultValue={
                              partner.description ?? ''
                            }
                          />
                        </label>

                        <label>
                          Website URL
                          <input
                            name="website_url"
                            type="url"
                            defaultValue={
                              partner.website_url ?? ''
                            }
                          />
                        </label>

                        <label>
                          Replace logo
                          <input
                            type="file"
                            name="logo"
                            accept="image/png,image/jpeg,image/webp"
                          />
                        </label>

                        <label>
                          Status
                          <select
                            name="status"
                            defaultValue={partner.status}
                          >
                            <option value="draft">
                              Draft
                            </option>
                            <option value="published">
                              Published
                            </option>
                            <option value="archived">
                              Archived
                            </option>
                          </select>
                        </label>

                        <label>
                          Sort order
                          <input
                            type="number"
                            name="sort_order"
                            defaultValue={
                              partner.sort_order
                            }
                          />
                        </label>

                        <div className="full">
                          <button
                            className="button compact"
                            type="submit"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.partners.length ? (
                <tr>
                  <td colSpan={4}>
                    No partners yet.
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
            <h2>Contact enquiries</h2>
            <span className="live-data-badge">
              {data.contacts.length} RECENT
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Status</th>
                <th>Received</th>
                <th>Manage</th>
              </tr>
            </thead>

            <tbody>
              {data.contacts.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.email}</small>
                    <small>{item.phone || '—'}</small>
                  </td>
                  <td>{item.subject || '—'}</td>
                  <td>
                    <details>
                      <summary>View message</summary>
                      <p>{item.message}</p>
                    </details>
                  </td>
                  <td>{humanize(item.status)}</td>
                  <td>{dateTime(item.created_at)}</td>
                  <td>
                    <form
                      action={updateContactSubmission}
                      className="live-row-form"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={item.id}
                      />
                      <select
                        name="status"
                        defaultValue={item.status}
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="replied">
                          Replied
                        </option>
                        <option value="closed">
                          Closed
                        </option>
                      </select>
                      <button
                        className="button compact"
                        type="submit"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {!data.contacts.length ? (
                <tr>
                  <td colSpan={6}>
                    No contact enquiries yet.
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

export async function ProgramsManagementLivePage({
  params,
}: {
  params: Record<string, string | undefined>
}) {
  const data = await getProgramsManagementData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Content Operations
          </span>
          <h1>Programs</h1>
          <p>
            Create and maintain programme records shown on
            the public website.
          </p>
        </div>

        <Link
          className="button secondary"
          href="/programs"
          target="_blank"
        >
          View Public Programs
        </Link>
      </div>

      {params.error ? (
        <div className="live-form-message error">
          {params.error === 'invalid_program'
            ? 'Program title and a valid status are required.'
            : params.error === 'invalid_image'
              ? 'Images must be PNG, JPEG or WebP and no larger than 5 MB.'
              : params.error === '23505'
                ? 'A program with that slug already exists.'
                : 'The program could not be saved.'}
        </div>
      ) : null}

      {params.saved === '1' ? (
        <div className="live-form-message success">
          Program saved successfully.
        </div>
      ) : null}

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Total</span>
          <strong>{data.programs.length}</strong>
          <small>All program records</small>
        </article>
        <article>
          <span>Published</span>
          <strong>
            {
              data.programs.filter(
                (item) => item.status === 'published',
              ).length
            }
          </strong>
          <small>Visible publicly</small>
        </article>
        <article>
          <span>Draft</span>
          <strong>
            {
              data.programs.filter(
                (item) => item.status === 'draft',
              ).length
            }
          </strong>
          <small>Not public</small>
        </article>
      </div>

      <details className="panel live-create-panel">
        <summary>Create Program</summary>

        <form
          action={saveProgram}
          className="live-admin-form mobile-admin-form"
        >
          <label className="full">
            Title
            <input name="title" required />
          </label>

          <label>
            Slug
            <input
              name="slug"
              placeholder="Auto-generated if blank"
            />
          </label>

          <label>
            Status
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">
                Published
              </option>
              <option value="archived">
                Archived
              </option>
            </select>
          </label>

          <label className="full">
            Summary
            <textarea name="summary" rows={3} />
          </label>

          <label className="full">
            Body
            <textarea name="body" rows={8} />
          </label>

          <label>
            Cover image
            <input
              type="file"
              name="cover_image"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>

          <label>
            Sort order
            <input
              type="number"
              name="sort_order"
              defaultValue="0"
            />
          </label>

          <div className="full">
            <button className="button" type="submit">
              Save Program
            </button>
          </div>
        </form>
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Program records</h2>
            <span className="live-data-badge">
              LIVE DATA
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Status</th>
                <th>Published</th>
                <th>Order</th>
                <th>Manage</th>
              </tr>
            </thead>

            <tbody>
              {data.programs.map((program) => (
                <tr key={program.id}>
                  <td>
                    <strong>{program.title}</strong>
                    <small>/{program.slug}</small>
                  </td>
                  <td>{humanize(program.status)}</td>
                  <td>{dateTime(program.published_at)}</td>
                  <td>{program.sort_order}</td>
                  <td>
                    <details className="live-row-editor wide">
                      <summary>Edit</summary>

                      <form
                        action={saveProgram}
                        className="live-admin-form mobile-admin-form"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={program.id}
                        />
                        <input
                          type="hidden"
                          name="existing_cover_image_url"
                          value={
                            program.cover_image_url ?? ''
                          }
                        />

                        <label className="full">
                          Title
                          <input
                            name="title"
                            defaultValue={program.title}
                            required
                          />
                        </label>

                        <label>
                          Slug
                          <input
                            name="slug"
                            defaultValue={program.slug}
                          />
                        </label>

                        <label>
                          Status
                          <select
                            name="status"
                            defaultValue={program.status}
                          >
                            <option value="draft">
                              Draft
                            </option>
                            <option value="published">
                              Published
                            </option>
                            <option value="archived">
                              Archived
                            </option>
                          </select>
                        </label>

                        <label className="full">
                          Summary
                          <textarea
                            name="summary"
                            rows={3}
                            defaultValue={
                              program.summary ?? ''
                            }
                          />
                        </label>

                        <label className="full">
                          Body
                          <textarea
                            name="body"
                            rows={7}
                            defaultValue={
                              program.body ?? ''
                            }
                          />
                        </label>

                        <label>
                          Replace cover image
                          <input
                            type="file"
                            name="cover_image"
                            accept="image/png,image/jpeg,image/webp"
                          />
                        </label>

                        <label>
                          Sort order
                          <input
                            type="number"
                            name="sort_order"
                            defaultValue={
                              program.sort_order
                            }
                          />
                        </label>

                        <div className="full">
                          <button
                            className="button compact"
                            type="submit"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}

              {!data.programs.length ? (
                <tr>
                  <td colSpan={5}>
                    No program records yet.
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

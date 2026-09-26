import {
  FileText,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
} from '@/components/public/public'
import { submitPublicNominationApplication } from '@/lib/applications/public-actions'
import { getPublicNominationOptions } from '@/lib/applications/public-data'

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    invalid_form:
      'Complete the required fields, provide a meaningful application statement and accept the declaration.',
    nominee_contact_required:
      'For a self-application, provide the applicant email address or phone number.',
    nominator_contact_required:
      'When nominating someone else, provide the nominator name and an email address or phone number.',
    category_unavailable:
      'That category is no longer accepting public applications. Please choose another available category.',
    nominations_closed:
      'Public nominations for that award edition are no longer open.',
    invalid_photo:
      'The photo must be a JPG, PNG or WebP image no larger than 5 MB.',
    invalid_supporting_document:
      'The supporting file must be a PDF, JPG, PNG or WebP file no larger than 10 MB.',
    upload_failed:
      'The application file could not be uploaded. Please try again.',
    submission_failed:
      'The application could not be submitted. Please review the form and try again.',
  }

  return error
    ? messages[error] ||
        'The application could not be submitted.'
    : null
}

export async function PublicNominationApplicationPage({
  submitted,
  reference,
  error,
}: {
  submitted?: string
  reference?: string
  error?: string
}) {
  const data = await getPublicNominationOptions()
  const message = errorMessage(error)

  return (
    <>
      <PublicHeader />

      <main>
        <section className="page-hero v2-page-hero">
          <span className="v2-overline">
            Girl Pikin For Betteh Awards
          </span>
          <h1>Apply or Nominate a Girl Pikin</h1>
          <p>
            Submit a self-application or nominate an eligible
            girl for an award category currently accepting
            nominations. Every submission is reviewed before
            nominee approval or publication.
          </p>
        </section>

        <section className="section">
          {submitted === '1' ? (
            <div className="panel live-form-message success">
              <strong>
                Your application has been submitted successfully.
              </strong>
              <p>
                The Foundation will review the submission before
                any nominee profile is approved or published.
              </p>
              {reference ? (
                <p>
                  Application reference:{' '}
                  <strong>{reference}</strong>
                </p>
              ) : null}
            </div>
          ) : null}

          {message ? (
            <div className="live-form-message error">
              {message}
            </div>
          ) : null}

          {!data.categories.length ? (
            <div className="panel live-public-empty cms-empty-state">
              <strong>
                Public nominations are not open right now.
              </strong>
              <p>
                When an award edition enters the nominations-open
                stage, the available categories will appear here.
              </p>
            </div>
          ) : (
            <div className="v2-contact-layout">
              <form
                action={submitPublicNominationApplication}
                className="panel v2-contact-form cms-contact-form live-admin-form mobile-admin-form"
              >
                <div className="full">
                  <Pill>Public application</Pill>
                  <h2>Nomination details</h2>
                  <p className="live-empty-copy">
                    Fields marked required must be completed.
                    Application information stays private during
                    review.
                  </p>
                </div>

                <input
                  type="text"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  className="cms-honeypot"
                  aria-hidden="true"
                />

                <label>
                  Application type
                  <select
                    name="application_type"
                    defaultValue="self"
                    required
                  >
                    <option value="self">
                      I am applying for myself
                    </option>
                    <option value="nomination">
                      I am nominating someone else
                    </option>
                  </select>
                </label>

                <label>
                  Award category
                  <select name="category_id" required>
                    <option value="">
                      Select a category
                    </option>
                    {data.editions.map((edition) => {
                      const categories =
                        data.categories.filter(
                          (category) =>
                            category.award_edition_id ===
                            edition.id,
                        )

                      if (!categories.length) return null

                      return (
                        <optgroup
                          key={edition.id}
                          label={`${edition.award_name} · ${edition.edition_label} · ${edition.year}`}
                        >
                          {categories.map((category) => (
                            <option
                              key={category.id}
                              value={category.id}
                            >
                              {category.name}
                            </option>
                          ))}
                        </optgroup>
                      )
                    })}
                  </select>
                </label>

                <div className="full">
                  <span className="v2-overline">
                    Girl being considered
                  </span>
                </div>

                <label>
                  Full name
                  <input
                    name="full_name"
                    maxLength={160}
                    required
                  />
                </label>

                <label>
                  School / institution / organization
                  <input
                    name="institution"
                    maxLength={220}
                  />
                </label>

                <label>
                  Her email
                  <input
                    name="nominee_email"
                    type="email"
                    maxLength={180}
                  />
                  <small>
                    Required with phone for neither; at least one
                    contact is required for self-applications.
                  </small>
                </label>

                <label>
                  Her phone
                  <input
                    name="nominee_phone"
                    type="tel"
                    maxLength={50}
                  />
                </label>

                <label className="full">
                  Why should she be considered?
                  <textarea
                    name="bio"
                    rows={7}
                    minLength={30}
                    maxLength={5000}
                    placeholder="Tell the review team about her background, contribution, achievements or impact."
                    required
                  />
                </label>

                <label>
                  Photo
                  <input
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                  <small>
                    Optional. JPG, PNG or WebP, maximum 5 MB.
                  </small>
                </label>

                <label>
                  Supporting document
                  <input
                    name="supporting_document"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                  />
                  <small>
                    Optional. PDF or image, maximum 10 MB.
                  </small>
                </label>

                <div className="full">
                  <span className="v2-overline">
                    If you are nominating someone else
                  </span>
                  <p className="live-empty-copy">
                    Complete this section only when “I am
                    nominating someone else” is selected.
                  </p>
                </div>

                <label>
                  Your name
                  <input
                    name="nominator_name"
                    maxLength={160}
                  />
                </label>

                <label>
                  Relationship to nominee
                  <input
                    name="nominator_relationship"
                    maxLength={160}
                    placeholder="e.g. Teacher, colleague, parent"
                  />
                </label>

                <label>
                  Your email
                  <input
                    name="nominator_email"
                    type="email"
                    maxLength={180}
                  />
                </label>

                <label>
                  Your phone
                  <input
                    name="nominator_phone"
                    type="tel"
                    maxLength={50}
                  />
                </label>

                <div className="full">
                  <span className="v2-overline">
                    Optional reference
                  </span>
                </div>

                <label>
                  Reference name
                  <input
                    name="reference_name"
                    maxLength={160}
                  />
                </label>

                <label>
                  Reference contact
                  <input
                    name="reference_contact"
                    maxLength={220}
                    placeholder="Email or phone"
                  />
                </label>

                <label className="live-check full">
                  <input
                    type="checkbox"
                    name="declaration"
                    required
                  />
                  I confirm that the information submitted is
                  accurate to the best of my knowledge and may be
                  reviewed by Girl Pikin For Betteh Foundation for
                  nomination purposes.
                </label>

                <div className="full">
                  <button
                    className="button"
                    type="submit"
                  >
                    Submit application
                  </button>
                </div>
              </form>

              <aside className="v2-contact-aside">
                <span className="v2-overline light">
                  How it works
                </span>
                <h2>
                  Submission does not make anyone a public nominee
                </h2>

                <div className="live-management-stack">
                  <div>
                    <UserRound size={22} />
                    <strong>1. Submit</strong>
                    <p>
                      Choose an open award category and provide
                      the application information.
                    </p>
                  </div>

                  <div>
                    <FileText size={22} />
                    <strong>2. Review</strong>
                    <p>
                      The Foundation reviews the submission and
                      can approve, reject or request internal
                      follow-up.
                    </p>
                  </div>

                  <div>
                    <ShieldCheck size={22} />
                    <strong>3. Approval</strong>
                    <p>
                      Approval is separate from publication.
                      Only approved records intentionally
                      published by staff appear publicly.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </>
  )
}

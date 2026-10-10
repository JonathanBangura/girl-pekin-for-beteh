import Link from 'next/link'
import {
  ArrowUpRight,
  Heart,
  Target,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
  SectionHeading,
} from '@/components/public/public'
import { DonationForm } from '@/components/donations/donation-form'
import type { PublicDonationCampaign } from '@/lib/donations/public-data'

function money(value: number, currency: string) {
  const label = currency === 'SLE' ? 'NLe' : currency
  return `${label} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function progress(campaign: PublicDonationCampaign) {
  if (
    !campaign.goal_amount ||
    campaign.goal_amount <= 0
  ) {
    return 0
  }

  return Math.min(
    100,
    Math.max(
      0,
      (campaign.raised_amount / campaign.goal_amount) * 100,
    ),
  )
}

export function PublicDonationsPage({
  campaigns,
  selectedCampaign = null,
}: {
  campaigns: PublicDonationCampaign[]
  selectedCampaign?: PublicDonationCampaign | null
}) {
  const formCampaigns = selectedCampaign
    ? [selectedCampaign]
    : campaigns

  return (
    <>
      <PublicHeader />

      <main>
        <section className="page-hero v2-page-hero donation-hero">
          <span className="v2-overline">
            Support the Mission
          </span>
          <h1>
            Help us create more opportunities for girls.
          </h1>
          <p>
            Your contribution supports programmes, outreach,
            recognition initiatives and the work required to
            advance Girl Pikin For Betteh Foundation&apos;s
            mission.
          </p>
        </section>

        {selectedCampaign ? (
          <section className="section donation-campaign-feature">
            <div className="donation-campaign-copy">
              <Pill>
                {selectedCampaign.fund_type === 'unrestricted'
                  ? 'Unrestricted Fund'
                  : 'Fundraising Campaign'}
              </Pill>
              <h2>{selectedCampaign.title}</h2>
              <p>
                {selectedCampaign.description ||
                  selectedCampaign.summary ||
                  'Support this Foundation fundraising priority.'}
              </p>

              {selectedCampaign.show_progress &&
              selectedCampaign.goal_amount ? (
                <div className="donation-progress-block">
                  <div>
                    <span>Raised</span>
                    <strong>
                      {money(
                        selectedCampaign.raised_amount,
                        selectedCampaign.currency,
                      )}
                    </strong>
                  </div>
                  <progress
                    max={100}
                    value={progress(selectedCampaign)}
                  />
                  <small>
                    Goal:{' '}
                    {money(
                      selectedCampaign.goal_amount,
                      selectedCampaign.currency,
                    )}
                  </small>
                </div>
              ) : null}

              <Link className="text-button" href="/donate">
                View all donation funds <ArrowUpRight size={14} />
              </Link>
            </div>

            <DonationForm
              campaigns={formCampaigns}
              selectedCampaignId={selectedCampaign.id}
              lockCampaign
            />
          </section>
        ) : (
          <>
            <section className="section section-surface">
              <SectionHeading
                label="Where your support goes"
                title={<>Choose a fund or campaign</>}
                copy="General Fund contributions are unrestricted. Campaign contributions are designated to the published fundraising purpose."
              />

              {campaigns.length ? (
                <div className="donation-campaign-grid">
                  {campaigns.map((campaign) => (
                    <article
                      className="panel donation-campaign-card"
                      key={campaign.id}
                    >
                      {campaign.cover_image_url ? (
                        <img
                          className="donation-campaign-image"
                          src={campaign.cover_image_url}
                          alt=""
                        />
                      ) : (
                        <div className="donation-campaign-placeholder">
                          {campaign.campaign_kind === 'general' ? (
                            <Heart size={34} />
                          ) : (
                            <Target size={34} />
                          )}
                        </div>
                      )}

                      <div className="donation-campaign-card-body">
                        <Pill>
                          {campaign.fund_type === 'unrestricted'
                            ? 'General Support'
                            : 'Designated Campaign'}
                        </Pill>
                        <h3>{campaign.title}</h3>
                        <p>
                          {campaign.summary ||
                            'Support this Foundation fundraising priority.'}
                        </p>

                        {campaign.show_progress &&
                        campaign.goal_amount ? (
                          <div className="donation-progress-block compact">
                            <div>
                              <span>Raised</span>
                              <strong>
                                {money(
                                  campaign.raised_amount,
                                  campaign.currency,
                                )}
                              </strong>
                            </div>
                            <progress
                              max={100}
                              value={progress(campaign)}
                            />
                            <small>
                              of{' '}
                              {money(
                                campaign.goal_amount,
                                campaign.currency,
                              )}
                            </small>
                          </div>
                        ) : null}

                        <Link
                          className="text-button"
                          href={`/donate/${campaign.slug}`}
                        >
                          Support this fund{' '}
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="live-public-empty">
                  <strong>
                    No donation funds are currently open.
                  </strong>
                  <p>
                    Please check again later or contact the
                    Foundation.
                  </p>
                </div>
              )}
            </section>

            <section className="section donation-form-section">
              <DonationForm campaigns={campaigns} />
            </section>
          </>
        )}
      </main>

      <PublicFooter />
    </>
  )
}

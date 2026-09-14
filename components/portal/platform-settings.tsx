import Link from 'next/link'
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  LockKeyhole,
  Settings2,
} from 'lucide-react'
import { getPlatformSettingsData } from '@/lib/settings/data'

export async function PlatformSettingsPage() {
  const data = await getPlatformSettingsData()
  const configuredCount =
    data.integrations.filter(
      (item) => item.configured,
    ).length

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Administration / Settings
          </span>
          <h1>Platform Settings</h1>
          <p>
            Review operational defaults and deployment/integration readiness
            without exposing or editing server secrets in the browser.
          </p>
        </div>
      </div>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Integrations</span>
          <strong>{data.integrations.length}</strong>
          <small>Tracked configuration checks</small>
        </article>
        <article>
          <span>Configured</span>
          <strong>{configuredCount}</strong>
          <small>Ready checks</small>
        </article>
        <article>
          <span>Needs attention</span>
          <strong>{data.integrations.length - configuredCount}</strong>
          <small>Missing configuration</small>
        </article>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">Operational defaults</span>
            <h2>Platform identity & locale</h2>
          </div>
          <Settings2 size={20} />
        </div>

        <div className="live-edition-summary">
          {data.operationalDefaults.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </div>
          ))}
        </div>

        <p className="live-empty-copy">
          These defaults match the platform requirements already implemented
          across voting, ticketing and date display. This screen does not offer
          cosmetic toggles that the rest of the system would ignore.
        </p>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Integration readiness</h2>
            <span className="live-data-badge">
              SERVER CONFIG
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Status</th>
                <th>Safe detail</th>
              </tr>
            </thead>
            <tbody>
              {data.integrations.map((item) => (
                <tr key={item.name}>
                  <td><strong>{item.name}</strong></td>
                  <td>
                    {item.configured ? (
                      <span className="pill teal">
                        <CheckCircle2 size={13} /> Configured
                      </span>
                    ) : (
                      <span className="pill coral">
                        <CircleAlert size={13} /> Needs attention
                      </span>
                    )}
                  </td>
                  <td>{item.detail}</td>
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
              Secret-management boundary
            </span>
            <h2>Deployment secrets stay outside the database</h2>
          </div>
          <LockKeyhole size={20} />
        </div>

        <p className="live-empty-copy">
          Vult private keys, webhook passwords, Supabase server keys, Resend API
          keys and the ticket QR secret must remain in the deployment environment.
          The application intentionally never returns their values to this page.
        </p>

        <div className="v2-admin-page-actions">
          <Link className="button secondary" href="/admin/audit">
            Audit Logs
          </Link>
          <Link className="button secondary" href="/admin/users">
            Users & Roles
          </Link>
          <Link className="button secondary" href="/" target="_blank">
            Public Site <ExternalLink size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}

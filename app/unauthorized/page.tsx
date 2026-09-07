import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: '#f4f6f3',
      color: '#10251f',
    }}>
      <section style={{
        width: 'min(100%, 520px)',
        padding: 32,
        background: '#fff',
        border: '1px solid #d9e2de',
        borderRadius: 14,
      }}>
        <p style={{
          margin: 0,
          color: '#0d5f50',
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
        }}>Access restricted</p>
        <h1 style={{ margin: '10px 0 12px', fontSize: 38 }}>You do not have access to this workspace.</h1>
        <p style={{ color: '#60706a', lineHeight: 1.6 }}>
          Your account is signed in, but the required role or permission has
          not been assigned.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Link className="button" href="/">Public site</Link>
          <form action="/auth/signout" method="post">
            <button className="button secondary" type="submit">Sign out</button>
          </form>
        </div>
      </section>
    </main>
  )
}

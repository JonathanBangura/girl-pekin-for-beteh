import Link from 'next/link'
import { Brand } from '@/components/brand/brand'
import { LoginForm } from '@/components/auth/login-form'
import styles from './login.module.css'

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand} aria-label="Return to public site">
          <Brand />
        </Link>

        <div className={styles.heading}>
          <span>Secure workspace</span>
          <h1>Sign in</h1>
          <p>
            Access administration, nominee or event operations using your
            assigned account.
          </p>
        </div>

        <LoginForm nextPath={next} />

        <div className={styles.footer}>
          <Link href="/">Return to public site</Link>
        </div>
      </section>
    </main>
  )
}

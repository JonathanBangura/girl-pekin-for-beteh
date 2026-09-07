'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/login/login.module.css'

function safeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/admin'
  return value
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      router.replace(safeNextPath(nextPath))
      router.refresh()
    } catch {
      setErrorMessage('Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        <span>Email address</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label>
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {errorMessage ? (
        <div className={styles.error} role="alert">
          {errorMessage}
        </div>
      ) : null}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

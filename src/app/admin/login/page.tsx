'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useLayoutEffect, useState } from 'react';
import type { AdminSession } from '@/lib/contracts';
import { getAuthClient } from '@/lib/auth-client';
import { adminApi, getAuthErrorMessage } from '@/components/admin/admin-api';
import styles from '@/components/admin/admin.module.css';

const PASSWORD_SETUP_CALLBACK_TYPES = ['invite', 'recovery', 'magiclink', 'signup'] as const;
type PasswordSetupCallbackType = typeof PASSWORD_SETUP_CALLBACK_TYPES[number];
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const readPasswordSetupCallbackType = (): PasswordSetupCallbackType | null => {
  if (typeof window === 'undefined') return null;
  const hashType = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type');
  const queryType = new URLSearchParams(window.location.search).get('type');
  const type = hashType ?? queryType;
  return PASSWORD_SETUP_CALLBACK_TYPES.includes(type as PasswordSetupCallbackType) ? type as PasswordSetupCallbackType : null;
};

const hasPasswordSetupCallback = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);
  return readPasswordSetupCallbackType() !== null
    || queryParams.has('code')
    || [hashParams, queryParams].some((params) => params.has('error') || params.has('error_code') || params.has('error_description'));
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (hasPasswordSetupCallback()) {
      window.location.replace(`/admin/set-password${window.location.search}${window.location.hash}`);
      return;
    }
    if (new URLSearchParams(window.location.search).get('setup') === '1') setResetMode(true);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const auth = getAuthClient();
    if (!auth) {
      setError('Admin sign-in is unavailable. The campaign stays closed until sign-in is available.');
      setLoading(false);
      return;
    }
    try {
      if (resetMode) {
        if (!email.trim()) throw new Error('Enter the invited admin email address.');
        const redirectTo = 'https://mothers-love.vercel.app/admin/set-password';
        const { error: resetError } = await auth.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (resetError) throw resetError;
        setMessage('If this address belongs to an active campaign account, a password setup link will arrive.');
        return;
      }
      const { error: signInError } = await auth.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      await adminApi<AdminSession>('/api/admin/session');
      router.replace('/admin');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.app}>
      <div className={styles.authLayout}>
        <section className={styles.authCard} aria-labelledby="login-title">
          <span className={styles.brandMark} aria-hidden="true">ML</span>
          <p className={styles.eyebrow}>Campaign workspace</p>
          <h1 id="login-title" className={styles.authTitle}>{resetMode ? 'Get a password setup link' : 'Admin sign in'}</h1>
          <p className={styles.authSubtitle}>{resetMode ? 'Request a password setup link for your invited account.' : 'Use your invited campaign email and password.'}</p>

          {message ? <div className={styles.success} role="status">{message}</div> : null}
          {error ? <div className={styles.error} role="alert">{error}</div> : null}

          {resetMode ? <div className={styles.card} style={{ marginBottom: 18 }}><h2 className={styles.cardTitle}>Set up an invited account</h2><p className={styles.cardDescription}>Enter the invited email address below.</p></div> : null}

          <form className={styles.authForm} onSubmit={submit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-email">Email address</label>
              <input id="admin-email" className={styles.input} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />
            </div>

            {!resetMode ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="admin-password">Password</label>
                <input id="admin-password" className={styles.input} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} />
              </div>
            ) : null}

            <button className={styles.button} type="submit" disabled={loading}>{loading ? 'Working...' : resetMode ? 'Send password setup link' : 'Sign in'}</button>
          </form>

          <div className={styles.buttonRow} style={{ marginTop: 18 }}>
            <button type="button" className={styles.buttonQuiet} onClick={() => { setResetMode((value) => !value); setError(null); setMessage(null); }}>
              {resetMode ? 'Back to sign in' : 'Set up an invited account'}
            </button>
            <Link className={styles.authLink} href="/">Back to live recognitions</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

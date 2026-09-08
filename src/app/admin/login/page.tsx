'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const callbackTypeRef = useRef<PasswordSetupCallbackType | null>(null);
  const [passwordMode, setPasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    const callbackType = readPasswordSetupCallbackType();
    callbackTypeRef.current = callbackType;
    if (callbackType !== null) setPasswordMode(true);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const auth = getAuthClient();
    if (!auth) {
      setError('Admin sign-in is not configured yet. The campaign stays closed until the authentication service is configured.');
      setLoading(false);
      return;
    }
    try {
      if (passwordMode) {
        if (newPassword.length < 10) throw new Error('Use a password with at least 10 characters.');
        const { error: updateError } = await auth.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;
        setPasswordMode(false);
        window.history.replaceState({}, '', '/admin/login');
        setMessage('Your password is ready. Sign in below.');
        setPassword('');
        return;
      }
      if (resetMode) {
        if (!email.trim()) throw new Error('Enter the invited admin email address.');
        const redirectTo = 'https://mothers-love.vercel.app/admin/login';
        const { error: resetError } = await auth.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (resetError) throw resetError;
        setMessage('If this address is an active admin, a recovery link will arrive from the configured provider.');
        return;
      }
      const { error: signInError } = await auth.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      const session = await adminApi<AdminSession>('/api/admin/session');
      router.replace(session.needsMfa && session.role === 'owner' ? '/admin/mfa' : '/admin');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = getAuthClient();
    if (!auth) return;
    const { data } = auth.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && callbackTypeRef.current !== null)) {
        setPasswordMode(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className={styles.app}>
      <div className={styles.authLayout}>
        <section className={styles.authCard} aria-labelledby="login-title">
          <span className={styles.brandMark} aria-hidden="true">ML</span>
          <p className={styles.eyebrow}>Campaign workspace</p>
          <h1 id="login-title" className={styles.authTitle}>Admin sign in</h1>
          <p className={styles.authSubtitle}>Use an invited campaign account. Public recognition does not require an account, and open admin registration is disabled.</p>

          {message ? <div className={styles.success} role="status">{message}</div> : null}
          {error ? <div className={styles.error} role="alert">{error}</div> : null}

          <form className={styles.authForm} onSubmit={submit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-email">Email address</label>
              <input id="admin-email" className={styles.input} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading || passwordMode} />
            </div>

            {passwordMode ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-password">Set a new password</label>
                <input id="new-password" className={styles.input} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required disabled={loading} />
                <p className={styles.fieldHint}>This link came from the configured invitation or recovery provider. No password is stored in the app UI.</p>
              </div>
            ) : resetMode ? null : (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="admin-password">Password</label>
                <input id="admin-password" className={styles.input} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} />
              </div>
            )}

            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? 'Working...' : passwordMode ? 'Set password' : resetMode ? 'Send recovery link' : 'Sign in'}
            </button>
          </form>

          <div className={styles.buttonRow} style={{ marginTop: 18 }}>
            {!passwordMode ? (
              <button type="button" className={styles.buttonQuiet} onClick={() => { setResetMode((value) => !value); setError(null); setMessage(null); }}>
                {resetMode ? 'Back to sign in' : 'Forgot password?'}
              </button>
            ) : null}
            <Link className={styles.authLink} href="/">Return to public form</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

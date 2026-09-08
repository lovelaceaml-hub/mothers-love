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
type CallbackInfo = { type: PasswordSetupCallbackType | null; hasError: boolean };
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const readCallbackInfo = (): CallbackInfo => {
  if (typeof window === 'undefined') return { type: null, hasError: false };
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);
  const hashType = hashParams.get('type');
  const queryType = queryParams.get('type');
  const type = hashType ?? queryType;
  const hasError = [hashParams, queryParams].some((params) => params.has('error') || params.has('error_code') || params.has('error_description'));
  return {
    type: PASSWORD_SETUP_CALLBACK_TYPES.includes(type as PasswordSetupCallbackType) ? type as PasswordSetupCallbackType : null,
    hasError,
  };
};

export default function AdminSetPasswordPage() {
  const router = useRouter();
  const [callbackType, setCallbackType] = useState<PasswordSetupCallbackType | null>(null);
  const [stage, setStage] = useState<'checking' | 'ready' | 'missing' | 'unavailable'>('checking');
  const callbackInfoRef = useRef<CallbackInfo>({ type: null, hasError: false });
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    const callbackInfo = readCallbackInfo();
    callbackInfoRef.current = callbackInfo;
    setCallbackType(callbackInfo.type);
    if (callbackInfo.hasError) setStage('missing');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const auth = getAuthClient();
    if (!auth) {
      const unavailableTimer = window.setTimeout(() => {
        if (!cancelled) setStage('unavailable');
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(unavailableTimer);
      };
    }

    if (callbackInfoRef.current.hasError) return;

    let eventVersion = 0;
    const markMissing = (message?: string) => {
      if (!cancelled) {
        setVerifiedEmail(null);
        if (message) setError(message);
        setStage('missing');
      }
    };
    const verifySession = async (expectedVersion: number) => {
      try {
        const { data, error: sessionError } = await auth.auth.getSession();
        if (sessionError) throw sessionError;
        if (cancelled || expectedVersion !== eventVersion) return;
        if (!data.session) {
          markMissing();
          return;
        }
        const { data: userData, error: userError } = await auth.auth.getUser();
        if (cancelled || expectedVersion !== eventVersion) return;
        if (userError || !userData.user?.email) {
          markMissing('This setup link could not verify the account. It may be expired, invalid or already used.');
          return;
        }
        if (cancelled || expectedVersion !== eventVersion) return;
        setVerifiedEmail(userData.user.email);
        setError(null);
        setStage('ready');
      } catch {
        if (cancelled || expectedVersion !== eventVersion) return;
        markMissing('This setup link could not be verified. It may be expired, invalid or already used.');
      }
    };
    const subscription = auth.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        eventVersion += 1;
        markMissing('Your setup session ended. Request a fresh setup link to continue.');
        return;
      }
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
        eventVersion += 1;
        const expectedVersion = eventVersion;
        window.setTimeout(() => { void verifySession(expectedVersion); }, 0);
      }
    });
    void verifySession(eventVersion);

    return () => {
      cancelled = true;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (stage !== 'ready') return;
    setWorking(true);
    setError(null);
    if (newPassword.length < 10) {
      setError('Use a password with at least 10 characters.');
      setWorking(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      setWorking(false);
      return;
    }
    const auth = getAuthClient();
    if (!auth) {
      setError('Admin authentication is not configured yet. Request a fresh setup link after the service is configured.');
      setStage('unavailable');
      setWorking(false);
      return;
    }
    try {
      const { error: updateError } = await auth.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      await adminApi<AdminSession>('/api/admin/session');
      router.replace('/admin');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  const title = callbackType === 'recovery' ? 'Recover your password' : 'Set your password';
  const checking = stage === 'checking';

  return (
    <main className={styles.app}>
      <div className={styles.authLayout}>
        <section className={styles.authCard} aria-labelledby="set-password-title">
          <span className={styles.brandMark} aria-hidden="true">ML</span>
          <p className={styles.eyebrow}>Campaign account</p>
          <h1 id="set-password-title" className={styles.authTitle}>{title}</h1>
          <p className={styles.authSubtitle}>Choose a password for your campaign account.</p>

          {checking ? <div className={styles.skeleton} aria-label="Checking setup link" /> : null}
          {stage === 'unavailable' ? (
            <div className={styles.error} role="alert">Admin authentication is not configured yet. The campaign stays closed until the authentication service is configured.</div>
          ) : null}
          {stage === 'missing' ? (
            <div className={styles.error} role="alert">{error ?? 'This setup link is missing, expired or already used. No password was changed.'}</div>
          ) : null}
          {error && stage === 'ready' ? <div className={styles.error} role="alert">{error}</div> : null}
          {stage === 'ready' && verifiedEmail ? <div className={styles.notice} role="status">Verified email: {verifiedEmail}</div> : null}

          {stage === 'ready' ? (
            <form className={styles.authForm} onSubmit={submit}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-password">New password</label>
                <input id="new-password" className={styles.input} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required disabled={working} />
                <p className={styles.fieldHint}>Use at least 10 characters.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm-password">Confirm new password</label>
                <input id="confirm-password" className={styles.input} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} required disabled={working} />
              </div>
              <button className={styles.button} type="submit" disabled={working}>{working ? 'Saving password...' : 'Save password'}</button>
            </form>
          ) : null}

          <div className={styles.buttonRow} style={{ marginTop: 18 }}>
            <Link className={styles.authLink} href="/admin/login?setup=1">Request a fresh setup link</Link>
            <Link className={styles.authLink} href="/admin/login">Return to sign in</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { AdminSession } from '@/lib/contracts';
import { getAuthClient } from '@/lib/auth-client';
import { adminApi, getAuthErrorMessage } from '@/components/admin/admin-api';
import styles from '@/components/admin/admin.module.css';

type MfaFactor = { id: string; status?: string; friendly_name?: string | null };
type MfaEnrollment = { id?: string; uri?: string; totp?: { qr_code?: string; secret?: string } };

export default function AdminMfaPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [factor, setFactor] = useState<MfaFactor | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      const auth = getAuthClient();
      if (!auth) {
        setError('Admin authentication is not configured yet.');
        setLoading(false);
        return;
      }
      try {
        const { data: sessionData } = await auth.auth.getSession();
        if (!sessionData.session) {
          router.replace('/admin/login');
          return;
        }
        const current = await adminApi<AdminSession>('/api/admin/session');
        if (current.role !== 'owner') {
          router.replace('/admin');
          return;
        }
        const { data, error: listError } = await auth.auth.mfa.listFactors();
        if (listError) throw listError;
        const verified = (data?.totp ?? []).find((item) => item.status === 'verified');
        if (!cancelled) {
          setFactor(verified ? { id: verified.id, status: verified.status, friendly_name: verified.friendly_name } : null);
          setLoading(false);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(getAuthErrorMessage(cause));
          setLoading(false);
        }
      }
    };
    void setup();
    return () => { cancelled = true; };
  }, [router]);

  const enroll = async () => {
    const auth = getAuthClient();
    if (!auth) return;
    setWorking(true);
    setError(null);
    try {
      const { data, error: enrollError } = await auth.auth.mfa.enroll({ factorType: 'totp', friendlyName: "Mother's Love admin" });
      if (enrollError) throw enrollError;
      setEnrollment(data as MfaEnrollment);
      const qrSource = (data as MfaEnrollment).totp?.qr_code ?? (data as MfaEnrollment).uri ?? '';
      if (qrSource) setQrDataUrl(await QRCode.toDataURL(qrSource, { errorCorrectionLevel: 'M', margin: 2, width: 240 }));
      setMessage('Scan this code with an authenticator app, then enter the six digit code to verify it.');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  const verify = async () => {
    const auth = getAuthClient();
    if (!auth || !code.trim()) return;
    setWorking(true);
    setError(null);
    try {
      const factorId = enrollment?.id ?? factor?.id;
      if (!factorId) throw new Error('No MFA factor is ready. Start enrollment again.');
      const { data: challenge, error: challengeError } = await auth.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      setChallengeId(challenge.id);
      const { error: verifyError } = await auth.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
      if (verifyError) throw verifyError;
      setMessage('Owner verification is complete.');
      router.replace('/admin');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <main className={styles.app}><div className={styles.authLayout}><div className={styles.authCard}><div className={styles.skeleton} aria-label="Loading MFA" /></div></div></main>;
  }

  return (
    <main className={styles.app}>
      <div className={styles.authLayout}>
        <section className={styles.authCard} aria-labelledby="mfa-title">
          <span className={styles.brandMark} aria-hidden="true">ML</span>
          <p className={styles.eyebrow}>Owner security</p>
          <h1 id="mfa-title" className={styles.authTitle}>Verify owner access</h1>
          <p className={styles.authSubtitle}>Campaign owner actions require a second factor. Moderator sessions continue with their invited account assurance level.</p>
          {message ? <div className={styles.success} role="status">{message}</div> : null}
          {error ? <div className={styles.error} role="alert">{error}</div> : null}

          {!factor && !enrollment ? (
            <div className={styles.card} style={{ marginBottom: 16 }}>
              <h2 className={styles.cardTitle}>Enroll an authenticator app</h2>
              <p className={styles.cardDescription}>The app will generate a one time code for owner actions. Keep the recovery path with your organization.</p>
              <button className={styles.button} type="button" onClick={() => void enroll()} disabled={working} style={{ marginTop: 16 }}>
                {working ? 'Preparing code...' : 'Show enrollment QR'}
              </button>
            </div>
          ) : null}

          {enrollment ? (
            <div className={styles.card} style={{ marginBottom: 16 }}>
              <h2 className={styles.cardTitle}>Scan the enrollment QR</h2>
              <p className={styles.cardDescription}>Use the authenticator app you trust for this campaign. The QR is shown only during this enrollment step.</p>
              {qrDataUrl ? (
                <div className={styles.qrFrame} style={{ margin: '18px auto' }}>
                  <Image className={styles.qrImage} src={qrDataUrl} alt="Authenticator enrollment QR code" width={240} height={240} unoptimized />
                </div>
              ) : null}
              {enrollment.totp?.secret ? <p className={styles.fieldHint}>Manual setup key: <code>{enrollment.totp.secret}</code></p> : null}
            </div>
          ) : null}

          {factor || enrollment ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="mfa-code">Six digit authenticator code</label>
              <input id="mfa-code" className={styles.input} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
              <p className={styles.fieldHint}>{challengeId ? 'Challenge ready. Submit the current code before it changes.' : 'A challenge is created when you verify this code.'}</p>
              <button className={styles.button} type="button" onClick={() => void verify()} disabled={working || code.length !== 6}>
                {working ? 'Verifying...' : 'Verify owner access'}
              </button>
            </div>
          ) : null}

          <div className={styles.buttonRow} style={{ marginTop: 18 }}>
            <Link className={styles.authLink} href="/admin/login">Return to sign in</Link>
            <Link className={styles.authLink} href="/privacy">Privacy</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

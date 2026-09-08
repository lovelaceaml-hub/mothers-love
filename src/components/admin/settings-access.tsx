'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Device } from '@/lib/contracts';
import { useAdminSession } from './admin-shell';
import { adminApi, adminJson, getAuthErrorMessage } from './admin-api';
import { formatDateTime } from './admin-utils';
import styles from './admin.module.css';

type Member = { id: string; role: string; active: boolean };

export function SettingsAccess() {
  const session = useAdminSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<{ code: string; expiresAt: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const deviceResponse = await adminApi<{ items: Device[] }>('/api/admin/devices');
      setDevices(deviceResponse.items);
      if (session?.role === 'owner') {
        const memberResponse = await adminApi<{ items: Member[] }>('/api/admin/members');
        setMembers(memberResponse.items);
      }
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const invite = async () => {
    if (!email.trim() || session?.role !== 'owner') return;
    if (!window.confirm(`Invite ${email.trim()} as a Moderator? They will receive a setup link. Continue?`)) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      await adminJson('/api/admin/members', { email: email.trim(), role: 'moderator' }, 'POST');
      setEmail('');
      setNotice('Moderator invitation created. They can use the setup link to choose a password.');
      await load();
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  const revoke = async (member: Member) => {
    if (session?.role !== 'owner') return;
    if (!window.confirm(`Revoke ${member.role} access for this invited account? The last owner is protected.`)) return;
    setWorking(true);
    try {
      await adminJson(`/api/admin/members/${encodeURIComponent(member.id)}`, { active: false }, 'PATCH');
      setNotice('Member access revoked.');
      await load();
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  const pair = async () => {
    if (session?.role !== 'owner') return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      setPairingCode(await adminJson<{ code: string; expiresAt: string }>('/api/admin/devices', {}, 'POST'));
      setNotice('Pairing code created. Enter it on the TV display page before it expires.');
      await load();
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  const revokeDevice = async (device: Device) => {
    if (session?.role !== 'owner') return;
    if (!window.confirm(`Revoke the paired browser “${device.label}”? It will lose display access on its next verification.`)) return;
    setWorking(true);
    try {
      await adminApi(`/api/admin/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' });
      setNotice('Device revoked. The browser must pair again before receiving display data.');
      await load();
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className={styles.skeleton} aria-label="Loading settings and access" />;

  return (
    <>
      {notice ? <div className={styles.success} role="status">{notice}</div> : null}
      {error ? <div className={styles.error} role="alert">{error} <button type="button" className={styles.authLink} onClick={() => void load()}>Try again</button></div> : null}
      <section className={styles.grid}>
        {session?.role === 'owner' ? <article className={`${styles.card} ${styles.cardWarm} ${styles.col7}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Invited campaign members</h2><p className={styles.cardDescription}>Invite or revoke moderators.</p></div><span className={styles.badge}>Owner only</span></div>
          <div className={styles.buttonRow} style={{ alignItems: 'end' }}><div className={styles.field} style={{ flex: 1, marginBottom: 0 }}><label className={styles.label} htmlFor="invite-email">Moderator email</label><input id="invite-email" className={styles.input} type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="invited address" /></div><button type="button" className={styles.button} onClick={() => void invite()} disabled={working || !email.trim()}>Invite moderator</button></div>
          <p className={styles.fieldHint} style={{ marginTop: 12 }}>The invitee will choose a password from the setup link.</p>
          {!members.length ? <div className={styles.empty}>No invited members yet.</div> : <div className={styles.list}>{members.map((member) => <div className={styles.listItem} key={member.id}><div><p className={styles.listItemTitle}>{member.role === 'owner' ? 'Campaign owner' : 'Moderator'}</p></div><div className={styles.buttonRow}><span className={`${styles.badge} ${member.active ? styles.badgePublished : styles.badgeHidden}`}>{member.active ? 'Active' : 'Revoked'}</span>{member.active && member.role !== 'owner' ? <button type="button" className={styles.buttonQuiet} onClick={() => void revoke(member)} disabled={working}>Revoke</button> : null}</div></div>)}</div>}
        </article> : null}

        <article className={`${styles.card} ${styles.cardBlue} ${session?.role === 'owner' ? styles.col5 : styles.col7}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Display devices</h2><p className={styles.cardDescription}>Pair a browser to show the campaign.</p></div><span className={styles.badge}>{session?.role === 'owner' ? 'Owner pairing' : 'Read only'}</span></div>
          {session?.role === 'owner' ? <button type="button" className={styles.button} onClick={() => void pair()} disabled={working}>Create one time pairing code</button> : <p className={styles.notice}>Moderators can inspect device health. Pairing and revocation remain Owner actions.</p>}
          {pairingCode ? <div className={styles.notice} style={{ marginTop: 16 }}><p style={{ margin: '0 0 8px' }}>Enter this code on the TV display page.</p><span className={styles.code}>{pairingCode.code}</span></div> : null}
          {!devices.length ? <div className={styles.empty} style={{ marginTop: 16 }}>No display devices are paired.</div> : <div className={styles.list} style={{ marginTop: 16 }}>{devices.map((device) => <div className={styles.listItem} key={device.id}><div><p className={styles.listItemTitle}>{device.label}</p><p className={styles.listItemText}>Browser last connected: {formatDateTime(device.lastSeenAt)}</p><div className={styles.listItemMeta}><span className={device.revoked ? `${styles.badge} ${styles.badgeInvalid}` : `${styles.badge} ${styles.badgePublished}`}>{device.revoked ? 'Revoked' : 'Active'}</span></div></div>{session?.role === 'owner' && !device.revoked ? <button type="button" className={styles.buttonQuiet} onClick={() => void revokeDevice(device)} disabled={working}>Revoke</button> : null}</div>)}</div>}
        </article>
      </section>
    </>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from './admin-shell';
import { adminApi, adminJson, getAuthErrorMessage } from './admin-api';
import styles from './admin.module.css';

type Member = { id: string; role: string; active: boolean };

export function SettingsAccess() {
  const session = useAdminSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
    if (!window.confirm(`Revoke ${member.role} access for the account ending in ${member.id.slice(-6)}? The last owner is protected.`)) return;
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
          {!members.length ? <div className={styles.empty}>No invited members yet.</div> : <div className={styles.list}>{members.map((member) => <div className={styles.listItem} key={member.id}><div><p className={styles.listItemTitle}>{member.role === 'owner' ? 'Campaign owner' : 'Moderator'}</p><p className={styles.listItemText}>Account ID ending in {member.id.slice(-6)}.</p></div><div className={styles.buttonRow}><span className={`${styles.badge} ${member.active ? styles.badgePublished : styles.badgeHidden}`}>{member.active ? 'Active' : 'Revoked'}</span>{member.active && member.role !== 'owner' ? <button type="button" className={styles.buttonQuiet} onClick={() => void revoke(member)} disabled={working}>Revoke</button> : null}</div></div>)}</div>}
        </article> : null}

        <article className={`${styles.card} ${styles.cardBlue} ${session?.role === 'owner' ? styles.col5 : styles.col7}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>TV View</h2><p className={styles.cardDescription}>Open the public campaign display directly with its link.</p></div><span className={styles.badge}>Public link</span></div>
          <Link className={styles.button} href="/display">Open TV View</Link>
          <p className={styles.fieldHint} style={{ marginTop: 12 }}>Settings apply to open TV View screens when they refresh. Blank an offline screen to hide messages immediately.</p>
        </article>
      </section>
    </>
  );
}

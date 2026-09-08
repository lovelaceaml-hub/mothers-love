'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { AdminSession } from '@/lib/contracts';
import { getAuthClient } from '@/lib/auth-client';
import { adminApi, getAuthErrorMessage, isUnauthorized } from './admin-api';
import styles from './admin.module.css';

type AdminShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
};

const AdminSessionContext = createContext<AdminSession | null>(null);

export const useAdminSession = (): AdminSession | null => useContext(AdminSessionContext);

const links = [
  { href: '/admin', label: 'Overview', icon: 'O' },
  { href: '/admin/recognitions', label: 'Recognitions', icon: 'R' },
  { href: '/admin/review', label: 'Review inbox', icon: 'I' },
  { href: '/admin/display', label: 'Display controls', icon: 'D' },
  { href: '/admin/insights', label: 'Insights', icon: 'N' },
  { href: '/admin/settings', label: 'Settings and access', icon: 'S' },
];

export function AdminShell({ children, eyebrow, title, description }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      const auth = getAuthClient();
      if (!auth) {
        if (!cancelled) {
          setLoading(false);
          setError('Admin sign-in is not configured yet. Collection and administration stay closed until the service is configured.');
        }
        return;
      }
      try {
        const { data } = await auth.auth.getSession();
        if (!data.session) {
          router.replace('/admin/login');
          return;
        }
        const current = await adminApi<AdminSession>('/api/admin/session');
        if (current.needsMfa && current.role === 'owner') {
          router.replace('/admin/mfa');
          return;
        }
        if (!cancelled) {
          setSession(current);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(isUnauthorized(cause) ? 'Your admin session expired. Sign in again to continue.' : getAuthErrorMessage(cause));
          setLoading(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const activeHref = useMemo(() => {
    if (pathname === '/admin') return '/admin';
    return links.find((link) => pathname.startsWith(link.href) && link.href !== '/admin')?.href ?? '/admin';
  }, [pathname]);

  const signOut = async () => {
    const auth = getAuthClient();
    if (!auth) return;
    await auth.auth.signOut();
    setSignedOut(true);
    router.replace('/admin/login');
  };

  if (signedOut) return null;

  return (
    <div className={styles.app}>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Admin navigation">
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">ML</span>
            <div>
              <p className={styles.brandName}>Mother&apos;s Love</p>
              <p className={styles.brandTagline}>Where a mother&apos;s love resides, peace abides.</p>
            </div>
          </div>

          <nav className={styles.nav} aria-label="Campaign workspace">
            <span className={styles.navLabel}>Workspace</span>
            {links.map((link) => {
              const active = activeHref === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles.navIcon} aria-hidden="true">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <span className={styles.rolePill}>{session?.role ?? 'Checking access'}</span>
            <p className={styles.footerText}>Personal recognition records expire after their original seven day lifetime.</p>
            <button type="button" className={styles.buttonQuiet} onClick={() => void signOut}>Sign out</button>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.topbar}>
            <div>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 className={styles.pageTitle}>{title}</h1>
              {description ? <p className={styles.sectionHint}>{description}</p> : null}
            </div>
            <div className={styles.topbarActions}>
              {session ? <span className={styles.rolePill}>{session.role === 'owner' ? 'Owner access' : 'Moderator access'}</span> : null}
              <button type="button" className={styles.buttonSecondary} onClick={() => void signOut}>Sign out</button>
            </div>
          </header>

          <div className={styles.content}>
            {loading ? <div className={styles.skeleton} aria-label="Loading admin access" /> : null}
            {error ? (
              <div className={styles.error} role="alert">
                <strong>Admin access unavailable.</strong> {error}{' '}
                <Link className={styles.authLink} href="/admin/login">Return to sign in</Link>
              </div>
            ) : null}
            {!loading && !error && session ? (
              <AdminSessionContext.Provider value={session}>{children}</AdminSessionContext.Provider>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

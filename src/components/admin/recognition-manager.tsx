'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminRecognition, Expression } from '@/lib/contracts';
import { EXPRESSIONS } from '@/lib/catalog';
import { clearSafeTimeout, setSafeTimeout, type SafeTimerHandle } from '@/lib/safe-timer';
import { adminApi, getAuthErrorMessage } from './admin-api';
import { ADMIN_LIST_PAGE_SIZE as PAGE_SIZE, formatDateTime, isExpired, numberRecognitions, statusLabel, type ListSort, type NumberedRecognition } from './admin-utils';
import styles from './admin.module.css';

type RecognitionResponse = { items: AdminRecognition[]; total: number; sort?: ListSort };

const expressionCatalog = EXPRESSIONS as Expression[];


export function RecognitionManager() {
  const [items, setItems] = useState<NumberedRecognition[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ListSort>('oldest');
  const [appliedSort, setAppliedSort] = useState<ListSort>('oldest');
  const [status, setStatus] = useState('');
  const [expression, setExpression] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ page: String(page), sort });
    if (status) query.set('status', status);
    if (expression) query.set('expression', expression);
    if (search.trim()) query.set('search', search.trim());
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    try {
      const response = await adminApi<RecognitionResponse>(`/api/admin/recognitions?${query.toString()}`);
      // The database says which order it used; until migration 015 is applied it only knows newest first.
      const usedSort: ListSort = response.sort === 'oldest' ? 'oldest' : 'newest';
      const numbered = numberRecognitions(response.items, response.total, page, usedSort);
      const currentItems = numbered.filter((item) => !isExpired(item.expiresAt));
      const expiredOnPage = numbered.length - currentItems.length;
      setAppliedSort(usedSort);
      setItems(currentItems);
      setTotal(Math.max(0, response.total - expiredOnPage));
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [expression, from, page, search, sort, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timers = items.map((item) => setSafeTimeout(() => {
      if (isExpired(item.expiresAt)) setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    }, Math.max(0, new Date(item.expiresAt).getTime() - Date.now())));
    return () => timers.forEach((timer: SafeTimerHandle) => clearSafeTimeout(timer));
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clearFilters = (event?: FormEvent) => {
    event?.preventDefault();
    setSearch('');
    setStatus('');
    setExpression('');
    setFrom('');
    setTo('');
    setSort('oldest');
    setPage(1);
  };
  const orderNotice = sort !== appliedSort && !loading && !error
    ? 'The database is still showing newest first. Apply database migration 015 to sort oldest first.'
    : null;

  const expressionText = useMemo(() => new Map(expressionCatalog.map((item) => [item.id, item.phrase])), []);

  return (
    <>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div><h2 className={styles.cardTitle}>Current recognitions</h2><p className={styles.cardDescription}>Every current recognition with its submitted name and message, numbered in the order it came in.</p></div>
          <span className={styles.badge}>{total} result{total === 1 ? '' : 's'}</span>
        </div>
        <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}>
          <div className={styles.filterField}><label className={styles.label} htmlFor="recognition-search">Search recipient</label><input id="recognition-search" className={styles.input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" /></div>
          <div className={styles.filterField}><label className={styles.label} htmlFor="recognition-status">Status</label><select id="recognition-status" className={styles.select} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All current</option><option value="published">Published</option><option value="held">Held</option><option value="hidden">Hidden</option><option value="invalid">Invalid</option></select></div>
          <div className={styles.filterField}><label className={styles.label} htmlFor="recognition-expression">Expression</label><select id="recognition-expression" className={styles.select} value={expression} onChange={(event) => { setExpression(event.target.value); setPage(1); }}><option value="">All expressions</option>{expressionCatalog.map((item) => <option key={item.id} value={item.id}>{item.id}. {item.phrase}</option>)}</select></div>
          <div className={styles.filterField}><label className={styles.label} htmlFor="recognition-from">From</label><input id="recognition-from" className={styles.input} type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></div>
          <div className={styles.filterField}><label className={styles.label} htmlFor="recognition-to">To</label><input id="recognition-to" className={styles.input} type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></div>
          <div className={styles.filterField}><label className={styles.label} htmlFor="recognition-sort">Order</label><select id="recognition-sort" className={styles.select} value={sort} onChange={(event) => { setSort(event.target.value === 'newest' ? 'newest' : 'oldest'); setPage(1); }}><option value="oldest">Oldest first (as they came in)</option><option value="newest">Newest first</option></select></div>
          <button type="button" className={styles.buttonSecondary} onClick={() => clearFilters()}>Clear</button>
        </form>
        {error ? <div className={styles.error} role="alert">{error} <button type="button" className={styles.authLink} onClick={() => void load()}>Try again</button></div> : null}
        {orderNotice ? <div className={styles.notice} role="status">{orderNotice}</div> : null}
        {loading ? <div className={styles.skeleton} aria-label="Loading recognitions" /> : null}
        {!loading && !error && !items.length ? <div className={styles.empty}>No current recognition records match these filters.</div> : null}
        {!loading && !error && items.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Current campaign recognition records</caption>
              <thead><tr><th scope="col">#</th><th scope="col">Submitted by</th><th scope="col">Recipient</th><th scope="col">Message</th><th scope="col">Expressions</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Feature</th><th scope="col"><span className={styles.srOnly}>Open</span></th></tr></thead>
              <tbody>{items.map((item) => {
                const badgeClass = item.status === 'published' ? styles.badgePublished : item.status === 'held' ? styles.badgeHeld : item.status === 'hidden' ? styles.badgeHidden : styles.badgeInvalid;
                return <tr key={item.id}>
                  <td><span className={styles.badge}>{item.sequence}</span></td>
                  <td>{item.submittedName}</td>
                  <td><strong>{item.recipient}</strong></td>
                  <td className={styles.messageCell}>{item.message}</td>
                  <td><div>{item.expressionIds.length} selected</div><div className={styles.fieldHint}>{item.expressionIds.map((id) => expressionText.get(id) ?? `Expression ${id}`).join(', ')}</div></td>
                  <td><span className={`${styles.badge} ${badgeClass}`}>{statusLabel(item.status)}</span></td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>{item.featured ? <span className={`${styles.badge} ${styles.badgePending}`}>Featured</span> : <span className={styles.badge}>Standard</span>}</td>
                  <td><Link className={styles.tableRowButton} href={`/admin/recognitions/${encodeURIComponent(item.id)}`}>Open detail</Link></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        ) : null}
        <div className={styles.buttonRow} style={{ justifyContent: 'space-between', marginTop: 16 }}>
          <span className={styles.fieldHint}>Showing up to {PAGE_SIZE} records per page, {appliedSort === 'oldest' ? 'oldest first' : 'newest first'}. The number is the order the recognition came in. Search is exact text matching, not identity verification.</span>
          <div className={styles.buttonRow}><button type="button" className={styles.buttonQuiet} disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span className={styles.badge}>Page {page} of {totalPages}</span><button type="button" className={styles.buttonQuiet} disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></div>
        </div>
      </section>
    </>
  );
}

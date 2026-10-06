import { describe, expect, it } from 'vitest';
import { shouldReload } from '@/lib/display-build';

const base = { ours: 'aaa', reported: 'bbb', previous: 'bbb', alreadyReloadedFor: null };

describe('TV reload on a new version', () => {
  it('reloads when the same new build is reported twice in a row', () => {
    expect(shouldReload(base)).toBe(true);
  });

  it('waits for a second report of a new build', () => {
    expect(shouldReload({ ...base, previous: null })).toBe(false);
    expect(shouldReload({ ...base, previous: 'ccc' })).toBe(false);
  });

  it('never reloads for the build it already runs', () => {
    expect(shouldReload({ ...base, reported: 'aaa', previous: 'aaa' })).toBe(false);
  });

  it('never reloads when the check failed', () => {
    expect(shouldReload({ ...base, reported: null, previous: null })).toBe(false);
  });

  it('is off on a build without a version', () => {
    expect(shouldReload({ ...base, ours: '' })).toBe(false);
  });

  it('reloads at most once per new build, so a stale page cannot loop', () => {
    expect(shouldReload({ ...base, alreadyReloadedFor: 'bbb' })).toBe(false);
    expect(shouldReload({ ...base, reported: 'ccc', previous: 'ccc', alreadyReloadedFor: 'bbb' })).toBe(true);
  });
});

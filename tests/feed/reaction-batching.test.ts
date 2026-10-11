import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchReactionCounts } from '@/components/feed/PublicFeedProvider';
import { MAX_REACTION_BATCH_SIZE } from '@/lib/reaction-contract';

afterEach(() => vi.unstubAllGlobals());

describe('bounded home reaction reads', () => {
  it('sends at most 100 IDs and decodes the full bounded response', async () => {
    const ids = Array.from({ length: MAX_REACTION_BATCH_SIZE + 1 }, (_, index) => `synthetic-${index}`);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requested = new URL(String(input), 'https://mothers-love.example')
        .searchParams.get('ids')?.split(',') ?? [];
      return new Response(JSON.stringify({
        items: requested.map((id) => ({ id, count: 2, liked: true })),
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const reactions = await fetchReactionCounts(ids);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), 'https://mothers-love.example');
    expect(requestUrl.searchParams.get('ids')?.split(',')).toHaveLength(MAX_REACTION_BATCH_SIZE);
    expect(reactions.size).toBe(MAX_REACTION_BATCH_SIZE);
    expect(reactions.get('synthetic-99')).toEqual({ id: 'synthetic-99', count: 2, liked: true });
  });
});

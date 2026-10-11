/** Poll only while visible, with one immediate refresh each time the tab returns. */
export function startVisiblePoll(load: () => void, intervalMs: number, beforeResume?: () => void): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => { if (timer !== null) clearInterval(timer); timer = null; };
  const resume = () => {
    stop();
    if (document.hidden) return;
    beforeResume?.();
    load();
    timer = setInterval(() => { if (!document.hidden) load(); }, intervalMs);
  };
  document.addEventListener('visibilitychange', resume);
  resume();
  return () => { stop(); document.removeEventListener('visibilitychange', resume); };
}

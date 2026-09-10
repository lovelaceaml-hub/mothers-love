export default function DisplayPage() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#202e2b',
      }}
    >
      <iframe
        src="/api/tv-v6?v=20260910-1006-color-material"
        title="Mother's Love TV Display"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        allow="autoplay; fullscreen"
      />
    </main>
  );
}

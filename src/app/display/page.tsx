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
        src="/display/v6?capture=1"
        title="Mother's Love TV Display V6"
        allow="fullscreen"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          border: 0,
        }}
      />
    </main>
  );
}

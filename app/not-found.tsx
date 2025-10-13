export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>404</h1>
      <p style={{ fontSize: '18px', marginBottom: '30px' }}>Page not found</p>
      <a
        href="/"
        style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
          color: 'white',
          fontWeight: '600',
          borderRadius: '12px',
          textDecoration: 'none',
        }}
      >
        Go Home
      </a>
    </div>
  );
}

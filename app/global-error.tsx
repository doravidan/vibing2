'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical error to monitoring service
    console.error('CRITICAL: Global error:', error);
  }, [error]);

  return (
    <html>
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          maxWidth: '600px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'white',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: 'rgba(239, 68, 68, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
          }}>
            ⚠️
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '10px',
          }}>
            Critical Error
          </h1>

          <p style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '20px',
          }}>
            A critical error occurred. Please refresh the page or contact support.
          </p>

          {error.message && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <p style={{
                fontSize: '14px',
                fontFamily: 'monospace',
                color: 'rgba(252, 165, 165, 1)',
                wordBreak: 'break-all',
                margin: 0,
              }}>
                {error.message}
              </p>
              {error.digest && (
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(252, 165, 165, 0.6)',
                  marginTop: '8px',
                  marginBottom: 0,
                }}>
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '10px',
            }}
          >
            Try Again
          </button>

          <a
            href="/"
            style={{
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '12px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go Home
          </a>
        </div>
      </body>
    </html>
  );
}

import { NextResponse } from 'next/server';

/**
 * Clear session cookies to fix redirect loop issues
 * This endpoint helps users who have old encrypted cookies that cause auth failures
 */
export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Session cleared successfully' },
    { status: 200 }
  );

  // Clear all NextAuth cookies
  const cookieOptions = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  // Clear session token (the main cookie that causes issues)
  response.cookies.set('next-auth.session-token', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);

  // Clear callback URL cookie
  response.cookies.set('next-auth.callback-url', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);

  // Clear CSRF token cookie
  response.cookies.set('next-auth.csrf-token', '', cookieOptions);
  response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);

  return response;
}

/**
 * GET endpoint for easy browser access
 * Visit /api/auth/clear-session in browser to clear cookies
 */
export async function GET() {
  const response = new NextResponse(
    `
<!DOCTYPE html>
<html>
<head>
  <title>Clear Session - QuickVibe</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
    }
    .success {
      background: #10b981;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    a {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background: #6366f1;
      color: white;
      text-decoration: none;
      border-radius: 6px;
    }
    a:hover {
      background: #4f46e5;
    }
  </style>
</head>
<body>
  <h1>🔓 Session Cleared</h1>
  <div class="success">
    <p><strong>All authentication cookies have been cleared!</strong></p>
    <p>You can now sign in again without redirect loop issues.</p>
  </div>
  <a href="/auth/signin">← Go to Sign In</a>
</body>
</html>
    `,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );

  // Clear all NextAuth cookies
  const cookieOptions = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  response.cookies.set('next-auth.session-token', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
  response.cookies.set('next-auth.callback-url', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);
  response.cookies.set('next-auth.csrf-token', '', cookieOptions);
  response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);

  return response;
}

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Disable auth for tests if DISABLE_AUTH env var is set
  if (process.env.DISABLE_AUTH === 'true') {
    return NextResponse.next();
  }

  // Detect Tauri desktop app by checking User-Agent header
  const userAgent = req.headers.get('user-agent') || '';
  const isTauriApp = userAgent.includes('Tauri') || req.headers.get('x-tauri-app') === 'true';

  // Skip authentication for Tauri desktop app
  // Desktop app uses local SQLite and integrates with Claude Code subscription
  if (isTauriApp) {
    return NextResponse.next();
  }

  const isAuthPage = nextUrl.pathname.startsWith('/auth');
  const isProtectedPage =
    nextUrl.pathname.startsWith('/create') ||
    nextUrl.pathname.startsWith('/dashboard');

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Redirect unauthenticated users to sign in
  if (isProtectedPage && !isLoggedIn) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)'],
};

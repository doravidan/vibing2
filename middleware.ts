import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

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

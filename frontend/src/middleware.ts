import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that always work regardless of subdomain
const PUBLIC_PATHS = ['/login', '/register', '/verify-email', '/auto-login', '/optin', '/privacidade', '/termos'];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === '/';
  if (isPublic) return NextResponse.next();

  // ── email.clicaai.ia.br ────────────────────────────────────────────────────
  // Allow only email-related routes. Redirect everything else to /email
  if (hostname.startsWith('email.')) {
    const isEmailPath = pathname.startsWith('/email') || pathname.startsWith('/contacts') || pathname.startsWith('/dashboard') || pathname.startsWith('/planos') || pathname.startsWith('/guide');
    if (!isEmailPath) {
      return NextResponse.redirect(new URL('/email', request.url));
    }
    return NextResponse.next();
  }

  // ── zap.clicaai.ia.br  (or app.) ──────────────────────────────────────────
  // Block pure email routes — redirect to dashboard
  if (hostname.startsWith('zap.') || hostname.startsWith('app.')) {
    if (pathname.startsWith('/email')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ── Default (main domain or localhost) ────────────────────────────────────
  // No restrictions — behaves as before
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|api).*)'],
};

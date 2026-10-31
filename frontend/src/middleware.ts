// ============================================================
// Route Protection Middleware (Next.js)
// Redirects requests without session cookies to /login. The backend still
// enforces token validity and account status for every API request.
// ============================================================
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/', '/login', '/register'];
  if (publicRoutes.includes(pathname)) return NextResponse.next();

  const protectedPrefixes = ['/dashboard', '/admin', '/hoa', '/resident'];
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !request.cookies.has('accessToken') && !request.cookies.has('refreshToken')) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Vercel Services do not support Edge middleware; Next.js 15.5 supports
  // Node.js middleware, which keeps this route guard enabled for this deploy.
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};

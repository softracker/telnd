import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth is handled client-side by AdminLayout + auth-context.
  // Cookie-based middleware can't work here because the API (localhost:3001)
  // sets cookies on its own origin, not the admin app's origin (localhost:3000).
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

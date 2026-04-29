import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limit store
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const LIMIT = 100; // requests
const WINDOW = 60 * 1000; // 1 minute

export function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const now = Date.now();
  
  const current = rateLimit.get(ip) ?? { count: 0, timestamp: now };
  
  if (now - current.timestamp > WINDOW) {
    current.count = 1;
    current.timestamp = now;
  } else {
    current.count++;
  }
  
  rateLimit.set(ip, current);
  
  if (current.count > LIMIT) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle protected routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Basic protection logic (can be enhanced)
    // For now, allow through, role check happens in client/server components
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

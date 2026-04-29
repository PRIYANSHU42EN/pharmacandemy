import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic in-memory rate limiting map for Edge Middleware.
// Note: In serverless environments, this state is per-instance.
// For strict global rate limiting, an external store like Redis is required.
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT_COUNT = 60; // 60 requests
const RATE_LIMIT_WINDOW_MS = 60000; // per 1 minute

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';

    const now = Date.now();
    const hit = rateLimitMap.get(ip);

    if (hit) {
      if (now - hit.timestamp < RATE_LIMIT_WINDOW_MS) {
        if (hit.count >= RATE_LIMIT_COUNT) {
          console.warn(`[RateLimit] IP ${ip} exceeded API rate limit.`);
          return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
          );
        }
        hit.count++;
      } else {
        // Reset window
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all API routes
  matcher: '/api/:path*',
};

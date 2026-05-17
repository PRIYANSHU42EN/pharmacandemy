import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client using Upstash for Edge compatibility
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Specific rate limit configuration for /api/users/me
const RATE_LIMIT = 5; // max requests per hour per user
const WINDOW_SECONDS = 60 * 60; // 1 hour in seconds

function getRateLimitKey(uid: string) {
  return `rl:user:${uid}`;
}

async function enforceRateLimit(uid: string) {
  const key = getRateLimitKey(uid);
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    if (count > RATE_LIMIT) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  } catch (error) {
    // Silent fail for rate limiting to ensure availability
  }
  return null;
}

// Basic in-memory rate limiting map for general API routes.
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const GLOBAL_RATE_LIMIT_COUNT = 200; 
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60000; // per 1 minute

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // Hardened CSP Header
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.ably.com https://*.firebaseapp.com https://*.googleapis.com https://apis.google.com https://www.youtube.com https://s.ytimg.com https://cdnjs.cloudflare.com https://unpkg.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
    img-src 'self' data: blob: https:;
    font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
    connect-src 'self' https://*.supabase.co https://*.ably.com https://*.ably-realtime.com https://*.realtime.ably.net https://*.firebaseio.com https://*.googleapis.com wss://*.ably.com wss://*.ably-realtime.com https://unpkg.com;
    worker-src 'self' blob: https://unpkg.com;
    frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.razorpay.com https://*.firebaseapp.com https://docs.google.com https://drive.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  // Rate Limiting Logic
  if (request.method === 'PATCH' && request.nextUrl.pathname === '/api/users/me') {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        const uid = payload.uid || payload.user_id || payload.sub;
        if (uid) {
          const limitResp = await enforceRateLimit(uid);
          if (limitResp) return limitResp;
        }
      } catch (e) {
        // Skip rate limit if token is invalid
      }
    }
  }

  // Global API rate limiting
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const hit = rateLimitMap.get(ip);

    if (hit) {
      if (now - hit.timestamp < GLOBAL_RATE_LIMIT_WINDOW_MS) {
        if (hit.count >= GLOBAL_RATE_LIMIT_COUNT) {
          return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
          );
        }
        hit.count++;
      } else {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }
  }

  const response = NextResponse.next();
  
  // Set Security Headers
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

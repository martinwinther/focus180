import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Use Edge runtime for better performance (works on both Vercel and Cloudflare)
export const runtime = 'edge';

// Simple in-memory rate limiter for Edge runtime
// Note: This works per-instance, so it provides soft protection
// For stricter rate limiting at scale, use Vercel Edge Config or external store
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per IP

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  // Try various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  // Fallback for development
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean up old entries periodically (simple garbage collection)
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // Start new window
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  record.count++;
  return { allowed: true };
}

export async function GET(request: NextRequest) {
  // Check rate limit
  const clientIP = getClientIP(request);
  const { allowed, retryAfter } = checkRateLimit(clientIP);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests', message: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter || 60),
        },
      }
    );
  }

  try {
    // This endpoint provides Firebase config to the client
    // Server-side env vars are available at runtime in Vercel
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    };

    // Log what we have for debugging (without exposing sensitive values)
    logger.info('Firebase config check:', {
      hasApiKey: !!config.apiKey,
      hasProjectId: !!config.projectId,
      hasAuthDomain: !!config.authDomain,
      hasStorageBucket: !!config.storageBucket,
      hasMessagingSenderId: !!config.messagingSenderId,
      hasAppId: !!config.appId,
    });

    // Only return config if we have the essential values
    if (!config.apiKey || !config.projectId) {
      return NextResponse.json(
        { 
          error: 'Firebase configuration not available',
          details: {
            hasApiKey: !!config.apiKey,
            hasProjectId: !!config.projectId,
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    logger.error('Error in firebase-config route:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

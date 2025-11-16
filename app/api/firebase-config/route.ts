import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Use Edge runtime for better performance (works on both Vercel and Cloudflare)
export const runtime = 'edge';

export async function GET() {
  try {
    // This endpoint provides Firebase config to the client
    // Server-side env vars are available at runtime in Cloudflare
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


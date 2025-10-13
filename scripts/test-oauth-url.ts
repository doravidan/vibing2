import 'dotenv/config';
import { init as initClient } from '@instantdb/react';

// Initialize client-side InstantDB (simulating what the browser does)
const db = initClient({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID!,
});

// Test Google OAuth URL generation
const googleAuthUrl = db.auth.createAuthorizationURL({
  clientName: 'google-web',
  redirectURL: 'http://localhost:3000/auth/callback',
});

console.log('✅ Google OAuth URL generated successfully:');
console.log(googleAuthUrl);
console.log('\nThis URL should redirect users to Google for authentication.');
console.log('After authentication, users will be redirected back to /auth/callback');

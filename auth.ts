import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Using JWT sessions (no database adapter needed)
// This prevents session/account issues and improves performance
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  ...authConfig,
});

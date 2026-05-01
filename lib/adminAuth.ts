import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

export function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';

  // Hash both sides to a fixed length before comparing, preventing length-leak
  // timing attacks while keeping the comparison constant-time.
  const provided = createHash('sha256').update(token).digest();
  const expected = createHash('sha256').update(adminPassword).digest();

  try {
    return timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

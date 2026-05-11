/**
 * Attaches a userId to every request.
 * Priority: Bearer token (Supabase JWT) → X-User-Id header → anon cookie.
 * Falls back to a UUID stored in a cookie so unauthenticated users still
 * get persistent memory.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { getSupabase } from './client';

const ANON_COOKIE = 'ai_tutor_anon_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { userId: string; }
  }
}

export async function attachUserId(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {

  // 1. Try Supabase JWT from Authorization header
  const bearer = req.headers.authorization?.replace('Bearer ', '');
  if (bearer) {
    const db = getSupabase();
    if (db) {
      const { data } = await db.auth.getUser(bearer);
      if (data?.user?.id) {
        req.userId = data.user.id;
        return next();
      }
    }
  }

  // 2. X-User-Id header (for trusted internal use)
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  if (headerUserId) {
    req.userId = headerUserId;
    return next();
  }

  // 3. Anonymous cookie — create one if missing
  let anonId = req.cookies?.[ANON_COOKIE] as string | undefined;
  if (!anonId) {
    anonId = randomUUID();
    res.cookie(ANON_COOKIE, anonId, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   COOKIE_MAX_AGE * 1000,
    });
  }
  req.userId = `anon_${anonId}`;
  next();
}

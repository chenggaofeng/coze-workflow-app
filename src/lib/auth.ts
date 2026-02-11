import { SignJWT, jwtVerify } from 'jose';

export interface User {
  id: number;
  username: string;
  expired_at: string;
}

export async function createToken(user: User, secret?: string): Promise<string> {
  const JWT_SECRET = new TextEncoder().encode(
    secret || 'your-secret-key-minimum-32-characters-long'
  );
  return new SignJWT({ 
    id: user.id, 
    username: user.username,
    expired_at: user.expired_at 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string, secret?: string): Promise<User | null> {
  try {
    const JWT_SECRET = new TextEncoder().encode(
      secret || 'your-secret-key-minimum-32-characters-long'
    );
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      username: payload.username as string,
      expired_at: payload.expired_at as string,
    };
  } catch {
    return null;
  }
}

export function isExpired(expiredAt: string): boolean {
  return new Date(expiredAt) < new Date();
}

import { verifyToken } from './auth';
import { getUserById } from './db';

export interface User {
  id: number;
  username: string;
  expired_at: string;
  role?: string;
}

export async function verifyAdminUser(token: string, db: any, secret?: string): Promise<User | null> {
  const user = await verifyToken(token, secret);
  if (!user) {
    return null;
  }

  const fullUser = await getUserById(db, user.id);
  if (!fullUser) {
    return null;
  }

  if (fullUser.role !== 'admin') {
    return null;
  }

  return {
    id: fullUser.id as number,
    username: fullUser.username as string,
    expired_at: fullUser.expired_at as string,
    role: fullUser.role as string,
  };
}

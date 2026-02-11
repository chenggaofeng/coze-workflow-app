import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken } from '@/lib/auth';
import { createUser, getUserByUsername, getInviteCode, useInviteCode, updateUserExpiry } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { username, password, inviteCode } = await request.json() as { username: string; password: string; inviteCode: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    if (!inviteCode) {
      return NextResponse.json(
        { error: '邀请码不能为空' },
        { status: 400 }
      );
    }

    const ctx: any = getRequestContext();
    const db = ctx.env ? ctx.env.DB : undefined;
    
    if (!db) {
      return NextResponse.json(
        { error: '数据库连接不可用' },
        { status: 500 }
      );
    }

    const validInviteCode = await getInviteCode(db, inviteCode);
    if (!validInviteCode) {
      return NextResponse.json(
        { error: '邀请码无效或已被使用' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByUsername(db, username);
    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 3);

    const result = await createUser(db, username, passwordHash, expiredAt.toISOString());
    
    if (!result.success) {
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      );
    }

    const newUser = await getUserByUsername(db, username);
    if (!newUser) {
      return NextResponse.json(
        { error: '用户创建失败' },
        { status: 500 }
      );
    }

    await useInviteCode(db, validInviteCode.id as number, newUser.id as number);

    const token = await createToken({
      id: newUser.id as number,
      username: newUser.username as string,
      expired_at: newUser.expired_at as string,
      role: newUser.role as string,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        expired_at: newUser.expired_at,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
